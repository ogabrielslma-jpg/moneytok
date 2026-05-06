import { NextResponse } from "next/server";

// Endpoint público pra diagnosticar a config do gateway no servidor.
// NÃO mostra valores das chaves, só se existem e o tamanho.
export async function GET() {
  const publicKey = process.env.IMPERIUMPAY_PUBLIC_KEY;
  const privateKey = process.env.IMPERIUMPAY_PRIVATE_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV || "unknown",
    vercel_region: process.env.VERCEL_REGION || "unknown",
    imperiumpay: {
      public_key: {
        configured: !!publicKey,
        prefix: publicKey ? publicKey.substring(0, 8) + "..." : null,
        length: publicKey?.length || 0,
        starts_with_pk: publicKey?.startsWith("pk_") || false,
      },
      private_key: {
        configured: !!privateKey,
        length: privateKey?.length || 0,
        starts_with_sk: privateKey?.startsWith("sk_") || false,
      },
      ready_to_charge: !!(publicKey && privateKey),
    },
    supabase: {
      url_configured: !!supabaseUrl,
      service_role_configured: !!serviceKey,
      service_role_length: serviceKey?.length || 0,
    },
    diagnosis: !publicKey && !privateKey
      ? "❌ NENHUMA chave do ImperiumPay configurada. Vai em Vercel → Settings → Environment Variables."
      : !publicKey
        ? "❌ Falta IMPERIUMPAY_PUBLIC_KEY"
        : !privateKey
          ? "❌ Falta IMPERIUMPAY_PRIVATE_KEY"
          : !serviceKey
            ? "⚠ Chaves do gateway OK, mas falta SUPABASE_SERVICE_ROLE_KEY (webhook não vai funcionar)"
            : "✅ Tudo configurado! Pode cobrar de verdade.",
  });
}
