// components/DailyTable.tsx

"use client";

import { useState } from "react";
import UpdateDailyModal from "@/app/Dashboard/DailyList/UpdateDailyModal";
import DeleteDailyModal from "@/app/Dashboard/DailyList/DeleteDailyModal";
import * as XLSX from "xlsx";

// Row type
type Row = {
  id: string;
  clientId: string;
  name: string;
  amount: number;
  date: string; // "Dec 28, 2025"
};

type DateFilterType = "all" | "year" | "month" | "day";

export default function DailyTable({ data }: { data: Row[] }) {
  const [dateFilterType, setDateFilterType] = useState<DateFilterType>("all");
  const [dateValue, setDateValue] = useState("");
  const [editRow, setEditRow] = useState<Row | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const todayStr = new Date().toLocaleDateString("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  // Filter logic
  const filteredData = data.filter((row) => {
    const rowDateObj = new Date(row.date);
    if (isNaN(rowDateObj.getTime())) return false;

    // 1️⃣ If "all" filter is selected AND no specific date filter value, show only today
    if (dateFilterType === "all" && !dateValue) {
      return row.date === todayStr;
    }

    // 2️⃣ Apply filters if user selected a specific date
    if (dateFilterType === "year") {
      return rowDateObj.getFullYear().toString() === dateValue;
    }

    if (dateFilterType === "month") {
      const [filterYear, filterMonth] = dateValue.split("-");
      return (
        rowDateObj.getFullYear().toString() === filterYear &&
        (rowDateObj.getMonth() + 1).toString().padStart(2, "0") === filterMonth
      );
    }

    if (dateFilterType === "day") {
      const [filterYear, filterMonth, filterDay] = dateValue.split("-");
      return (
        rowDateObj.getFullYear().toString() === filterYear &&
        (rowDateObj.getMonth() + 1).toString().padStart(2, "0") === filterMonth &&
        rowDateObj.getDate().toString().padStart(2, "0") === filterDay
      );
    }

    // fallback, show all if somehow none matched
    return true;
  });

  // Excel Export
  const exportToExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(
      filteredData.map((row) => ({
        Date: row.date,
        Name: row.name,
        Amount: row.amount,
      }))
    );
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "DailyPayments");
    XLSX.writeFile(workbook, "DailyPayments.xlsx");
  };

  return (
    <div className="w-full rounded-xl border bg-white p-6 shadow-lg">
      {/* Filter + Export */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4 text-black">
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={dateFilterType}
            onChange={(e) => {
              setDateFilterType(e.target.value as DateFilterType);
              setDateValue(""); // clear filter value on type change
            }}
            className="bg-gray-50 border border-gray-300 rounded-lg px-4 py-2 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Dates</option>
            <option value="year">By Year</option>
            <option value="month">By Month</option>
            <option value="day">By Day</option>
          </select>

          {dateFilterType === "year" && (
            <input
              type="number"
              placeholder="YYYY"
              min="2000"
              max="2100"
              value={dateValue}
              onChange={(e) => setDateValue(e.target.value)}
              className="w-28 bg-gray-50 border border-gray-300 rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
          )}

          {dateFilterType === "month" && (
            <input
              type="month"
              value={dateValue}
              onChange={(e) => setDateValue(e.target.value)}
              className="bg-gray-50 border border-gray-300 rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
          )}

          {dateFilterType === "day" && (
            <input
              type="date"
              value={dateValue}
              onChange={(e) => setDateValue(e.target.value)}
              className="bg-gray-50 border border-gray-300 rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
          )}
        </div>

        <button
          onClick={exportToExcel}
          className="flex items-center gap-2 text-green-900 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-green-50 transition-colors"
        >
          <span className="text-lg">📥</span> Export
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm text-center shadow-sm">
          <thead className="bg-gray-100 sticky top-0 z-10">
            <tr className="border-b text-gray-500 uppercase text-xs">
              <th className="py-3 px-2 font-medium">Date</th>
              <th className="py-3 px-2 font-medium">Name</th>
              <th className="py-3 px-2 font-medium">Amount</th>
              <th className="py-3 px-2 font-medium">Actions</th>
            </tr>
          </thead>

          <tbody>
            {filteredData.map((row, idx) => (
              <tr
                key={idx}
                className="border-b hover:bg-blue-50 transition-colors text-black text-lg"
              >
                <td className="py-4 px-2">{row.date}</td>
                <td className="py-4 px-2">{row.name}</td>
                <td className="py-4 px-2 font-semibold">₱{row.amount.toLocaleString()}</td>
                <td className="py-4 px-2 flex justify-center gap-2">
                  <button
                    onClick={() => setEditRow(row)}
                    className="rounded-lg border p-2 bg-yellow-400 hover:bg-yellow-600 transition-colors"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => setDeleteId(row.id)}
                    className="rounded-lg border p-2 bg-red-500 hover:bg-red-700 transition-colors"
                  >
                    🗑️
                  </button>
                </td>
              </tr>
            ))}

            {filteredData.length === 0 && (
              <tr>
                <td colSpan={4} className="py-10 text-gray-400 text-center">
                  No records found for this selection.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modals */}
      {editRow && (
        <UpdateDailyModal
          open={true}
          row={editRow}
          onClose={() => setEditRow(null)}
        />
      )}

      {deleteId && (
        <DeleteDailyModal
          open={true}
          id={deleteId}
          onClose={() => setDeleteId(null)}
        />
      )}
    </div>
  );
}
