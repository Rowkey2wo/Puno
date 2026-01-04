"use client";

import { useState, useEffect } from "react";
import { doc, deleteDoc, getDoc } from "firebase/firestore";
import { db } from "@/app/lib/firebase";
import type { DisbursementRow } from "./page";

type DeleteDisbursementModalProps = {
  open: boolean;
  onClose: () => void;
  row: DisbursementRow | null;
};

export default function DeleteDisbursementModal({ open, onClose, row }: DeleteDisbursementModalProps) {
  const [loggedUser, setLoggedUser] = useState<{ id: string; name: string } | null>(null);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // Load logged-in user from sessionStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedUser = sessionStorage.getItem("loggedUser");
      if (storedUser) {
        try {
          const parsed = JSON.parse(storedUser);
          setLoggedUser({ id: parsed.id, name: parsed.name });
        } catch (e) {
          console.error("Failed to parse loggedUser:", e);
        }
      }
    }
  }, []);

  if (!open || !row) return null;

  const handlePinConfirm = async () => {
    if (!loggedUser) return;

    setIsProcessing(true);
    try {
      const userRef = doc(db, "Users", loggedUser.id);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        setPinError("User not found.");
        setIsProcessing(false);
        return;
      }

      const storedPin = String(userSnap.data().PIN ?? userSnap.data().pin ?? "");
      if (pin !== storedPin) {
        setPinError("Incorrect PIN. Please try again.");
        setIsProcessing(false);
        return;
      }

      // PIN correct → delete disbursement
      const disRef = doc(db, "Disbursement", row.id);
      await deleteDoc(disRef);

      onClose();
    } catch (err) {
      console.error(err);
      setPinError("Failed to delete disbursement.");
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 px-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-xl p-6 text-black">
        <div className="flex items-center justify-between mb-4 bg-red-200 p-4 rounded">
          <h3 className="text-xl font-semibold">Delete Disbursement</h3>
          <button onClick={onClose} className="text-xl font-bold">✕</button>
        </div>

        <p className="mb-4">
          Are you sure you want to delete the disbursement for <strong>{row.name}</strong> of amount <strong>₱{row.amount.toLocaleString()}</strong>?
        </p>

        <p className="mb-4 text-sm text-gray-600">Enter your PIN to confirm deletion:</p>
        {pinError && <p className="text-red-500 mb-4">{pinError}</p>}

        <input
          type="text"
          value={loggedUser?.name ?? ""}
          className="w-full p-3 border rounded mb-4 bg-gray-100"
          disabled
        />

        <input
          type="password"
          placeholder="Enter PIN"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          className="w-full p-3 border rounded mb-4"
          disabled={isProcessing}
        />

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded"
            disabled={isProcessing}
          >
            Cancel
          </button>
          <button
            onClick={handlePinConfirm}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
            disabled={isProcessing || !loggedUser || pin.length === 0}
          >
            {isProcessing ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}
