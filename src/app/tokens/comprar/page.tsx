"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { DEFAULT_LANDING_CONFIG, fetchLandingConfig, type LandingConfig, type TikTokProfile } from "@/lib/landing-config";

type Step = 1 | 2 | 3;

function formatBRL(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",");
}

function formatCoins(coins: number): string {
  return coins.toLocaleString("pt-BR");
}

function formatCpf(value: string): string {
  const clean = value.replace(/\D/g, "").slice(0, 11);
  return clean
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

function isValidCpf(cpf: string): boolean {
  const clean = cpf.replace(/\D/g, "");
  if (clean.length !== 11) return false;
  if (/^(\d)\1+$/.test(clean)) return false;
  return true;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function TokensCompraPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const planoParam = parseInt(searchParams.get("plano") || "2") as 1 | 2 | 3;

  const [landingConfig, setLandingConfig] = useState<LandingConfig>(DEFAULT_LANDING_CONFIG);
  const [step, setStep] = useState<Step>(1);

  // Step 1: TikTok lookup
  const [username, setUsername] = useState("");
  const [profile, setProfile] = useState<TikTokProfile | null>(null);
  const [lookingUp, setLookingUp] = useState(false);
  const [lookupError, setLookupError] = useState("");

  // Step 2: dados do comprador
  const [fullName, setFullName] = useState("");
  const [cpf, setCpf] = useState("");
  const [email, setEmail] = useState("");

  // Step 3: PIX gerado
  const [pixData, setPixData] = useState<{ qrCodeBase64: string; pixKey: string; saleId: number } | null>(null);
  const [creatingPix, setCreatingPix] = useState(false);
  const [pollingStatus, setPollingStatus] = useState<"idle" | "polling" | "paid">("idle");
  const [error, setError] = useState("");

  const dash = landingConfig.dashboard;
  const planIdx = (planoParam >= 1 && planoParam <= 3) ? planoParam : 2;
  const currentPlan = {
    coins: dash[`plan_${planIdx}_coins` as keyof typeof dash] as number,
    price_cents: dash[`plan_${planIdx}_price_cents` as keyof typeof dash] as number,
  };

  useEffect(() => {
    fetchLandingConfig().then(setLandingConfig).catch(() => {});
  }, []);

  async function handleLookup() {
    setLookupError("");
    setProfile(null);
    const cleanUsername = username.replace(/^@/, "").trim();
    if (cleanUsername.length < 2) {
      setLookupError("Digite um username valido");
      return;
    }
    setLookingUp(true);
    try {
      const resp = await fetch("/api/tiktok-lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: cleanUsername }),
      });
      const data = await resp.json();
      if (!resp.ok || !data.profile) {
        setLookupError(data.error || "Perfil nao encontrado. Verifique o username.");
        setLookingUp(false);
        return;
      }
      setProfile(data.profile);
      setLookingUp(false);
    } catch (e: any) {
      setLookupError(e.message || "Erro ao buscar perfil");
      setLookingUp(false);
    }
  }

  function confirmProfile() {
    setStep(2);
  }

  async function handleGeneratePix() {
    setError("");
    if (!fullName.trim() || fullName.length < 3) {
      setError("Digite seu nome completo");
      return;
    }
    if (!isValidCpf(cpf)) {
      setError("CPF invalido");
      return;
    }
    if (!isValidEmail(email)) {
      setError("Email invalido");
      return;
    }
    setCreatingPix(true);
    setStep(3);

    try {
      const resp = await fetch("/api/imperium/create-pix-public", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tiktok_username: profile?.username || username.replace(/^@/, ""),
          full_name: fullName.trim(),
          cpf: cpf.replace(/\D/g, ""),
          email: email.trim().toLowerCase(),
          coins: currentPlan.coins,
          amount_cents: currentPlan.price_cents,
        }),
      });

      const data = await resp.json();

      if (!resp.ok) {
        setError(data.error || "Erro ao gerar PIX");
        setCreatingPix(false);
        setStep(2);
        return;
      }

      setPixData({
        qrCodeBase64: data.qrCodeBase64,
        pixKey: data.pixKey,
        saleId: data.saleId,
      });
      setCreatingPix(false);
      setPollingStatus("polling");
    } catch (e: any) {
      setError(e.message || "Erro inesperado");
      setCreatingPix(false);
      setStep(2);
    }
  }

  // Polling de status
  useEffect(() => {
    if (pollingStatus !== "polling" || !pixData) return;

    const interval = setInterval(async () => {
      try {
        const resp = await fetch(`/api/imperium/check-public-purchase?saleId=${pixData.saleId}`);
        const data = await resp.json();
        if (data?.status === "paid") {
          setPollingStatus("paid");
          clearInterval(interval);
          setTimeout(() => router.push(`/tokens/sucesso?username=${encodeURIComponent(profile?.username || username)}`), 1500);
        }
      } catch (e) {}
    }, 3000);

    return () => clearInterval(interval);
  }, [pollingStatus, pixData, router, profile, username]);

  function copyPixKey() {
    if (!pixData?.pixKey) return;
    navigator.clipboard.writeText(pixData.pixKey).catch(() => {});
  }

  return (
    <div style={{ minHeight: "100vh", background: dash.mtpay_planos_bg }} className="py-8 px-4">
      <div className="max-w-md mx-auto">

        {/* Progress */}
        <div className="flex items-center justify-center gap-1.5 mb-6">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className="h-1.5 rounded-full transition-all"
              style={{
                width: s === step ? 32 : 8,
                background: s <= step
                  ? `linear-gradient(90deg, ${dash.mtpay_planos_recommended_from}, ${dash.mtpay_planos_recommended_to})`
                  : "#e5e7eb",
              }}
            />
          ))}
        </div>

        {/* Step 1: lookup TikTok */}
        {step === 1 && (
          <div className="bg-white rounded-2xl p-6 shadow-lg">
            <h1 className="text-xl font-bold text-gray-900 mb-1 text-center">Confirme seu perfil</h1>
            <p className="text-sm text-gray-500 mb-5 text-center">Digite seu @username do TikTok pra recarregar as moedas na conta certa</p>

            <div className="mb-3">
              <label className="block text-xs font-semibold text-gray-700 mb-1">Username TikTok</label>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">@</span>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.replace(/^@/, ""))}
                    placeholder="seu_username"
                    className="w-full pl-9 pr-3 py-3 rounded-xl border border-gray-200 focus:border-pink-500 focus:ring-2 focus:ring-pink-100 outline-none text-sm text-gray-900 bg-white"
                  />
                </div>
                <button
                  onClick={handleLookup}
                  disabled={lookingUp || username.length < 2}
                  className="px-5 py-3 rounded-xl text-white font-bold text-sm shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ background: `linear-gradient(90deg, ${dash.mtpay_planos_recommended_from}, ${dash.mtpay_planos_recommended_to})` }}
                >
                  {lookingUp ? "..." : "Buscar"}
                </button>
              </div>
            </div>

            {lookupError && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-700 mb-3">
                {lookupError}
              </div>
            )}

            {/* Preview do perfil encontrado */}
            {profile && (
              <div className="bg-gradient-to-br from-pink-50 to-orange-50 border-2 border-pink-200 rounded-2xl p-4 mb-4">
                <div className="flex items-center gap-3 mb-3">
                  {profile.avatar_url && (
                    <img src={profile.avatar_url} alt="" className="w-14 h-14 rounded-full object-cover border-2 border-white shadow" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <p className="text-sm font-bold text-gray-900 truncate">{profile.display_name}</p>
                      {profile.verified && <span className="text-blue-500 text-xs">\u2713</span>}
                    </div>
                    <p className="text-xs text-gray-500">@{profile.username}</p>
                  </div>
                </div>
                {profile.bio && (
                  <p className="text-xs text-gray-700 mb-2 line-clamp-2">{profile.bio}</p>
                )}
                <div className="flex items-center gap-3 text-[11px] text-gray-600 pt-2 border-t border-pink-200/50">
                  <span><strong className="text-gray-900">{profile.followers?.toLocaleString("pt-BR")}</strong> seguidores</span>
                  <span><strong className="text-gray-900">{profile.total_likes?.toLocaleString("pt-BR")}</strong> curtidas</span>
                </div>
                <button
                  onClick={confirmProfile}
                  className="w-full mt-4 py-3 rounded-xl text-white font-bold text-sm shadow-lg uppercase tracking-wide"
                  style={{ background: `linear-gradient(90deg, ${dash.mtpay_planos_recommended_from}, ${dash.mtpay_planos_recommended_to})` }}
                >
                  Sim, este \u00e9 meu perfil
                </button>
                <button
                  onClick={() => { setProfile(null); setUsername(""); }}
                  className="w-full mt-2 py-2 text-xs text-gray-500 hover:text-gray-900"
                >
                  Buscar outro perfil
                </button>
              </div>
            )}

            <p className="text-[10px] text-gray-500 text-center">
              Plano selecionado: <strong>{formatCoins(currentPlan.coins)} moedas</strong> por <strong>R$ {formatBRL(currentPlan.price_cents)}</strong>
            </p>
          </div>
        )}

        {/* Step 2: dados do comprador */}
        {step === 2 && (
          <div className="bg-white rounded-2xl p-6 shadow-lg">
            <h1 className="text-xl font-bold text-gray-900 mb-1 text-center">Seus dados</h1>
            <p className="text-sm text-gray-500 mb-5 text-center">Preencha pra gerar o PIX e confirmar o pagamento</p>

            <div className="space-y-3 mb-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Nome completo</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Como aparece no documento"
                  className="w-full px-3 py-3 rounded-xl border border-gray-200 focus:border-pink-500 focus:ring-2 focus:ring-pink-100 outline-none text-sm text-gray-900 bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">CPF</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={cpf}
                  onChange={(e) => setCpf(formatCpf(e.target.value))}
                  placeholder="000.000.000-00"
                  className="w-full px-3 py-3 rounded-xl border border-gray-200 focus:border-pink-500 focus:ring-2 focus:ring-pink-100 outline-none text-sm text-gray-900 bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="w-full px-3 py-3 rounded-xl border border-gray-200 focus:border-pink-500 focus:ring-2 focus:ring-pink-100 outline-none text-sm text-gray-900 bg-white"
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-700 mb-3">
                {error}
              </div>
            )}

            <div className="bg-gray-50 rounded-xl p-3 mb-4 text-xs text-gray-700">
              <div className="flex justify-between mb-1">
                <span>Perfil:</span>
                <span className="font-bold">@{profile?.username || username}</span>
              </div>
              <div className="flex justify-between mb-1">
                <span>Moedas:</span>
                <span className="font-bold">{formatCoins(currentPlan.coins)}</span>
              </div>
              <div className="flex justify-between font-bold text-base text-gray-900">
                <span>Total:</span>
                <span>R$ {formatBRL(currentPlan.price_cents)}</span>
              </div>
            </div>

            <button
              onClick={handleGeneratePix}
              disabled={creatingPix}
              className="w-full py-4 rounded-2xl text-white font-bold text-sm shadow-lg uppercase tracking-wide disabled:opacity-50"
              style={{ background: `linear-gradient(90deg, ${dash.mtpay_planos_recommended_from}, ${dash.mtpay_planos_recommended_to})` }}
            >
              {creatingPix ? "Gerando PIX..." : "Gerar PIX"}
            </button>

            <button
              onClick={() => setStep(1)}
              className="w-full mt-2 py-2 text-xs text-gray-500 hover:text-gray-900"
            >
              \u2190 Voltar
            </button>
          </div>
        )}

        {/* Step 3: QR Code */}
        {step === 3 && (
          <div className="bg-white rounded-2xl p-6 shadow-lg">
            <h1 className="text-xl font-bold text-gray-900 mb-1 text-center">Pague com PIX</h1>
            <p className="text-sm text-gray-500 mb-5 text-center">Escaneie o QR Code ou copie o codigo</p>

            {creatingPix && !pixData && (
              <div className="bg-gray-50 rounded-2xl p-12 mb-4 flex flex-col items-center">
                <div className="w-12 h-12 border-2 border-pink-300 border-t-pink-600 rounded-full animate-spin mb-3" />
                <p className="text-xs text-gray-600">Gerando QR Code PIX...</p>
              </div>
            )}

            {pixData && (
              <>
                <div className="bg-gray-50 rounded-2xl p-6 mb-4 flex flex-col items-center">
                  <div className="w-56 h-56 bg-white border-2 border-gray-200 rounded-xl p-3 flex items-center justify-center mb-3">
                    <img src={pixData.qrCodeBase64} alt="QR Code PIX" className="w-full h-full object-contain" />
                  </div>
                  <div className="text-[10px] text-gray-500 uppercase tracking-wider">Escaneie no app do banco</div>
                </div>

                <div className="bg-gray-100 rounded-xl p-3 mb-4 flex items-center gap-2">
                  <code className="flex-1 text-[10px] text-gray-700 font-mono truncate">
                    {pixData.pixKey}
                  </code>
                  <button onClick={copyPixKey} className="text-xs text-pink-600 font-semibold whitespace-nowrap">
                    Copiar
                  </button>
                </div>

                {pollingStatus === "polling" && (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-3 flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                    <p className="text-xs text-blue-700">Aguardando confirmacao do pagamento...</p>
                  </div>
                )}
                {pollingStatus === "paid" && (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 mb-3 flex items-center gap-2">
                    <div className="w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <p className="text-xs text-emerald-700 font-bold">Pagamento confirmado!</p>
                  </div>
                )}

                <p className="text-[10px] text-center text-gray-500">
                  Confirma\u00e7\u00e3o autom\u00e1tica em ate 1 minuto.
                </p>
              </>
            )}
          </div>
        )}

      </div>
    </div>
  );
}

export default function TokensCompraPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-2 border-pink-300 border-t-pink-600 rounded-full animate-spin" /></div>}>
      <TokensCompraPageInner />
    </Suspense>
  );
}
