import { useCallback, useEffect, useRef, useState } from "react";
import socket from "../socket";
import API from "../services/api";

// STUN server alone only works when both sides are on networks that
// allow a direct peer-to-peer connection (e.g. same wifi). Real-world
// calls (phone data <-> home wifi, campus networks, etc.) are usually
// behind NATs that block that direct path, so audio/video silently
// fails to flow even though the call "connects". A TURN server relays
// the media through a third-party server to work around that. This
// uses Open Relay Project's free public TURN service, which is fine
// for a demo/project; for a real product you'd use a paid TURN
// provider (e.g. Twilio, Metered, Cloudflare) with your own credentials.
const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    {
      urls: "turn:openrelay.metered.ca:80",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
    {
      urls: "turn:openrelay.metered.ca:443",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
    {
      urls: "turn:openrelay.metered.ca:443?transport=tcp",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
  ],
};

// Short-lived TURN credentials are minted by our backend (Cloudflare TURN)
// so the long-term secret never reaches the browser. If that fails for any
// reason we quietly keep using the built-in ICE_SERVERS above.
let cachedIce = null;
let cachedIceAt = 0;

async function loadIceServers() {
  if (cachedIce && Date.now() - cachedIceAt < 60 * 60 * 1000) return;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const res = await API.get("/turn/ice", { timeout: 12000 });
      if (Array.isArray(res.data?.iceServers) && res.data.iceServers.length) {
        cachedIce = { iceServers: res.data.iceServers };
        cachedIceAt = Date.now();
        console.log("[call] Using TURN servers from backend:", res.data.iceServers.length);
        return;
      }
    } catch (err) {
      console.warn(
        `[call] TURN credentials unavailable (try ${attempt}):`,
        err.response?.status || err.message,
        "- set METERED_APP_NAME + METERED_API_KEY on Render"
      );
    }
  }
  console.warn("[call] Falling back to the built-in public TURN (unreliable).");
}

/**
 * callState machine:
 *   idle -> calling (outgoing, waiting for answer)
 *   idle -> ringing (incoming, waiting for local accept/reject)
 *   calling -> connecting (answer received, ICE negotiating)
 *   ringing -> connecting (local accept sent, ICE negotiating)
 *   connecting -> connected (real peer-to-peer link confirmed)
 *   any -> idle (on end/reject/fail)
 */
export default function useCall(currentUserId) {
  const [callState, setCallState] = useState("idle");
  const [callType, setCallType] = useState(null); // "audio" | "video"
  const [remoteUser, setRemoteUser] = useState(null); // { id, name }
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [error, setError] = useState(null);

  const pcRef = useRef(null);
  const incomingOfferRef = useRef(null);
  const pendingCandidatesRef = useRef([]);
  const connectTimeoutRef = useRef(null);

  const cleanup = useCallback(() => {
    if (connectTimeoutRef.current) {
      clearTimeout(connectTimeoutRef.current);
      connectTimeoutRef.current = null;
    }
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    setLocalStream((stream) => {
      stream?.getTracks().forEach((t) => t.stop());
      return null;
    });
    setRemoteStream(null);
    setCallState("idle");
    setCallType(null);
    setRemoteUser(null);
    setIsMuted(false);
    setIsVideoOff(false);
    incomingOfferRef.current = null;
    pendingCandidatesRef.current = [];
  }, []);

  const createPeerConnection = useCallback(
    (targetId) => {
      const pc = new RTCPeerConnection(cachedIce || ICE_SERVERS);

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit("ice-candidate", {
            to: targetId,
            candidate: event.candidate,
          });
        }
      };

      pc.ontrack = (event) => {
        setRemoteStream(event.streams[0]);
      };

      pc.oniceconnectionstatechange = () =>
        console.log("[call] ICE state:", pc.iceConnectionState);

      pc.onconnectionstatechange = () => {
        console.log("[call] connection state:", pc.connectionState);
        if (pc.connectionState === "connected") {
          // Debug: shows whether media goes direct (host/srflx) or via TURN (relay).
          pc.getStats().then((stats) => {
            stats.forEach((r) => {
              if (r.type === "candidate-pair" && r.nominated && r.state === "succeeded") {
                const l = stats.get(r.localCandidateId);
                const rem = stats.get(r.remoteCandidateId);
                console.log("[call] route:", l?.candidateType, "->", rem?.candidateType);
              }
            });
          }).catch(() => {});
          // The actual peer-to-peer link is up — now it's safe to call
          // this "Connected" and show the video. Doing this earlier
          // (right after offer/answer signaling) let the UI claim
          // success while media was still silently failing to flow.
          setCallState("connected");
        }
        if (["failed", "disconnected", "closed"].includes(pc.connectionState)) {
          if (pc.connectionState === "failed") {
            setError(
              "Couldn't establish a connection — this can happen on some networks."
            );
            cleanup();
          }
        }
      };

      pcRef.current = pc;
      return pc;
    },
    [cleanup]
  );

  const getMedia = useCallback(async (type) => {
    return navigator.mediaDevices.getUserMedia({
      audio: true,
      video: type === "video",
    });
  }, []);

  // ---- Outgoing call ----
  const startCall = useCallback(
    async (targetId, targetName, type, targetProfilePic) => {
      setError(null);
      try {
        await loadIceServers();
        const stream = await getMedia(type);
        setLocalStream(stream);
        setCallType(type);
        setRemoteUser({ id: targetId, name: targetName, profilePic: targetProfilePic });
        setCallState("calling");

        const pc = createPeerConnection(targetId);
        stream.getTracks().forEach((track) => pc.addTrack(track, stream));

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        const me = JSON.parse(localStorage.getItem("user"));

        socket.emit("call-user", {
          to: targetId,
          from: currentUserId,
          offer,
          callType: type,
          callerName: me?.username,
          callerProfilePic: me?.profilePic,
        });
      } catch (err) {
        setError(
          err.name === "NotAllowedError"
            ? "Camera/microphone permission denied"
            : "Could not start call"
        );
        cleanup();
      }
    },
    [currentUserId, getMedia, createPeerConnection, cleanup]
  );

  // ---- Accept incoming call ----
  const acceptCall = useCallback(async () => {
    if (!incomingOfferRef.current) return;
    const { from, offer, callType: type, callerName } = incomingOfferRef.current;

    setError(null);
    try {
      await loadIceServers();
      const stream = await getMedia(type);
      setLocalStream(stream);

      const pc = createPeerConnection(from);
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      await pc.setRemoteDescription(new RTCSessionDescription(offer));

      // Apply any ICE candidates that arrived before we were ready
      const queued = pendingCandidatesRef.current;
      pendingCandidatesRef.current = [];
      for (const candidate of queued) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
          console.error("[call] queued ICE failed:", e.message);
        }
      }

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socket.emit("call-answer", { to: from, answer });

      setCallState("connecting");
    } catch (err) {
      setError(
        err.name === "NotAllowedError"
          ? "Camera/microphone permission denied"
          : "Could not accept call"
      );
      socket.emit("call-rejected", { to: from });
      cleanup();
    }
  }, [getMedia, createPeerConnection, cleanup]);

  const rejectCall = useCallback(() => {
    if (incomingOfferRef.current) {
      socket.emit("call-rejected", { to: incomingOfferRef.current.from });
    }
    cleanup();
  }, [cleanup]);

  const endCall = useCallback(() => {
    if (remoteUser?.id) {
      socket.emit("call-ended", { to: remoteUser.id });
    }
    cleanup();
  }, [remoteUser, cleanup]);

  const toggleMute = useCallback(() => {
    setLocalStream((stream) => {
      stream?.getAudioTracks().forEach((t) => (t.enabled = !t.enabled));
      return stream;
    });
    setIsMuted((m) => !m);
  }, []);

  const toggleVideo = useCallback(() => {
    setLocalStream((stream) => {
      stream?.getVideoTracks().forEach((t) => (t.enabled = !t.enabled));
      return stream;
    });
    setIsVideoOff((v) => !v);
  }, []);

  useEffect(() => {
    if (callState === "connecting") {
      connectTimeoutRef.current = setTimeout(() => {
        setError(
          "Couldn't connect — this can happen on some networks. Please try again."
        );
        if (remoteUser?.id) {
          socket.emit("call-ended", { to: remoteUser.id });
        }
        cleanup();
      }, 15000);
    }
    return () => {
      if (connectTimeoutRef.current) {
        clearTimeout(connectTimeoutRef.current);
        connectTimeoutRef.current = null;
      }
    };
  }, [callState, remoteUser, cleanup]);

  // ---- Socket listeners ----
  useEffect(() => {
    const onIncomingCall = ({ from, offer, callType: type, callerName, callerProfilePic }) => {
      incomingOfferRef.current = { from, offer, callType: type, callerName };
      setCallType(type);
      setRemoteUser({ id: from, name: callerName || "Unknown", profilePic: callerProfilePic });
      setCallState("ringing");
    };

    const onCallAnswered = async ({ answer }) => {
      const pc = pcRef.current;
      if (!pc) return;
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
        // The callee's ICE candidates often arrive BEFORE the answer.
        // They were queued; apply them now or the call never connects.
        const queued = pendingCandidatesRef.current;
        pendingCandidatesRef.current = [];
        for (const c of queued) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(c));
          } catch (e) {
            console.error("[call] queued ICE failed:", e.message);
          }
        }
        setCallState("connecting");
      } catch (err) {
        console.error("[call] setRemoteDescription(answer) failed:", err.message);
        setError("Call setup failed. Please try again.");
        cleanup();
      }
    };

    const onIceCandidate = async ({ candidate }) => {
      if (pcRef.current?.remoteDescription) {
        try {
          await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.error("Failed to add ICE candidate:", err.message);
        }
      } else {
        // Remote description not set yet (e.g. callee hasn't accepted) —
        // queue it and apply once the connection is ready.
        pendingCandidatesRef.current.push(candidate);
      }
    };

    const onCallRejected = () => {
      setError("Call declined");
      cleanup();
    };

    const onCallEnded = () => {
      cleanup();
    };

    const onCallFailed = ({ reason }) => {
      setError(reason || "Call failed");
      cleanup();
    };

    socket.on("incoming-call", onIncomingCall);
    socket.on("call-answered", onCallAnswered);
    socket.on("ice-candidate", onIceCandidate);
    socket.on("call-rejected", onCallRejected);
    socket.on("call-ended", onCallEnded);
    socket.on("call-failed", onCallFailed);

    return () => {
      socket.off("incoming-call", onIncomingCall);
      socket.off("call-answered", onCallAnswered);
      socket.off("ice-candidate", onIceCandidate);
      socket.off("call-rejected", onCallRejected);
      socket.off("call-ended", onCallEnded);
      socket.off("call-failed", onCallFailed);
    };
  }, [cleanup]);

  return {
    callState,
    callType,
    remoteUser,
    localStream,
    remoteStream,
    isMuted,
    isVideoOff,
    error,
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleVideo,
  };
}
