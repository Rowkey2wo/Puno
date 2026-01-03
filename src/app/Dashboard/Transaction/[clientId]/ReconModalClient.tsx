// components/ReconModalClient.tsx

"use client";

import { addDoc, collection, Timestamp, doc, getDoc, runTransaction, serverTimestamp } from "firebase/firestore";
import { db } from "@/app/lib/firebase";
import { useEffect, useState, useCallback } from "react";

// Helper function to calculate a date N months in the future
// FIXED: Now properly adds months without adjusting for day overflow
const calculateFutureDateISO = (dateString: string, months: number): string => {
    if (!dateString || months <= 0) return "";

    const [year, month, day] = dateString.split("-").map(Number);
    const baseDate = new Date(year, month - 1, day);

    const targetMonth = baseDate.getMonth() + months;
    const targetYear = baseDate.getFullYear() + Math.floor(targetMonth / 12);
    const finalMonth = targetMonth % 12;

    // Get the last day of the target month
    const lastDayOfTargetMonth = new Date(targetYear, finalMonth + 1, 0).getDate();

    // Use the original day, but cap it at the last day of the target month
    const finalDay = Math.min(day, lastDayOfTargetMonth);
    const finalDate = new Date(targetYear, finalMonth, finalDay);

    const yyyy = finalDate.getFullYear();
    const mm = String(finalDate.getMonth() + 1).padStart(2, "0");
    const dd = String(finalDate.getDate()).padStart(2, "0");

    return `${yyyy}-${mm}-${dd}`;
};


export default function ReconModalClient({
  clientId,
  open,
  onClose,
}: {
  clientId: string;
  open: boolean;
  onClose: () => void;
}) {
  
  // Helper function to get today's date in local YYYY-MM-DD format
  const getTodayISO = (): string => {
    const today = new Date();
    return new Date(today.getTime() - (today.getTimezoneOffset() * 60000)).toISOString().split("T")[0];
  };

  const [form, setForm] = useState({
    Amount: "",
    Interest: "",
    MonthsToPay: "",
    DateToday: getTodayISO(),
    Deadline: "",
  });

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [clientBalance, setClientBalance] = useState(0);

  const calculateDeadline = useCallback((monthsToPay: string, dateToday: string) => {
    const months = Number(monthsToPay);
    if (months > 0 && dateToday) {
        const newDeadline = calculateFutureDateISO(dateToday, months); 
        setForm(prevForm => ({ ...prevForm, Deadline: newDeadline }));
    } else {
         setForm(prevForm => ({ ...prevForm, Deadline: "" }));
    }
  }, []);
  
  // --- Fetch Client Balance on Open ---
  useEffect(() => {
    if (!open) return;
    
    const fetchBalance = async () => {
        setIsLoading(true);
        setError('');
        try {
            const clientRef = doc(db, 'Clients', clientId);
            const clientSnap = await getDoc(clientRef);
            if (clientSnap.exists()) {
                const data = clientSnap.data();
                const balance = data.Balance ?? 0;
                setClientBalance(balance);
                
                setForm(prev => ({ ...prev, Amount: balance.toString(), DateToday: getTodayISO() }));
            } else {
                setError('Client data not found.');
            }
        } catch (err) {
            console.error("Error fetching client balance:", err);
            setError('Failed to fetch client details.');
        } finally {
            setIsLoading(false);
        }
    };
    
    fetchBalance();
  }, [open, clientId]);


  if (!open) return null;

  const submit = async () => {
    if (!form.Amount || !form.Interest || !form.Deadline || !form.MonthsToPay) {
      setError("All fields (except auto-filled amount/date) are required.");
      return;
    }

    if (clientBalance <= 0) {
        setError("Cannot reconstruct a loan with a zero balance.");
        return;
    }

    try {
        await runTransaction(db, async (transaction) => {
            const newDisbursementRef = doc(collection(db, "Disbursement"));
            transaction.set(newDisbursementRef, {
                clientId,
                Amount: Number(form.Amount),
                Interest: Number(form.Interest),
                MonthsToPay: Number(form.MonthsToPay),
                Remarks: "Recon", 
                DateToday: serverTimestamp(), 
                Deadline: Timestamp.fromDate(new Date(form.Deadline + 'T23:59:59')), 
                Status: "",
            });

            const clientRef = doc(db, 'Clients', clientId);
            transaction.update(clientRef, {
                Status: "Recon" 
            });
        });

      onClose();
    } catch(err) {
      console.error(err);
      setError("Failed to save reconstruction. Please try again.");
    }
  };
  
  const handleMonthsChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setForm(prevForm => ({ ...prevForm, MonthsToPay: value }));
    calculateDeadline(value, form.DateToday); 
  };

  const handleDateTodayChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setForm(prevForm => ({ ...prevForm, DateToday: value }));
    calculateDeadline(form.MonthsToPay, value); 
  };

  const isBalanceZeroOrLess = clientBalance <= 0;
  const isSubmitDisabled = !form.MonthsToPay || isLoading || isBalanceZeroOrLess;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 px-4">
      <div className="bg-white w-full max-w-xl rounded-2xl shadow-xl p-6 text-black max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex p-4 md:items-center justify-between gap-2 mb-6 bg-yellow-200 rounded">
          <h3 className="text-xl font-semibold">Reconstruct Form (Current Balance: ₱{clientBalance.toLocaleString()})</h3>
          <button
            onClick={onClose}
            className="text-black-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>
        
        {isLoading ? (
            <p>Loading client balance...</p>
        ) : (
        <>
        {/* Display status message if balance is zero */}
        {isBalanceZeroOrLess && (
                <p className="text-sm text-green-600 my-4 p-2 bg-green-100 rounded">
                    This client&apos;s balance is 0. Cannot perform a reconstruction.
                </p>
            )}
            {/* FORM GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              

            {/* Amount (Disabled, auto-filled) */}
            <div>
                <label className="block text-sm font-medium mb-1">Amount (Client Balance)</label>
                <input
                type="number"
                disabled 
                className="w-full rounded-lg border border-gray-300 p-2 focus:ring-2 focus:ring-indigo-500 outline-none bg-gray-100 cursor-not-allowed"
                value={form.Amount}
                onChange={(e) => setForm({ ...form, Amount: e.target.value })}
                />
            </div>

            {/* Interest */}
            <div>
                <label className="block text-sm font-medium mb-1">Interest</label>
                <input
                type="number"
                placeholder="Enter interest"
                className="w-full rounded-lg border border-gray-300 p-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                value={form.Interest}
                onChange={(e) =>
                    setForm({ ...form, Interest: e.target.value })
                }
                />
            </div>

            {/* Date Today */}
            <div>
                <label className="block text-sm font-medium mb-1">
                Date Today
                </label>
                <input
                type="date"
                className="w-full rounded-lg border border-gray-300 p-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                value={form.DateToday}
                onChange={handleDateTodayChange}
                />
            </div>
            
            {/* Months To Pay */}
            <div>
                <label className="block text-sm font-medium mb-1">
                Months To Pay
                </label>
                <select 
                    className="w-full border border-gray-300 rounded-lg px-2 py-2 text-md outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.MonthsToPay}
                    onChange={handleMonthsChange}
                    required
                >
                <option value="">Select months</option>
                <option value="1">1 Month</option>
                <option value="2">2 Months</option>
                <option value="3">3 Months</option>
                </select>
            </div>


            {/* Deadline */}
            <div>
                <label className="block text-sm font-medium mb-1">
                Deadline
                </label>
                <input
                type="date"
                className="w-full rounded-lg border border-gray-300 p-2 focus:ring-2 focus:ring-indigo-500 outline-none bg-gray-100"
                value={form.Deadline}
                readOnly 
                />
            </div>

            </div>

            {/* Remarks (Full width) */}
            <div className="mt-4">
            <label className="block text-sm font-medium mb-1">Remarks</label>
            <input
                type="text"
                value="Recon"
                disabled
                className="w-full rounded-lg border border-gray-200 bg-gray-100 p-2 text-gray-600 cursor-not-allowed"
            />
            </div>

            {/* Error */}
            {error && (
            <p className="text-sm text-red-600 mt-4">{error}</p>
            )}

            {/* Actions */}
            <div className="flex flex-col-reverse md:flex-row justify-end gap-3 mt-6">
            <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-100"
            >
                Cancel
            </button>
            <button
                onClick={submit}
                disabled={!!isSubmitDisabled}
                className="px-5 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
            >
                Start Reconstruction
            </button>
            </div>
        </>
        )}
      </div>
    </div>
  );
}