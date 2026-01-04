"use client";

import { useState, useMemo } from "react";
import * as XLSX from "xlsx";
import { InterestRow } from "./page";

type Props = {
  data: InterestRow[];
};

const formatDate = (d: Date) =>
  d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

export default function InterestTable({ data }: Props) {
  const [page, setPage] = useState(1);
  const rowsPerPage = 10;

  // ====== MONTH/YEAR FILTER ======
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  const filteredData = useMemo(() => {
    return data.filter(
      (row) =>
        row.date.getFullYear() === selectedYear &&
        row.date.getMonth() === selectedMonth
    );
  }, [data, selectedMonth, selectedYear]);

  const totalInterest = useMemo(() => {
    return filteredData.reduce((sum, row) => sum + row.interest, 0);
  }, [filteredData]);

  const totalPages = Math.ceil(filteredData.length / rowsPerPage);
  const paginated = filteredData
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice((page - 1) * rowsPerPage, page * rowsPerPage);

  // ====== EXPORT TO EXCEL ======
  const exportExcel = () => {
    const monthName = getMonthName(selectedMonth);
  
    // ===== TABLE DATA =====
    const tableRows = filteredData.map((r) => ({
      Date: formatDate(r.date),
      Amount: r.amount,
      Interest: r.interest,
    }));
  
    tableRows.push({
      Date: "TOTAL",
      Amount: 0,
      Interest: totalInterest,
    });
  
    // ===== CREATE SHEET WITH HEADERS =====
    const ws = XLSX.utils.aoa_to_sheet([
      ["Interest Report", "", ""],
      [`Month: ${monthName}`, "", ""],
      [`Year: ${selectedYear}`, "", ""],
      [], // spacer
    ]);
  
    // ===== ADD TABLE =====
    XLSX.utils.sheet_add_json(ws, tableRows, {
      origin: "A5",
    });
  
    // ===== MERGE HEADER CELLS =====
    ws["!merges"] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 2 } }, // Interest Report
      { s: { r: 1, c: 0 }, e: { r: 1, c: 2 } }, // Month
      { s: { r: 2, c: 0 }, e: { r: 2, c: 2 } }, // Year
    ];
  
    // ===== SET COLUMN WIDTHS =====
    ws["!cols"] = [
      { wch: 18 }, // Date
      { wch: 18 }, // Amount
      { wch: 18 }, // Interest
    ];
  
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Interest");
  
    XLSX.writeFile(
      wb,
      `InterestReport_${monthName}_${selectedYear}.xlsx`
    );
  };
  
  

  const getMonthName = (monthIndex: number) =>
    new Date(0, monthIndex).toLocaleString("en-US", { month: "long" });

  return (
    <div className="bg-white rounded-xl border p-6 shadow">
      {/* ====== FILTER & EXPORT ====== */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-3 text-black">
        <h2 className="text-xl font-semibold text-black">
          {getMonthName(selectedMonth)} {selectedYear} ({filteredData.length})
        </h2>

        <div className="flex items-center gap-2">
          <select
            value={selectedMonth}
            onChange={(e) => {
              setSelectedMonth(Number(e.target.value));
              setPage(1);
            }}
            className="p-2 border rounded"
          >
            {Array.from({ length: 12 }).map((_, i) => (
              <option key={i} value={i}>
                {getMonthName(i)}
              </option>
            ))}
          </select>

          <select
            value={selectedYear}
            onChange={(e) => {
              setSelectedYear(Number(e.target.value));
              setPage(1);
            }}
            className="p-2 border rounded"
          >
            {Array.from(
              { length: 5 },
              (_, i) => now.getFullYear() - i
            ).map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>

          <button
            onClick={exportExcel}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Export Excel
          </button>
        </div>
      </div>

      {/* ====== TABLE ====== */}
      <div className="overflow-x-auto lg:overflow-x-hidden">
        <div className="inline-block min-w-175 lg:min-w-full">
          <table className="min-w-full text-sm text-center border-collapse">
            <thead>
              <tr className="border-b text-gray-500">
                <th className="py-3 px-1 whitespace-nowrap">Date</th>
                <th className="py-3 px-3 whitespace-nowrap">Amount</th>
                <th className="py-3 px-3 whitespace-nowrap">Interest</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((row) => (
                <tr
                  key={row.id}
                  className="border-b hover:bg-gray-50 text-black text-sm md:text-lg"
                >
                  <td className="py-3 px-1 whitespace-nowrap">
                    {formatDate(row.date)}
                  </td>
                  <td className="py-3 px-3 font-semibold whitespace-nowrap">
                    ₱{row.amount.toLocaleString()}
                  </td>
                  <td className="py-3 px-3 whitespace-nowrap">
                    ₱{row.interest.toLocaleString()}
                  </td>
                </tr>
              ))}

              {paginated.length === 0 && (
                <tr>
                  <td colSpan={3} className="py-6 text-gray-400">
                    No data found
                  </td>
                </tr>
              )}

              {/* TOTAL ROW */}
              {paginated.length > 0 && (
                <tr className="border-t font-bold text-black text-2xl">
                  <td className="py-3 px-1">Total</td>
                  <td className="py-3 px-3"></td>
                  <td className="py-3 px-3">₱{totalInterest.toLocaleString()}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ====== PAGINATION ====== */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-5 text-black">
          <button
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
            className="px-3 py-1 border rounded disabled:opacity-50"
          >
            Prev
          </button>

          {Array.from({ length: totalPages }).map((_, i) => (
            <button
              key={i}
              onClick={() => setPage(i + 1)}
              className={`px-3 py-1 border rounded ${
                page === i + 1 ? "bg-indigo-600 text-white" : ""
              }`}
            >
              {i + 1}
            </button>
          ))}

          <button
            disabled={page === totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="px-3 py-1 border rounded disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
