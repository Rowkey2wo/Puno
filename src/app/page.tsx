import Image from "next/image";
import ProfileCard from "@/app/Components/ProfileCard";

const people = [
  {
    name: "Mama Engkis",
    image:
      "/Mader.png",
  },
  {
    name: "Kim Teene",
    image:
      "Teene.jpg",
  },{
    name: "Boss Ruki",
    image:
      "Ruki.jpg",
  },
];

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-yellow-50 font-sans">
      <main className="flex min-h-screen w-full max-w-5xl flex-col items-center justify-between py-5 px-16 bg-black dark:bg-yellow-50">
        <Image
          className="border-amber-500"
          src="/Puno-WhiteTitleBG-removebg-preview.png"
          alt="Puno logo"
          width={430}
          height={0}
          priority
        />
        
        <div className="flex flex-col items-center gap-6 text-center md:items-start sm:text-left">
          <div className="grid grid-cols-1 gap-15 md:grid-cols-3">
            {people.map((person, index) =>(<ProfileCard key={index}{...person}/>))}
          </div>
        </div>
      </main>
    </div>
  );
}
