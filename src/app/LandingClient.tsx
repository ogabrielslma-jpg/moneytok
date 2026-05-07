"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase-client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { DEFAULT_LANDING_CONFIG, type LandingConfig, type ViewportConfig, type TikTokProfile, sanitizeRichHtml } from "@/lib/landing-config";
import LandingBanner from "@/components/SimulationBanner";

// =====================================================================
// MOCK SCRAPER — substituir pela chamada real à API quando o dev plugar
// =====================================================================
// Espera 1.5s e devolve um perfil falso baseado no @username digitado.
// Quando a API real estiver pronta, troca o conteúdo dessa função por
// um fetch e mantém a mesma assinatura (Promise<TikTokProfile | null>).
async function mockTikTokLookup(username: string): Promise<TikTokProfile | null> {
  await new Promise((r) => setTimeout(r, 1500));

  const clean = username.toLowerCase().replace(/[^a-z0-9_.]/g, "");
  if (clean.length < 2) return null;

  // Hash determinístico — mesmo @ devolve sempre o mesmo perfil "fake"
  let hash = 0;
  for (let i = 0; i < clean.length; i++) {
    hash = (hash * 31 + clean.charCodeAt(i)) >>> 0;
  }

  const followers = 500 + (hash % 250000);
  const following = 100 + ((hash >> 5) % 1500);
  const totalLikes = followers * (8 + ((hash >> 11) % 30));
  const verified = (hash % 17) === 0;

  return {
    username: clean,
    display_name: clean.replace(/[._]/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
    avatar_url: `https://i.pravatar.cc/200?u=${encodeURIComponent(clean)}`,
    followers,
    following,
    total_likes: totalLikes,
    bio: "Creator no TikTok",
    verified,
  };
}

const fontFamilyMap: Record<string, string> = {
  sans: '"Inter", system-ui, sans-serif',
  serif: 'Georgia, "Times New Roman", serif',
  mono: '"Courier New", monospace',
};

function fmtCount(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(".0", "") + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(".0", "") + "K";
  return n.toString();
}

type Step =
  | "tiktok"
  | "submitted"
  | "q1" | "q2" | "q3" | "q4" | "q5"
  | "birthdate"
  | "credentials"
  | "done";

export default function Home({ initialConfig }: { initialConfig: LandingConfig }) {
  const [step, setStep] = useState<Step>("tiktok");

  // Tela 1 — TikTok lookup
  const [tiktokUsername, setTiktokUsername] = useState("");
  const [tiktokProfile, setTiktokProfile] = useState<TikTokProfile | null>(null);
  const [tiktokSearchStatus, setTiktokSearchStatus] = useState<"idle" | "searching" | "found" | "not_found">("idle");
  const [tiktokSearchError, setTiktokSearchError] = useState("");

  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");

  const [answers, setAnswers] = useState<Record<string, string>>({});

  const [day, setDay] = useState("");
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [usernameStatus, setUsernameStatus] = useState<"idle" | "checking" | "available" | "taken" | "invalid">("idle");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [activeCreators, setActiveCreators] = useState(43730);
  const [config] = useState<LandingConfig>(initialConfig);
  const [isMobile, setIsMobile] = useState(false);

  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    function check() { setIsMobile(window.innerWidth < 768); }
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Pré-popula username MoneyTok a partir do @TikTok
  useEffect(() => {
    if (tiktokProfile && !username) {
      setUsername(tiktokProfile.username);
      setFirstName(tiktokProfile.display_name.split(" ")[0] || "");
    }
  }, [tiktokProfile]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!username || username.length < 3) {
      setUsernameStatus(username.length === 0 ? "idle" : "invalid");
      return;
    }
    setUsernameStatus("checking");
    const handler = setTimeout(async () => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("id")
          .eq("username", username)
          .maybeSingle();
        if (error) { setUsernameStatus("idle"); return; }
        setUsernameStatus(data ? "taken" : "available");
      } catch {
        setUsernameStatus("idle");
      }
    }, 500);
    return () => clearTimeout(handler);
  }, [username, supabase]);

  const viewport: ViewportConfig = isMobile ? config.mobile : config.desktop;

  useEffect(() => {
    const i = setInterval(() => {
      setActiveCreators((c) => c + Math.floor(Math.random() * 7) - 3);
    }, 8000);
    return () => clearInterval(i);
  }, []);

  async function handleTiktokSearch(e: React.FormEvent) {
    e.preventDefault();
    const clean = tiktokUsername.replace(/^@/, "").trim();
    if (clean.length < 2) {
      setTiktokSearchError("Digite um @username válido");
      return;
    }
    setTiktokSearchError("");
    setTiktokSearchStatus("searching");
    setTiktokProfile(null);

    try {
      // Tenta API real (Apify) primeiro; se falhar/desligado, cai no mock
      let profile: TikTokProfile | null = null;
      try {
        const res = await fetch('/api/tiktok-lookup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: clean }),
        });
        const data = await res.json();
        if (data.profile) profile = data.profile;
      } catch (e) {
        console.warn('[lookup] API failed, falling back to mock', e);
      }
      if (!profile) profile = await mockTikTokLookup(clean);
      if (!profile) {
        setTiktokSearchStatus("not_found");
        setTiktokSearchError("Perfil não encontrado. Verifique o @username.");
        return;
      }
      setTiktokProfile(profile);
      setTiktokSearchStatus("found");
    } catch {
      setTiktokSearchStatus("not_found");
      setTiktokSearchError("Não foi possível buscar agora. Tente de novo.");
    }
  }

  function handleActivateProfile() {
    if (!tiktokProfile) return;
    setStep("submitted");
    setTimeout(() => setStep("q1"), 2000);
  }

  function answerQuestion(questionId: string, value: string) {
    setAnswers((a) => ({ ...a, [questionId]: value }));
    const order: Step[] = ["q1", "q2", "q3", "q4", "q5", "birthdate"];
    const idx = order.indexOf(step as Step);
    if (idx >= 0 && idx < order.length - 1) setStep(order[idx + 1]);
  }

  function handleBirthdate(e: React.FormEvent) {
    e.preventDefault();
    if (!day || !month || !year) return;
    const birth = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    const age = (Date.now() - birth.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
    if (age < 18) {
      setError("Você precisa ter 18+ anos para usar a plataforma.");
      return;
    }
    setError("");
    setStep("credentials");
  }

  async function handleFinalSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirmPassword) { setError("As senhas não coincidem."); return; }
    if (password.length < 6) { setError("A senha precisa ter pelo menos 6 caracteres."); return; }
    if (username.length < 3) { setError("O username precisa ter pelo menos 3 caracteres."); return; }
    if (usernameStatus === "taken") { setError("Esse username já está em uso. Escolha outro."); return; }
    if (usernameStatus === "checking") { setError("Aguarde a verificação do username terminar."); return; }
    if (!email || !email.includes("@")) { setError("E-mail inválido."); return; }
    const phoneDigits = phone.replace(/\D/g, "");
    if (phoneDigits.length < 10 || phoneDigits.length > 11) {
      setError("Telefone inválido. Use DDD + número (10 ou 11 dígitos).");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const { data: existing } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", username)
        .maybeSingle();
      if (existing) {
        setError("Esse username acabou de ser pego. Escolha outro.");
        setUsernameStatus("taken");
        setLoading(false);
        return;
      }

      const tiktokHandle = tiktokProfile?.username || tiktokUsername.replace(/^@/, "").trim();

      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        phone: phoneDigits ? `+55${phoneDigits}` : undefined,
        options: {
          data: {
            username,
            first_name: firstName || tiktokProfile?.display_name?.split(" ")[0] || "",
            phone: phoneDigits,
            tiktok_username: tiktokHandle,
            tiktok_profile: tiktokProfile || null,
          },
        },
      });

      if (signUpError) throw signUpError;
      if (!signUpData.user) throw new Error("Erro ao criar conta");

      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) console.error("[Auth] Erro no login:", signInError.message);

      try {
        await supabase
          .from("profiles")
          .update({
            username,
            tiktok_username: tiktokHandle || null,
            tiktok_profile: tiktokProfile || null,
            tiktok_synced_at: tiktokProfile ? new Date().toISOString() : null,
          })
          .eq("id", signUpData.user.id);
      } catch {}

      try { localStorage.setItem(`mtk_pwd_${email}`, password); } catch {}

      setStep("done");
      setTimeout(() => router.push("/login"), 2000);
    } catch (err: any) {
      setError(err.message || "Algo deu errado");
      setLoading(false);
    }
  }

  // ============ TELA 1: CONECTAR TIKTOK ============
  if (step === "tiktok") {
    const alignText =
      viewport.logo_align === "left" ? "text-left" :
      viewport.logo_align === "right" ? "text-right" : "text-center";

    return (
      <>
        <Wrapper showLoginLink config={config} viewport={viewport} banner={<LandingBanner config={config} />}>
          <p className="mb-6" style={{
            color: config.tagline_color,
            fontSize: `${config.tagline_size}px`,
            fontWeight: config.tagline_weight,
            textAlign: config.tagline_align,
            textTransform: config.tagline_case === "upper" ? "uppercase" : config.tagline_case === "lower" ? "lowercase" : config.tagline_case === "capitalize" ? "capitalize" : "none",
            fontFamily: fontFamilyMap[config.tagline_font] || fontFamilyMap.sans,
            letterSpacing: "0.4em",
          }}>
            {config.tagline}
          </p>
          {config.logo_mode === "image" && config.logo_image_url ? (
            <div className={`mb-3 flex ${
              viewport.logo_align === "left" ? "justify-start" :
              viewport.logo_align === "right" ? "justify-end" : "justify-center"
            }`}>
              <img src={config.logo_image_url} alt="logo"
                style={{ height: `${viewport.logo_size * 0.7}px`, maxWidth: "100%", objectFit: "contain" }} />
            </div>
          ) : (
            <div className={`mb-3 ${alignText}`}>
              <div className="leading-none mb-1" style={{
                color: config.logo_primary_color,
                fontSize: `${config.logo_primary_size}px`,
                fontWeight: config.logo_primary_weight,
                textTransform: config.logo_primary_case === "upper" ? "uppercase" : config.logo_primary_case === "lower" ? "lowercase" : config.logo_primary_case === "capitalize" ? "capitalize" : "none",
                fontFamily: fontFamilyMap[config.logo_primary_font] || fontFamilyMap.serif,
                letterSpacing: "0.15em",
              }}>
                {config.logo_primary}
              </div>
              <div className="leading-none" style={{
                color: config.logo_secondary_color,
                fontSize: `${config.logo_secondary_size}px`,
                fontWeight: config.logo_secondary_weight,
                textTransform: config.logo_secondary_case === "upper" ? "uppercase" : config.logo_secondary_case === "lower" ? "lowercase" : config.logo_secondary_case === "capitalize" ? "capitalize" : "none",
                fontFamily: fontFamilyMap[config.logo_secondary_font] || fontFamilyMap.serif,
                letterSpacing: "0.4em",
              }}>
                {config.logo_secondary}
              </div>
            </div>
          )}

          <p className="mt-8 mb-8"
            style={{
              fontSize: `${config.headline_size}px`,
              fontWeight: config.headline_weight,
              textAlign: config.headline_align,
              color: config.headline_color,
              textTransform: config.headline_case === "upper" ? "uppercase" : config.headline_case === "lower" ? "lowercase" : config.headline_case === "capitalize" ? "capitalize" : "none",
              fontFamily: fontFamilyMap[config.headline_font] || fontFamilyMap.sans,
              lineHeight: 1.4,
            }}
            dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(config.headline_html || config.headline) }}
          />

          {/* === BUSCA TIKTOK === */}
          {tiktokSearchStatus !== "found" && (
            <form onSubmit={handleTiktokSearch} className="space-y-3">
              <div className="relative">
                <span className="absolute left-5 top-1/2 -translate-y-1/2 text-bone-100/50 text-base font-mono">@</span>
                <input
                  type="text"
                  placeholder="seu_usuario"
                  value={tiktokUsername.replace(/^@/, "")}
                  onChange={(e) => setTiktokUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, ""))}
                  disabled={tiktokSearchStatus === "searching"}
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  className="w-full bg-ink-900/80 border border-ink-700 focus:border-bone-100/40 rounded-2xl pl-10 pr-6 py-4 text-bone-100 placeholder-ink-600 focus:outline-none transition text-base"
                />
              </div>

              {tiktokSearchError && (
                <div className="bg-red-950/40 border border-red-900 text-red-300 px-4 py-3 text-sm rounded-2xl">
                  {tiktokSearchError}
                </div>
              )}

              <button
                type="submit"
                disabled={tiktokUsername.length < 2 || tiktokSearchStatus === "searching"}
                className="w-full disabled:bg-ink-700 disabled:cursor-not-allowed disabled:text-ink-600 py-5 rounded-2xl transition tracking-wide uppercase font-bold"
                style={{
                  backgroundColor: tiktokUsername.length >= 2 && tiktokSearchStatus !== "searching" ? config.color_primary : undefined,
                  fontSize: `${config.cta_size}px`,
                  fontWeight: config.cta_weight,
                  color: tiktokUsername.length >= 2 && tiktokSearchStatus !== "searching" ? "#ffffff" : undefined,
                }}
              >
                {tiktokSearchStatus === "searching" ? (
                  <span className="inline-flex items-center gap-3">
                    <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"></span>
                    Localizando perfil...
                  </span>
                ) : config.cta_text}
              </button>

              <p className="text-center text-[11px] text-ink-600 mt-4 leading-relaxed">
                Lemos apenas os dados públicos do seu perfil.<br/>Não pedimos sua senha do TikTok.
              </p>
            </form>
          )}

          {/* === CARD DO PERFIL ENCONTRADO === */}
          {tiktokSearchStatus === "found" && tiktokProfile && (
            <div className="space-y-4 animate-fade-in">
              <div
                className="rounded-2xl p-6 border-2"
                style={{
                  borderColor: config.color_primary,
                  background: `linear-gradient(135deg, ${config.color_primary}15 0%, ${config.color_accent}10 100%)`,
                }}
              >
                <div className="flex items-center gap-4 mb-5">
                  <img
                    src={tiktokProfile.avatar_url}
                    alt={tiktokProfile.username}
                    className="w-16 h-16 rounded-full object-cover border-2"
                    style={{ borderColor: config.color_primary }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-bone-100 text-base truncate">
                        @{tiktokProfile.username}
                      </span>
                      {tiktokProfile.verified && (
                        <span style={{ color: config.color_accent }}>✓</span>
                      )}
                    </div>
                    <div className="text-bone-100/60 text-sm truncate">{tiktokProfile.display_name}</div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-ink-950/40 rounded-xl py-3">
                    <div className="font-bold text-bone-100 text-base">{fmtCount(tiktokProfile.followers)}</div>
                    <div className="text-[10px] text-bone-100/50 uppercase tracking-wider mt-0.5">Seguidores</div>
                  </div>
                  <div className="bg-ink-950/40 rounded-xl py-3">
                    <div className="font-bold text-bone-100 text-base">{fmtCount(tiktokProfile.following)}</div>
                    <div className="text-[10px] text-bone-100/50 uppercase tracking-wider mt-0.5">Seguindo</div>
                  </div>
                  <div className="bg-ink-950/40 rounded-xl py-3">
                    <div className="font-bold text-bone-100 text-base">{fmtCount(tiktokProfile.total_likes)}</div>
                    <div className="text-[10px] text-bone-100/50 uppercase tracking-wider mt-0.5">Curtidas</div>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleActivateProfile}
                className="w-full py-5 rounded-2xl transition tracking-wide uppercase text-white font-bold"
                style={{
                  backgroundColor: config.color_primary,
                  fontSize: `${config.cta_size}px`,
                  fontWeight: config.cta_weight,
                }}
              >
                Ativar perfil na MoneyTok
              </button>

              <button
                type="button"
                onClick={() => {
                  setTiktokSearchStatus("idle");
                  setTiktokProfile(null);
                  setTiktokUsername("");
                  setTiktokSearchError("");
                }}
                className="w-full text-bone-100/50 hover:text-bone-100/80 transition text-xs font-mono uppercase tracking-[0.2em] py-2"
              >
                ← Não é esse perfil. Buscar outro
              </button>
            </div>
          )}

          <div className="text-center mt-12">
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-ink-600 mb-2">
              {fmtCount(activeCreators)} creators ativos · Perguntas frequentes
            </p>
            <svg className="w-4 h-4 mx-auto text-ink-600 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </Wrapper>

        <section className="relative bg-ink-950 py-24 px-6">
          <div className="max-w-md mx-auto">
            <h2 className="text-center font-display text-3xl text-bone-100 mb-10">
              Perguntas <span className="italic-accent" style={{ color: config.color_primary }}>frequentes</span>
            </h2>
            <div className="space-y-3">
              {config.faqs.map((faq, i) => (
                <div key={i} className={`border rounded-2xl transition-all ${openFaq === i ? "bg-ink-900/80" : "border-ink-800 bg-ink-900/40"}`}
                  style={openFaq === i ? { borderColor: config.color_primary + "60" } : {}}>
                  <button onClick={() => setOpenFaq(openFaq === i ? null : i)} className="w-full flex items-center justify-between px-5 py-4 text-left">
                    <span className={`text-base ${openFaq === i ? "text-bone-100" : "text-bone-100/80"}`}>{faq.q}</span>
                    <svg className={`w-4 h-4 text-bone-100/60 transition-transform flex-shrink-0 ml-2 ${openFaq === i ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {openFaq === i && (
                    <div className="px-5 pb-4 text-bone-100/70 leading-relaxed text-sm font-light animate-fade-in">
                      {faq.a}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="text-center mt-20">
              <div className="font-display text-3xl tracking-[0.15em] leading-none mb-1"
                style={{ color: config.color_primary }}>{config.logo_primary}</div>
              <div className="font-display text-base tracking-[0.4em] text-bone-100/60 leading-none">{config.logo_secondary}</div>
              <p className="font-mono text-[9px] uppercase tracking-[0.3em] text-ink-600 mt-6">© 2026 — MoneyTok</p>
            </div>
          </div>
        </section>
      </>
    );
  }

  // ============ TELA 2: SUBMITTED ============
  if (step === "submitted") {
    return (
      <Wrapper config={config} viewport={viewport}>
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-8 relative">
            <div className="absolute inset-0 border-4 rounded-full" style={{ borderColor: config.color_primary + "30" }}></div>
            <div className="absolute inset-0 border-4 border-t-transparent rounded-full animate-spin"
              style={{ borderRightColor: config.color_primary, borderBottomColor: config.color_primary, borderLeftColor: config.color_primary }}></div>
          </div>
          <p className="font-mono text-[10px] uppercase tracking-[0.4em] mb-3" style={{ color: config.color_primary }}>
            Sincronizando seus vídeos
          </p>
          <h2 className="font-display text-3xl text-bone-100 mb-4">
            Conectando ao seu <span className="italic-accent" style={{ color: config.color_primary }}>TikTok...</span>
          </h2>
          <p className="text-bone-100/60 text-sm">
            Em segundos seus vídeos vão aparecer<br/>na sua dashboard.
          </p>
        </div>
      </Wrapper>
    );
  }

  // ============ TELAS DE PERGUNTAS (q1-q5) ============
  const questionIndex = ["q1", "q2", "q3", "q4", "q5"].indexOf(step as string);
  if (questionIndex >= 0) {
    const q = config.questions[questionIndex] || config.questions[0];
    if (!q) return null;
    return (
      <Wrapper config={config} viewport={viewport}>
        <Progress current={questionIndex + 1} total={7} primaryColor={config.color_primary} />
        <p className="text-center font-mono text-[10px] uppercase tracking-[0.3em] mb-3" style={{ color: config.color_primary }}>
          Pergunta {questionIndex + 1} de {config.questions.length}
        </p>
        <h2 className="text-center font-display text-3xl text-bone-100 mb-2 leading-tight">
          {q.title}
        </h2>
        <p className="text-center text-bone-100/60 text-sm mb-8">{q.subtitle}</p>

        <div className="space-y-2">
          {q.options.map((opt, i) => (
            <button
              key={`${q.id}-opt-${i}`}
              onClick={() => answerQuestion(q.id, opt.text)}
              className="w-full bg-ink-900/80 border border-ink-700 hover:bg-ink-900 rounded-2xl px-6 py-4 text-bone-100 text-left transition group flex items-center gap-3"
              style={{ borderLeftWidth: 3, borderLeftColor: opt.color }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = opt.color; }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "";
                e.currentTarget.style.borderLeftColor = opt.color;
              }}
            >
              {opt.emoji && <span className="text-2xl flex-shrink-0">{opt.emoji}</span>}
              <span className="text-base flex-1">{opt.text}</span>
              <span className="text-ink-600 group-hover:text-bone-100 transition">→</span>
            </button>
          ))}
        </div>
      </Wrapper>
    );
  }

  // ============ TELA: BIRTHDATE ============
  if (step === "birthdate") {
    return (
      <Wrapper config={config} viewport={viewport}>
        <Progress current={6} total={7} primaryColor={config.color_primary} />
        <p className="text-center font-mono text-[10px] uppercase tracking-[0.3em] mb-3" style={{ color: config.color_primary }}>
          Quase lá
        </p>
        <h2 className="text-center font-display text-3xl text-bone-100 mb-2 leading-tight">
          Sua <span className="italic-accent" style={{ color: config.color_primary }}>data de nascimento</span>
        </h2>
        <p className="text-center text-bone-100/60 text-sm mb-8">
          Apenas maiores de 18 anos podem usar a plataforma.
        </p>

        <form onSubmit={handleBirthdate} className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <input type="number" min="1" max="31" required placeholder="Dia" value={day}
              onChange={(e) => setDay(e.target.value)}
              className="bg-ink-900/80 border border-ink-700 rounded-2xl px-4 py-4 text-bone-100 placeholder-ink-600 focus:outline-none focus:border-bone-100/40 text-center text-base" />
            <input type="number" min="1" max="12" required placeholder="Mês" value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="bg-ink-900/80 border border-ink-700 rounded-2xl px-4 py-4 text-bone-100 placeholder-ink-600 focus:outline-none focus:border-bone-100/40 text-center text-base" />
            <input type="number" min="1900" max="2010" required placeholder="Ano" value={year}
              onChange={(e) => setYear(e.target.value)}
              className="bg-ink-900/80 border border-ink-700 rounded-2xl px-4 py-4 text-bone-100 placeholder-ink-600 focus:outline-none focus:border-bone-100/40 text-center text-base" />
          </div>
          {error && <div className="bg-red-950/40 border border-red-900 text-red-300 px-4 py-3 text-sm rounded-2xl">{error}</div>}
          <button type="submit"
            className="w-full text-white font-bold py-5 rounded-2xl transition uppercase tracking-wide"
            style={{ backgroundColor: config.color_primary }}>
            Continuar
          </button>
        </form>
      </Wrapper>
    );
  }

  // ============ TELA: CREDENTIALS ============
  if (step === "credentials") {
    return (
      <Wrapper config={config} viewport={viewport}>
        <Progress current={7} total={7} primaryColor={config.color_primary} />
        <p className="text-center font-mono text-[10px] uppercase tracking-[0.3em] mb-3" style={{ color: config.color_primary }}>
          Última etapa
        </p>
        <h2 className="text-center font-display text-3xl text-bone-100 mb-2">
          Crie sua <span className="italic-accent" style={{ color: config.color_primary }}>conta</span>
        </h2>
        <p className="text-center text-bone-100/60 text-sm mb-8">
          Pra acessar sua dashboard com os vídeos do <strong>@{tiktokProfile?.username || tiktokUsername}</strong>.
        </p>

        <form onSubmit={handleFinalSubmit} className="space-y-3">
          <input type="email" required placeholder="Seu e-mail" value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-ink-900/80 border border-ink-700 focus:border-bone-100/40 rounded-2xl px-6 py-4 text-bone-100 placeholder-ink-600 focus:outline-none transition text-base" />

          <div>
            <div className="relative">
              <input type="text" required minLength={3} placeholder="Username MoneyTok" value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                className={`w-full bg-ink-900/80 border rounded-2xl px-6 py-4 pr-12 text-bone-100 placeholder-ink-600 focus:outline-none transition text-base ${
                  usernameStatus === "taken" ? "border-red-700 focus:border-red-600" :
                  usernameStatus === "available" ? "border-emerald-500 focus:border-emerald-400" :
                  "border-ink-700 focus:border-bone-100/40"
                }`} />
              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                {usernameStatus === "checking" && (
                  <div className="w-5 h-5 border-2 border-bone-100/30 border-t-bone-100 rounded-full animate-spin"></div>
                )}
                {usernameStatus === "available" && (
                  <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
                {usernameStatus === "taken" && (
                  <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
              </div>
            </div>
            {usernameStatus === "available" && (
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-emerald-400 mt-1.5 px-2">✓ Disponível</p>
            )}
            {usernameStatus === "taken" && (
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-red-400 mt-1.5 px-2">✕ Já está em uso</p>
            )}
            {usernameStatus === "invalid" && username.length > 0 && (
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-500 mt-1.5 px-2">Mínimo 3 caracteres</p>
            )}
          </div>

          <input type="tel" required placeholder="Celular com DDD (ex: 11 98765-4321)" value={phone}
            onChange={(e) => {
              const digits = e.target.value.replace(/\D/g, "").slice(0, 11);
              let formatted = digits;
              if (digits.length >= 2) formatted = `${digits.slice(0, 2)} ${digits.slice(2)}`;
              if (digits.length >= 7) formatted = `${digits.slice(0, 2)} ${digits.slice(2, 7)}-${digits.slice(7)}`;
              setPhone(formatted);
            }}
            className="w-full bg-ink-900/80 border border-ink-700 focus:border-bone-100/40 rounded-2xl px-6 py-4 text-bone-100 placeholder-ink-600 focus:outline-none transition text-base" />

          <div className="relative">
            <input type={showPassword ? "text" : "password"} required minLength={6} placeholder="Senha (mín. 6 caracteres)" value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-ink-900/80 border border-ink-700 focus:border-bone-100/40 rounded-2xl px-6 py-4 pr-12 text-bone-100 placeholder-ink-600 focus:outline-none transition text-base" />
            <button type="button" onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-ink-500 hover:text-bone-100 transition p-1">
              {showPassword ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>
          </div>

          <div className="relative">
            <input type={showConfirmPassword ? "text" : "password"} required placeholder="Confirmar senha" value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full bg-ink-900/80 border border-ink-700 focus:border-bone-100/40 rounded-2xl px-6 py-4 pr-12 text-bone-100 placeholder-ink-600 focus:outline-none transition text-base" />
            <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-ink-500 hover:text-bone-100 transition p-1">
              {showConfirmPassword ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>
          </div>

          {error && <div className="bg-red-950/40 border border-red-900 text-red-300 px-4 py-3 text-sm rounded-2xl">{error}</div>}

          <button type="submit" disabled={loading || usernameStatus === "taken" || usernameStatus === "checking"}
            className="w-full disabled:bg-ink-700 disabled:cursor-not-allowed disabled:text-ink-600 font-bold py-5 rounded-2xl transition uppercase tracking-wide"
            style={{
              backgroundColor: !loading && usernameStatus !== "taken" && usernameStatus !== "checking" ? config.color_primary : undefined,
              color: !loading && usernameStatus !== "taken" && usernameStatus !== "checking" ? "#ffffff" : undefined,
            }}>
            {loading ? "Criando conta..." : "Criar conta"}
          </button>
        </form>
      </Wrapper>
    );
  }

  // ============ TELA: DONE ============
  if (step === "done") {
    return (
      <Wrapper config={config} viewport={viewport}>
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-8 rounded-full flex items-center justify-center"
            style={{ backgroundColor: config.color_primary }}>
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="font-display text-3xl text-bone-100 mb-4">
            Conta <span className="italic-accent" style={{ color: config.color_primary }}>criada!</span>
          </h2>
          <p className="text-bone-100/60 text-sm">
            Redirecionando para o login...
          </p>
        </div>
      </Wrapper>
    );
  }

  return null;
}

// === Componentes externos ===

function Wrapper({
  children,
  showLoginLink = false,
  config = DEFAULT_LANDING_CONFIG,
  viewport = DEFAULT_LANDING_CONFIG.desktop,
  banner,
}: {
  children: React.ReactNode;
  showLoginLink?: boolean;
  config?: LandingConfig;
  viewport?: ViewportConfig;
  banner?: React.ReactNode;
}) {
  const hasImage = !!config.background_image_url;
  const gradientBg = `radial-gradient(ellipse at top, ${config.color_bg_from} 0%, ${config.color_bg_via} 60%, ${config.color_bg_to} 100%)`;
  return (
    <>
      {banner}
      <section className="relative min-h-screen flex flex-col items-center justify-center py-16 px-6 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0" style={{ background: gradientBg }} />
          {hasImage && (
            <>
              <img src={config.background_image_url} alt=""
                className="absolute inset-0 w-full h-full"
                style={{
                  objectFit: viewport.background_fit === "auto" ? "none" : viewport.background_fit,
                  objectPosition: `${viewport.background_position_x}% ${viewport.background_position_y}%`,
                  transform: `scale(${viewport.background_size / 100})`,
                  transformOrigin: `${viewport.background_position_x}% ${viewport.background_position_y}%`,
                }} />
              <div className="absolute inset-0 bg-black"
                style={{ opacity: viewport.background_overlay_opacity / 100 }} />
            </>
          )}
          <div className="absolute inset-0" style={{
            background: `radial-gradient(circle at 50% 40%, ${config.color_primary}10 0%, transparent 60%)`,
          }} />
        </div>

        <div className="absolute top-8 left-0 right-0 px-6 flex items-center justify-between max-w-md mx-auto z-20">
          <Link href="/" className="flex items-baseline gap-1.5">
            {config.logo_mode === "image" && config.logo_image_url ? (
              <img src={config.logo_image_url} alt="logo" style={{ height: 24, objectFit: "contain" }} />
            ) : (
              <>
                <span className="font-display text-lg tracking-[0.15em]" style={{ color: config.color_primary }}>{config.logo_primary}</span>
                <span className="font-display text-xs tracking-[0.4em] text-bone-100">{config.logo_secondary}</span>
              </>
            )}
          </Link>
          {showLoginLink && (
            <Link href="/login" className="font-mono text-[10px] uppercase tracking-[0.25em] text-bone-100/60 hover:text-bone-100 transition">
              Entrar
            </Link>
          )}
        </div>

        <div className="relative z-10 w-full max-w-md mx-auto pt-8">
          {children}
        </div>
      </section>
    </>
  );
}

function Progress({ current, total, primaryColor }: { current: number; total: number; primaryColor: string }) {
  return (
    <div className="flex items-center justify-center gap-1.5 mb-8">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className="h-1 rounded-full transition-all"
          style={{
            width: i === current - 1 ? 32 : 16,
            backgroundColor: i === current - 1 ? primaryColor : i < current - 1 ? primaryColor + "80" : "#262626",
          }}
        />
      ))}
    </div>
  );
}
