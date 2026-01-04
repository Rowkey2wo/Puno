"use client";

type NavbarProps = {
  onMenuClick: () => void;
};

export default function Navbar({ onMenuClick }: NavbarProps) {
  return (
    <header className="w-full border-b border-gray-300 shadow-2xl bg-yellow-100">
      <div className="relative flex h-14 justify-center items-center px-4">
        
        {/* <h1 className="mx-auto text-3xl font-extrabold text-green-900 tracking-wide">
          PUNO
        </h1> */}
        <img src="/PunoLogo.png" className="h-40 pt-4 w-25" alt="" />
        {/* <div className="flex justify-center  border border-white">
          <img src="/PunoLogo.png" className="h-40 pt-4 w-25 border border-black" alt="" />
        </div> */}
        
        <button
          onClick={onMenuClick}
          className="absolute right-4 lg:hidden"
          aria-label="Open Menu"
        >
          <svg
            className="h-6 w-6 text-gray-700"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>
    </header>
  );
}
