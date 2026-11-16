import React, { useState } from "react";

function NewChatModal({ isOpen, onClose, onAddContact }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (!name || !phone) {
      alert("Please fill all fields");
      return;
    }

    onAddContact({
      name,
      phone,
    });

    setName("");
    setPhone("");
    onClose();
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <div
        style={{
          background: "#fff",
          padding: "25px",
          borderRadius: "10px",
          width: "350px",
        }}
      >
        <h2>Add New Contact</h2>

        <input
          type="text"
          placeholder="Contact Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{
            width: "100%",
            padding: "10px",
            marginTop: "15px",
            marginBottom: "10px",
          }}
        />

        <input
          type="text"
          placeholder="Phone Number"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          style={{
            width: "100%",
            padding: "10px",
            marginBottom: "20px",
          }}
        />

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: "10px 20px",
              border: "none",
              borderRadius: "5px",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>

          <button
            onClick={handleSubmit}
            style={{
              padding: "10px 20px",
              background: "#25D366",
              color: "white",
              border: "none",
              borderRadius: "5px",
              cursor: "pointer",
            }}
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
}

export default NewChatModal;