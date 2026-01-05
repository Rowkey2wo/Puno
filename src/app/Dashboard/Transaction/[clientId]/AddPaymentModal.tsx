"use client";

import { useState, useEffect, useCallback } from "react";
import { db } from "@/app/lib/firebase";
import {
  doc,
  getDoc,
  collection,
  Timestamp,
  runTransaction,
} from "firebase/firestore";

interface ClientBalanceInfo {
  balance: number;
  status: string;
  loanType: "OnGoing" | "Recon";
}

export default function AddPaymentModal({
  clientId,
  open,
  onClose,
  currentDisbursementId,
}: {
  clientId: string;
  open: boolean;
  onClose: () => void;
  currentDisbursementId: string | null;
}) {
  const [paymentAmount, setPaymentAmount] = useState("");
  const [clientInfo, setClientInfo] = useState<ClientBalanceInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const [showPinModal, setShowPinModal] = useState(false);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [loggedUser, setLoggedUser] = useState<{ id: string; name: string } | null>(null);

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // 🔴 Penalty states
  const [showPenalty, setShowPenalty] = useState(false);
  const [penalty, setPenalty] = useState<number | "">("");

  /* ---------------------------------------------
     FETCH CLIENT INFO
  --------------------------------------------- */
  const fetchClient = useCallback(async () => {
    if (!open || !clientId) return;

    setIsLoading(true);
    try {
      const clientRef = doc(db, "Clients", clientId);
      const clientSnap = await getDoc(clientRef);

      if (!clientSnap.exists()) {
        setError("Client not found.");
        return;
      }

      const clientData = clientSnap.data();
      setClientInfo({
        balance: clientData.Balance ?? 0,
        status: clientData.Status ?? "OnGoing",
        loanType: clientData.LoanType ?? "OnGoing",
      });
    } catch (err) {
      console.error(err);
      setError("Failed to load client.");
    } finally {
      setIsLoading(false);
    }
  }, [open, clientId]);

  /* ---------------------------------------------
     LOAD LOGGED USER
  --------------------------------------------- */
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = sessionStorage.getItem("loggedUser");
      if (stored) {
        const parsed = JSON.parse(stored);
        setLoggedUser({ id: parsed.id, name: parsed.name });
      }
    }
  }, []);

  useEffect(() => {
    if (open) {
      fetchClient();
      setPaymentAmount("");
      setPenalty("");
      setShowPenalty(false);
      setSelectedDate(new Date());
      setPin("");
      setPinError("");
      setError("");
    }
  }, [open, fetchClient]);

  if (!open) return null;

  /* ---------------------------------------------
     SUBMIT HANDLER
  --------------------------------------------- */
  const handleSubmit = () => {
    const amount = Number(paymentAmount);

    if (!amount || amount <= 0) {
      setError("Enter a valid amount.");
      return;
    }
    if (!clientInfo) {
      setError("Client data not loaded.");
      return;
    }
    if (amount > clientInfo.balance) {
      setError("Payment exceeds balance.");
      return;
    }
    if (!currentDisbursementId) {
      setError("No active disbursement.");
      return;
    }

    setShowPinModal(true);
  };

  /* ---------------------------------------------
     PIN CONFIRM
  --------------------------------------------- */
  const handlePinConfirm = async () => {
    if (!loggedUser) return;

    try {
      const ref = doc(db, "Users", loggedUser.id);
      const snap = await getDoc(ref);

      if (!snap.exists()) {
        setPinError("User not found.");
        return;
      }

      if (pin !== String(snap.data().PIN ?? "")) {
        setPinError("Incorrect PIN.");
        return;
      }

      setShowPinModal(false);
      await processPayment();
    } catch (err) {
      console.error(err);
      setPinError("PIN verification failed.");
    }
  };

  /* ---------------------------------------------
     PROCESS PAYMENT
  --------------------------------------------- */
  const processPayment = async () => {
    if (!clientInfo || !loggedUser || !currentDisbursementId) return;

    const amount = Number(paymentAmount);
    const penaltyValue = penalty === "" ? null : Number(penalty);

    setIsLoading(true);

    try {
      await runTransaction(db, async (tx) => {
        const clientRef = doc(db, "Clients", clientId);
        const clientSnap = await tx.get(clientRef);

        if (!clientSnap.exists()) throw new Error("Client missing");

        const clientData = clientSnap.data();
        const newBalance = (clientData.Balance ?? 0) - amount;

        tx.update(clientRef, {
          Balance: newBalance,
          Status: newBalance <= 0 ? "Paid" : clientData.Status,
        });

        // Add payment
        tx.set(doc(collection(db, "DailyList")), {
          clientId,
          Amount: amount,
          DateToday: Timestamp.fromDate(selectedDate),
          DisbursementID: currentDisbursementId,
          UserID: loggedUser.id,
        });

        // Update Disbursement (Penalty only if used)
        const disRef = doc(db, "Disbursement", currentDisbursementId);
        tx.update(disRef, {
          ...(penaltyValue !== null && { Penalty: penaltyValue }),
          Status: newBalance <= 0 ? "Paid" : "Active",
        });
      });

      onClose();
    } catch (err) {
      console.error(err);
      setError("Payment failed.");
    } finally {
      setIsLoading(false);
      setPin("");
    }
  };

  /* ---------------------------------------------
     UI
  --------------------------------------------- */
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 px-4">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-lg">
        <h2 className="text-2xl font-bold mb-4">Add Payment</h2>

        {error && <p className="text-red-500 mb-4">{error}</p>}

        {clientInfo && (
          <div className="mb-4 p-3 bg-gray-100 rounded">
            <p>Balance: <strong>₱{clientInfo.balance.toLocaleString()}</strong></p>
            <p>Status: <strong className="capitalize">{clientInfo.status}</strong></p>
          </div>
        )}

        {!showPinModal ? (
          <>
            <input
              type="date"
              value={selectedDate.toISOString().split("T")[0]}
              onChange={(e) => setSelectedDate(new Date(e.target.value))}
              className="w-full p-3 border rounded mb-4"
            />

            <input
              type="number"
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
              placeholder="Enter amount"
              className="w-full p-3 border rounded mb-2"
            />

            <span
              onClick={() => {
                setShowPenalty(!showPenalty);
                if (!showPenalty) setPenalty(0);
              }}
              className="text-sm text-red-600 ms-2 border-b tracking-widest cursor-pointer"
            >
              Penalty?
            </span>

            {showPenalty && (
              <input
                type="number"
                value={penalty}
                onChange={(e) => setPenalty(e.target.value === "" ? "" : Number(e.target.value))}
                placeholder="Enter penalty amount"
                className="w-full p-3 border rounded mt-2"
              />
            )}

            <div className="flex justify-end gap-3 mt-4">
              <button onClick={onClose} className="px-4 py-2 border rounded">
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className={`px-4 py-2 rounded text-white ${
                  !paymentAmount ||
                  Number(paymentAmount) <= 0 ||
                  Number(paymentAmount) > (clientInfo?.balance ?? 0)
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-700"
                }`}
                disabled={isLoading}
              >
                Submit Payment
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="mb-2">Confirm with PIN</p>
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

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowPinModal(false)}
                className="px-4 py-2 border rounded"
              >
                Back
              </button>
              <button
                onClick={handlePinConfirm}
                className="px-4 py-2 bg-green-600 text-white rounded"
                disabled={!pin}
              >
                Confirm
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
