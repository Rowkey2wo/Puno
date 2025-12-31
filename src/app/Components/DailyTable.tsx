// components/DailyTable_Alternative.tsx 

"use client";

import { useState } from "react";

// The input 'date' property is now assumed to be in the "Dec 28, 2025" format
type Row = {
  name: string;
  amount: number;
  date: string; 
};

type DateFilterType = "all" | "year" | "month" | "day";

// We don't need a display formatter anymore, the input is already formatted.

export default function DailyTable({ data }: { data: Row[] }) {
  const [dateFilterType, setDateFilterType] = useState<DateFilterType>("all");
  const [dateValue, setDateValue] = useState("");

  const filteredData = data.filter((row) => {
    if (dateFilterType === "all" || !dateValue) return true;

    // Convert the display date string (e.g., "Dec 28, 2025") into a JS Date object
    const rowDateObj = new Date(row.date);

    if (isNaN(rowDateObj.getTime())) return false; // Skip invalid dates

    if (dateFilterType === "year") {
      // dateValue is "2025"
      return rowDateObj.getFullYear().toString() === dateValue;
    }

    if (dateFilterType === "month") {
      // dateValue is "YYYY-MM" (e.g., "2025-12") from the input type="month"
      const [filterYear, filterMonth] = dateValue.split('-');
      
      return (
        rowDateObj.getFullYear().toString() === filterYear &&
        // getMonth() is 0-indexed (0=Jan), but input month is 1-indexed (12=Dec)
        (rowDateObj.getMonth() + 1).toString().padStart(2, '0') === filterMonth
      );
    }

    if (dateFilterType === "day") {
      // dateValue is "YYYY-MM-DD" (e.g., "2025-12-28") from the input type="date"
      const [filterYear, filterMonth, filterDay] = dateValue.split('-');

      return (
        rowDateObj.getFullYear().toString() === filterYear &&
        (rowDateObj.getMonth() + 1).toString().padStart(2, '0') === filterMonth &&
        rowDateObj.getDate().toString().padStart(2, '0') === filterDay
      );
    }

    return true;
  });

  return (
    <div className="w-full rounded-xl border bg-white p-6 shadow-sm">
      {/* ... (Filter UI remains the same, it handles the different input formats automatically) ... */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4 text-black">
        <div className="flex flex-wrap items-center gap-3">
          {/* FILTER TYPE */}
          <select
            value={dateFilterType}
            onChange={(e) => {
              setDateFilterType(e.target.value as DateFilterType);
              setDateValue(""); // Clear the value when changing filter type
            }}
            className="bg-gray-50 border border-gray-300 rounded-lg px-4 py-2 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Dates</option>
            <option value="year">By Year</option>
            <option value="month">By Month</option>
            <option value="day">By Day</option>
          </select>

          {/* YEAR PICKER */}
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

          {/* MONTH PICKER */}
          {dateFilterType === "month" && (
            <input
              type="month"
              value={dateValue}
              onChange={(e) => setDateValue(e.target.value)}
              className="bg-gray-50 border border-gray-300 rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
          )}

          {/* DAY PICKER */}
          {dateFilterType === "day" && (
            <input
              type="date"
              value={dateValue}
              onChange={(e) => setDateValue(e.target.value)}
              className="bg-gray-50 border border-gray-300 rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
          )}
        </div>

        <button className="flex items-center gap-2 text-green-900 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-gray-200">
          <span className="text-lg">+</span> Export
        </button>
      </div>

      {/* TABLE */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm text-center">
          <thead>
            <tr className="border-b text-gray-500">
              <th className="py-3 font-medium">Date</th>
              <th className="py-3 font-medium">Name</th>
              <th className="py-3 font-medium">Amount</th>
              <th className="py-3 font-medium">Actions</th>
            </tr>
          </thead>

          <tbody>
            {filteredData.map((row, idx) => (
              <tr key={idx} className="border-b hover:bg-gray-50 text-black text-lg">
                {/* We use the input format directly as it is already the display format */}
                <td className="py-4">{row.date}</td> 
                <td className="py-4">{row.name}</td>
                <td className="py-4 font-semibold">{row.amount.toLocaleString()}</td>
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

        {filteredData.length === 0 && (
          <div className="py-10 text-center text-gray-400">
            No records found for this selection.
          </div>
        )}
      </div>
    </div>
  );
}
