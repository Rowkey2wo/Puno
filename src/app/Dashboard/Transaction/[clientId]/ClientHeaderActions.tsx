"use client";

import { useState } from "react";
import DisbursementModal from "./DisbursementModal";
import ReconModalClient from "./ReconModalClient";

export default function ClientHeaderActions({ clientId }: { clientId: string }) {
  const [open, setOpen] = useState(false);
  const [openRecon, setOpenRecon] = useState(false);

  return (
    <div>
      <div className="flex flex-col md:flex-row gap-2">
        <button
          onClick={() => setOpen(true)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 cursor-pointer"
        >
          Release
        </button>

        <button
          onClick={() => setOpenRecon(true)}
          className="bg-yellow-500 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 cursor-pointer"
        >
          Recon
        </button>
      </div>

      <DisbursementModal
        clientId={clientId}
        open={open}
        onClose={() => setOpen(false)}
      />
      <ReconModalClient
        clientId={clientId}
        open={openRecon}
        onClose={() => setOpenRecon(false)}
      />
    </div>
  );
}
