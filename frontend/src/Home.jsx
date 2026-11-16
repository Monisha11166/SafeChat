import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import "./Home.css";

import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import ChatWindow from "./components/ChatWindow";
import MessageInput from "./components/MessageInput";
import AddContactModal from "./components/AddContactModal";
import CallModal from "./components/CallModal";

import API from "./services/api";
import socket from "./socket";
import useCall from "./hooks/useCall";

// senderId/receiverId sometimes arrive populated as a full user
// object (from API responses) and sometimes as a plain id string
// (from socket events) — this normalizes either into just the id.
const idOf = (value) => (typeof value === "object" ? value?._id : value);

function Home() {
  const user = JSON.parse(localStorage.getItem("user"));

  const [contacts, setContacts] = useState([]);
  const [selectedContact, setSelectedContact] = useState(null);
  const [messages, setMessages] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(true);
  // On phones the contact list and the open chat can't fit side by
  // side, so only one is shown at a time; this tracks which one.
  const [mobileChatOpen, setMobileChatOpen] = useState(false);
  // List of userIds currently online — the backend already tracks and
  // broadcasts this on every connect/disconnect; we just weren't
  // listening for it before, which is why everyone showed "Offline".
  const [onlineUsers, setOnlineUsers] = useState([]);

  const navigate = useNavigate();
  const call = useCall(user?._id);

  // Socket event handlers are registered once (empty dependency
  // array) so they'd otherwise always see the selectedContact from
  // that first render. This ref is kept in sync on every change so
  // those handlers can read the *current* open chat.
  const selectedContactRef = useRef(null);
  useEffect(() => {
    selectedContactRef.current = selectedContact;
  }, [selectedContact]);

  useEffect(() => {
    const handler = (ids) => setOnlineUsers(ids || []);
    socket.on("onlineUsers", handler);
    return () => socket.off("onlineUsers", handler);
  }, []);

  // Older accounts have no guardian contact - nudge them once.
  useEffect(() => {
    if (user && !user.guardianEmail && !user.guardianPhone) {
      toast.warn("Add a parent/guardian contact to enable safety alerts. Click here.", {
        toastId: "guardian-missing",
        autoClose: 9000,
        onClick: () => navigate("/dashboard"),
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (user?._id) {
      socket.emit("registerUser", user._id);
    }
  }, [user]);

  const fetchContacts = async () => {
    try {
      const res = await API.get(`/contacts/${user._id}`);
      setContacts(res.data || []);
    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, []);

  useEffect(() => {
    if (!selectedContact) {
      setMessages([]);
      return;
    }

    const fetchMessages = async () => {
      try {
        const receiverId =
          selectedContact.contactId?._id || selectedContact.contactId;

        const res = await API.get(
          `/messages/${user._id}/${receiverId}`
        );

        const fetched = res.data || [];
        setMessages(fetched);

        // Opening this chat means we've now seen every message the
        // other person sent us — mark the unread ones as read and
        // tell their socket so their tick updates live.
        const unreadFromThem = fetched.filter(
          (m) => idOf(m.senderId) === receiverId && !m.read
        );

        unreadFromThem.forEach((m) => {
          API.put(`/messages/read/${m._id}`).catch(() => {});
          socket.emit("messageRead", {
            senderId: receiverId,
            messageId: m._id,
          });
        });
      } catch (err) {
        console.log(err);
      }
    };

    fetchMessages();
  }, [selectedContact]);

  useEffect(() => {
    const receiveHandler = (message) => {
      const senderId = idOf(message.senderId);
      const openContactId = idOf(
        selectedContactRef.current?.contactId ||
          selectedContactRef.current
      );
      const chatIsOpen = openContactId && openContactId === senderId;

      setMessages((prev) => [...prev, message]);

      // It just reached this device, so it's delivered — tell the
      // server (which notifies the sender's socket for a live tick
      // update) and persist it so a page refresh shows the same tick.
      API.put(`/messages/delivered/${message._id}`).catch(() => {});
      socket.emit("messageDelivered", {
        senderId,
        messageId: message._id,
      });

      // If we're already looking at this exact conversation, treat
      // it as read immediately too (matches normal chat-app behavior).
      if (chatIsOpen) {
        API.put(`/messages/read/${message._id}`).catch(() => {});
        socket.emit("messageRead", {
          senderId,
          messageId: message._id,
        });
      }
    };

    // Live tick updates for messages *we* sent, once the other side's
    // device/app confirms delivery or reads it.
    const deliveredHandler = ({ messageId }) => {
      setMessages((prev) =>
        prev.map((m) =>
          m._id === messageId ? { ...m, delivered: true } : m
        )
      );
    };

    const readHandler = ({ messageId }) => {
      setMessages((prev) =>
        prev.map((m) =>
          m._id === messageId ? { ...m, delivered: true, read: true } : m
        )
      );
    };

    socket.on("receiveMessage", receiveHandler);
    socket.on("messageDelivered", deliveredHandler);
    socket.on("messageRead", readHandler);

    return () => {
      socket.off("receiveMessage", receiveHandler);
      socket.off("messageDelivered", deliveredHandler);
      socket.off("messageRead", readHandler);
    };
  }, []);

  const handleSendMessage = async (data) => {
    if (!selectedContact) return;

    const receiverId =
      selectedContact.contactId?._id || selectedContact.contactId;

    // Supports both old (plain string) and new ({message, image}) MessageInput
    const text = typeof data === "string" ? data : data.message;
    const imageFile = typeof data === "object" ? data.image : null;

    try {
      let res;

      if (imageFile) {
        // Image/file attached -> multipart upload so it reaches
        // upload.single("file") on the backend and gets a real URL.
        const form = new FormData();
        form.append("senderId", user._id);
        form.append("receiverId", receiverId);
        form.append("message", text || "");
        form.append("file", imageFile);

        res = await API.post("/messages/send", form, {
          headers: { "Content-Type": undefined },
        });
      } else {
        res = await API.post("/messages/send", {
          senderId: user._id,
          receiverId,
          message: text,
        });
      }

      if (res.data?.data) {
        setMessages((prev) => [...prev, res.data.data]);
      }

      socket.emit("sendMessage", res.data.data);
    } catch (err) {
      console.log(err);
    }
  };

  return (
    <div className={mobileChatOpen ? "home mobile-chat-open" : "home"}>

      <Sidebar
        user={user}
        contacts={contacts}
        selectedContact={selectedContact}
        onSelectContact={(contact) => {
          setSelectedContact(contact);
          setMobileChatOpen(true);
        }}
        onAddContact={() => setShowAddModal(true)}
      />

      <div className="chat">

        <Header
          contact={selectedContact}
          onlineUsers={onlineUsers}
          onBack={() => setMobileChatOpen(false)}
          onStartCall={(type) => {
            const friend =
              selectedContact?.contactId || selectedContact;
            if (friend?._id) {
              call.startCall(friend._id, friend.username, type, friend.profilePic);
            }
          }}
        />

        {loading ? (
          <div className="loading-chat">
            Loading...
          </div>
        ) : (
          <>
            <ChatWindow
              messages={messages}
            />

            {selectedContact && (
              <MessageInput
                onSend={handleSendMessage}
              />
            )}
          </>
        )}

      </div>

      <AddContactModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onContactAdded={fetchContacts}
      />

      <CallModal
        callState={call.callState}
        callType={call.callType}
        remoteUser={call.remoteUser}
        localStream={call.localStream}
        remoteStream={call.remoteStream}
        isMuted={call.isMuted}
        isVideoOff={call.isVideoOff}
        error={call.error}
        onAccept={call.acceptCall}
        onReject={call.rejectCall}
        onEnd={call.endCall}
        onToggleMute={call.toggleMute}
        onToggleVideo={call.toggleVideo}
      />

    </div>
  );
}

export default Home;