"use client";

import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/app/lib/firebase";
import Link from "next/link";

import ClientCard from "../../Components/ClientCard";
import SearchBar from "../../Components/SearchBar";
import type { Status } from "../../Components/ClientCard";

type Client = {
  id: string;
  name: string;
  image: string;
  status: Status;
  nickname?: string;
  validId?: string;
};

export default function Transaction() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchClients = async () => {
      try {
        const snapshot = await getDocs(collection(db, "Clients"));

        const data: Client[] = snapshot.docs.map(doc => {
            const d = doc.data();
            return {
              id: doc.id,
              name: d.ClientName,
              image: "/ClientIMG.png",
              status: d.Status as Status,
              nickname: d.Nickname,
              validId: d.ValidID,
            };
        });          
          
        setClients(data);
      } catch (error) {
        console.error("Error fetching clients:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchClients();
  }, []);

  return (
    <div className="container-lg min-h-screen bg-white p-5 md:p-15">
      <div className="grid grid-cols-1 md:grid-cols-[2fr_1.5fr] gap-4 ps-2">
        <div className="mb-5 w-full">
          <SearchBar />
        </div>
        <div className="text-end">
          <button
            type="button"
            className="bg-indigo-600 px-3 py-2 font-medium rounded text-white cursor-pointer w-full lg:w-[40%]"
          >
            Add Client
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 text-black p-3 md:grid-cols-5">
        <h1 className="flex">
          <span className="rounded-full h-5 w-5 bg-green-600 me-2" /> = On-Going
        </h1>
        <h1 className="flex">
          <span className="rounded-full h-5 w-5 bg-yellow-400 me-2" /> = Recon
        </h1>
        <h1 className="flex">
          <span className="rounded-full h-5 w-5 bg-red-500 me-2" /> = Overdue
        </h1>
        <h1 className="flex">
          <span className="rounded-full h-5 w-5 bg-blue-600 me-2" /> = Paid
        </h1>
      </div>

      {loading ? (
        <p className="text-center text-black">Loading clients...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 p-3 gap-5">
          {clients.map((client) => (
            <Link
            href={`/Dashboard/Transaction/${client.id}`}
            key={client.id}
            className="block"
          >
            <ClientCard {...client} />
          </Link>          
          
        ))}

        </div>
      )}
    </div>
  );
}
