"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

type SidebarProps = {
  isOpen: boolean;
  onClose: () => void;
};

const menuItems = [
  { label: "Transactions", path: "/Dashboard/Transaction" },
  { label: "Daily List", path: "/Dashboard/DailyList" },
  { label: "Disbursement List", path: "/Dashboard/Disbursement" },
  { label: "I - Report", path: "/Dashboard/I-Report" },
  { label: "Expenses", path: "/Dashboard/Expenses" },
];

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const [userName, setUserName] = useState("NAME");

  // ✅ Get logged-in user from sessionStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedUser = sessionStorage.getItem("loggedUser");
      if (storedUser) {
        try {
          const parsed = JSON.parse(storedUser);
          setUserName(parsed.name || "NAME");
        } catch (e) {
          console.error("Failed to parse loggedUser:", e);
        }
      }
    }
  }, []);

  // Only these users can see I-Report
  const allowedIReportUsers = ["Ruki", "Kim Teene"];

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-transparent lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`
          fixed z-40 h-screen w-64 bg-green-950 text-white
          transform transition-transform duration-300
          lg:static lg:translate-x-0
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        <div className="px-6 py-4 text-xl font-semibold">
          {userName}
        </div>

        <hr className="border-gray-700" />

        <nav className="flex-1 px-4 py-4">
          <ul className="space-y-3">
            {menuItems.map((item) => {
              // ✅ Hide I-Report if user is not allowed
              if (
                item.label === "I - Report" &&
                !allowedIReportUsers.includes(userName)
              ) {
                return null;
              }

              const isActive =
                pathname === item.path ||
                pathname.startsWith(item.path + "/");

              return (
                <li key={item.path}>
                  <Link
                    href={item.path}
                    className={`block rounded px-3 py-2 cursor-pointer
                      ${
                        isActive
                          ? "bg-gray-200 text-black font-bold"
                          : "hover:bg-gray-500"
                      }
                    `}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="px-4 py-4">
          <hr className="border-gray-700 mb-4" />
          <button
            className="w-full rounded px-3 py-2 text-left text-red-400 hover:bg-gray-800"
            onClick={() => {
              sessionStorage.removeItem("loggedUser");
              window.location.href = "/";
            }}
          >
            Logout →
          </button>
        </div>
      </aside>
    </>
  );
}
