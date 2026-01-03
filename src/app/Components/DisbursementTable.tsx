"use client";

import { useState } from "react";
import { DisbursementRow } from "@/app/Dashboard/Disbursement/page";
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
    <div className="w-full rounded-xl border bg-white p-6 shadow-sm">
      <div className="flex justify-between items-center mb-4">
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
            {paginatedData.map((row) => (
              <tr
                key={row.id}
                className="border-b hover:bg-gray-50 text-black text-lg"
              >
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
        <div className="flex justify-center items-center gap-2 mt-5">
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
