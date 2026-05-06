import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Resolve um username pra email pra permitir login com username.
// Usa service_role pq email não é exposto na tabela profiles publicamente.

export async function POST(req: NextRequest) {
  try {
    const { username } = await req.json();
    if (!username || typeof username !== "string") {
      return NextResponse.json({ error: "Username inválido" }, { status: 400 });
    }

    const cleanUsername = username.toLowerCase().replace(/[^a-z0-9_]/g, "");
    if (!cleanUsername) {
      return NextResponse.json({ error: "Username inválido" }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: "Configuração ausente" }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Busca profile pelo username
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", cleanUsername)
      .maybeSingle();

    if (error || !profile) {
      return NextResponse.json({ error: "Username não encontrado" }, { status: 404 });
    }

    // Pega email do auth.users
    const { data: userData } = await supabase.auth.admin.getUserById(profile.id);
    if (!userData?.user?.email) {
      return NextResponse.json({ error: "Email não encontrado" }, { status: 404 });
    }

    return NextResponse.json({ email: userData.user.email });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Erro" }, { status: 500 });
  }
}
