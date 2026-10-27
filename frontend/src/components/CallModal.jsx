import { useEffect, useRef } from "react";
import { FaPhoneAlt, FaPhoneSlash, FaMicrophone, FaMicrophoneSlash, FaVideo, FaVideoSlash } from "react-icons/fa";
import Avatar from "./Avatar";
import "./CallModal.css";

function CallModal({
  callState, // "idle" | "calling" | "ringing" | "connecting" | "connected"
  callType, // "audio" | "video"
  remoteUser,
  localStream,
  remoteStream,
  isMuted,
  isVideoOff,
  error,
  onAccept,
  onReject,
  onEnd,
  onToggleMute,
  onToggleVideo,
}) {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const remoteAudioRef = useRef(null);

  // These effects re-attach the stream whenever it changes, for the
  // common case where the <video>/<audio> element is already mounted.
  useEffect(() => {
    if (localVideoRef.current) localVideoRef.current.srcObject = localStream;
  }, [localStream]);

  useEffect(() => {
    if (callType === "video" && remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
    if (callType === "audio" && remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = remoteStream;
    }
  }, [remoteStream, callType]);

  // But the video elements only exist in the DOM once callState
  // becomes "connected" (see render below), which happens *after*
  // the effects above already ran with the stream. Without this,
  // the element mounts with no stream ever attached and stays blank
  // forever — these callback refs catch that by attaching the
  // latest stream the instant each element is created.
  const bindLocalVideo = (node) => {
    localVideoRef.current = node;
    if (node) node.srcObject = localStream;
  };
  const bindRemoteVideo = (node) => {
    remoteVideoRef.current = node;
    if (node) node.srcObject = remoteStream;
  };
  const bindRemoteAudio = (node) => {
    remoteAudioRef.current = node;
    if (node) node.srcObject = remoteStream;
  };

  if (callState === "idle") return null;

  return (
    <div className="call-modal-overlay">
      <div className="call-modal">
        {error && <div className="call-error">{error}</div>}

        {callType === "video" ? (
          <div className="video-call-area">
            {callState === "connected" ? (
              <video ref={bindRemoteVideo} autoPlay playsInline className="remote-video" />
            ) : (
              <div className="audio-call-area">
                <Avatar
                  src={remoteUser?.profilePic}
                  name={remoteUser?.name}
                  size={110}
                  className="call-avatar"
                />
                <h2>{remoteUser?.name || "Unknown"}</h2>
                <p className="call-status-text">
                  {callState === "calling" && "Calling..."}
                  {callState === "ringing" && "Incoming video call..."}
                  {callState === "connecting" && "Connecting..."}
                </p>
              </div>
            )}

            {/* Your own camera preview — shown from the moment the
                call starts, not just once it's connected. */}
            <video ref={bindLocalVideo} autoPlay playsInline muted className="local-video" />
          </div>
        ) : (
          <div className="audio-call-area">
            <Avatar
              src={remoteUser?.profilePic}
              name={remoteUser?.name}
              size={110}
              className="call-avatar"
            />
            <h2>{remoteUser?.name || "Unknown"}</h2>
            <p className="call-status-text">
              {callState === "calling" && "Calling..."}
              {callState === "ringing" && `Incoming ${callType} call...`}
              {callState === "connecting" && "Connecting..."}
              {callState === "connected" && "Connected"}
            </p>
            <audio ref={bindRemoteAudio} autoPlay />
          </div>
        )}

        <div className="call-controls">
          {callState === "ringing" ? (
            <>
              <button className="call-btn reject" onClick={onReject} title="Decline">
                <FaPhoneSlash />
              </button>
              <button className="call-btn accept" onClick={onAccept} title="Accept">
                <FaPhoneAlt />
              </button>
            </>
          ) : (
            <>
              <button className="call-btn secondary" onClick={onToggleMute} title="Mute">
                {isMuted ? <FaMicrophoneSlash /> : <FaMicrophone />}
              </button>

              {callType === "video" && (
                <button className="call-btn secondary" onClick={onToggleVideo} title="Camera">
                  {isVideoOff ? <FaVideoSlash /> : <FaVideo />}
                </button>
              )}

              <button className="call-btn reject" onClick={onEnd} title="End call">
                <FaPhoneSlash />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default CallModal;
