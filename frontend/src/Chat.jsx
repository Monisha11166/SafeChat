function Chat() {
  return (
    <div style={{ display: "flex", height: "100vh" }}>
      {/* Sidebar */}
      <div
        style={{
          width: "30%",
          backgroundColor: "#f0f2f5",
          borderRight: "1px solid #ccc",
          padding: "20px",
        }}
      >
        <h2>Chats</h2>

        <div
          style={{
            padding: "10px",
            backgroundColor: "#fff",
            marginBottom: "10px",
            cursor: "pointer",
          }}
        >
          Monisha
        </div>

        <div
          style={{
            padding: "10px",
            backgroundColor: "#fff",
            cursor: "pointer",
          }}
        >
          Sushma
        </div>
      </div>

      {/* Chat Area */}
      <div
        style={{
          width: "70%",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <div
          style={{
            backgroundColor: "#075E54",
            color: "white",
            padding: "15px",
          }}
        >
          <h3>Monisha</h3>
        </div>

        {/* Messages */}
        <div
          style={{
            flex: 1,
            padding: "20px",
            backgroundColor: "#ECE5DD",
          }}
        >
          <p><b>Monisha:</b> Hi!</p>
          <p><b>You:</b> Hello 👋</p>
        </div>

        {/* Message Input */}
        <div
          style={{
            display: "flex",
            padding: "10px",
            backgroundColor: "#f0f2f5",
          }}
        >
          <input
            type="text"
            placeholder="Type a message..."
            style={{
              flex: 1,
              padding: "10px",
            }}
          />

          <button
            style={{
              marginLeft: "10px",
              padding: "10px 20px",
            }}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

export default Chat;