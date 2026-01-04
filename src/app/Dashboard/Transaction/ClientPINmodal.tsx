"use client";

import { useState, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/app/lib/firebase";

export default function ClientPINModal({
  clientId,
  open,
  onClose,
  onSuccess,
}: {
  clientId: string;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open) return;

    const fetchClient = async () => {
      setLoading(true);
      try {
        const clientRef = doc(db, "Clients", clientId);
        const clientSnap = await getDoc(clientRef);
        if (clientSnap.exists()) {
          const data = clientSnap.data();
          if (data.isPrivate === "Yes") {
            setIsPrivate(true);
          } else {
            setIsPrivate(false);
            onSuccess(); // auto-proceed if not private
          }
        } else {
          setError("Client not found.");
        }
      } catch (err) {
        console.error(err);
        setError("Failed to fetch client info.");
      } finally {
        setLoading(false);
      }
    };

    fetchClient();
  }, [clientId, open, onSuccess]);

  if (!open || !isPrivate) return null;

  const handleConfirm = async () => {
    try {
      const clientRef = doc(db, "Clients", clientId);
      const clientSnap = await getDoc(clientRef);
      if (!clientSnap.exists()) {
        setError("Client not found.");
        return;
      }
      const data = clientSnap.data();
      const storedPin = String(data.ClientPIN ?? "");
      if (pin === storedPin) {
        onSuccess();
        setPin("");
        setError("");
      } else {
        setError("Incorrect PIN.");
      }
    } catch (err) {
      console.error(err);
      setError("Failed to verify PIN.");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md text-black">
        <h2 className="text-xl font-bold mb-4">Enter Client PIN</h2>
        {error && <p className="text-red-500 mb-2">{error}</p>}
        <input
          type="password"
          placeholder="Client PIN"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          className="w-full p-3 border rounded mb-4"
        />
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 border rounded">
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="px-4 py-2 bg-green-600 text-white rounded disabled:opacity-50"
            disabled={!pin}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
