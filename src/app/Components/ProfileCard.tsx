"use client";
import React from "react";

type ProfileCardProps = {
  image: string;
  name: string;
  onLogin: () => void;
};

export default function ProfileCard({ image, name, onLogin }: ProfileCardProps) {
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
    <div
      ref={divRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      className="relative w-full h-80 rounded-xl bg-white overflow-hidden shadow-lg p-2"
    >
      {visible && (
        <div
          className="pointer-events-none blur-xl bg-linear-to-r from-blue-400 via-indigo-500 to-purple-500 size-60 absolute z-0"
          style={{ top: position.y - 120, left: position.x - 120 }}
        />
      )}

      <div className="relative z-10 bg-white h-full pt-4 rounded-[10px] flex flex-col items-center text-center px-10">
        <img
          src={image}
          alt={name}
          className="w-40 h-40 rounded-full shadow-md mb-5 border-2"
        />
        <h2 className="text-2xl text-green-800 font-bold">{name}</h2>

        <button
          onClick={onLogin}
          className="bg-indigo-600 mt-4 px-6 py-2 font-medium rounded text-white w-full hover:bg-indigo-700"
        >
          LOGIN
        </button>
      </div>
    </div>
  );
}
