"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/app/lib/firebase";

type ClientData = {
  ClientName?: string;
  Nickname?: string;
  ImageUrl?: string;
  ValidID?: string; // 🔥 IMAGE URL
};

export default function EditProfile({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const { clientId } = use(params);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [clientName, setClientName] = useState("");
  const [nickname, setNickname] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [validID, setValidID] = useState("");

  // 🔥 Fetch client data
  useEffect(() => {
    if (!clientId) return;

    const fetchClient = async () => {
      try {
        const snap = await getDoc(doc(db, "Clients", clientId));

        if (!snap.exists()) {
          setError("Client not found");
          return;
        }

        const data = snap.data() as ClientData;

        setClientName(data.ClientName ?? "");
        setNickname(data.Nickname ?? "");
        setImageUrl(data.ImageUrl ?? "");
        setValidID(data.ValidID ?? "");
      } catch (err) {
        console.error(err);
        setError("Failed to load client");
      } finally {
        setLoading(false);
      }
    };

    fetchClient();
  }, [clientId]);

  // 💾 Save
  const handleSave = async () => {
    if (!clientName.trim()) {
      setError("Client name is required");
      return;
    }

    setSaving(true);
    setError("");

    try {
      await updateDoc(doc(db, "Clients", clientId), {
        ClientName: clientName,
        Nickname: nickname,
        ImageUrl: imageUrl,
        ValidID: validID,
      });

      router.push(`/Dashboard/Transaction/${clientId}`);
    } catch (err) {
      console.error(err);
      setError("Failed to update client");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="p-6">Loading client...</p>;
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-indigo-50 to-purple-100 p-6">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl p-6 sm:p-8 text-black">

        {/* 🔙 Back */}
        <button
          onClick={() =>
            router.push(`/Dashboard/Transaction/${clientId}`)
          }
          className="text-sm text-indigo-600 hover:underline mb-6"
        >
          ← Back to Client
        </button>

        <h1 className="text-2xl font-bold mb-8">
          Update Client Profile
        </h1>

        {/* CLIENT IMAGE */}
        <div className="flex justify-center mb-8">
          <div className="h-28 w-28 rounded-full bg-indigo-100 flex items-center justify-center overflow-hidden shadow">
            {imageUrl ? (
              <img
                src={imageUrl}
                className="w-full h-full object-cover"
                alt="Client"
              />
            ) : (
              <span className="text-4xl font-bold text-indigo-600">
                {clientName.charAt(0)}
              </span>
            )}
          </div>
        </div>

        {/* IMAGE URL */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-1">
            Client Image URL
          </label>
          <input
            type="text"
            placeholder="https://..."
            className="w-full rounded-lg border p-2 focus:ring-2 focus:ring-indigo-500"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
          />
        </div>

        {/* NAME */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-1">
            Client Name
          </label>
          <input
            type="text"
            className="w-full rounded-lg border p-2 focus:ring-2 focus:ring-indigo-500"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
          />
        </div>

        {/* NICKNAME */}
        <div className="mb-8">
          <label className="block text-sm font-medium mb-1">
            Nickname
          </label>
          <input
            type="text"
            className="w-full rounded-lg border p-2 focus:ring-2 focus:ring-indigo-500"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
          />
        </div>

        {/* 🔥 VALID ID IMAGE */}
        <div className="mb-8">
          <label className="block text-sm font-medium mb-2">
            Valid ID (Image)
          </label>

          <div className="border rounded-xl p-4 bg-gray-50">
            <img
              src={validID || "/ValidIDSampleImg.png"}
              alt="Valid ID Preview"
              className="w-full max-h-64 object-contain rounded-lg border mb-3"
            />

            <input
              type="text"
              placeholder="Valid ID image URL"
              className="w-full rounded-lg border p-2 focus:ring-2 focus:ring-indigo-500"
              value={validID}
              onChange={(e) => setValidID(e.target.value)}
            />

            <p className="text-xs text-gray-500 mt-2">
              Sample shown when no image is provided
            </p>
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-600 mb-4">{error}</p>
        )}

        {/* ACTIONS */}
        <div className="flex justify-end gap-3">
          <button
            onClick={() =>
              router.push(`/Dashboard/Transaction/${clientId}`)
            }
            className="px-4 py-2 rounded-lg border hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
