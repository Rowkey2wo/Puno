// components/AddPaymentModal.tsx

'use client';

import { useState, useEffect, useCallback } from 'react';
import { db } from '@/app/lib/firebase';
import { doc, getDoc, collection, Timestamp, runTransaction, onSnapshot } from 'firebase/firestore';

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

    const [showPinModal, setShowPinModal] = useState(false);
    const [pin, setPin] = useState('');
    const [pinError, setPinError] = useState('');

    const [users, setUsers] = useState<{ id: string; name: string }[]>([]);
    const [selectedUserId, setSelectedUserId] = useState<string>('');

    // Fetch client balance
    const fetchClientBalance = useCallback(async () => {
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

    // Listen to User collection for all users
    const listenUsers = useCallback(() => {
        const unsubscribe = onSnapshot(collection(db, 'Users'), (snapshot) => {
            const usersList: { id: string; name: string }[] = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                usersList.push({ id: doc.id, name: data.name });
            });
            setUsers(usersList);
            if (usersList.length > 0) setSelectedUserId(usersList[0].id); // default first user
        }, (err) => {
            console.error("Failed to listen users:", err);
            setPinError("Failed to fetch users.");
        });
        return unsubscribe;
    }, []);

    useEffect(() => {
        if (open) {
            fetchClientBalance();
            const unsubscribeUsers = listenUsers();
            setPaymentAmount('');
            setPin('');
            setPinError('');
            return () => unsubscribeUsers();
        }
    }, [open, fetchClientBalance, listenUsers]);

    if (!open) return null;

    // Step 1: Submit payment click
    const handlePaymentSubmit = () => {
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

        setShowPinModal(true);
    };

    // Step 2: Confirm PIN
    const handlePinConfirm = async () => {
        if (!selectedUserId) {
            setPinError('Please select a user.');
            return;
        }

        try {
            const userRef = doc(db, 'Users', selectedUserId);
            const userSnap = await getDoc(userRef);

            if (!userSnap.exists()) {
                setPinError('User not found.');
                return;
            }

            const userData = userSnap.data();
            console.log('Selected User ID:', selectedUserId);
            console.log('User Data:', userData);
            console.log('Stored PIN:', userData.PIN);
            console.log('Entered PIN:', pin);
            
            // Handle both string and number PINs, and check both PIN and pin field names
            const storedPin = String(userData.PIN ?? userData.pin ?? '');
            const enteredPin = String(pin);
            
            if (enteredPin !== storedPin) {
                setPinError('Incorrect PIN. Please try again.');
                return;
            }

            setPinError('');
            setShowPinModal(false);
            await processPayment();

        } catch (err) {
            console.error('PIN verification error:', err);
            setPinError('Failed to verify PIN.');
        }
    };

    // Step 3: Process payment
    const processPayment = async () => {
        const amount = Number(paymentAmount);
        if (!clientInfo) return;
        
        if (!currentDisbursementId || currentDisbursementId === 'N/A') {
            console.error("Error: currentDisbursementId is missing during processPayment.");
            setError('Internal error: Missing disbursement ID.');
            setIsLoading(false);
            return; 
        }

        setIsLoading(true);

        try {
            const newBalance = clientInfo.balance - amount;
            const newClientStatus = newBalance <= 0 ? 'Paid' : clientInfo.status;
            const newDisbursementStatus = newBalance <= 0 ? 'Paid' : '';

            await runTransaction(db, async (transaction) => {
                const clientRef = doc(db, 'Clients', clientId);
                transaction.update(clientRef, {
                    Balance: newBalance,
                    Status: newClientStatus,
                });

                const newPaymentRef = doc(collection(db, "DailyList")); 
                transaction.set(newPaymentRef, { 
                    clientId,
                    Amount: amount,
                    DateToday: Timestamp.now(),
                    DisbursementID: currentDisbursementId,
                });

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
            setPin('');
        }
    };

    // FIX APPLIED HERE: Use an IIFE to wrap the logic.
    // The IIFE returns a definitive 'boolean' value, satisfying the strict prop type check.
    const isSubmitDisabled = (() => {
        const isIdMissing = !currentDisbursementId || currentDisbursementId === 'N/A';
        const isAmountInvalid = isNaN(Number(paymentAmount)) || Number(paymentAmount) <= 0;
        const isOverBalance = clientInfo ? Number(paymentAmount) > clientInfo.balance : false;

        return isLoading || isAmountInvalid || isIdMissing || isOverBalance;
    })();


    return (
        <>
        {/* Main Add Payment Modal */}
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 px-4">
            <div className="bg-white p-6 rounded-lg shadow-2xl w-full max-w-lg">
                <h2 className="text-2xl font-bold mb-4">Add Payment</h2>
                {error && <p className="text-red-500 mb-4">{error}</p>}
                {clientInfo && (
                    <div className="mb-4 p-3 bg-gray-100 rounded">
                        <p className="text-lg">Current Balance: <strong>₱{clientInfo.balance.toLocaleString()}</strong></p>
                        {/* <p>Status: {clientInfo.status}</p>
                        <p>Active Disbursement ID: {currentDisbursementId || 'N/A'}</p> */}
                    </div>
                )}
                
                {!showPinModal ? (
                    // Payment Input View
                    <div>
                        <input
                            type="number"
                            placeholder="Enter Amount"
                            value={paymentAmount}
                            onChange={(e) => setPaymentAmount(e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded mb-4"
                            disabled={isLoading}
                        />
                        <div className="flex justify-end space-x-3">
                            <button onClick={onClose} className="px-4 py-2 border rounded">Cancel</button>
                            <button 
                                onClick={handlePaymentSubmit} 
                                className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
                                disabled={isSubmitDisabled} 
                            >
                                Submit Payment
                            </button>
                        </div>
                    </div>
                ) : (
                    // PIN Confirmation View
                    <div>
                        <p className="mb-4">Select user:</p>
                        {pinError && <p className="text-red-500 mb-4">{pinError}</p>}
                        
                        <select 
                            value={selectedUserId} 
                            onChange={(e) => setSelectedUserId(e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded mb-4"
                        >
                            {users.map(user => (
                                <option key={user.id} value={user.id}>{user.name}</option>
                            ))}
                        </select>
                        
                        <input
                            type="password"
                            placeholder="Enter PIN"
                            value={pin}
                            onChange={(e) => setPin(e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded mb-4"
                            disabled={isLoading}
                        />
                        <div className="flex justify-end space-x-3">
                            <button onClick={() => setShowPinModal(false)} className="px-4 py-2 border rounded">Back</button>
                            <button 
                                onClick={handlePinConfirm} 
                                className="px-4 py-2 bg-green-600 text-white rounded disabled:opacity-50"
                                disabled={isLoading || !selectedUserId || pin.length === 0}
                            >
                                Confirm
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
        </>
    );
}