"use client";

import { useState } from "react";
import { db } from "@/app/lib/firebase";
import { doc, setDoc, collection } from "firebase/firestore";

export default function AddClientModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [clientName, setClientName] = useState("");
  const [nickname, setNickname] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

  const handleSubmit = async () => {
    if (!clientName.trim()) {
      setError("Client name is required.");
      return;
    }
  
    setLoading(true);
    setError("");
  
    try {
      const ref = doc(collection(db, "Clients"));
  
      await setDoc(ref, {
        clientId: ref.id,                 // 🔥 document ID
        ClientName: clientName.trim(),
        Nickname: nickname || null,
        Balance: 0,
        Status: "NoData",
        ClientImage: "/ClientIMG.png",
        ImageUrl: "",
        ValidID: "/ValidIDSampleImg.png",
      });
  
      onClose();
      setClientName("");
      setNickname("");
    } catch (err) {
      console.error(err);
      setError("Failed to add client.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-xl text-black">
        <h2 className="text-xl font-bold mb-4 text-black">
          Add New Client
        </h2>

        <div className="space-y-4">
          <input
            placeholder="Client Name *"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            className="w-full border rounded-lg p-2"
          />

          <input
            placeholder="Nickname (optional)"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            className="w-full border rounded-lg p-2"
          />

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <button
              onClick={onClose}
              className="px-4 py-2 border rounded-lg"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg disabled:opacity-50"
            >
              Add Client
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
