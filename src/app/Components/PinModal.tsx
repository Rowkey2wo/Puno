"use client";

import { useState } from "react";

type PinModalProps = {
  user: {
    id: string;
    name: string;
    pin: string;
  };
  onClose: () => void;
  onSuccess: (user: any) => void;
};

export default function PinModal({ user, onClose, onSuccess }: PinModalProps) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = () => {
    console.log("Entered PIN:", pin);
    console.log("Stored PIN:", user.pin);
    console.log("Entered PIN length:", pin.length);
    console.log("Stored PIN length:", user.pin.length);
    if (!user.pin) {
      setError("PIN not set for this user");
      return;
    }
  
    if (pin.trim() === user.pin.trim()) {
      onSuccess(user);
    } else {
      setError("Invalid PIN");
    }
  };
  
  

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-80 text-center shadow-lg text-black">
        <h2 className="text-xl font-bold mb-2">
          Enter PIN for {user.name}
        </h2>

        <input
          type="password"
          maxLength={4}
          value={pin}
          onChange={e => setPin(e.target.value)}
          className="w-full border p-2 rounded text-center text-lg tracking-widest"
          placeholder="••••"
        />

        {error && <p className="text-red-500 text-sm mt-2">{error}</p>}

        <div className="flex gap-2 mt-4">
          <button
            onClick={onClose}
            className="w-full border rounded py-2"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="w-full bg-indigo-600 text-white rounded py-2"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
