"use client";

import { useRouter } from "next/navigation";
import { use, useEffect, useMemo, useState } from "react";
import {
  collection,
  onSnapshot,
  query,
  where,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/app/lib/firebase";
import SearchBar from "@/app/Components/SearchBar";

type Disbursement = {
  id: string;
  Status: string;
  Amount: number;
  DateToday: Timestamp;
  Deadline: Timestamp;
};

type DailyPayment = {
  id: string;
  Amount: number;
  DateToday: Timestamp;
};

export default function SeeAllDisburseClient({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const { clientId } = use(params);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [disbursements, setDisbursements] = useState<Disbursement[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [dailyMap, setDailyMap] = useState<Record<string, DailyPayment[]>>({});
  const [searchTerm, setSearchTerm] = useState("");

  // 🔥 Fetch disbursements
  useEffect(() => {
    if (!clientId) return;

    const q = query(
      collection(db, "Disbursement"),
      where("clientId", "==", clientId),
    );

    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Disbursement, "id">),
      }));

      setDisbursements(data);
      setLoading(false);
    });

    return () => unsub();
  }, [clientId]);

  // 🔥 Fetch daily payments on expand
  useEffect(() => {
    if (!expandedId || dailyMap[expandedId]) return;

    const q = query(
      collection(db, "DailyList"),
      where("DisbursementID", "==", expandedId)
    );

    const unsub = onSnapshot(q, (snap) => {
      setDailyMap((prev) => ({
        ...prev,
        [expandedId]: snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<DailyPayment, "id">),
        })),
      }));
    });

    return () => unsub();
  }, [expandedId, dailyMap]);

  const formatDate = (t?: Timestamp) =>
    t
      ? t.toDate().toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      : "";

  // 🔍 SEARCH FILTER (ANYTHING)
  const filteredDisbursements = useMemo(() => {
    if (!searchTerm.trim()) return disbursements;

    const keyword = searchTerm.toLowerCase();

    return disbursements.filter((d) => {
      const dateStr = formatDate(d.DateToday).toLowerCase();
      const dueStr = formatDate(d.Deadline).toLowerCase();
      const amountStr = d.Amount.toString();
      const statusStr = d.Status.toLowerCase();

      return (
        dateStr.includes(keyword) ||
        dueStr.includes(keyword) ||
        amountStr.includes(keyword) ||
        statusStr.includes(keyword)
      );
    });
  }, [searchTerm, disbursements]);

  return (
    <div className="min-h-screen bg-linear-to-br from-indigo-50 to-purple-100 p-6">
      <button
        onClick={() =>
          router.push(`/Dashboard/Transaction/${clientId}`)
        }
        className="text-sm text-indigo-600 hover:underline mb-6 cursor-pointer"
      >
        ← Back to Client
      </button>

      <h1 className="text-2xl font-bold text-black mb-6">
        All Disbursements of Client
      </h1>

      <div className="bg-white px-6 pt-5 pb-10 rounded-2xl border shadow">
        <div className="my-3 w-full md:w-1/2">
          <SearchBar
            value={searchTerm}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setSearchTerm(e.target.value)
            }
            placeholder="Search date, amount, status..."
          />
        </div>

        {loading ? (
        <p className="text-gray-500 mt-6">Loading disbursements...</p>
        ) : disbursements.length === 0 ? (
        <p className="text-gray-500 mt-6">No yet data for the client.</p>
        ) : filteredDisbursements.length === 0 ? (
        <p className="text-gray-500 mt-6">No matching disbursement found.</p>
        ) : (
        <div className="grid grid-cols-1 gap-4 text-black mt-5">
            {filteredDisbursements.map((d) => {
            const isOpen = expandedId === d.id;
            const dailyPayments = dailyMap[d.id] || [];

            return (
                <div
                key={d.id}
                className="rounded-2xl border overflow-hidden bg-white"
                >
                {/* HEADER */}
                <div
                    onClick={() =>
                    setExpandedId(isOpen ? null : d.id)
                    }
                    className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 cursor-pointer hover:bg-gray-50 transition"
                >
                    <h1 className="font-semibold">
                    Status:{" "}
                    <span className="text-indigo-600">{d.Status}</span>
                    </h1>
                    <h1>Date: {formatDate(d.DateToday)}</h1>
                    <h1>Due: {formatDate(d.Deadline)}</h1>
                    <h1 className="font-bold">₱{d.Amount.toLocaleString()}</h1>
                </div>

                {/* COLLAPSE */}
                {isOpen && (
                    <div className="bg-gray-50 border-t p-4">
                    <h2 className="font-semibold mb-3">Daily Payments</h2>

                    {dailyPayments.length === 0 ? (
                        <p className="text-sm text-gray-500">
                        No payments yet for this disbursement.
                        </p>
                    ) : (
                        <div className="space-y-2">
                        {dailyPayments.map((p) => (
                            <div
                            key={p.id}
                            className="flex justify-between bg-white border rounded-lg p-3"
                            >
                            <span>{formatDate(p.DateToday)}</span>
                            <span className="font-semibold">
                                ₱{p.Amount.toLocaleString()}
                            </span>
                            </div>
                        ))}
                        </div>
                    )}
                    </div>
                )}
                </div>
            );
            })}
        </div>
        )}


      </div>
    </div>
  );
}
