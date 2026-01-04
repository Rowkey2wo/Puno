"use client";

import { useEffect, useState } from "react";
import { doc, getDoc, runTransaction } from "firebase/firestore";
import { db } from "@/app/lib/firebase";

type Props = {
  open: boolean;
  onClose: () => void;
  row: {
    id: string;
    clientId: string;
    amount: number; // OLD amount
  };
};

export default function UpdateDailyModal({ open, onClose, row }: Props) {
  // 🔹 keep input as STRING
  const [newAmount, setNewAmount] = useState<string>(String(row.amount));
  const [clientBalance, setClientBalance] = useState<number>(0);
  const [loanType, setLoanType] = useState<"Recon" | "OnGoing">("OnGoing");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [showPin, setShowPin] = useState(false);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState("");

  const [loggedUser, setLoggedUser] = useState<{
    id: string;
    name: string;
  } | null>(null);

  /* --------------------------------
     LOAD LOGGED USER
  -------------------------------- */
  useEffect(() => {
    const stored = sessionStorage.getItem("loggedUser");
    if (stored) {
      const parsed = JSON.parse(stored);
      setLoggedUser({ id: parsed.id, name: parsed.name });
    }
  }, []);

  /* --------------------------------
     LOAD CLIENT BALANCE
  -------------------------------- */
  useEffect(() => {
    if (!open) return;

    const loadClient = async () => {
      const ref = doc(db, "Clients", row.clientId);
      const snap = await getDoc(ref);

      if (snap.exists()) {
        const data = snap.data();
        setClientBalance(data.Balance ?? 0);
        setLoanType(data.LoanType ?? "OnGoing");
      }
    };

    loadClient();
    setNewAmount(String(row.amount));
    setError("");
    setPin("");
    setPinError("");
    setShowPin(false);
  }, [open, row]);

  if (!open) return null;

  /* --------------------------------
     VALIDATION
  -------------------------------- */
  const parsedAmount = Number(newAmount);
  const isEmpty = newAmount.trim() === "";
  const difference = isNaN(parsedAmount) ? 0 : parsedAmount - row.amount;
  const maxAllowed = clientBalance + row.amount;

  const isInvalid =
    isEmpty ||
    isNaN(parsedAmount) ||
    parsedAmount < 0 ||
    parsedAmount > maxAllowed;

  /* --------------------------------
     CONFIRM PIN & UPDATE
  -------------------------------- */
  const handlePinConfirm = async () => {
    if (!loggedUser) return;

    try {
      setLoading(true);
      setPinError("");

      const dailyRef = doc(db, "DailyList", row.id);
      const clientRef = doc(db, "Clients", row.clientId);
      const userRef = doc(db, "Users", loggedUser.id);

      await runTransaction(db, async (tx) => {
        // 🔐 VERIFY PIN
        const userSnap = await tx.get(userRef);
        if (!userSnap.exists()) throw new Error("User not found");

        const storedPin = String(userSnap.data().PIN ?? "");
        if (pin !== storedPin) throw new Error("Incorrect PIN");

        // 📄 GET CLIENT
        const clientSnap = await tx.get(clientRef);
        if (!clientSnap.exists()) throw new Error("Client not found");

        const currentBalance = clientSnap.data().Balance ?? 0;

        const amount = Number(newAmount);
        const diff = amount - row.amount;
        const updatedBalance = currentBalance - diff;

        if (updatedBalance < 0) {
          throw new Error("Amount exceeds client balance");
        }

        // ✏️ UPDATE DAILY PAYMENT
        tx.update(dailyRef, {
          Amount: amount,
        });

        // 🔑 STATUS LOGIC (IMPORTANT)
        let updatedStatus: "Paid" | "Recon" | "OnGoing";
        if (updatedBalance === 0) {
          updatedStatus = "Paid";
        } else {
          updatedStatus = loanType === "Recon" ? "Recon" : "OnGoing";
        }

        // 👤 UPDATE CLIENT
        tx.update(clientRef, {
          Balance: updatedBalance,
          Status: updatedStatus,
        });
      });

      onClose();
    } catch (err: any) {
      console.error(err);
      setPinError(err.message || "Update failed");
    } finally {
      setLoading(false);
      setPin("");
    }
  };

  /* --------------------------------
     UI
  -------------------------------- */
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-xl p-6 w-96 text-black shadow-xl">
        <h2 className="text-xl font-bold mb-3">Update Payment</h2>

        <p className="mb-3 text-sm bg-gray-100 p-2 rounded">
          Balance: <strong>₱{clientBalance.toLocaleString()}</strong>
        </p>

        {!showPin ? (
          <>
            <input
              type="number"
              value={newAmount}
              onChange={(e) => {
                setNewAmount(e.target.value);
                setError("");
              }}
              className="w-full border rounded p-2 mb-1"
            />

            {isEmpty && (
              <p className="text-red-500 text-sm mb-2">
                Amount is required
              </p>
            )}

            {!isEmpty && parsedAmount > maxAllowed && (
              <p className="text-red-500 text-sm mb-2">
                Maximum allowed is ₱{maxAllowed.toLocaleString()}
              </p>
            )}

            <div className="flex justify-end gap-2 mt-3">
              <button
                onClick={onClose}
                className="px-4 py-2 border rounded"
              >
                Cancel
              </button>

              <button
                disabled={isInvalid}
                onClick={() => setShowPin(true)}
                className="px-4 py-2 bg-green-600 text-white rounded disabled:opacity-50"
              >
                Continue
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="mb-2 font-medium">Confirm with PIN</p>

            {pinError && (
              <p className="text-red-500 mb-2">{pinError}</p>
            )}

            <input
              type="text"
              value={loggedUser?.name ?? ""}
              disabled
              className="w-full p-2 border rounded mb-3 bg-gray-100"
            />

            <input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="Enter PIN"
              className="w-full p-2 border rounded mb-4"
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
                className="px-4 py-2 bg-green-600 text-white rounded disabled:opacity-50"
              >
                {loading ? "Updating..." : "Confirm Update"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
