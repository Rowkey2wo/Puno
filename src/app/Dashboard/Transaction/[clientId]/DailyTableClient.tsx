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

  // 🔒 Prevent infinite updates
  const statusUpdateLock = useRef(false);

  const formatDate = (date: Date) =>
    date.toLocaleDateString("en-US", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  // ================= CLIENT =================
  useEffect(() => {
    if (!clientId) return;

    const unsub = onSnapshot(doc(db, "Clients", clientId), (snap) => {
      if (snap.exists()) {
        setClientBalance(snap.data().Balance ?? 0);
      }
    });

    return () => unsub();
  }, [clientId]);

  // ================= SNAPSHOTS =================
  useEffect(() => {
    if (!clientId) return;

    const unsubDisbursement = onSnapshot(
      query(collection(db, "Disbursement"), where("clientId", "==", clientId)),
      (snap) =>
        setDisbursements(
          snap.docs.map((d) => ({ id: d.id, ...d.data() } as DisbursementItem))
        )
    );

    const unsubDaily = onSnapshot(
      query(collection(db, "DailyList"), where("clientId", "==", clientId)),
      (snap) =>
        setDailyData(
          snap.docs.map((d) => ({ id: d.id, ...d.data() } as DailyListItem))
        )
    );

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
  }, [latestDisbursement?.id]);

  // ================= AUTO STATUS SYNC =================
  useEffect(() => {
    if (!latestDisbursement || clientBalance === null) return;
    if (statusUpdateLock.current) return;

    const now = new Date();
    const deadline = latestDisbursement.Deadline.toDate();
    deadline.setHours(23, 59, 59, 999); // end of day

    let nextStatus: string;

    if (clientBalance <= 0) {
      nextStatus = "Paid";
    } else if (now > deadline) {
      nextStatus = "Overdue"; // ✅ overrides Recon
    } else {
      nextStatus = "OnGoing";
    }

    if (latestDisbursement.Status !== nextStatus) {
      statusUpdateLock.current = true;

      Promise.all([
        updateDoc(doc(db, "Disbursement", latestDisbursement.id), {
          Status: nextStatus,
        }),
        updateDoc(doc(db, "Clients", clientId), {
          Status: nextStatus,
        }),
      ])
        .catch(console.error)
        .finally(() => {
          setTimeout(() => {
            statusUpdateLock.current = false;
          }, 300);
        });
    }
  }, [
    clientBalance,
    latestDisbursement?.id,
    latestDisbursement?.Status,
    latestDisbursement?.Deadline,
    clientId,
  ]);

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
  }, [dailyData, latestDisbursement?.id]);

  const isFullyPaid = clientBalance !== null && clientBalance <= 0;
  const currentStatus = isFullyPaid ? "Paid" : latestDisbursement?.Status;

  // ================= UI =================
  return (
    <div className="bg-white shadow-lg rounded-xl p-4 text-black w-full">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-lg font-semibold">Daily Payment</h2>
          {dateRange && <p className="text-sm text-gray-500">{dateRange}</p>}
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          disabled={isFullyPaid}
          className="bg-red-500 text-white px-4 py-2 rounded disabled:opacity-50"
        >
          {isFullyPaid ? "Transaction Paid" : "Add Payment"}
        </button>
      </div>

      {currentStatus === "Overdue" && (
        <p className="text-center py-4 text-red-500 font-semibold">
          ⚠️ This transaction is Overdue.
        </p>
      )}

      <AddPaymentModal
        clientId={clientId}
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        currentDisbursementId={latestDisbursement?.id ?? ""}
      />
    </div>
  );
}
