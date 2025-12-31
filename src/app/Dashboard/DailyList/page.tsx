"use client";

import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/app/lib/firebase";
import DailyTable from "@/app/Components/DailyTable";

type TableRow = {
  name: string;
  amount: number;
  date: string;
};

export default function DailyList() {
  const [data, setData] = useState<TableRow[]>([]);

  useEffect(() => {
    const fetchDailyList = async () => {
      // 1️⃣ Fetch DailyList
      const dailySnap = await getDocs(collection(db, "DailyList"));

      const dailyDocs = dailySnap.docs.map(doc => doc.data());

      // 2️⃣ Collect unique clientIds
      const clientIds = [
        ...new Set(dailyDocs.map(item => item.clientId)),
      ];

      // 3️⃣ Fetch clients
      const clientsSnap = await getDocs(collection(db, "Clients"));

      const clientMap: Record<string, string> = {};
      clientsSnap.forEach(doc => {
        clientMap[doc.id] = doc.data().ClientName;
      });

      // 4️⃣ Merge into table-ready data
      const formatted: TableRow[] = dailyDocs.map(item => ({
        name: clientMap[item.clientId] || "Unknown",
        amount: item.Amount,
        date: item.DateToday.toDate().toLocaleDateString("en-US", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }),
      }));

      setData(formatted);
    };

    fetchDailyList();
  }, []);

  return (
    <div className="px-0 md:px-15 pb-15 pt-5">
      <h1 className="text-black font-extrabold my-5 text-3xl">
        Daily List
      </h1>

      <DailyTable data={data} />
    </div>
  );
}
