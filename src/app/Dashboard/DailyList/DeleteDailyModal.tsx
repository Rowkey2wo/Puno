"use client";

import { useEffect, useState } from "react";
import { doc, getDoc, runTransaction } from "firebase/firestore";
import { db } from "@/app/lib/firebase";

type Props = {
  open: boolean;
  onClose: () => void;
  id: string; // DailyList document ID
};

export default function DeleteDailyModal({ open, onClose, id }: Props) {
  const [showPin, setShowPin] = useState(false);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [loading, setLoading] = useState(false);

  const [loggedUser, setLoggedUser] = useState<{
    id: string;
    name: string;
  } | null>(null);

  /* ----------------------------
     LOAD LOGGED USER
  ---------------------------- */
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = sessionStorage.getItem("loggedUser");
      if (stored) {
        const parsed = JSON.parse(stored);
        setLoggedUser({ id: parsed.id, name: parsed.name });
      }
    }
  }, []);

  if (!open) return null;

  /* ----------------------------
     PIN CONFIRMATION
  ---------------------------- */
  const handlePinConfirm = async () => {
    if (!loggedUser) return;

    try {
      setLoading(true);

      await runTransaction(db, async (tx) => {
        /* 🔐 VERIFY PIN */
        const userRef = doc(db, "Users", loggedUser.id);
        const userSnap = await tx.get(userRef);

        if (!userSnap.exists()) throw new Error("User not found");

        const storedPin = String(userSnap.data().PIN ?? "");
        if (pin !== storedPin) throw new Error("Incorrect PIN");

        /* 📄 GET DAILY PAYMENT */
        const dailyRef = doc(db, "DailyList", id);
        const dailySnap = await tx.get(dailyRef);

        if (!dailySnap.exists()) throw new Error("Payment not found");

        const dailyData = dailySnap.data();
        const amount = dailyData.Amount ?? 0;
        const clientId = dailyData.clientId;

        /* 👤 GET CLIENT */
        const clientRef = doc(db, "Clients", clientId);
        const clientSnap = await tx.get(clientRef);

        if (!clientSnap.exists()) throw new Error("Client not found");

        const clientData = clientSnap.data();
        const currentBalance = clientData.Balance ?? 0;
        const currentStatus = clientData.Status ?? "OnGoing";

        /* 🔁 REVERT BALANCE */
        const updatedBalance = currentBalance + amount;

        /* 🔑 DETERMINE NEW STATUS */
        let updatedStatus: "Paid" | "Recon" | "OnGoing";

        if (updatedBalance <= 0) {
          updatedStatus = "Paid";
        } else if (currentStatus === "Recon") {
          // If client was Recon before, keep Recon
          updatedStatus = "Recon";
        } else {
          updatedStatus = "OnGoing";
        }

        /* ✏️ UPDATE CLIENT */
        tx.update(clientRef, {
          Balance: updatedBalance,
          Status: updatedStatus,
        });

        /* 🗑 DELETE PAYMENT */
        tx.delete(dailyRef);
      });

      onClose();
    } catch (err: any) {
      console.error("Delete failed:", err);
      setPinError(err.message || "Delete failed");
    } finally {
      setLoading(false);
      setPin("");
    }
  };

  /* ----------------------------
     UI
  ---------------------------- */
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-xl p-6 w-96 text-black shadow-xl">
        <h2 className="text-xl font-bold mb-4">Delete Payment</h2>

        {!showPin ? (
          <>
            <p className="mb-6 text-gray-600">
              This will revert the client balance. Continue?
            </p>

            <div className="flex justify-end gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 border rounded"
              >
                Cancel
              </button>

              <button
                onClick={() => {
                  setShowPin(true);
                  setPin("");
                  setPinError("");
                }}
                className="px-4 py-2 bg-red-600 text-white rounded"
              >
                Continue
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="mb-2 font-medium">Confirm with PIN</p>
            {pinError && <p className="text-red-500 mb-2">{pinError}</p>}

            <input
              type="text"
              value={loggedUser?.name ?? ""}
              disabled
              className="w-full p-3 border rounded mb-3 bg-gray-100"
            />

            <input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="Enter PIN"
              className="w-full p-3 border rounded mb-4"
            />

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowPin(false)}
                className="px-4 py-2 border rounded"
              >
                Back
              </button>

              <button
                onClick={handlePinConfirm}
                disabled={!pin || loading}
                className="px-4 py-2 bg-red-600 text-white rounded disabled:opacity-50"
              >
                {loading ? "Deleting..." : "Confirm Delete"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
