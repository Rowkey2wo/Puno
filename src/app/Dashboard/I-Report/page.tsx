"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, Timestamp } from "firebase/firestore";
import { db } from "@/app/lib/firebase";
import InterestTable from "./InterestTable";

export type InterestRow = {
  id: string;
  clientId: string;
  interest: number;
  amount: number;
  date: Date;
};

export default function InterestReport() {
  const [data, setData] = useState<InterestRow[]>([]);
  const [loading, setLoading] = useState(true);

  /* ================= FETCH DISBURSEMENT ================= */
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "Disbursement"),
      (snapshot) => {
        const rows: InterestRow[] = snapshot.docs.map((doc) => {
          const d = doc.data();

          return {
            id: doc.id,
            clientId: d.clientId,
            amount: d.Amount ?? 0,
            interest: d.Interest ?? 0,
            date:
              d.DateToday instanceof Timestamp
                ? d.DateToday.toDate()
                : new Date(),
          };
        });

        setData(rows);
        setLoading(false);
      },
      (err) => {
        console.error("Interest report error:", err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, []);

  /* ================= SUMMARY CALCULATIONS ================= */
  const summaries = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    let yearly = 0;
    let monthly = 0;
    let last3Months = 0;

    data.forEach((row) => {
      const d = row.date;

      if (d.getFullYear() === currentYear) {
        yearly += row.interest;
      }

      if (
        d.getFullYear() === currentYear &&
        d.getMonth() === currentMonth
      ) {
        monthly += row.interest;
      }

      const diffMonths =
        (currentYear - d.getFullYear()) * 12 +
        (currentMonth - d.getMonth());

      if (diffMonths >= 0 && diffMonths <= 2) {
        last3Months += row.interest;
      }
    });

    return { yearly, monthly, last3Months };
  }, [data]);

  return (
    <div className="px-0 md:px-15 py-8">
      <h1 className="text-3xl font-extrabold text-black mb-6">
        Interest Report
      </h1>

      {/* ================= SUMMARY CARDS ================= */}
      <div className="grid mb-8 grid-cols-1 md:grid-cols-3 px-10 md:px-0">

        <div className=" bg-white border-t-7 border-green-600 rounded-xl p-5 shadow mb-5 md:mb-0 me-5 text-center sm:text-start">
          <p className="text-gray-500 text-sm">Annual Interest</p>
          <h2 className="text-2xl font-bold text-green-600">
            ₱{summaries.yearly.toLocaleString()}
          </h2>
        </div>

        <div className=" bg-white border-t-7 border-indigo-600 rounded-xl p-5 shadow mb-5 md:mb-0 me-5 text-center sm:text-start">
          <p className="text-gray-500 text-sm">This Month</p>
          <h2 className="text-2xl font-bold text-indigo-600">
            ₱{summaries.monthly.toLocaleString()}
          </h2>
        </div>

        <div className=" bg-white border-t-7 border-orange-600 rounded-xl p-5 shadow mb-5 md:mb-0 me-5 text-center sm:text-start">
          <p className="text-gray-500 text-sm">Last 3 Months</p>
          <h2 className="text-2xl font-bold text-orange-600">
            ₱{summaries.last3Months.toLocaleString()}
          </h2>
        </div>
      </div>

      {/* ================= TABLE ================= */}
      {loading ? (
        <p className="text-gray-500">Loading interest data...</p>
      ) : (
        <div className="grid grid-cols-1">
          <InterestTable data={data} />
        </div>
      )}
    </div>
  );
}
