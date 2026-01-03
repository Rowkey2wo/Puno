// app/Components/DisbursementTable.tsx

"use client"; // Can be client component as it relies on props from client page

// Import the type definition from the source page
import { DisbursementRow } from "@/app/Dashboard/Disbursement/page"; 

// Define the Props type explicitly
type DisbursementTableProps = {
  data: DisbursementRow[];
};

// Helper function to format Date objects for display (e.g., "Dec 25, 2025")
const formatDateForDisplay = (dateObj: Date) => {
    return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    }).format(dateObj);
};


// Assign the props type to the function signature using destructuring
export default function DisbursementTable({ data }: DisbursementTableProps) {

  return (
    <div className="w-full rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold mb-4 text-black">Results ({data.length} records)</h2>
      
        {/* TABLE */}
        <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm text-center">
            <thead>
                <tr className="border-b text-gray-500">
                <th className="py-3 font-medium border-r">Date</th>
                <th className="py-3 font-medium border-r">Deadline</th>
                <th className="py-3 font-medium border-r">Month/s</th>
                <th className="py-3 font-medium">Client Name</th>
                <th className="py-3 font-medium">Amount</th>
                <th className="py-3 font-medium">Interest</th>
                <th className="py-3 font-medium">Status/Remarks</th>
                <th className="py-3 font-medium">Actions</th>
                </tr>
            </thead>

            <tbody>
                {data.map((row) => (
                <tr key={row.id} className="border-b hover:bg-gray-50 text-black text-lg">
                    <td className="py-4 border-r">{formatDateForDisplay(row.date)}</td>
                    <td className="py-4 border-r">{formatDateForDisplay(row.deadline)}</td>
                    <td className="py-4 border-r">{row.monthsToPay}</td>
                    <td className="py-4">{row.name}</td>
                    <td className="py-4 font-semibold">{row.amount.toLocaleString()}</td>
                    <td className="py-4">{row.interest.toLocaleString()}</td>
                    <td className="py-4">{row.status}</td>
                    <td className="py-4 flex justify-center gap-2">
                    <button className="rounded-lg border p-2 bg-yellow-400 hover:bg-yellow-600">
                        ✏️
                    </button>
                    <button className="rounded-lg border p-2 bg-red-500 hover:bg-red-700">
                        🗑️
                    </button>
                    </td>
                </tr>
                ))}
            </tbody>
            </table>

            {data.length === 0 && (
            <div className="py-10 text-center text-gray-400">
                No records found for this selection.
            </div>
            )}
        </div>
    </div>
  );
}
