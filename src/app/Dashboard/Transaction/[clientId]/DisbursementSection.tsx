"use client";

import { useEffect, useState } from "react";
import {
  addDoc,
  collection,
  query,
  where,
  getDocs,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/app/lib/firebase";
import DisbursementModal from "./DisbursementModal";

type Disbursement = {
  id: string;
  Amount: number;
  Interest: number;
  Remarks: string;
  DateToday: Timestamp;
  Deadline: Timestamp;
};

export default function DisbursementSection({ clientId }: { clientId: string }) {
  const [open, setOpen] = useState(false);
  const [disbursements, setDisbursements] = useState<Disbursement[]>([]);
  const [loading, setLoading] = useState(false);

  // 🔹 Fetch disbursements for this client
  const fetchDisbursements = async () => {
    const q = query(
      collection(db, "Disbursement"),
      where("clientId", "==", clientId)
    );

    const snap = await getDocs(q);
    const data = snap.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as Omit<Disbursement, "id">),
    }));

    setDisbursements(data);
  };

  useEffect(() => {
    fetchDisbursements();
  }, []);

  return (
    <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6 mt-6">
      
      {/* 🔹 HEADER (RESPONSIVE) */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
        <h2 className="text-lg sm:text-xl font-semibold">Disbursements</h2>

        <button
          onClick={() => setOpen(true)}
          className="w-full md:w-auto bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition"
        >
          + New Disbursement
        </button>
      </div>

      {/* 🔹 TABLE (SCROLLABLE ON MOBILE) */}
      <div className="overflow-x-auto -mx-4 sm:mx-0">
        <table className="min-w-162.5 w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase">
                Date
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase">
                Amount
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase">
                Interest
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase">
                Deadline
              </th>
            </tr>
          </thead>

          <tbody className="divide-y">
            {disbursements.length === 0 && (
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-6 text-center text-sm text-gray-500"
                >
                  No disbursements found.
                </td>
              </tr>
            )}

            {disbursements.map((d) => (
              <tr key={d.id}>
                <td className="px-4 py-2 text-sm whitespace-nowrap">
                  {d.DateToday.toDate().toLocaleDateString()}
                </td>
                <td className="px-4 py-2 text-sm whitespace-nowrap">
                  ₱{d.Amount.toLocaleString()}
                </td>
                <td className="px-4 py-2 text-sm whitespace-nowrap">
                  ₱{d.Interest.toLocaleString()}
                </td>
                <td className="px-4 py-2 text-sm whitespace-nowrap">
                  {d.Deadline.toDate().toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 🔹 MODAL */}
      <DisbursementModal
        clientId={clientId}
        open={open}
        onClose={() => {
          setOpen(false);
          fetchDisbursements();
        }}
      />
    </div>
  );
}
