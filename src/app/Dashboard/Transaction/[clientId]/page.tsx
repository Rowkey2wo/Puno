"use client";

import { use, useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/app/lib/firebase";

import ClientHeaderActions from "./ClientHeaderActions";
import DisbursementTable from "./DisbursementTableClient";
import DailyTableClient from "./DailyTableClient";
import Link from "next/link";

type ClientData = {
  ClientName: string;
  Status: string;
  Balance: number;
  Nickname?: string;
  ValidID?: string;
};

export default function ClientDetails({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {

  const { clientId } = use(params);

  const [client, setClient] = useState<ClientData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!clientId) return;

    const ref = doc(db, "Clients", clientId);

    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        setClient(snap.data() as ClientData);
      } else {
        setClient(null);
      }
      setLoading(false);
    });

    return () => unsub();
  }, [clientId]);

  if (loading) return <p className="p-5">Loading...</p>;
  if (!client) return <p className="p-5">Client not found</p>;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "OnGoing":
        return "bg-green-600 text-white";
      case "Recon":
        return "bg-yellow-400 text-white";
      case "Overdue":
        return "bg-red-500 text-white";
      case "Paid":
        return "bg-blue-600 text-white";
      default:
        return "bg-gray-500 text-white";
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-indigo-50 to-purple-100 p-6">
      <div className="max-w-6xl mx-auto">

        {/* HEADER */}
        <div className="bg-white shadow-lg rounded-xl p-6 mb-8">
          <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-6">

            <div className="flex flex-col md:flex-row md:items-center gap-4 w-full">

              {/* Avatar */}
              <div className="mx-auto md:mx-0 h-16 w-16 sm:h-20 sm:w-20 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 text-2xl sm:text-3xl font-semibold">
                {/* {client.ClientName.charAt(0)} */}
                <img src="/ClientIMG.png" alt="" className="rounded-full h-20"/>
              </div>

              {/* Name */}
              <div className="flex flex-col items-center md:items-start gap-1">
                <h1 className="text-xl sm:text-3xl font-bold text-black">
                  {client.ClientName}
                </h1>
                <p className="text-gray-500 text-sm">
                  {client.Nickname || "No nickname"}
                </p>
                <div>
                    <Link
                      href={`/Dashboard/Transaction/${clientId}/EditProfile`}
                      className="text-sm border-b text-blue-500">
                      Update Client
                    </Link>
                </div>
              </div>

              {/* Status */}
              <div className="text-center">
                <span
                  className={`mt-2 px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(
                    client.Status
                  )}`}
                >
                  {client.Status}
                </span>
              </div>
              

            </div>

            
            {/* Actions */} 
            <div className="w-full md:w-auto md:ml-auto">
              <ClientHeaderActions clientId={clientId} />
            </div>
          </div>

          {/* BALANCE (LIVE) */}
          <div className="flex justify-center flex-col mt-4 pt-4 border-t md:flex-row text-center">
            <p className="text-lg font-bold text-black me-3">
              BALANCE:
            </p>
            <p className="text-lg font-bold text-black">
              ₱{client.Balance.toLocaleString()}
            </p>
          </div>
        </div>

        {/* TABLES */}
        <div className="grid grid-cols-1 lg:grid-cols-12">
          <div className="col-span-12 lg:col-span-4 mb-8">
            <DailyTableClient clientId={clientId} />
          </div>

          <div className="col-span-12 lg:col-span-8 ps-0 lg:ps-8">
            <DisbursementTable clientId={clientId} />
          </div>
        </div>

      </div>
    </div>
  );
}
