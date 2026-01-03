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
  const [dateRange, setDateRange] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [latestDisbursementStatus, setLatestDisbursementStatus] =
    useState<string | null>(null);

  // 🔒 Prevent multiple overdue updates
  const overdueUpdatedRef = useRef(false);

  const formatDate = (date: Date) =>
    date.toLocaleDateString("en-US", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  // ================= SNAPSHOTS =================
  useEffect(() => {
    if (!clientId) return;

    const disburseQuery = query(
      collection(db, "Disbursement"),
      where("clientId", "==", clientId)
    );

    const unsubscribeDisbursement = onSnapshot(disburseQuery, (snap) => {
      const list = snap.docs.map(
        (d) => ({ id: d.id, ...d.data() } as DisbursementItem)
      );
      setDisbursements(list);
    });

    const dailyQuery = query(
      collection(db, "DailyList"),
      where("clientId", "==", clientId)
    );

    const unsubscribeDaily = onSnapshot(dailyQuery, (snap) => {
      const list = snap.docs.map(
        (d) => ({ id: d.id, ...d.data() } as DailyListItem)
      );
      setDailyData(list);
    });

    return () => {
      unsubscribeDisbursement();
      unsubscribeDaily();
    };
  }, [clientId]);

  // ================= CURRENT TRANSACTION LOGIC =================
  const latestDisbursementId = useMemo(() => {
    if (disbursements.length === 0) {
      setDateRange("No disbursements found.");
      setLatestDisbursementStatus(null);
      return null;
    }

    const latest = [...disbursements].sort(
      (a, b) =>
        b.DateToday.toDate().getTime() -
        a.DateToday.toDate().getTime()
    )[0];

    const start = latest.DateToday?.toDate();
    const end = latest.Deadline?.toDate();
    const now = new Date();

    if (start && end) {
      setDateRange(`${formatDate(start)} - ${formatDate(end)}`);

      // 🔥 OVERDUE CHECK (SAFE)
      if (
        now > end &&
        latest.Status !== "Paid" &&
        !overdueUpdatedRef.current
      ) {
        overdueUpdatedRef.current = true;

        updateDoc(doc(db, "Clients", clientId), {
          Status: "Overdue",
        }).catch(console.error);
      }
    }

    setLatestDisbursementStatus(latest.Status);
    return latest.id;
  }, [disbursements, clientId]);

  // ================= FILTER DAILY PAYMENTS =================
  const filteredAndSortedDailyData = useMemo(() => {
    if (!latestDisbursementId) return [];

    return dailyData
      .filter((d) => d.DisbursementID === latestDisbursementId)
      .sort(
        (a, b) =>
          b.DateToday.toDate().getTime() -
          a.DateToday.toDate().getTime()
      );
  }, [dailyData, latestDisbursementId]);

  // ================= UI =================
  let tableContent;
  const currentStatus = latestDisbursementStatus;

  if (currentStatus === "Paid") {
    tableContent = (
      <div className="py-10 text-center text-green-600 font-semibold bg-green-50 rounded-lg">
        ✅ The latest transaction is Paid.
      </div>
    );
  } else if (currentStatus === "Overdue") {
    tableContent = (
      <p className="text-center py-4 text-red-500 font-semibold">
        ⚠️ This transaction is Overdue.
      </p>
    );
  } else if (filteredAndSortedDailyData.length === 0) {
    tableContent = (
      <p className="text-center py-4 text-gray-500">
        No payment for the current transaction.
      </p>
    );
  } else {
    tableContent = (
      <div className="overflow-x-auto -mx-2 sm:mx-0">
        <div className="inline-block min-w-full align-middle">
          <table className="min-w-full divide-y">
            <thead>
              <tr>
                <th className="text-left px-2 sm:px-3 py-2 text-xs sm:text-sm whitespace-nowrap">Date</th>
                <th className="text-left px-2 sm:px-3 py-2 text-xs sm:text-sm whitespace-nowrap">Amount</th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSortedDailyData.map((d) => (
                <tr key={d.id} className="border-t">
                  <td className="px-2 sm:px-3 py-2 text-sm sm:text-base whitespace-nowrap">
                    {formatDate(d.DateToday.toDate())}
                  </td>
                  <td className="px-2 sm:px-3 py-2 font-bold text-sm sm:text-base whitespace-nowrap">
                    ₱{d.Amount.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow-lg rounded-xl p-4 sm:p-6 text-black w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-5">
        <div className="flex-1 min-w-0">
          <h2 className="text-lg sm:text-xl font-semibold">Daily Payment</h2>
          {dateRange && (
            <p className="text-xs sm:text-sm text-gray-500 mt-1 truncate">{dateRange}</p>
          )}
        </div>

        <div className="flex-shrink-0">
          <button
            onClick={() => setIsModalOpen(true)}
            disabled={currentStatus === "Paid"}
            className="w-full sm:w-auto bg-red-500 text-xs sm:text-sm text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
          >
            {currentStatus === "Paid"
              ? "Transaction Paid"
              : "Add Payment"}
          </button>
        </div>
      </div>

      {tableContent}

      <AddPaymentModal
        clientId={clientId}
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        currentDisbursementId={latestDisbursementId ?? ""}
      />
    </div>
  );
}