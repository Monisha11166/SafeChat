import { useEffect, useState } from "react";
import { FaPhoneAlt, FaPhoneSlash, FaMicrophone, FaMicrophoneSlash, FaVideo, FaVideoSlash } from "react-icons/fa";
import Avatar from "./Avatar";
import "./CallModal.css";
import { useT } from "../i18n/LanguageContext";

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
  const { t } = useT();
  // The <video>/<audio> elements are mounted and unmounted as the call
  // state changes. Keeping the elements in state (setState is a stable
  // ref callback) means the stream is attached exactly when BOTH the
  // element and the stream exist, and is NOT re-assigned on every
  // re-render. Re-assigning srcObject on each render (what the old
  // inline callback refs did) restarts the media element, so the video
  // flashed once and then went black.
  const [localEl, setLocalEl] = useState(null);
  const [remoteVideoEl, setRemoteVideoEl] = useState(null);
  const [remoteAudioEl, setRemoteAudioEl] = useState(null);

  const attach = (el, stream) => {
    if (!el || el.srcObject === stream) return;
    el.srcObject = stream;
    const p = el.play?.();
    if (p && p.catch) p.catch(() => {}); // autoplay can be blocked; user tap retries
  };

  useEffect(() => attach(localEl, localStream), [localEl, localStream]);
  useEffect(() => attach(remoteVideoEl, remoteStream), [remoteVideoEl, remoteStream]);
  useEffect(() => attach(remoteAudioEl, remoteStream), [remoteAudioEl, remoteStream]);

  if (callState === "idle") return null;

  return (
    <div className="call-modal-overlay">
      <div className="call-modal">
        {error && <div className="call-error">{error}</div>}

        {callType === "video" ? (
          <div className="video-call-area">
            {callState === "connected" ? (
              <video ref={setRemoteVideoEl} autoPlay playsInline className="remote-video" />
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
            <video ref={setLocalEl} autoPlay playsInline muted className="local-video" />
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
            <audio ref={setRemoteAudioEl} autoPlay />
          </div>
        )}

        <div className="call-controls">
          {callState === "ringing" ? (
            <>
              <button className="call-btn reject" onClick={onReject} title={t("decline")}>
                <FaPhoneSlash />
              </button>
              <button className="call-btn accept" onClick={onAccept} title={t("accept")}>
                <FaPhoneAlt />
              </button>
            </>
          ) : (
            <>
              <button className="call-btn secondary" onClick={onToggleMute} title={t("mute")}>
                {isMuted ? <FaMicrophoneSlash /> : <FaMicrophone />}
              </button>

              {callType === "video" && (
                <button className="call-btn secondary" onClick={onToggleVideo} title={t("camera")}>
                  {isVideoOff ? <FaVideoSlash /> : <FaVideo />}
                </button>
              )}

              <button className="call-btn reject" onClick={onEnd} title={t("endCall")}>
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
