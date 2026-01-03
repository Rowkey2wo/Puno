"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, orderBy, query, Timestamp } from "firebase/firestore";
import { db } from "@/app/lib/firebase";
import DisbursementTable from "@/app/Components/DisbursementTable";

export type DisbursementRow = {
  id: string;
  name: string; // Client name
  amount: number;
  interest: number;
  monthsToPay: number;
  status: string; // Remarks
  date: Date;
  deadline: Date;
};

export default function Disbursement() {
  const [data, setData] = useState<DisbursementRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [year, setYear] = useState<number | null>(null);
  const [month, setMonth] = useState<number | null>(null);
  const [day, setDay] = useState<string>("");

  useEffect(() => {
    const fetchDisbursements = async () => {
      try {
        // Fetch clients map first
        const clientsSnap = await onSnapshot(collection(db, "Clients"), (snap) => {
          const clientMap: Record<string, string> = {};
          snap.docs.forEach((doc) => {
            clientMap[doc.id] = doc.data().ClientName;
          });

          // Now listen to disbursements
          const disRef = query(collection(db, "Disbursement"), orderBy("DateToday", "desc"));
          const unsubDis = onSnapshot(disRef, (disSnap) => {
            const rows: DisbursementRow[] = disSnap.docs.map((doc) => {
              const d = doc.data();

              const dateToday =
                d.DateToday instanceof Timestamp ? d.DateToday.toDate() : new Date();
              const deadline =
                d.Deadline instanceof Timestamp ? d.Deadline.toDate() : new Date();

              return {
                id: doc.id,
                name: clientMap[d.clientId] ?? "Unknown Client",
                amount: d.Amount ?? 0,
                interest: d.Interest ?? 0,
                monthsToPay: d.MonthsToPay ?? 0,
                status: d.Remarks ?? "N/A",
                date: dateToday,
                deadline: deadline,
              };
            });

            setData(rows);
            setLoading(false);
          });

          return unsubDis; // cleanup
        });
      } catch (err) {
        console.error("Error fetching disbursement:", err);
        setLoading(false);
      }
    };

    fetchDisbursements();
  }, []);

  const filteredData = useMemo(() => {
    return data.filter((row) => {
      const d = row.date;

      if (year !== null && d.getFullYear() !== year) return false;
      if (month !== null && d.getMonth() + 1 !== month) return false;

      if (day) {
        const selected = new Date(day + "T00:00:00");
        if (
          d.getFullYear() !== selected.getFullYear() ||
          d.getMonth() !== selected.getMonth() ||
          d.getDate() !== selected.getDate()
        ) {
          return false;
        }
      }

      return true;
    });
  }, [data, year, month, day]);

  return (
    // Added overflow-x-hidden here to prevent layout shift in the main page container
    <div className="pt-5 pb-10 px-0 md:px-15 overflow-x-hidden">
      <h1 className="text-black font-extrabold my-5 text-3xl">
        Disbursement List
      </h1>

      <div className="flex flex-wrap gap-4 mb-5">
        <select
          className="border rounded px-3 py-2 text-black"
          value={year ?? ""}
          onChange={(e) => setYear(e.target.value ? Number(e.target.value) : null)}
        >
          <option value="">All Years</option>
          {Array.from({ length: 10 }).map((_, i) => {
            const y = new Date().getFullYear() - i;
            return (
              <option key={y} value={y}>
                {y}
              </option>
            );
          })}
        </select>

        <select
          className="border rounded px-3 py-2 text-black"
          value={month ?? ""}
          onChange={(e) => setMonth(e.target.value ? Number(e.target.value) : null)}
        >
          <option value="">All Months</option>
          {Array.from({ length: 12 }).map((_, i) => (
            <option key={i + 1} value={i + 1}>
              {new Date(0, i).toLocaleString("default", { month: "long" })}
            </option>
          ))}
        </select>

        <input
          type="date"
          className="border rounded px-3 py-2 text-black"
          value={day}
          onChange={(e) => setDay(e.target.value)}
        />
      </div>

      {loading ? (
        <p className="text-gray-500">Loading data from Firebase...</p>
      ) : (
        // The DisbursementTable already has the necessary internal overflow logic
        <div className="grid grid-cols-1">
          <DisbursementTable data={filteredData} />
        </div>
      )}
    </div>
  );
}
