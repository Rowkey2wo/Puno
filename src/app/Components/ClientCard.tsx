"use client";
import React from "react";

export type Status = "OnGoing"|"Recon"|"Overdue"|"Paid"

type ClientCardProps = {
    image: string;
    name: string;
    nickname?: string;
    status: Status;
};

const statusStyles: Record<Status, string> = {
  OnGoing: "bg-blue-600",
  Recon: "bg-yellow-400",
  Overdue: "bg-red-500",
  Paid: "bg-green-600",
};
const BorderStyle: Record<Status, string> = {
  OnGoing: "border-blue-200",
  Recon: "border-yellow-200",
  Overdue: "border-red-200",
  Paid: "border-green-200",
};

export default function ClientCard({
    image,
    name,
    nickname,
    status
  }: ClientCardProps) {
  const [visible, setVisible] = React.useState(false);
  const [position, setPosition] = React.useState({ x: 0, y: 0 });
  const divRef = React.useRef<HTMLDivElement | null>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!divRef.current) return;
    const bounds = divRef.current.getBoundingClientRect();
    setPosition({
      x: e.clientX - bounds.left,
      y: e.clientY - bounds.top,
    });
  };

  return (
      <div className={`relative bg-white h-80 border-5 pt-4 w-full rounded-[10px] flex flex-col items-center text-center ${BorderStyle[status]}`}>
        <div className="absolute w-full flex justify-end h-5 px-2">
          <p className={`rounded-full h-5 w-5 ${statusStyles[status]}`}></p>
        </div>
        <img src={image} alt="Client Image" className="w-40 h-40 rounded-full shadow-md mb-5 border-2 mt-7"/>
        <h2 className="text-2xl text-black font-bold my-2">{name}</h2>
        <p className="text-sm text-gray-400">{nickname}</p>
      </div>
  );
}
