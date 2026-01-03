// components/DisbursementModal.tsx

"use client";

import {
  collection,
  Timestamp,
  doc,
  runTransaction,
  getDoc,
  onSnapshot,
} from "firebase/firestore";
import { db } from "@/app/lib/firebase";
import { useEffect, useState, useCallback } from "react";

/**
 * Safely adds N months to a local YYYY-MM-DD date
 * Handles month overflow (Jan 31 → Feb 28/29)
 */
const calculateFutureDateISO = (dateString: string, months: number) => {
  if (!dateString || months <= 0) return "";

  const [year, month, day] = dateString.split("-").map(Number);
  const baseDate = new Date(year, month - 1, day);

  const targetMonth = baseDate.getMonth() + months;
  const targetYear = baseDate.getFullYear() + Math.floor(targetMonth / 12);
  const finalMonth = targetMonth % 12;

  const lastDayOfTargetMonth = new Date(
    targetYear,
    finalMonth + 1,
    0
  ).getDate();

  const finalDay = Math.min(day, lastDayOfTargetMonth);
  const finalDate = new Date(targetYear, finalMonth, finalDay);

  const yyyy = finalDate.getFullYear();
  const mm = String(finalDate.getMonth() + 1).padStart(2, "0");
  const dd = String(finalDate.getDate()).padStart(2, "0");

  return `${yyyy}-${mm}-${dd}`;
};

export default function DisbursementModal({
  clientId,
  open,
  onClose,
}: {
  clientId: string;
  open: boolean;
  onClose: () => void;
}) {

  const getTodayISO = () => {
    const today = new Date();
    return new Date(
      today.getTime() - today.getTimezoneOffset() * 60000
    )
      .toISOString()
      .split("T")[0];
  };

  const [form, setForm] = useState({
    Amount: "",
    Interest: "",
    MonthsToPay: "",
    DateToday: getTodayISO(),
    Deadline: "",
    Remarks: "Release",
  });

  const [error, setError] = useState("");
  const [clientBalance, setClientBalance] = useState<number | null>(null);
  const [isLoadingClient, setIsLoadingClient] = useState(false);

  // PIN Modal states
  const [showPinModal, setShowPinModal] = useState(false);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [users, setUsers] = useState<{ id: string; name: string }[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);

  const calculateDeadline = useCallback(
    (monthsToPay: string, dateToday: string) => {
      const months = Number(monthsToPay);
      if (months > 0 && dateToday) {
        const deadline = calculateFutureDateISO(dateToday, months);
        setForm((prev) => ({ ...prev, Deadline: deadline }));
      } else {
        setForm((prev) => ({ ...prev, Deadline: "" }));
      }
    },
    []
  );

  // Fetch client balance
  const fetchClientBalance = useCallback(async () => {
    if (!open || !clientId) return;
    setIsLoadingClient(true);
    try {
      const clientRef = doc(db, "Clients", clientId);
      const clientSnap = await getDoc(clientRef);
      if (clientSnap.exists()) {
        const data = clientSnap.data();
        setClientBalance(data.Balance ?? 0);
      } else {
        setError("Client not found.");
      }
    } catch (err) {
      console.error("Error fetching client balance:", err);
      setError("Failed to fetch client data.");
    } finally {
      setIsLoadingClient(false);
    }
  }, [open, clientId]);

  // Listen to Users collection
  const listenUsers = useCallback(() => {
    const unsubscribe = onSnapshot(
      collection(db, "Users"),
      (snapshot) => {
        const usersList: { id: string; name: string }[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          usersList.push({ id: doc.id, name: data.name });
        });
        setUsers(usersList);
        if (usersList.length > 0) setSelectedUserId(usersList[0].id);
      },
      (err) => {
        console.error("Failed to listen users:", err);
        setPinError("Failed to fetch users.");
      }
    );
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (open) {
      setForm({
        Amount: "",
        Interest: "",
        MonthsToPay: "",
        DateToday: getTodayISO(),
        Deadline: "",
        Remarks: "Release",
      });
      setError("");
      setShowPinModal(false);
      setPin("");
      setPinError("");
      
      fetchClientBalance();
      const unsubscribeUsers = listenUsers();
      
      return () => unsubscribeUsers();
    }
  }, [open, fetchClientBalance, listenUsers]);

  if (!open) return null;

  // Step 1: Validate and show PIN modal
  const handleSaveClick = () => {
    if (
      !form.Amount ||
      !form.Interest ||
      !form.MonthsToPay ||
      !form.DateToday ||
      !form.Deadline
    ) {
      setError("All fields are required.");
      return;
    }

    // Check if client balance is 0
    if (clientBalance === null) {
      setError("Client balance not loaded. Please try again.");
      return;
    }

    if (clientBalance !== 0) {
      setError("Cannot create new disbursement. Client balance must be 0.");
      return;
    }

    setError("");
    setShowPinModal(true);
  };

  // Step 2: Confirm PIN
  const handlePinConfirm = async () => {
    if (!selectedUserId) {
      setPinError("Please select a user.");
      return;
    }

    try {
      const userRef = doc(db, "Users", selectedUserId);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        setPinError("User not found.");
        return;
      }

      const userData = userSnap.data();
      console.log("Selected User ID:", selectedUserId);
      console.log("User Data:", userData);
      console.log("Stored PIN:", userData.PIN);
      console.log("Entered PIN:", pin);

      // Handle both string and number PINs
      const storedPin = String(userData.PIN ?? userData.pin ?? "");
      const enteredPin = String(pin);

      if (enteredPin !== storedPin) {
        setPinError("Incorrect PIN. Please try again.");
        return;
      }

      setPinError("");
      setShowPinModal(false);
      await processDisbursement();
    } catch (err) {
      console.error("PIN verification error:", err);
      setPinError("Failed to verify PIN.");
    }
  };

  // Step 3: Process disbursement
  const processDisbursement = async () => {
    setIsProcessing(true);

    const amount = Number(form.Amount);

    /**
     * ✅ Merge USER SELECTED DATE + CURRENT TIME
     */
    const [year, month, day] = form.DateToday.split("-").map(Number);
    const now = new Date();

    const dateWithCurrentTime = new Date(
      year,
      month - 1,
      day,
      now.getHours(),
      now.getMinutes(),
      now.getSeconds(),
      now.getMilliseconds()
    );

    try {
      await runTransaction(db, async (transaction) => {
        const clientRef = doc(db, "Clients", clientId);
        const clientSnap = await transaction.get(clientRef);

        if (!clientSnap.exists()) {
          throw new Error("Client does not exist");
        }

        const currentBalance = clientSnap.data().Balance ?? 0;

        // Double-check balance is 0 before proceeding
        if (currentBalance !== 0) {
          throw new Error("Client balance must be 0 to create new disbursement.");
        }

        // 🔹 1. INSERT DISBURSEMENT
        const disbursementRef = doc(collection(db, "Disbursement"));

        transaction.set(disbursementRef, {
          clientId,
          Amount: amount,
          Interest: Number(form.Interest),
          MonthsToPay: Number(form.MonthsToPay),
          Remarks: form.Remarks,
          Status: "", // unpaid
          DateToday: Timestamp.fromDate(dateWithCurrentTime),
          Deadline: Timestamp.fromDate(
            new Date(form.Deadline + "T23:59:59")
          ),
        });

        // 🔹 2. UPDATE CLIENT BALANCE & STATUS
        transaction.update(clientRef, {
          Balance: amount,
          Status: "OnGoing",
        });
      });

      onClose();
    } catch (err) {
      console.error("Transaction failed:", err);
      setError(
        err instanceof Error ? err.message : "Failed to save disbursement."
      );
    } finally {
      setIsProcessing(false);
      setPin("");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 px-4">
      <div className="bg-white w-full max-w-xl rounded-2xl shadow-xl p-6 text-black max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6 bg-blue-200 p-4 rounded">
          <h3 className="text-xl font-semibold">New Disbursement</h3>
          <button onClick={onClose}>✕</button>
        </div>

        {/* Show client balance info */}
        {isLoadingClient ? (
          <p className="text-sm text-gray-600 mb-4">Loading client data...</p>
        ) : clientBalance !== null ? (
          <div className="mb-4 p-3 bg-gray-100 rounded">
            <p className="text-sm">
              Current Client Balance:{" "}
              <strong
                className={clientBalance === 0 ? "text-green-600" : "text-red-600"}
              >
                ${clientBalance.toFixed(2)}
              </strong>
            </p>
            {clientBalance !== 0 && (
              <p className="text-xs text-red-600 mt-1">
                ⚠️ Balance must be 0 to create a new disbursement
              </p>
            )}
          </div>
        ) : null}

        {!showPinModal ? (
          // Main Form
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Amount</label>
                <input
                  type="number"
                  className="w-full border rounded p-2"
                  value={form.Amount}
                  onChange={(e) => setForm({ ...form, Amount: e.target.value })}
                />
              </div>

              <div>
                <label className="text-sm font-medium">Interest</label>
                <input
                  type="number"
                  className="w-full border rounded p-2"
                  value={form.Interest}
                  onChange={(e) =>
                    setForm({ ...form, Interest: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="text-sm font-medium">Date Today</label>
                <input
                  type="date"
                  className="w-full border rounded p-2"
                  value={form.DateToday}
                  onChange={(e) => {
                    const value = e.target.value;
                    setForm({ ...form, DateToday: value });
                    calculateDeadline(form.MonthsToPay, value);
                  }}
                />
              </div>

              <div>
                <label className="text-sm font-medium">Months To Pay</label>
                <select
                  className="w-full border rounded p-2"
                  value={form.MonthsToPay}
                  onChange={(e) => {
                    const value = e.target.value;
                    setForm({ ...form, MonthsToPay: value });
                    calculateDeadline(value, form.DateToday);
                  }}
                >
                  <option value="">Select months</option>
                  <option value="1">1 Month</option>
                  <option value="2">2 Months</option>
                  <option value="3">3 Months</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium">Deadline</label>
                <input
                  type="date"
                  className="w-full border rounded p-2 bg-gray-100"
                  value={form.Deadline}
                  readOnly
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="text-sm font-medium">Remarks</label>
              <select
                className="w-full border rounded p-2"
                value={form.Remarks}
                onChange={(e) => setForm({ ...form, Remarks: e.target.value })}
              >
                <option value="Release">Release</option>
              </select>
            </div>

            {error && <p className="text-red-600 text-sm mt-4">{error}</p>}

            <div className="flex justify-end gap-3 mt-6">
              <button onClick={onClose} className="px-4 py-2 border rounded">
                Cancel
              </button>
              <button
                onClick={handleSaveClick}
                className="px-5 py-2 bg-indigo-600 text-white rounded disabled:opacity-50"
                disabled={isLoadingClient || clientBalance !== 0}
              >
                Save Disbursement
              </button>
            </div>
          </>
        ) : (
          // PIN Confirmation View
          <div>
            <p className="mb-4">Confirm disbursement using PIN for user:</p>
            {pinError && <p className="text-red-500 mb-4">{pinError}</p>}

            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded mb-4"
            >
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </select>

            <input
              type="password"
              placeholder="Enter PIN"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded mb-4"
              disabled={isProcessing}
            />

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowPinModal(false)}
                className="px-4 py-2 border rounded"
              >
                Back
              </button>
              <button
                onClick={handlePinConfirm}
                className="px-4 py-2 bg-green-600 text-white rounded disabled:opacity-50"
                disabled={isProcessing || !selectedUserId || pin.length === 0}
              >
                Confirm
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}