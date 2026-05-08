"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { DEFAULT_LANDING_CONFIG, fetchLandingConfig, type LandingConfig } from "@/lib/landing-config";

function TokensSucessoPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const username = searchParams.get("username") || "";

  const [landingConfig, setLandingConfig] = useState<LandingConfig>(DEFAULT_LANDING_CONFIG);
  const dash = landingConfig.dashboard;

  useEffect(() => {
    fetchLandingConfig().then(setLandingConfig).catch(() => {});
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: dash.mtpay_planos_bg }} className="py-8 px-4 flex items-center justify-center">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-3xl p-8 shadow-2xl text-center">

          {/* Icone de sucesso */}
          <div className="w-20 h-20 mx-auto mb-5 rounded-full flex items-center justify-center shadow-lg" style={{ background: "linear-gradient(135deg, #10b981, #059669)" }}>
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-2">Pagamento confirmado!</h1>

          <p className="text-sm text-gray-600 leading-relaxed mb-5">
            Suas moedas est\u00e3o reservadas para o perfil <strong>@{username}</strong>.
            <br /><br />
            Para receber as moedas, fa\u00e7a login na plataforma com o mesmo @TikTok.
          </p>

          <div className="bg-gradient-to-br from-pink-50 to-orange-50 border border-pink-200/60 rounded-2xl p-4 mb-5 text-left">
            <h3 className="text-sm font-bold text-gray-900 mb-2">Pr\u00f3ximos passos:</h3>
            <ol className="text-xs text-gray-700 space-y-1.5 list-decimal list-inside">
              <li>Crie sua conta no MoneyTok</li>
              <li>Use o mesmo @TikTok (<strong>@{username}</strong>)</li>
              <li>Suas moedas ser\u00e3o creditadas automaticamente</li>
            </ol>
          </div>

          <button
            onClick={() => router.push(`/login?tiktok=${encodeURIComponent(username)}`)}
            className="w-full py-4 rounded-2xl text-white font-bold text-sm shadow-lg uppercase tracking-wide hover:opacity-90"
            style={{ background: `linear-gradient(90deg, ${dash.mtpay_planos_recommended_from}, ${dash.mtpay_planos_recommended_to})` }}
          >
            Criar minha conta agora
          </button>

          <p className="text-[10px] text-gray-500 mt-3">
            Voc\u00ea receber\u00e1 um email de confirma\u00e7\u00e3o.
          </p>

        </div>
      </div>
    </div>
  );
}

export default function TokensSucessoPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-2 border-pink-300 border-t-pink-600 rounded-full animate-spin" /></div>}>
      <TokensSucessoPageInner />
    </Suspense>
  );
}
