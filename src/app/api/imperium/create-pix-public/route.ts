import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

const IMPERIUM_API_URL = "https://api.imperiumpay.com.br/api";

export async function POST(req: NextRequest) {
  try {
    const { tiktok_username, full_name, cpf, email, coins, amount_cents } = await req.json();

    // Validacoes basicas
    if (!tiktok_username || !full_name || !cpf || !email || !coins || !amount_cents) {
      return NextResponse.json({ error: "Campos obrigatorios faltando" }, { status: 400 });
    }

    const cleanCpf = String(cpf).replace(/\D/g, "");
    if (cleanCpf.length !== 11) {
      return NextResponse.json({ error: "CPF invalido" }, { status: 400 });
    }

    const cleanUsername = String(tiktok_username).replace(/^@/, "").trim().toLowerCase();
    if (cleanUsername.length < 2) {
      return NextResponse.json({ error: "Username invalido" }, { status: 400 });
    }

    const publicKey = process.env.IMPERIUMPAY_PUBLIC_KEY;
    const privateKey = process.env.IMPERIUMPAY_PRIVATE_KEY;
    if (!publicKey || !privateKey) {
      return NextResponse.json({ error: "Credenciais ImperiumPay nao configuradas" }, { status: 500 });
    }

    const baseUrl = req.headers.get("origin") || `https://${req.headers.get("host")}`;
    const postbackUrl = `${baseUrl}/api/imperium/webhook-public`;

    // Chama ImperiumPay
    const imperiumResp = await fetch(`${IMPERIUM_API_URL}/sales`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Public-Key": publicKey,
        "X-Api-Private-Key": privateKey,
      },
      body: JSON.stringify({
        amount: amount_cents,
        paymentMethod: "PIX",
        customer: {
          name: full_name,
          email: email,
          document: { type: "cpf", number: cleanCpf },
        },
        items: [
          {
            title: `${coins} moedas MoneyTokPay (perfil @${cleanUsername})`,
            unitPrice: amount_cents,
            quantity: 1,
            tangible: false,
          },
        ],
        postbackUrl,
        metadata: {
          tiktok_username: cleanUsername,
          coins,
          source: "moneytok-tokens-public",
        },
      }),
    });

    const imperiumData = await imperiumResp.json();

    if (!imperiumResp.ok) {
      console.error("[create-pix-public] erro ImperiumPay:", imperiumData);
      return NextResponse.json(
        { error: imperiumData.message || "Erro ao criar PIX", details: imperiumData },
        { status: imperiumResp.status }
      );
    }

    const sale = imperiumData.sale;
    const pix = sale?.payment?.pix;

    if (!pix?.key || !pix?.qrCodeBase64) {
      return NextResponse.json({ error: "Resposta ImperiumPay invalida" }, { status: 502 });
    }

    // Salva compra publica no Supabase (sem user_id, vinculado por @TikTok)
    const supabase = createClient();
    const { error: insertError } = await supabase
      .from("public_token_purchases")
      .insert({
        tiktok_username: cleanUsername,
        full_name: full_name.trim(),
        cpf: cleanCpf,
        email: email.trim().toLowerCase(),
        coins,
        amount_cents,
        status: "pending",
        imperium_sale_id: String(sale.id),
        imperium_pix_key: pix.key,
      });

    if (insertError) {
      console.error("[create-pix-public] insert error:", insertError);
      // PIX foi criado, salvar e nice-to-have
    }

    return NextResponse.json({
      success: true,
      saleId: sale.id,
      qrCodeBase64: pix.qrCodeBase64,
      pixKey: pix.key,
      amount_cents,
      coins,
    });
  } catch (err: any) {
    console.error("[create-pix-public] erro:", err);
    return NextResponse.json({ error: err.message || "Erro interno" }, { status: 500 });
  }
}
