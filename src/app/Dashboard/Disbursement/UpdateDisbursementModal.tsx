"use client";

import { useState, useEffect, useCallback } from "react";
import { doc, updateDoc, Timestamp, getDoc } from "firebase/firestore";
import { db } from "@/app/lib/firebase";
import type { DisbursementRow } from "./page";

const calculateFutureDateISO = (dateString: string, months: number) => {
  if (!dateString || months <= 0) return "";

  const [year, month, day] = dateString.split("-").map(Number);
  const baseDate = new Date(year, month - 1, day);

  const targetMonth = baseDate.getMonth() + months;
  const targetYear = baseDate.getFullYear() + Math.floor(targetMonth / 12);
  const finalMonth = targetMonth % 12;

  const lastDayOfTargetMonth = new Date(targetYear, finalMonth + 1, 0).getDate();
  const finalDay = Math.min(day, lastDayOfTargetMonth);

  const finalDate = new Date(targetYear, finalMonth, finalDay);
  const yyyy = finalDate.getFullYear();
  const mm = String(finalDate.getMonth() + 1).padStart(2, "0");
  const dd = String(finalDate.getDate()).padStart(2, "0");

  return `${yyyy}-${mm}-${dd}`;
};

type UpdateDisbursementModalProps = {
  open: boolean;
  onClose: () => void;
  row: DisbursementRow | null;
};

export default function UpdateDisbursementModal({
  open,
  onClose,
  row,
}: UpdateDisbursementModalProps) {
  const getTodayISO = () => {
    const today = new Date();
    return new Date(today.getTime() - today.getTimezoneOffset() * 60000)
      .toISOString()
      .split("T")[0];
  };

  const [form, setForm] = useState({
    Amount: "",
    Interest: "",
    MonthsToPay: "",
    DateToday: getTodayISO(),
    Deadline: "",
    Remarks: "",
  });

  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // PIN verification state
  const [showPinModal, setShowPinModal] = useState(false);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [loggedUser, setLoggedUser] = useState<{ id: string; name: string } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (row) {
      setForm({
        Amount: row.amount.toString(),
        Interest: row.interest.toString(),
        MonthsToPay: row.monthsToPay.toString(),
        DateToday: row.date.toISOString().split("T")[0],
        Deadline: row.deadline.toISOString().split("T")[0],
        Remarks: row.status,
      });
      setError("");
    }
  }, [row]);

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

  const calculateDeadline = useCallback((months: string, dateToday: string) => {
    const mons = Number(months);
    if (mons > 0 && dateToday) {
      const deadline = calculateFutureDateISO(dateToday, mons);
      setForm((prev) => ({ ...prev, Deadline: deadline }));
    }
  }, []);

  const handleSubmit = () => {
    const amt = Number(form.Amount);
    const intr = Number(form.Interest);
    const mons = Number(form.MonthsToPay);
    const dt = new Date(form.DateToday);
    const dd = new Date(form.Deadline);

    if (!amt || amt < 0) {
      setError("Enter a valid amount.");
      return;
    }
    if (isNaN(intr) || intr < 0) {
      setError("Enter a valid interest.");
      return;
    }
    if (!mons || mons <= 0) {
      setError("Enter valid months to pay.");
      return;
    }
    if (isNaN(dt.getTime()) || isNaN(dd.getTime())) {
      setError("Enter valid dates.");
      return;
    }
    if (!loggedUser) {
      setError("No logged-in user found.");
      return;
    }

    setError("");
    setShowPinModal(true);
  };

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

      setPinError("");
      await processUpdate();
    } catch (err) {
      console.error(err);
      setPinError("Failed to verify PIN.");
      setIsProcessing(false);
    }
  };

  const processUpdate = async () => {
    if (!row) return;

    setIsProcessing(true);
    try {
      const amt = Number(form.Amount);
      const intr = Number(form.Interest);
      const mons = Number(form.MonthsToPay);
      const dt = new Date(form.DateToday);
      const dd = new Date(form.Deadline);

      const disRef = doc(db, "Disbursement", row.id);
      await updateDoc(disRef, {
        Amount: amt,
        Interest: intr,
        MonthsToPay: mons,
        DateToday: Timestamp.fromDate(dt),
        Deadline: Timestamp.fromDate(dd),
        Remarks: form.Remarks, // Status read-only
      });

      onClose();
    } catch (err) {
      console.error(err);
      setError("Failed to update disbursement.");
    } finally {
      setIsProcessing(false);
      setPin("");
      setShowPinModal(false);
    }
  };

  if (!open || !row) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 px-4">
      <div className="bg-white w-full max-w-xl rounded-2xl shadow-xl p-6 text-black max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6 bg-indigo-200 p-4 rounded">
          <h3 className="text-xl font-semibold">Update Disbursement</h3>
          <button onClick={onClose} className="text-xl font-bold">✕</button>
        </div>

        {!showPinModal ? (
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
                  onChange={(e) => setForm({ ...form, Interest: e.target.value })}
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
                  <option value="4">4 Months</option>
                  <option value="5">5 Months</option>
                  <option value="6">6 Months</option>
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

              <div className="md:col-span-2">
                <label className="text-sm font-medium">Status / Remarks</label>
                <input
                  type="text"
                  className="w-full border rounded p-2 bg-gray-100 cursor-not-allowed"
                  value={form.Remarks}
                  disabled
                />
              </div>
            </div>

            {error && <p className="text-red-600 text-sm mt-4">{error}</p>}

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={onClose}
                className="px-4 py-2 border rounded"
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className={`px-5 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50`}
                disabled={isLoading}
              >
                {isLoading ? "Processing..." : "Update"}
              </button>
            </div>
          </>
        ) : (
          <div>
            <p className="mb-4">Confirm update using your PIN:</p>
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
                disabled={isProcessing || !loggedUser || pin.length === 0}
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
