import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

const IMPERIUM_API_URL = "https://api.imperiumpay.com.br/api";

export async function POST(req: NextRequest) {
  try {
    const { coins, amount_cents } = await req.json();

    if (!coins || !amount_cents) {
      return NextResponse.json({ error: "coins e amount_cents obrigatorios" }, { status: 400 });
    }

    // Auth: pega user logado
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
    }

    // Pega dados do MoneyTokPay (nome, CPF, telefone)
    const { data: account } = await supabase
      .from("moneytok_pay_accounts")
      .select("id, full_name, cpf, phone")
      .eq("user_id", user.id)
      .single();

    if (!account) {
      return NextResponse.json({ error: "Conta MoneyTokPay nao encontrada" }, { status: 404 });
    }

    const publicKey = process.env.IMPERIUMPAY_PUBLIC_KEY;
    const privateKey = process.env.IMPERIUMPAY_PRIVATE_KEY;
    if (!publicKey || !privateKey) {
      return NextResponse.json({ error: "Credenciais ImperiumPay nao configuradas" }, { status: 500 });
    }

    // Limpa CPF (so digitos) e telefone
    const cleanCpf = (account.cpf || "").replace(/\D/g, "");
    const cleanPhone = (account.phone || "").replace(/\D/g, "");

    // URL do webhook (Vercel detecta automaticamente)
    const baseUrl = req.headers.get("origin") || `https://${req.headers.get("host")}`;
    const postbackUrl = `${baseUrl}/api/imperium/webhook`;

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
          name: account.full_name || "Cliente MoneyTok",
          email: user.email || "",
          document: cleanCpf ? { type: "cpf", number: cleanCpf } : undefined,
          phone: cleanPhone || undefined,
        },
        items: [
          {
            title: `${coins} moedas MoneyTokPay`,
            unitPrice: amount_cents,
            quantity: 1,
            tangible: false,
          },
        ],
        postbackUrl,
        metadata: {
          user_id: user.id,
          account_id: account.id,
          coins: coins,
          source: "moneytok-planos",
        },
      }),
    });

    const imperiumData = await imperiumResp.json();

    if (!imperiumResp.ok) {
      console.error("[imperium/create-pix] Erro ImperiumPay:", imperiumData);
      return NextResponse.json(
        { error: imperiumData.message || "Erro ao criar PIX", details: imperiumData },
        { status: imperiumResp.status }
      );
    }

    const sale = imperiumData.sale;
    const pix = sale?.payment?.pix;

    if (!pix?.key || !pix?.qrCodeBase64) {
      console.error("[imperium/create-pix] Resposta sem PIX:", imperiumData);
      return NextResponse.json({ error: "Resposta ImperiumPay invalida" }, { status: 502 });
    }

    // Salva no Supabase: cria registro de purchase com status PENDENTE
    const { error: insertError } = await supabase
      .from("moneytok_pay_purchases")
      .insert({
        user_id: user.id,
        account_id: account.id,
        coins,
        amount_cents,
        status: "pending",
        payment_method: "pix",
        imperium_sale_id: String(sale.id),
        imperium_pix_key: pix.key,
      });

    if (insertError) {
      console.error("[imperium/create-pix] Erro insert purchase:", insertError);
      // Nao retorna erro - PIX foi criado, salvar e nice-to-have
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
    console.error("[imperium/create-pix] Erro:", err);
    return NextResponse.json({ error: err.message || "Erro interno" }, { status: 500 });
  }
}
