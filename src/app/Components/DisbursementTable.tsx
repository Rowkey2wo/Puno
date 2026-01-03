"use client";

import { useState } from "react";
// Import DisbursementRow from the correct source file
import type { DisbursementRow } from "@/app/Dashboard/Disbursement/page"; 
import * as XLSX from "xlsx";

type DisbursementTableProps = {
  data: DisbursementRow[];
};

const formatDateForDisplay = (dateObj: Date) => {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(dateObj);
};

export default function DisbursementTable({ data }: DisbursementTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  // Calculate page count
  const totalPages = Math.ceil(data.length / rowsPerPage);

  // Slice data for current page
  const paginatedData = data.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  // Export to Excel
  const handleExportExcel = () => {
    const exportData = data.map((row) => ({
      Date: formatDateForDisplay(row.date),
      Deadline: formatDateForDisplay(row.deadline),
      "Months to Pay": row.monthsToPay,
      "Client Name": row.name,
      Amount: row.amount,
      Interest: row.interest,
      "Status/Remarks": row.status,
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Disbursements");

    XLSX.writeFile(workbook, "DisbursementData.xlsx");
  };

  return (
    <div className="w-full p-6 rounded-xl border bg-white shadow-sm">
      <div className="flex justify-between items-center p-6 mb-4">
        <h2 className="text-xl font-semibold text-black">
          Results ({data.length} records)
        </h2>
        <button
          onClick={handleExportExcel}
          className="px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          Export to Excel
        </button>
      </div>

      {/* TABLE WRAPPER: overflow-x-auto by default, visible on large screens */}
      <div className="overflow-x-auto lg:overflow-x-visible">
        {/* TABLE: min-w-max ensures table won't shrink below its content width, forcing overflow on small screens */}
        <table className="min-w-max w-full border-collapse text-sm text-center">
          <thead>
            <tr className="border-b text-gray-500">
              <th className="py-3 px-4 font-medium border-r whitespace-nowrap">Date</th>
              <th className="py-3 px-4 font-medium border-r whitespace-nowrap">Deadline</th>
              <th className="py-3 px-4 font-medium border-r whitespace-nowrap">Month/s</th>
              <th className="py-3 px-4 font-medium whitespace-nowrap">Client Name</th>
              <th className="py-3 px-4 font-medium whitespace-nowrap">Amount</th>
              <th className="py-3 px-4 font-medium whitespace-nowrap">Interest</th>
              <th className="py-3 px-4 font-medium whitespace-nowrap">Status/Remarks</th>
              <th className="py-3 px-4 font-medium whitespace-nowrap">Actions</th>
            </tr>
          </thead>

          <tbody>
            {paginatedData.map((row) => (
              // The key uses row.id which is now correctly typed as a string
              <tr
                key={row.id} 
                className="border-b hover:bg-gray-50 text-black text-lg"
              >
                <td className="py-4 px-4 border-r whitespace-nowrap">{formatDateForDisplay(row.date)}</td>
                <td className="py-4 px-4 border-r whitespace-nowrap">{formatDateForDisplay(row.deadline)}</td>
                <td className="py-4 px-4 border-r whitespace-nowrap">{row.monthsToPay}</td>
                <td className="py-4 px-4 whitespace-nowrap">{row.name}</td>
                <td className="py-4 px-4 font-semibold whitespace-nowrap">{row.amount.toLocaleString()}</td>
                <td className="py-4 px-4 whitespace-nowrap">{row.interest.toLocaleString()}</td>
                <td className="py-4 px-4 whitespace-nowrap">{row.status}</td>
                <td className="py-4 flex justify-center gap-2 px-4 whitespace-nowrap">
                  <button className="rounded-lg border p-2 bg-yellow-400 hover:bg-yellow-600">
                    ✏️
                  </button>
                  <button className="rounded-lg border p-2 bg-red-500 hover:bg-red-700">
                    🗑️
                  </button>
                </td>
              </tr>
            ))}

            {paginatedData.length === 0 && (
              <tr>
                <td colSpan={8} className="py-10 text-center text-gray-400">
                  No records found for this selection.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* PAGINATION CONTROLS */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-5 text-black p-6 pt-0">
          <button
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="px-3 py-1 border rounded disabled:opacity-50"
          >
            Prev
          </button>

          {Array.from({ length: totalPages }).map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentPage(i + 1)}
              className={`px-3 py-1 border rounded ${
                currentPage === i + 1 ? "bg-indigo-600 text-white" : ""
              }`}
            >
              {i + 1}
            </button>
          ))}

          <button
            onClick={() =>
              setCurrentPage((prev) => Math.min(prev + 1, totalPages))
            }
            disabled={currentPage === totalPages}
            className="px-3 py-1 border rounded disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
