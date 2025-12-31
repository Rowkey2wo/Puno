// app/Disbursement/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, getDocs, Timestamp } from "firebase/firestore";
import { db } from "@/app/lib/firebase";
// Ensure this path matches where you saved the UI component
import DisbursementTable from "@/app/Components/DisbursementTable"; 

// Define the shape of a single row of data after processing
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

  // 🔎 Date filters (Use null for "all" selection)
  const [year, setYear] = useState<number | null>(null);
  const [month, setMonth] = useState<number | null>(null);
  const [day, setDay] = useState<string>(""); // YYYY-MM-DD string

  /* ================= FETCH DATA FROM FIREBASE ================= */
  useEffect(() => {
    const fetchDisbursements = async () => {
      try {
        // Fetch clients map first to get names linked to IDs
        const clientsSnap = await getDocs(collection(db, "Clients"));
        const clientMap: Record<string, string> = {};

        clientsSnap.forEach((doc) => {
          // Assuming your field name in 'Clients' collection is 'ClientName'
          clientMap[doc.id] = doc.data().ClientName; 
        });

        // Fetch disbursements
        const disSnap = await getDocs(collection(db, "Disbursement"));

        const rows: DisbursementRow[] = disSnap.docs.map((doc) => {
          const d = doc.data();

          // Safely convert Firebase Timestamps to JS Date objects
          const dateToday =
            d.DateToday instanceof Timestamp ? d.DateToday.toDate() : new Date();
          const deadline =
            d.Deadline instanceof Timestamp ? d.Deadline.toDate() : new Date();

          return {
            id: doc.id,
            name: clientMap[d.clientId] ?? "Unknown Client",
            amount: d.Amount ?? 0,
            interest: d.Interest ?? 0,
            monthsToPay: d.MonthsToPay ?? 0, // Ensure you have this field in DB
            status: d.Remarks ?? "N/A",
            date: dateToday,
            deadline: deadline,
          };
        });

        setData(rows);
      } catch (err) {
        console.error("Error fetching disbursement:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDisbursements();
  }, []);

  /* ================= DATE FILTER LOGIC (useMemo for efficiency) ================= */
  const filteredData = useMemo(() => {
    return data.filter((row) => {
      const d = row.date;

      // Year filter
      if (year !== null && d.getFullYear() !== year) return false;
      
      // Month filter (getMonth() is 0-indexed, UI value is 1-indexed)
      if (month !== null && d.getMonth() + 1 !== month) return false;

      // Day filter (compares YYYY-MM-DD strings after date parsing)
      if (day) {
        const selected = new Date(day + 'T00:00:00'); // Consistent parsing
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
  }, [data, year, month, day]); // Dependencies for useMemo

  return (
    <div className="pt-5 pb-10 px-0 md:px-15">
      <h1 className="text-black font-extrabold my-5 text-3xl">
        Disbursement List
      </h1>

      {/* FILTER CONTROLS */}
      <div className="flex flex-wrap gap-4 mb-5">
        {/* YEAR SELECT */}
        <select
          className="border rounded px-3 py-2 text-black"
          value={year ?? ""}
          onChange={(e) =>
            setYear(e.target.value ? Number(e.target.value) : null)
          }
        >
          <option value="">All Years</option>
          {Array.from({ length: 10 }).map((_, i) => {
            const y = new Date().getFullYear() - i;
            return <option key={y} value={y}>{y}</option>;
          })}
        </select>

        {/* MONTH SELECT */}
        <select
          className="border rounded px-3 py-2 text-black"
          value={month ?? ""}
          onChange={(e) =>
            setMonth(e.target.value ? Number(e.target.value) : null)
          }
        >
          <option value="">All Months</option>
          {Array.from({ length: 12 }).map((_, i) => (
            <option key={i + 1} value={i + 1}>
              {new Date(0, i).toLocaleString("default", { month: "long" })}
            </option>
          ))}
        </select>

        {/* DAY INPUT */}
        <input
          type="date"
          className="border rounded px-3 py-2 text-black"
          value={day}
          onChange={(e) => setDay(e.target.value)}
        />
      </div>

      {/* TABLE Display */}
      {loading ? (
        <p className="text-gray-500">Loading data from Firebase...</p>
      ) : (
        // Pass the filtered data array to the UI component
        <DisbursementTable data={filteredData} /> 
      )}
    </div>
  );
}
