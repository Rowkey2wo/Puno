"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "@/app/lib/firebase";
import { useRouter } from "next/navigation";

import ClientCard from "../../Components/ClientCard";
import SearchBar from "../../Components/SearchBar";
import type { Status } from "../../Components/ClientCard";
import AddClientModal from "./AddClientModal";
import ClientPINModal from "./ClientPINmodal";

type Client = {
  id: string;
  name: string;
  image: string;
  status: Status;
  nickname?: string;
  validId?: string;
  isPrivate?: string;
};

export default function Transaction() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [openAdd, setOpenAdd] = useState(false);

  const router = useRouter();
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [openPinModal, setOpenPinModal] = useState(false);

  useEffect(() => {
    setLoading(true);

    // 🔥 Listen to live updates from Clients collection
    const unsub = onSnapshot(
      collection(db, "Clients"),
      (snapshot) => {
        const data: Client[] = snapshot.docs.map((doc) => {
          const d = doc.data();
          return {
            id: doc.id,
            name: d.ClientName,
            image: "/ClientIMG.png",
            status: d.Status as Status,
            nickname: d.Nickname ?? "",
            validId: d.ValidID ?? "",
            isPrivate: d.isPrivate ?? "No",
          };
        });

        setClients(data);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching clients:", error);
        setLoading(false);
      }
    );

    return () => unsub();
  }, []);

  // Filter clients based on search
  const filteredClients = clients.filter((client) => {
    const term = searchTerm.toLowerCase();

    return (
      client.name.toLowerCase().includes(term) ||
      client.status.toLowerCase().includes(term) ||
      client.nickname?.toLowerCase().includes(term) ||
      client.id.toLowerCase().includes(term)
    );
  });

  // Handle client card click
  const handleClientClick = (clientId: string, isPrivate: boolean) => {
    if (isPrivate) {
      setSelectedClientId(clientId);
      setOpenPinModal(true);
    } else {
      router.push(`/Dashboard/Transaction/${clientId}`);
    }
  };

  return (
    <div className="container-lg min-h-screen bg-white p-5 md:p-15">
      {/* SEARCH + ADD CLIENT */}
      <div className="grid grid-cols-1 md:grid-cols-[2fr_1.5fr] gap-4 ps-2">
        <div className="mb-5 w-full">
          <SearchBar
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search client name, status, or ID..."
          />
        </div>

        <div className="text-end">
          <button
            onClick={() => setOpenAdd(true)}
            type="button"
            className="bg-indigo-600 px-3 py-2 font-medium rounded text-white cursor-pointer w-full lg:w-[40%]"
          >
            Add Client
          </button>

          <AddClientModal open={openAdd} onClose={() => setOpenAdd(false)} />
        </div>
      </div>

      {/* STATUS LEGEND */}
      <div className="grid grid-cols-2 text-black p-3 md:grid-cols-5">
        <h1 className="flex">
          <span className="rounded-full h-5 w-5 bg-blue-600 me-2" /> = On-Going
        </h1>
        <h1 className="flex">
          <span className="rounded-full h-5 w-5 bg-yellow-400 me-2" /> = Recon
        </h1>
        <h1 className="flex">
          <span className="rounded-full h-5 w-5 bg-red-500 me-2" /> = Overdue
        </h1>
        <h1 className="flex">
          <span className="rounded-full h-5 w-5 bg-green-600 me-2" /> = Paid
        </h1>
      </div>

      {/* CLIENT CARDS */}
      {loading ? (
        <p className="text-center text-black">Loading clients...</p>
      ) : filteredClients.length === 0 ? (
        <p className="text-center text-gray-500">No clients found.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 p-3 gap-5">
          {filteredClients.map((client) => (
            <div
              key={client.id}
              className="block cursor-pointer"
              onClick={() =>
                handleClientClick(client.id, client.isPrivate === "Yes")
              }
            >
              <ClientCard {...client} />
            </div>
          ))}
        </div>
      )}

      {/* Client PIN Modal */}
      {selectedClientId && (
        <ClientPINModal
          clientId={selectedClientId}
          open={openPinModal}
          onClose={() => setOpenPinModal(false)}
          onSuccess={() => {
            router.push(`/Dashboard/Transaction/${selectedClientId}`);
            setOpenPinModal(false);
            setSelectedClientId(null);
          }}
        />
      )}
    </div>
  );
}
