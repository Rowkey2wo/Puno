"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, Timestamp } from "firebase/firestore";
import { db } from "@/app/lib/firebase";
import DailyTable from "@/app/Components/DailyTable";

type TableRow = {
  name: string;
  amount: number;
  date: string;
};

export default function DailyList() {
  const [data, setData] = useState<TableRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1️⃣ Listen to Clients collection to build name map
    const clientsRef = collection(db, "Clients");
    const unsubClients = onSnapshot(clientsRef, (clientsSnap) => {
      const clientMap: Record<string, string> = {};
      clientsSnap.docs.forEach((doc) => {
        clientMap[doc.id] = doc.data().ClientName;
      });

      // 2️⃣ Listen to DailyList collection
      const dailyRef = collection(db, "DailyList");
      const unsubDaily = onSnapshot(dailyRef, (dailySnap) => {
        const rows: TableRow[] = dailySnap.docs.map((doc) => {
          const d = doc.data();

          // Convert Timestamp to string
          const dateStr =
            d.DateToday instanceof Timestamp
              ? d.DateToday.toDate().toLocaleDateString("en-US", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })
              : new Date().toLocaleDateString("en-US", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                });

          return {
            name: clientMap[d.clientId] || "Unknown",
            amount: d.Amount ?? 0,
            date: dateStr,
          };
        });

        // Sort by newest first
        rows.sort((a, b) => {
          const dA = new Date(a.date).getTime();
          const dB = new Date(b.date).getTime();
          return dB - dA;
        });

        setData(rows);
        setLoading(false);
      });

      return () => unsubDaily(); // cleanup DailyList listener
    });

    return () => unsubClients(); // cleanup Clients listener
  }, []);

  return (
    <div className="px-0 md:px-15 pb-15 pt-5">
      <h1 className="text-black font-extrabold my-5 text-3xl">Daily List</h1>

      {loading ? (
        <p className="text-gray-500">Loading daily payments...</p>
      ) : (
        <DailyTable data={data} />
      )}
    </div>
  );
}
