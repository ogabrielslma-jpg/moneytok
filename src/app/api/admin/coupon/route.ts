import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Cria cupom de 47% off pra um user. Auth via x-admin-password.

export async function POST(req: NextRequest) {
  try {
    const password = req.headers.get("x-admin-password");
    const expected = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || "footfans2026";
    if (password !== expected) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { user_id, discount_pct } = await req.json();
    if (!user_id) {
      return NextResponse.json({ error: "user_id obrigatório" }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: "Servidor mal configurado" }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Expira em 6 horas
    const expiresAt = new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString();

    // Invalida cupons anteriores ativos do user (não acumula)
    await supabase
      .from("coupons")
      .update({ status: "replaced" })
      .eq("user_id", user_id)
      .eq("status", "active");

    // Cria novo
    const { data, error } = await supabase
      .from("coupons")
      .insert({
        user_id,
        discount_pct: discount_pct || 47,
        status: "active",
        expires_at: expiresAt,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ coupon: data });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Erro" }, { status: 500 });
  }
}
