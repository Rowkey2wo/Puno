// components/DisbursementTable.tsx (Client-side sorting workaround, limited data)

"use client";

import { collection, query, where, onSnapshot, Timestamp, DocumentData } from "firebase/firestore";
import { db } from "@/app/lib/firebase";
import { useEffect, useState, useMemo } from "react"; 

// Define the type for the data we expect from Firebase
interface DisbursementData extends DocumentData {
    id: string;
    DateToday: Timestamp;
    Deadline: Timestamp;
    Amount: number;
    Interest: number;
    Remarks: string;
    Status: "Paid"|"";
}

// Define the maximum number of items to show
const MAX_ITEMS_TO_SHOW = 10;

export default function DisbursementTable({ clientId }: { clientId: string }) {
  const [data, setData] = useState<DisbursementData[]>([]);

  useEffect(() => {
    // 1. Define the query (only 'where' clause remains)
    const q = query(
      collection(db, "Disbursement"),
      where("clientId", "==", clientId),
    );

    // 2. Subscribe to real-time updates using onSnapshot
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const disbursementsList: DisbursementData[] = [];
      querySnapshot.forEach((doc) => {
        disbursementsList.push({ id: doc.id, ...doc.data() } as DisbursementData);
      });
      
      setData(disbursementsList); // Data is received unsorted
    }, (error) => {
        console.error("Error fetching real-time disbursements:", error);
    });

    // 3. Cleanup function: stop listening when the component unmounts
    return () => unsubscribe();

  }, [clientId]);

  // 4. Sort and LIMIT the data client-side using useMemo
  const limitedAndSortedData = useMemo(() => {
    // Sort by DateToday descending (newest first)
    const sorted = [...data].sort((a, b) => 
        b.DateToday.toDate().getTime() - a.DateToday.toDate().getTime()
    );
    
    // FIX: Limit the results to the top 10 using .slice()
    return sorted.slice(0, MAX_ITEMS_TO_SHOW);
  }, [data]); // Only re-sort and limit when 'data' changes

  // Helper function for consistent date formatting
  const formatDate = (timestamp: Timestamp | undefined) => {
    if (!timestamp) return 'N/A';
    try {
        return timestamp.toDate().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    } catch {
        return 'Invalid Date';
    }
  };

  return (
    <div className="bg-white shadow-lg rounded-xl p-6 text-black">
      <div className="flex justify-between">
        <h2 className="text-xl font-semibold">Disbursements</h2>
        {/* You can show a "See All" link if there are more than 10 items */}
        {data.length > MAX_ITEMS_TO_SHOW && (
            <button className="border-b hover:text-indigo-700 cursor-pointer">See all ({data.length})</button> 
        )}
      </div>

      <div className="overflow-x-scroll mt-4">
        <table className="min-w-full divide-y">
          <thead>
            <tr>
              <th className="text-left px-3 py-2 text-sm">Date</th>
              <th className="text-left px-3 py-2 text-sm">Deadline</th>
              <th className="text-left px-3 py-2 text-sm">Amount</th>
              <th className="text-left px-3 py-2 text-sm">Remarks</th>
              <th className="text-left px-3 py-2 text-sm">Status</th>
            </tr>
          </thead>
          <tbody>
            {/* Use the limitedAndSortedData here */}
            {limitedAndSortedData.map(d => ( 
              <tr key={d.id} className="border-t text-lg">
                <td className="px-3 py-2">{formatDate(d.DateToday)}</td>
                <td className="px-3 py-2">{formatDate(d.Deadline)}</td>
                <td className="px-3 py-2 font-bold">₱{d.Amount.toLocaleString()}</td>
                <td className="px-3 py-2">{d.Remarks}</td>
                <td className="px-3 py-2">{d.Status}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {limitedAndSortedData.length === 0 && (
            <p className="text-center py-4 text-gray-500">No disbursements found for this client.</p>
        )}
      </div>
    </div>
  );
}
