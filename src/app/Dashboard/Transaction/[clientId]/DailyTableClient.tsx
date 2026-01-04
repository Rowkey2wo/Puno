"use client";

import {
  collection,
  query,
  where,
  onSnapshot,
  Timestamp,
  DocumentData,
  doc,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/app/lib/firebase";
import { useEffect, useState, useMemo, useRef } from "react";
import AddPaymentModal from "./AddPaymentModal";

// ================= TYPES =================
interface DailyListItem extends DocumentData {
  id: string;
  Amount: number;
  DateToday: Timestamp;
  DisbursementID: string;
}

interface DisbursementItem extends DocumentData {
  id: string;
  DateToday: Timestamp;
  Deadline: Timestamp;
  Status: string | null;
}

export default function DailyTableClient({ clientId }: { clientId: string }) {
  const [dailyData, setDailyData] = useState<DailyListItem[]>([]);
  const [disbursements, setDisbursements] = useState<DisbursementItem[]>([]);
  const [clientBalance, setClientBalance] = useState<number | null>(null);
  const [dateRange, setDateRange] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  // 🔒 Prevent repeated updates
  const statusUpdateLock = useRef(false);

  const formatDate = (date: Date) =>
    date.toLocaleDateString("en-US", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  // ================= CLIENT BALANCE =================
  useEffect(() => {
    if (!clientId) return;

    const unsubClient = onSnapshot(
      doc(db, "Clients", clientId),
      (snap) => {
        if (snap.exists()) {
          setClientBalance(snap.data().Balance ?? 0);
        }
      }
    );

    return () => unsubClient();
  }, [clientId]);

  // ================= SNAPSHOTS =================
  useEffect(() => {
    if (!clientId) return;

    const disburseQuery = query(
      collection(db, "Disbursement"),
      where("clientId", "==", clientId)
    );

    const unsubDisbursement = onSnapshot(disburseQuery, (snap) => {
      const list = snap.docs.map(
        (d) => ({ id: d.id, ...d.data() } as DisbursementItem)
      );
      setDisbursements(list);
    });

    const dailyQuery = query(
      collection(db, "DailyList"),
      where("clientId", "==", clientId)
    );

    const unsubDaily = onSnapshot(dailyQuery, (snap) => {
      const list = snap.docs.map(
        (d) => ({ id: d.id, ...d.data() } as DailyListItem)
      );
      setDailyData(list);
    });

    return () => {
      unsubDisbursement();
      unsubDaily();
    };
  }, [clientId]);

  // ================= CURRENT DISBURSEMENT =================
  const latestDisbursement = useMemo(() => {
    if (disbursements.length === 0) return null;

    return [...disbursements].sort(
      (a, b) =>
        b.DateToday.toDate().getTime() -
        a.DateToday.toDate().getTime()
    )[0];
  }, [disbursements]);

  // ================= DATE RANGE =================
  useEffect(() => {
    if (!latestDisbursement) return;

    const start = latestDisbursement.DateToday?.toDate();
    const end = latestDisbursement.Deadline?.toDate();

    if (start && end) {
      setDateRange(`${formatDate(start)} - ${formatDate(end)}`);
    }
  }, [latestDisbursement]);

  // ================= AUTO STATUS SYNC =================
  useEffect(() => {
    if (!latestDisbursement || clientBalance === null) return;
    if (statusUpdateLock.current) return;

    const now = new Date();
    const deadline = latestDisbursement.Deadline.toDate();

    let nextStatus: string | null = null;

    if (clientBalance <= 0) {
      nextStatus = "Paid";
    } else if (now > deadline) {
      nextStatus = "Overdue";
    } else {
      nextStatus = "Ongoing";
    }

    if (latestDisbursement.Status !== nextStatus) {
      statusUpdateLock.current = true;

      updateDoc(doc(db, "Disbursement", latestDisbursement.id), {
        Status: nextStatus,
      })
        .catch(console.error)
        .finally(() => {
          setTimeout(() => {
            statusUpdateLock.current = false;
          }, 300);
        });
    }
  }, [clientBalance, latestDisbursement]);

  // ================= FILTER DAILY =================
  const filteredDaily = useMemo(() => {
    if (!latestDisbursement) return [];

    return dailyData
      .filter((d) => d.DisbursementID === latestDisbursement.id)
      .sort(
        (a, b) =>
          b.DateToday.toDate().getTime() -
          a.DateToday.toDate().getTime()
      );
  }, [dailyData, latestDisbursement]);

  const isFullyPaid = clientBalance !== null && clientBalance <= 0;
  const currentStatus = isFullyPaid ? "Paid" : latestDisbursement?.Status;

  // ================= UI =================
  let tableContent;

  if (currentStatus === "Paid" && isFullyPaid) {
    tableContent = (
      <div className="py-10 text-center text-green-600 font-semibold bg-green-50 rounded-lg">
        ✅ The latest transaction is fully Paid.
      </div>
    );
  } else if (currentStatus === "Overdue") {
    tableContent = (
      <p className="text-center py-4 text-red-500 font-semibold">
        ⚠️ This transaction is Overdue.
      </p>
    );
  } else if (filteredDaily.length === 0) {
    tableContent = (
      <p className="text-center py-4 text-gray-500">
        No payment for the current transaction.
      </p>
    );
  } else {
    tableContent = (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y">
          <thead>
            <tr>
              <th className="px-3 py-2 text-left">Date</th>
              <th className="px-3 py-2 text-left">Amount</th>
            </tr>
          </thead>
          <tbody>
            {filteredDaily.map((d) => (
              <tr key={d.id} className="border-t">
                <td className="px-3 py-2">
                  {formatDate(d.DateToday.toDate())}
                </td>
                <td className="px-3 py-2 font-bold">
                  ₱{d.Amount.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="bg-white shadow-lg rounded-xl p-4 text-black w-full">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-lg font-semibold">Daily Payment</h2>
          {dateRange && (
            <p className="text-sm text-gray-500">{dateRange}</p>
          )}
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          disabled={isFullyPaid}
          className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-700 disabled:opacity-50"
        >
          {isFullyPaid ? "Transaction Paid" : "Add Payment"}
        </button>
      </div>

      {tableContent}

      <AddPaymentModal
        clientId={clientId}
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        currentDisbursementId={latestDisbursement?.id ?? ""}
      />
    </div>
  );
}
