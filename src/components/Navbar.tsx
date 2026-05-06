"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase-client";
import { useRouter } from "next/navigation";

export default function Navbar() {
  const [user, setUser] = useState<any>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user || null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function logout() {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <nav className="absolute top-7 left-0 right-0 z-30 px-8 py-6">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Link href="/" className="group flex items-baseline gap-1">
          <span className="font-display text-2xl tracking-tight text-bone-100">
            Foot
          </span>
          <span className="font-display italic text-2xl text-moss-500 group-hover:text-moss-400 transition">
            Priv
          </span>
        </Link>

        <div className="flex items-center gap-8 text-xs uppercase tracking-[0.2em] font-mono">
          {user ? (
            <>
              <Link href="/dashboard" className="text-bone-100 hover:text-moss-500 transition">
                Meu leilão
              </Link>
              <button onClick={logout} className="text-ink-600 hover:text-bone-100 transition">
                Sair
              </button>
            </>
          ) : (
            <>
              <Link href="/feed" className="text-bone-100/70 hover:text-bone-100 transition hidden sm:block">
                Galeria
              </Link>
              <Link href="/login" className="text-bone-100/70 hover:text-bone-100 transition">
                Entrar
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
