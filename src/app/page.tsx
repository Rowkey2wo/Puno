"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "@/app/lib/firebase";
import ProfileCard from "@/app/Components/ProfileCard";
import PinModal from "@/app/Components/PinModal";

type User = {
  id: string;
  name: string;
  image: string;
  pin: string;
};

export default function Home() {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // 🔥 Realtime fetch users
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "Users"), snapshot => {
      const list: User[] = snapshot.docs.map(doc => {
        const data = doc.data();
  
        return {
          id: doc.id,
          name: data.name ?? "",
          image: data.image ?? "",
          pin: String(data.PIN ?? ""), // ✅ FIXED
        };
      });
  
      setUsers(list);
    });
  
    return () => unsub();
  }, []);
  
  

  const handleLoginSuccess = (user: User) => {
    sessionStorage.setItem(
      "loggedUser",
      JSON.stringify({
        id: user.id,
        name: user.name,
      })
    );

    window.location.href = "/Dashboard/Transaction";
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-yellow-50 font-sans">
      <main className="flex min-h-screen w-full max-w-5xl flex-col items-center justify-between py-5 px-16 bg-black dark:bg-yellow-50">

        <Image
          src="/Puno-WhiteTitleBG-removebg-preview.png"
          alt="Puno logo"
          width={430}
          height={0}
          priority
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mt-10">
          {users.map(user => (
            <ProfileCard
              key={user.id}
              name={user.name}
              image={user.image}
              onLogin={() => setSelectedUser(user)}
            />
          ))}
        </div>

        {selectedUser && (
          <PinModal
            user={selectedUser}
            onClose={() => setSelectedUser(null)}
            onSuccess={handleLoginSuccess}
          />
        )}

      </main>
    </div>
  );
}
