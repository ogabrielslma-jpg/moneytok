import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Endpoint admin que retorna todos os cadastros com foto + respostas + email.
// Protegido por header x-admin-password (mesma senha do painel).

export async function GET(req: NextRequest) {
  // Auth simples por header
  const password = req.headers.get("x-admin-password");
  const expected = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || "footfans2026";
  if (password !== expected) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({
      error: "SUPABASE_SERVICE_ROLE_KEY não configurada nas variáveis de ambiente",
      hint: "Adicione no Vercel → Settings → Environment Variables",
    }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    // Busca todas as listings (que representam cada envio de foto)
    const { data: listings, error: listingsError } = await supabase
      .from("listings")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);

    if (listingsError) {
      return NextResponse.json({ error: listingsError.message }, { status: 500 });
    }

    if (!listings || listings.length === 0) {
      return NextResponse.json({ submissions: [], total: 0 });
    }

    // Pega lista única de seller_ids
    const sellerIds = Array.from(new Set(listings.map((l) => l.seller_id).filter(Boolean)));

    // Busca profiles em batch
    const { data: profiles } = await supabase
      .from("profiles")
      .select("*")
      .in("id", sellerIds);

    const profileById = new Map((profiles || []).map((p) => [p.id, p]));

    // Busca emails do auth.users em batch
    const userById = new Map<string, any>();
    for (const userId of sellerIds) {
      try {
        const { data: userData } = await supabase.auth.admin.getUserById(userId);
        if (userData?.user) {
          userById.set(userId, userData.user);
        }
      } catch {}
    }

    // Combina tudo
    const submissions = listings.map((listing) => {
      const profile = profileById.get(listing.seller_id);
      const user = userById.get(listing.seller_id);

      // Parse das respostas que vêm na description ("Tatuagem: x | Esmalte: y | ...")
      const parsedAnswers: Record<string, string> = {};
      if (listing.description) {
        const parts = String(listing.description).split("|").map((s: string) => s.trim());
        parts.forEach((part: string) => {
          const colonIdx = part.indexOf(":");
          if (colonIdx > 0) {
            const k = part.substring(0, colonIdx).trim();
            const v = part.substring(colonIdx + 1).trim();
            if (k && v) parsedAnswers[k] = v;
          }
        });
      }

      return {
        id: listing.id,
        listing_id: listing.id,
        user_id: listing.seller_id,
        username: profile?.username || null,
        bio: profile?.bio || null,
        email: user?.email || null,
        phone: user?.phone || user?.user_metadata?.phone || null,
        full_name: user?.user_metadata?.full_name || null,
        image_url: listing.image_url,
        rarity: listing.rarity,
        current_bid: listing.current_bid,
        bid_count: listing.bid_count,
        starting_price: listing.starting_price,
        answers: parsedAnswers,
        raw_description: listing.description,
        created_at: listing.created_at,
        user_created_at: user?.created_at,
        last_sign_in_at: user?.last_sign_in_at,
        email_confirmed_at: user?.email_confirmed_at,
      };
    });

    // Calcula stats
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    const oneWeek = 7 * oneDay;
    const stats = {
      total: submissions.length,
      today: submissions.filter((s) => {
        const t = new Date(s.created_at).getTime();
        return now - t < oneDay;
      }).length,
      this_week: submissions.filter((s) => {
        const t = new Date(s.created_at).getTime();
        return now - t < oneWeek;
      }).length,
      unique_users: sellerIds.length,
    };

    return NextResponse.json({ submissions, stats });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Erro" }, { status: 500 });
  }
}
