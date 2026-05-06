import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Lista PIX pendentes (não pagos) com dados do usuário
// Auth via header x-admin-password

export async function GET(req: NextRequest) {
  try {
    const password = req.headers.get("x-admin-password");
    const expected = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || "footfans2026";
    if (password !== expected) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json(
        { error: "Servidor mal configurado: SUPABASE_SERVICE_ROLE_KEY ausente." },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // PIX gerados nos últimos 3 dias e ainda não pagos
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();

    const { data: subs, error: subsError } = await supabase
      .from("subscriptions")
      .select("id, user_id, plan_id, amount_cents, status, created_at, gateway_sale_id")
      .neq("status", "paid")
      .gte("created_at", threeDaysAgo)
      .order("created_at", { ascending: false });

    if (subsError) {
      return NextResponse.json({ error: subsError.message }, { status: 500 });
    }

    if (!subs || subs.length === 0) {
      return NextResponse.json({ pending: [], stats: { total: 0, last24h: 0, last72h: 0 } });
    }

    // Busca profiles dos users
    const userIds = Array.from(new Set(subs.map((s: any) => s.user_id)));
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, username, full_name, bio")
      .in("id", userIds);

    // Busca user_state pra pegar walletBalance e currentBidBRL
    const { data: states } = await supabase
      .from("user_state")
      .select("user_id, data")
      .in("user_id", userIds);

    // Busca emails + telefones via auth admin
    const enriched = await Promise.all(
      subs.map(async (sub: any) => {
        const profile = profiles?.find((p: any) => p.id === sub.user_id);
        const userState = states?.find((s: any) => s.user_id === sub.user_id);
        const stateData = userState?.data || {};
        let email = "—";
        let phone = "";
        let firstName = "";
        try {
          const { data: userData } = await supabase.auth.admin.getUserById(sub.user_id);
          if (userData?.user) {
            email = userData.user.email || "—";
            phone = userData.user.phone || (userData.user.user_metadata?.phone as string) || "";
            firstName = (userData.user.user_metadata?.first_name as string) || "";
          }
        } catch {}

        const planMap: Record<string, { name: string; yearly: number }> = {
          starter: { name: "Creator", yearly: 79 },
          creator: { name: "Creator Advanced", yearly: 99 },
          super: { name: "Top Creator", yearly: 109 },
        };
        const plan = planMap[sub.plan_id] || { name: sub.plan_id, yearly: 0 };

        return {
          id: sub.id,
          user_id: sub.user_id,
          username: profile?.username || "",
          full_name: profile?.full_name || firstName || "",
          first_name: firstName || (profile?.full_name?.split(" ")[0] || profile?.username || ""),
          email,
          phone,
          plan_id: sub.plan_id,
          plan_name: plan.name,
          plan_value: plan.yearly,
          status: sub.status,
          created_at: sub.created_at,
          // Dados do leilão da pessoa
          wallet_balance: typeof stateData.walletBalance === "number" ? stateData.walletBalance : 0,
          current_bid: typeof stateData.currentBidBRL === "number" ? stateData.currentBidBRL : 0,
          has_sold: !!stateData.hasSold,
        };
      })
    );

    // Filtra só quem tem telefone (opção A do user)
    const withPhone = enriched.filter((s) => s.phone && s.phone.length > 0);

    // Stats
    const now = Date.now();
    const stats = {
      total: withPhone.length,
      last24h: withPhone.filter((s) => now - new Date(s.created_at).getTime() < 24 * 60 * 60 * 1000).length,
      last72h: withPhone.filter((s) => now - new Date(s.created_at).getTime() < 72 * 60 * 60 * 1000).length,
    };

    return NextResponse.json({ pending: withPhone, stats });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Erro" }, { status: 500 });
  }
}
