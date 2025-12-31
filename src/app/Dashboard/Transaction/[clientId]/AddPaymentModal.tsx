// components/AddPaymentModal.tsx

'use client';

import { useState, useEffect, useCallback } from 'react';
import { db } from '@/app/lib/firebase';
import { doc, getDoc, collection, Timestamp, runTransaction } from 'firebase/firestore';

interface ClientBalanceInfo {
    balance: number;
    status: string;
}

export default function AddPaymentModal({
    clientId,
    open,
    onClose,
    currentDisbursementId 
}: {
    clientId: string;
    open: boolean;
    onClose: () => void;
    currentDisbursementId: string | null;
}) {
    const [paymentAmount, setPaymentAmount] = useState('');
    const [clientInfo, setClientInfo] = useState<ClientBalanceInfo | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const fetchClientBalance = useCallback(async () => {
        // ... (Fetching logic remains the same) ...
        if (!open || !clientId) return;
        setIsLoading(true);
        setError('');
        try {
            const clientRef = doc(db, 'Clients', clientId);
            const clientSnap = await getDoc(clientRef);
            if (clientSnap.exists()) {
                const data = clientSnap.data();
                if (data.Balance === undefined) {
                    throw new Error("Client document missing 'Balance' field in Firebase.");
                }
                setClientInfo({
                    balance: data.Balance ?? 0, 
                    status: data.Status ?? 'N/A',
                });
            } else {
                setError('Client data not found in Firebase.');
            }
        } catch (err) {
            console.error("Error fetching client balance:", err);
            setError(`Failed to fetch client details: ${err instanceof Error ? err.message : String(err)}`);
        } finally {
            setIsLoading(false);
        }
    }, [open, clientId]);

    useEffect(() => {
        if (open) {
            fetchClientBalance();
            setPaymentAmount('');
        }
    }, [open, fetchClientBalance]);

    if (!open) return null;

    const handlePaymentSubmit = async () => {
        const amount = Number(paymentAmount);
        
        if (isNaN(amount) || amount <= 0) {
            setError('Please enter a valid amount.');
            return;
        }

        if (!clientInfo) {
            setError('Client data not loaded.');
            return;
        }
        
        if (amount > clientInfo.balance) {
            setError('Payment amount cannot exceed the current balance.');
            return;
        }

        if (!currentDisbursementId || currentDisbursementId === 'N/A') {
            setError('Cannot submit payment: No active disbursement found.');
            return;
        }

        setIsLoading(true);

        try {
            const newBalance = clientInfo.balance - amount;
            // The client's status is set to "Paid" if their overall balance is 0 or less
            const newClientStatus = newBalance <= 0 ? 'Paid' : clientInfo.status;
            
            // The status of the specific disbursement is also set to "Paid" if the balance is cleared
            const newDisbursementStatus = newBalance <= 0 ? 'Paid' : '';


            await runTransaction(db, async (transaction) => {
                const clientRef = doc(db, 'Clients', clientId);
                
                // 1. Update the Client's Master Balance and Status
                transaction.update(clientRef, {
                    Balance: newBalance,
                    Status: newClientStatus,
                });

                // 2. Add a new payment record to the DailyList collection
                const newPaymentRef = doc(collection(db, "DailyList")); 
                transaction.set(newPaymentRef, { 
                    clientId: clientId,
                    Amount: amount,
                    DateToday: Timestamp.now(),
                    DisbursementID: currentDisbursementId,
                });

                // 3. Update the specific Disbursement document's Status field (New Logic)
                // This is needed because you use this 'Status' field in your DisbursementTable UI
                const disbursementRef = doc(db, 'Disbursement', currentDisbursementId);
                transaction.update(disbursementRef, {
                    Status: newDisbursementStatus
                });
            });

            onClose();
        } catch (err) {
            console.error("Transaction failed:", err);
            setError('Payment processing failed. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const isSubmitDisabled = 
        isLoading || 
        Number(paymentAmount) <= 0 || 
        !currentDisbursementId || 
        (clientInfo && Number(paymentAmount) > clientInfo.balance);

    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 px-4">
            <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl p-6 text-black">
                <h3 className="text-xl font-semibold mb-4">Add Payment</h3>
                
                {isLoading ? (
                    <p>Loading client info...</p>
                ) : clientInfo ? (
                    <div className="space-y-4">
                        <div className="p-3 bg-gray-100 rounded-lg">
                            <p className="text-sm">Current Balance:</p>
                            <p className="text-2xl font-bold">₱{clientInfo.balance.toLocaleString()}</p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">Payment Amount</label>
                            <input
                                type="number"
                                placeholder="Enter amount received"
                                className="w-full rounded-lg border border-gray-300 p-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                                value={paymentAmount}
                                onChange={(e) => {
                                    setPaymentAmount(e.target.value);
                                    if (error) setError(''); 
                                }}
                            />
                        </div>

                        {error && <p className="text-sm text-red-600">{error}</p>}

                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                onClick={onClose}
                                className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-100"
                                disabled={isLoading}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handlePaymentSubmit}
                                className="px-5 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
                                disabled={!!isSubmitDisabled} 
                            >
                                Submit Payment
                            </button>
                        </div>
                    </div>
                ) : (
                    <p>{error || "Could not load client details."}</p>
                )}
            </div>
        </div>
    );
}
