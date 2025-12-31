// components/DisbursementModal.tsx

"use client";

import {
  collection,
  Timestamp,
  doc,
  runTransaction,
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
    }
  }, [open]);

  if (!open) return null;

  const submit = async () => {
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

    const amount = Number(form.Amount);

    /**
     * ✅ Merge USER SELECTED DATE + CURRENT TIME
     * ❌ No hard-coded "T00:00:00"
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
      console.error(err);
      setError("Failed to save disbursement.");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 px-4">
      <div className="bg-white w-full max-w-xl rounded-2xl shadow-xl p-6 text-black max-h-[90vh] overflow-y-auto">

        <div className="flex items-center justify-between mb-6 bg-blue-200 p-4 rounded">
          <h3 className="text-xl font-semibold">New Disbursement</h3>
          <button onClick={onClose}>✕</button>
        </div>

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
          <button onClick={submit} className="px-5 py-2 bg-indigo-600 text-white rounded">
            Save Disbursement
          </button>
        </div>
      </div>
    </div>
  );
}
