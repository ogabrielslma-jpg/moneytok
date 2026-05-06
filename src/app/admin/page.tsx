"use client";

import { useEffect, useRef, useState } from "react";
import {
  fetchLandingConfig,
  saveLandingConfig,
  uploadLandingAsset,
  sanitizeRichHtml,
  generateRandomBidder,
  DEFAULT_LANDING_CONFIG,
  type LandingConfig,
  type ViewportConfig,
  type FeedPost,
  type DashboardConfig,
} from "@/lib/landing-config";

const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || "footfans2026";
const SESSION_KEY = "ff_admin_authed";

type Viewport = "desktop" | "mobile";
type Area = "external" | "internal";
type MegaTab = "customize" | "submissions" | "recovery";

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [loginError, setLoginError] = useState("");

  const [config, setConfig] = useState<LandingConfig>(DEFAULT_LANDING_CONFIG);
  const [viewport, setViewport] = useState<Viewport>("desktop");
  const [area, setArea] = useState<Area>("external");
  const [megaTab, setMegaTab] = useState<MegaTab>("customize");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  useEffect(() => {
    try {
      if (sessionStorage.getItem(SESSION_KEY) === "1") setAuthed(true);
    } catch {}
  }, []);

  useEffect(() => {
    if (!authed) return;
    (async () => {
      const c = await fetchLandingConfig();
      setConfig(c);
      setLoading(false);
    })();
  }, [authed]);

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (passwordInput === ADMIN_PASSWORD) {
      setAuthed(true);
      try {
        sessionStorage.setItem(SESSION_KEY, "1");
        sessionStorage.setItem("admin_password", passwordInput);
      } catch {}
    } else {
      setLoginError("Senha incorreta.");
      setTimeout(() => setLoginError(""), 2500);
    }
  }

  function handleLogout() {
    try { sessionStorage.removeItem(SESSION_KEY); } catch {}
    setAuthed(false);
    setPasswordInput("");
  }

  async function handleSave() {
    setSaving(true);
    setSaveMessage("");
    const res = await saveLandingConfig(config);
    if (res.ok) {
      setSaveMessage("✓ Salvo! Recarregue a página inicial pra ver.");
      setTimeout(() => setSaveMessage(""), 4000);
    } else {
      setSaveMessage(`Erro: ${res.error}`);
    }
    setSaving(false);
  }

  function resetDefaults() {
    if (!confirm("Restaurar todas as configurações padrão? Isso vai sobrescrever o que está salvo.")) return;
    setConfig(DEFAULT_LANDING_CONFIG);
  }

  function copyDesktopToMobile() {
    if (!confirm("Copiar todas as configurações do Desktop para o Mobile?")) return;
    setConfig((c) => ({ ...c, mobile: { ...c.desktop } }));
  }

  function copyMobileToDesktop() {
    if (!confirm("Copiar todas as configurações do Mobile para o Desktop?")) return;
    setConfig((c) => ({ ...c, desktop: { ...c.mobile } }));
  }

  function updateField<K extends keyof LandingConfig>(key: K, value: LandingConfig[K]) {
    setConfig((c) => ({ ...c, [key]: value }));
  }

  function updateDashboard(patch: Partial<DashboardConfig>) {
    setConfig((c) => ({ ...c, dashboard: { ...c.dashboard, ...patch } }));
  }

  function updateViewportField<K extends keyof ViewportConfig>(key: K, value: ViewportConfig[K]) {
    setConfig((c) => ({
      ...c,
      [viewport]: { ...c[viewport], [key]: value },
    }));
  }

  function updateFaq(idx: number, field: "q" | "a", value: string) {
    setConfig((c) => ({
      ...c,
      faqs: c.faqs.map((f, i) => (i === idx ? { ...f, [field]: value } : f)),
    }));
  }

  function addFaq() {
    setConfig((c) => ({ ...c, faqs: [...c.faqs, { q: "Nova pergunta", a: "Nova resposta" }] }));
  }

  function removeFaq(idx: number) {
    setConfig((c) => ({ ...c, faqs: c.faqs.filter((_, i) => i !== idx) }));
  }

  function updateQuestion(qIdx: number, field: "title" | "subtitle", value: string) {
    setConfig((c) => ({
      ...c,
      questions: c.questions.map((q, i) =>
        i === qIdx ? { ...q, [field]: value } : q
      ),
    }));
  }

  function updateQuestionOption(qIdx: number, optIdx: number, field: "emoji" | "text" | "color", value: string) {
    setConfig((c) => ({
      ...c,
      questions: c.questions.map((q, i) =>
        i === qIdx
          ? {
              ...q,
              options: q.options.map((o, j) =>
                j === optIdx ? { ...o, [field]: value } : o
              ),
            }
          : q
      ),
    }));
  }

  function addQuestionOption(qIdx: number) {
    setConfig((c) => ({
      ...c,
      questions: c.questions.map((q, i) =>
        i === qIdx
          ? { ...q, options: [...q.options, { emoji: "✨", text: "Nova opção", color: "#22c55e" }] }
          : q
      ),
    }));
  }

  function removeQuestionOption(qIdx: number, optIdx: number) {
    setConfig((c) => ({
      ...c,
      questions: c.questions.map((q, i) =>
        i === qIdx
          ? { ...q, options: q.options.filter((_, j) => j !== optIdx) }
          : q
      ),
    }));
  }

  // ========== HELPERS DASHBOARD ==========
  function updateDashField<K extends keyof DashboardConfig>(key: K, value: DashboardConfig[K]) {
    setConfig((c) => ({ ...c, dashboard: { ...c.dashboard, [key]: value } }));
  }

  function copyLogoFromLanding() {
    if (!confirm("Copiar logo, tagline e textos da landing pro dashboard?")) return;
    setConfig((c) => ({
      ...c,
      dashboard: {
        ...c.dashboard,
        logo_mode: c.logo_mode === "image" ? "image" : "text",
        logo_primary: c.logo_primary,
        logo_secondary: c.logo_secondary,
        logo_image_url: c.logo_image_url,
      },
    }));
  }

  function updateFeedPost<K extends keyof FeedPost>(idx: number, key: K, value: FeedPost[K]) {
    setConfig((c) => ({
      ...c,
      dashboard: {
        ...c.dashboard,
        feed_posts: c.dashboard.feed_posts.map((p, i) =>
          i === idx ? { ...p, [key]: value } : p
        ),
      },
    }));
  }

  function addFeedPost() {
    const newPost: FeedPost = {
      id: `post-${Date.now()}`,
      seller_name: "novo_user",
      seller_avatar_url: "",
      buyer_name: "Novo Comprador",
      buyer_emirate: "Dubai · UAE",
      buyer_flag: "🇦🇪",
      amount_brl: 250.00,
      bids_count: 10,
      rarity: "common",
      time_ago: "agora",
      image_url: "",
    };
    setConfig((c) => ({
      ...c,
      dashboard: { ...c.dashboard, feed_posts: [...c.dashboard.feed_posts, newPost] },
    }));
  }

  function removeFeedPost(idx: number) {
    if (!confirm("Remover esse post do feed?")) return;
    setConfig((c) => ({
      ...c,
      dashboard: {
        ...c.dashboard,
        feed_posts: c.dashboard.feed_posts.filter((_, i) => i !== idx),
      },
    }));
  }

  function moveFeedPost(idx: number, direction: -1 | 1) {
    setConfig((c) => {
      const posts = [...c.dashboard.feed_posts];
      const newIdx = idx + direction;
      if (newIdx < 0 || newIdx >= posts.length) return c;
      [posts[idx], posts[newIdx]] = [posts[newIdx], posts[idx]];
      return { ...c, dashboard: { ...c.dashboard, feed_posts: posts } };
    });
  }

  // ========== TELA DE LOGIN ==========
  if (!authed) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <form onSubmit={handleLogin} className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md border border-gray-200">
          <div className="text-center mb-8">
            <div className="w-14 h-14 mx-auto mb-3 bg-gray-900 rounded-full flex items-center justify-center">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h1 className="font-display text-2xl text-gray-900 mb-1">Painel Admin</h1>
            <p className="text-sm text-gray-500">Foot Priv · Editor da landing</p>
          </div>
          <input type="password" placeholder="Senha de acesso" value={passwordInput}
            onChange={(e) => setPasswordInput(e.target.value)} autoFocus
            className="w-full bg-gray-50 border border-gray-200 focus:border-gray-900 rounded-xl px-4 py-3 text-gray-900 focus:outline-none transition mb-3" />
          {loginError && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs px-4 py-2.5 rounded-xl mb-3">
              {loginError}
            </div>
          )}
          <button type="submit" className="w-full bg-gray-900 hover:bg-black text-white font-semibold py-3 rounded-xl transition text-sm">
            Entrar
          </button>
        </form>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-gray-200 border-t-gray-900 rounded-full animate-spin"></div>
      </div>
    );
  }

  const v = config[viewport];
  const dash = config.dashboard;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl text-gray-900">Editor da Landing</h1>
          <p className="text-xs text-gray-500">Personalize a página inicial — alterações aplicam ao salvar</p>
        </div>
        <div className="flex items-center gap-3">
          <a href="/" target="_blank" rel="noopener noreferrer" className="text-sm text-gray-600 hover:text-gray-900 font-medium underline underline-offset-4">
            Ver página ao vivo →
          </a>
          <button onClick={resetDefaults} className="text-sm text-gray-500 hover:text-gray-900 transition">Resetar</button>
          <button onClick={handleLogout} className="text-sm text-gray-500 hover:text-gray-900 transition">Sair</button>
          <button onClick={handleSave} disabled={saving}
            className="bg-gray-900 hover:bg-black disabled:bg-gray-300 text-white font-semibold px-5 py-2 rounded-xl transition text-sm">
            {saving ? "Salvando..." : "Salvar alterações"}
          </button>
        </div>
      </header>

      {saveMessage && (
        <div className={`px-6 py-3 text-sm font-medium ${
          saveMessage.startsWith("✓")
            ? "bg-emerald-50 text-emerald-800 border-b border-emerald-200"
            : "bg-red-50 text-red-800 border-b border-red-200"
        }`}>
          {saveMessage}
        </div>
      )}

      {/* === MEGA TABS (fora do grid pra ficar visível em ambos modos) === */}
      <div className="px-6 pt-4">
        <div className="bg-gradient-to-br from-gray-900 to-black rounded-2xl p-1.5 shadow-lg max-w-2xl mx-auto">
          <div className="grid grid-cols-3 gap-1">
            <button
              onClick={() => setMegaTab("customize")}
              className={`flex items-center justify-center gap-2 py-3 rounded-xl text-xs sm:text-sm font-bold transition ${
                megaTab === "customize"
                  ? "bg-white text-gray-900 shadow"
                  : "text-white/60 hover:text-white"
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              <span>Personalização</span>
            </button>
            <button
              onClick={() => setMegaTab("submissions")}
              className={`flex items-center justify-center gap-2 py-3 rounded-xl text-xs sm:text-sm font-bold transition ${
                megaTab === "submissions"
                  ? "bg-white text-gray-900 shadow"
                  : "text-white/60 hover:text-white"
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2a4 4 0 014-4h4m0 0l-3-3m3 3l-3 3M3 12a9 9 0 1018 0 9 9 0 00-18 0z" />
              </svg>
              <span>Envios</span>
            </button>
            <button
              onClick={() => setMegaTab("recovery")}
              className={`flex items-center justify-center gap-2 py-3 rounded-xl text-xs sm:text-sm font-bold transition ${
                megaTab === "recovery"
                  ? "bg-white text-gray-900 shadow"
                  : "text-white/60 hover:text-white"
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              </svg>
              <span>Recuperação</span>
            </button>
          </div>
        </div>
      </div>

      {/* === MODO RECUPERAÇÃO === */}
      {megaTab === "recovery" && (
        <div className="px-6 pb-6 pt-4">
          <RecoveryPanel />
        </div>
      )}

      {/* === MODO ENVIOS: tela cheia === */}
      {megaTab === "submissions" && (
        <div className="px-6 pb-6 pt-4">
          <SubmissionsPanel />
        </div>
      )}

      {/* === MODO PERSONALIZAÇÃO: grid 2 colunas com preview === */}
      {megaTab === "customize" && (
      <div className="grid lg:grid-cols-2 gap-0 lg:h-[calc(100vh-145px)]">
        {/* === FORMULÁRIO === */}
        <div className="overflow-y-auto p-6 lg:border-r border-gray-200">

          <>



          {/* === TABS EXTERNO / INTERNO === */}
          <div className="bg-white border border-gray-200 rounded-2xl p-1.5 mb-4 sticky top-0 z-20 shadow-sm">
            <div className="grid grid-cols-2 gap-1">
              <button
                onClick={() => setArea("external")}
                className={`flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition ${
                  area === "external"
                    ? "bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow"
                    : "text-gray-500 hover:text-gray-900"
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                </svg>
                <span>Externo (Landing)</span>
              </button>
              <button
                onClick={() => setArea("internal")}
                className={`flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition ${
                  area === "internal"
                    ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow"
                    : "text-gray-500 hover:text-gray-900"
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <span>Interno (Dashboard)</span>
              </button>
            </div>
            <p className="text-[10px] text-gray-500 text-center mt-1.5 leading-tight">
              {area === "external"
                ? "Página inicial e fluxo de cadastro (visível antes do login)"
                : "Dashboard, feed e leilão (visível só após login)"}
            </p>
          </div>

          {area === "external" && (
            <>

          {/* === TOGGLE DESKTOP / MOBILE === */}
          <div className="bg-gray-900 text-white rounded-2xl p-2 mb-6 sticky top-0 z-10 shadow-lg">
            <div className="grid grid-cols-2 gap-1">
              <button
                onClick={() => setViewport("desktop")}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition ${
                  viewport === "desktop" ? "bg-white text-gray-900" : "text-white/70 hover:text-white"
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Desktop
              </button>
              <button
                onClick={() => setViewport("mobile")}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition ${
                  viewport === "mobile" ? "bg-white text-gray-900" : "text-white/70 hover:text-white"
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                Mobile
              </button>
            </div>
            <div className="text-center mt-1.5">
              <p className="text-[10px] text-white/60 leading-tight">
                Editando configurações visuais para <strong className="text-white">{viewport === "desktop" ? "💻 Desktop" : "📱 Mobile"}</strong>
              </p>
              <button
                onClick={viewport === "desktop" ? copyDesktopToMobile : copyMobileToDesktop}
                className="text-[10px] text-white/60 hover:text-white underline mt-0.5"
              >
                Copiar config para {viewport === "desktop" ? "Mobile" : "Desktop"}
              </button>
            </div>
          </div>

          <p className="text-[11px] text-gray-500 mb-6 text-center bg-gray-100 rounded-lg py-2 px-3">
            ℹ Textos, cores, FAQ e URLs são <strong>compartilhados</strong>. Tamanho da logo, alinhamento e posição da imagem de fundo são <strong>separados</strong> entre desktop e mobile.
          </p>

          {/* === BANNER DO TOPO === */}
          <Section title="Banner do topo" icon="📢">
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer mb-2">
              <input type="checkbox" checked={config.banner_enabled}
                onChange={(e) => updateField("banner_enabled", e.target.checked)}
                className="w-4 h-4 accent-gray-900" />
              Mostrar banner no topo da landing
            </label>

            {config.banner_enabled && (
              <>
                <div>
                  <label className="block text-xs uppercase tracking-wider text-gray-500 font-semibold mb-2">Tipo</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => updateField("banner_mode", "text")}
                      className={`py-2.5 rounded-lg text-sm font-semibold transition border ${
                        config.banner_mode === "text"
                          ? "bg-gray-900 text-white border-gray-900"
                          : "bg-white text-gray-700 border-gray-200 hover:border-gray-400"
                      }`}>
                      Aa Texto
                    </button>
                    <button type="button" onClick={() => updateField("banner_mode", "image")}
                      className={`py-2.5 rounded-lg text-sm font-semibold transition border ${
                        config.banner_mode === "image"
                          ? "bg-gray-900 text-white border-gray-900"
                          : "bg-white text-gray-700 border-gray-200 hover:border-gray-400"
                      }`}>
                      🖼 Imagem
                    </button>
                  </div>
                </div>

                {config.banner_mode === "text" ? (
                  <Field label="Texto do banner" hint="Ex: 'Projeto acadêmico de [Universidade] - 2026'">
                    <input type="text" value={config.banner_text}
                      onChange={(e) => updateField("banner_text", e.target.value)}
                      className="w-full bg-white border border-gray-200 focus:border-gray-900 rounded-lg px-3.5 py-2.5 text-sm text-gray-900 outline-none transition-colors" />
                  </Field>
                ) : (
                  <ImageUploadField
                    label="Imagem do banner"
                    hint="Fica horizontal no topo, altura máx 48px. Upload preserva qualidade."
                    folder="banner"
                    value={config.banner_image_url}
                    onChange={(url) => updateField("banner_image_url", url)}
                    previewBg={config.banner_bg_color}
                    previewMaxHeight={48}
                  />
                )}

                <div className="grid grid-cols-2 gap-3">
                  <ColorField label="Cor de fundo" value={config.banner_bg_color} onChange={(val) => updateField("banner_bg_color", val)} />
                  {config.banner_mode === "text" && (
                    <ColorField label="Cor do texto" value={config.banner_text_color} onChange={(val) => updateField("banner_text_color", val)} />
                  )}
                </div>

                <Field label="Link ao clicar (opcional)" hint="Deixe vazio se não for clicável">
                  <input type="url" value={config.banner_link_url}
                    onChange={(e) => updateField("banner_link_url", e.target.value)}
                    placeholder="https://..." className="w-full bg-white border border-gray-200 focus:border-gray-900 rounded-lg px-3.5 py-2.5 text-sm text-gray-900 outline-none transition-colors" />
                </Field>
              </>
            )}
          </Section>

          {/* === LOGO === */}
          <Section title="Logo & Identidade" icon="✨">
            <div>
              <label className="block text-xs uppercase tracking-wider text-gray-500 font-semibold mb-2">Tipo de logo</label>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => updateField("logo_mode", "text")}
                  className={`py-2.5 rounded-lg text-sm font-semibold transition border ${
                    config.logo_mode === "text" ? "bg-gray-900 text-white border-gray-900"
                      : "bg-white text-gray-700 border-gray-200 hover:border-gray-400"
                  }`}>Aa Texto</button>
                <button type="button" onClick={() => updateField("logo_mode", "image")}
                  className={`py-2.5 rounded-lg text-sm font-semibold transition border ${
                    config.logo_mode === "image" ? "bg-gray-900 text-white border-gray-900"
                      : "bg-white text-gray-700 border-gray-200 hover:border-gray-400"
                  }`}>🖼 Imagem</button>
              </div>
            </div>

            {config.logo_mode === "text" ? (
              <>
                <Field label="Texto principal">
                  <input type="text" value={config.logo_primary}
                    onChange={(e) => updateField("logo_primary", e.target.value)} className="w-full bg-white border border-gray-200 focus:border-gray-900 rounded-lg px-3.5 py-2.5 text-sm text-gray-900 outline-none transition-colors" />
                </Field>
                <Field label="Texto secundário">
                  <input type="text" value={config.logo_secondary}
                    onChange={(e) => updateField("logo_secondary", e.target.value)} className="w-full bg-white border border-gray-200 focus:border-gray-900 rounded-lg px-3.5 py-2.5 text-sm text-gray-900 outline-none transition-colors" />
                </Field>
              </>
            ) : (
              <ImageUploadField
                label="Imagem da logo"
                hint="PNG ou SVG com fundo transparente. Upload preserva qualidade."
                folder="logo"
                value={config.logo_image_url}
                onChange={(url) => updateField("logo_image_url", url)}
                previewBg="linear-gradient(to bottom right, #1f2937, #111827)"
                previewMaxHeight={Math.max(80, v.logo_size * 0.5)}
              />
            )}

            <ViewportLabel viewport={viewport} />

            <Field label={`Tamanho da logo: ${v.logo_size}%`}>
              <input type="range" min="40" max="250" value={v.logo_size}
                onChange={(e) => updateViewportField("logo_size", parseInt(e.target.value))}
                className="w-full accent-gray-900" />
            </Field>

            <div>
              <label className="block text-xs uppercase tracking-wider text-gray-500 font-semibold mb-2">Alinhamento</label>
              <div className="grid grid-cols-3 gap-2">
                {(["left", "center", "right"] as const).map((align) => (
                  <button key={align} type="button"
                    onClick={() => updateViewportField("logo_align", align)}
                    className={`py-2 rounded-lg text-xs font-semibold transition border ${
                      v.logo_align === align ? "bg-gray-900 text-white border-gray-900"
                        : "bg-white text-gray-700 border-gray-200 hover:border-gray-400"
                    }`}>
                    {align === "left" ? "← Esquerda" : align === "center" ? "Centro" : "Direita →"}
                  </button>
                ))}
              </div>
            </div>

            <Field label="Tagline (acima do logo)" hint="Ex: Discreto · Anônimo · Lucrativo">
              <input type="text" value={config.tagline}
                onChange={(e) => updateField("tagline", e.target.value)} className="w-full bg-white border border-gray-200 focus:border-gray-900 rounded-lg px-3.5 py-2.5 text-sm text-gray-900 outline-none transition-colors" />
            </Field>
          </Section>

          {/* === HEADLINE + CTA === */}
          <Section title="Headline & Botão CTA" icon="📣">
            <Field label="Headline principal" hint="Use a barra de formatação para destacar palavras">
              <RichTextEditor
                value={config.headline_html}
                onChange={(html) => {
                  updateField("headline_html", html);
                  // Mantém versão plana sincronizada (fallback)
                  const plain = html.replace(/<[^>]*>/g, "");
                  updateField("headline", plain);
                }}
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label={`Tamanho: ${config.headline_size}px`}>
                <input type="range" min="12" max="48" value={config.headline_size}
                  onChange={(e) => updateField("headline_size", parseInt(e.target.value))}
                  className="w-full accent-gray-900" />
              </Field>
              <Field label={`Peso: ${config.headline_weight}`}>
                <input type="range" min="300" max="900" step="100" value={config.headline_weight}
                  onChange={(e) => updateField("headline_weight", parseInt(e.target.value))}
                  className="w-full accent-gray-900" />
              </Field>
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-gray-500 font-semibold mb-2">Alinhamento</label>
              <div className="grid grid-cols-3 gap-2">
                {(["left", "center", "right"] as const).map((align) => (
                  <button key={align} type="button"
                    onClick={() => updateField("headline_align", align)}
                    className={`py-2 rounded-lg text-xs font-semibold transition border ${
                      config.headline_align === align ? "bg-gray-900 text-white border-gray-900"
                        : "bg-white text-gray-700 border-gray-200 hover:border-gray-400"
                    }`}>
                    {align === "left" ? "← Esquerda" : align === "center" ? "Centro" : "Direita →"}
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t border-gray-200 my-2"></div>

            <Field label="Texto do botão (CTA)">
              <input type="text" value={config.cta_text}
                onChange={(e) => updateField("cta_text", e.target.value)} className="w-full bg-white border border-gray-200 focus:border-gray-900 rounded-lg px-3.5 py-2.5 text-sm text-gray-900 outline-none transition-colors" />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label={`Tamanho: ${config.cta_size}px`}>
                <input type="range" min="10" max="24" value={config.cta_size}
                  onChange={(e) => updateField("cta_size", parseInt(e.target.value))}
                  className="w-full accent-gray-900" />
              </Field>
              <Field label={`Peso: ${config.cta_weight}`}>
                <input type="range" min="300" max="900" step="100" value={config.cta_weight}
                  onChange={(e) => updateField("cta_weight", parseInt(e.target.value))}
                  className="w-full accent-gray-900" />
              </Field>
            </div>
          </Section>

          {/* === CORES === */}
          <Section title="Cores" icon="🎨">
            <div className="grid grid-cols-2 gap-3">
              <ColorField label="Primária" value={config.color_primary} onChange={(val) => updateField("color_primary", val)} />
              <ColorField label="Acento" value={config.color_accent} onChange={(val) => updateField("color_accent", val)} />
              <ColorField label="Fundo (topo)" value={config.color_bg_from} onChange={(val) => updateField("color_bg_from", val)} />
              <ColorField label="Fundo (meio)" value={config.color_bg_via} onChange={(val) => updateField("color_bg_via", val)} />
              <ColorField label="Fundo (base)" value={config.color_bg_to} onChange={(val) => updateField("color_bg_to", val)} />
            </div>
          </Section>

          {/* === IMAGEM DE FUNDO === */}
          <Section title="Imagem de fundo (opcional)" icon="🖼️">
            <ImageUploadField
              label="Imagem de fundo"
              hint="Compartilhada entre desktop e mobile. Recomendado mínimo 2400px de largura."
              folder="background"
              value={config.background_image_url}
              onChange={(url) => updateField("background_image_url", url)}
              previewBg="#111827"
              previewMaxHeight={160}
            />

            {config.background_image_url && (
              <>
                <ViewportLabel viewport={viewport} />

                <div>
                  <label className="block text-xs uppercase tracking-wider text-gray-500 font-semibold mb-2">Comportamento</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(["cover", "contain", "auto"] as const).map((fit) => (
                      <button key={fit} type="button"
                        onClick={() => updateViewportField("background_fit", fit)}
                        className={`py-2 rounded-lg text-xs font-semibold transition border ${
                          v.background_fit === fit ? "bg-gray-900 text-white border-gray-900"
                            : "bg-white text-gray-700 border-gray-200 hover:border-gray-400"
                        }`}
                        title={fit === "cover" ? "Preenche tudo" : fit === "contain" ? "Imagem inteira" : "Tamanho original"}>
                        {fit === "cover" ? "Preencher" : fit === "contain" ? "Conter" : "Auto"}
                      </button>
                    ))}
                  </div>
                </div>

                <Field label={`Posição horizontal: ${v.background_position_x}%`} hint="0% = esquerda · 100% = direita">
                  <input type="range" min="0" max="100" value={v.background_position_x}
                    onChange={(e) => updateViewportField("background_position_x", parseInt(e.target.value))}
                    className="w-full accent-gray-900" />
                </Field>

                <Field label={`Posição vertical: ${v.background_position_y}%`} hint="0% = topo · 100% = base">
                  <input type="range" min="0" max="100" value={v.background_position_y}
                    onChange={(e) => updateViewportField("background_position_y", parseInt(e.target.value))}
                    className="w-full accent-gray-900" />
                </Field>

                <Field label={`Zoom: ${v.background_size}%`} hint="50% = afasta · 250% = aproxima">
                  <input type="range" min="50" max="250" value={v.background_size}
                    onChange={(e) => updateViewportField("background_size", parseInt(e.target.value))}
                    className="w-full accent-gray-900" />
                </Field>

                <Field label={`Escurecimento: ${v.background_overlay_opacity}%`} hint="Camada escura sobre a imagem pra texto ficar legível">
                  <input type="range" min="0" max="90" value={v.background_overlay_opacity}
                    onChange={(e) => updateViewportField("background_overlay_opacity", parseInt(e.target.value))}
                    className="w-full accent-gray-900" />
                </Field>
              </>
            )}
          </Section>

          {/* === FAQ === */}
          <Section title="FAQ" icon="❓">
            {config.faqs.map((faq, i) => (
              <div key={i} className="bg-white border border-gray-200 rounded-xl p-3 mb-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Pergunta {i + 1}</span>
                  <button onClick={() => removeFaq(i)} className="text-xs text-red-600 hover:text-red-800 transition">Remover</button>
                </div>
                <input type="text" value={faq.q} onChange={(e) => updateFaq(i, "q", e.target.value)}
                  placeholder="Pergunta" className="w-full bg-white border border-gray-200 focus:border-gray-900 rounded-lg px-3.5 py-2.5 text-sm text-gray-900 outline-none transition-colors mb-2" />
                <textarea value={faq.a} onChange={(e) => updateFaq(i, "a", e.target.value)} rows={3}
                  placeholder="Resposta" className="w-full bg-white border border-gray-200 focus:border-gray-900 rounded-lg px-3.5 py-2.5 text-sm text-gray-900 outline-none transition-colors resize-none" />
              </div>
            ))}
            <button onClick={addFaq}
              className="w-full border-2 border-dashed border-gray-300 hover:border-gray-500 text-gray-500 hover:text-gray-900 py-3 rounded-xl text-sm font-semibold transition">
              + Adicionar pergunta
            </button>
          </Section>

          {/* === PERGUNTAS DO ONBOARDING === */}
          <Section title="Perguntas do cadastro" icon="❔">
            <p className="text-[11px] text-gray-500 mb-2">
              As perguntas que aparecem no fluxo de onboarding (após enviar a foto). Cada uma tem título, subtítulo e opções de resposta com emoji + cor.
            </p>
            {config.questions.map((q, qIdx) => (
              <div key={q.id} className="bg-white border border-gray-200 rounded-xl p-4 mb-3">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Pergunta {qIdx + 1}
                  </span>
                </div>

                <div className="space-y-2 mb-3">
                  <input
                    type="text"
                    value={q.title}
                    onChange={(e) => updateQuestion(qIdx, "title", e.target.value)}
                    placeholder="Título da pergunta"
                    className="w-full bg-white border border-gray-200 focus:border-gray-900 rounded-lg px-3.5 py-2.5 text-sm text-gray-900 outline-none transition-colors font-semibold"
                  />
                  <input
                    type="text"
                    value={q.subtitle}
                    onChange={(e) => updateQuestion(qIdx, "subtitle", e.target.value)}
                    placeholder="Subtítulo / explicação"
                    className="w-full bg-white border border-gray-200 focus:border-gray-900 rounded-lg px-3.5 py-2.5 text-sm text-gray-900 outline-none transition-colors text-sm"
                  />
                </div>

                <div className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-2">
                  Opções de resposta
                </div>

                <div className="space-y-2">
                  {q.options.map((opt, optIdx) => (
                    <div
                      key={`${q.id}-opt-${optIdx}`}
                      className="bg-gray-50 border border-gray-200 rounded-lg p-2 flex items-center gap-2"
                    >
                      <input
                        type="text"
                        value={opt.emoji}
                        onChange={(e) => updateQuestionOption(qIdx, optIdx, "emoji", e.target.value)}
                        placeholder="🌟"
                        className="w-12 text-center bg-white border border-gray-200 rounded px-1 py-1.5 text-base"
                        title="Emoji"
                      />
                      <input
                        type="text"
                        value={opt.text}
                        onChange={(e) => updateQuestionOption(qIdx, optIdx, "text", e.target.value)}
                        placeholder="Texto da opção"
                        className="flex-1 bg-white border border-gray-200 rounded px-3 py-1.5 text-sm text-gray-900 outline-none focus:border-gray-900 min-w-0"
                      />
                      <input
                        type="color"
                        value={opt.color}
                        onChange={(e) => updateQuestionOption(qIdx, optIdx, "color", e.target.value)}
                        className="w-8 h-8 rounded cursor-pointer border border-gray-200 flex-shrink-0"
                        title="Cor"
                      />
                      <button
                        type="button"
                        onClick={() => removeQuestionOption(qIdx, optIdx)}
                        className="text-red-500 hover:text-red-700 text-lg flex-shrink-0 px-1"
                        title="Remover opção"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => addQuestionOption(qIdx)}
                    className="w-full border border-dashed border-gray-300 hover:border-gray-500 text-gray-500 hover:text-gray-900 py-2 rounded-lg text-xs font-semibold transition"
                  >
                    + Adicionar opção
                  </button>
                </div>
              </div>
            ))}
          </Section>

            </>
          )}

          {/* ========================================== */}
          {/* ========== ÁREA INTERNA (DASHBOARD) ====== */}
          {/* ========================================== */}
          {area === "internal" && (
            <>

          <p className="text-[11px] text-gray-500 mb-6 text-center bg-blue-50 rounded-lg py-2 px-3 border border-blue-100">
            ℹ Editando o <strong>dashboard</strong> — o que a usuária vê após fazer login (feed, leilão, perfil, etc).
          </p>

          {/* === LOGO DO DASHBOARD === */}
          <Section title="Logo do Dashboard" icon="✨">
            <button
              type="button"
              onClick={copyLogoFromLanding}
              className="w-full bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 text-xs font-semibold py-2 rounded-lg transition mb-2"
            >
              ↓ Copiar logo da landing externa
            </button>

            <div>
              <label className="block text-xs uppercase tracking-wider text-gray-500 font-semibold mb-2">Tipo de logo</label>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => updateDashField("logo_mode", "text")}
                  className={`py-2.5 rounded-lg text-sm font-semibold transition border ${
                    dash.logo_mode === "text" ? "bg-gray-900 text-white border-gray-900"
                      : "bg-white text-gray-700 border-gray-200 hover:border-gray-400"
                  }`}>Aa Texto</button>
                <button type="button" onClick={() => updateDashField("logo_mode", "image")}
                  className={`py-2.5 rounded-lg text-sm font-semibold transition border ${
                    dash.logo_mode === "image" ? "bg-gray-900 text-white border-gray-900"
                      : "bg-white text-gray-700 border-gray-200 hover:border-gray-400"
                  }`}>🖼 Imagem</button>
              </div>
            </div>

            {dash.logo_mode === "text" ? (
              <>
                <Field label="Texto principal">
                  <input type="text" value={dash.logo_primary}
                    onChange={(e) => updateDashField("logo_primary", e.target.value)} className="w-full bg-white border border-gray-200 focus:border-gray-900 rounded-lg px-3.5 py-2.5 text-sm text-gray-900 outline-none transition-colors" />
                </Field>
                <Field label="Texto secundário">
                  <input type="text" value={dash.logo_secondary}
                    onChange={(e) => updateDashField("logo_secondary", e.target.value)} className="w-full bg-white border border-gray-200 focus:border-gray-900 rounded-lg px-3.5 py-2.5 text-sm text-gray-900 outline-none transition-colors" />
                </Field>
              </>
            ) : (
              <ImageUploadField
                label="Imagem da logo (dashboard)"
                hint="PNG/SVG transparente recomendado"
                folder="logo"
                value={dash.logo_image_url}
                onChange={(url) => updateDashField("logo_image_url", url)}
                previewBg="#f9fafb"
                previewMaxHeight={80}
              />
            )}

            <Field label={`Tamanho da logo: ${dash.logo_size}%`}>
              <input type="range" min="40" max="200" value={dash.logo_size}
                onChange={(e) => updateDashField("logo_size", parseInt(e.target.value))}
                className="w-full accent-gray-900" />
            </Field>
          </Section>

          {/* === CORES DO DASHBOARD === */}
          <Section title="Cores do Dashboard" icon="🎨">
            <div className="grid grid-cols-2 gap-3">
              <ColorField label="Primária" value={dash.color_primary} onChange={(val) => updateDashField("color_primary", val)} />
              <ColorField label="Acento" value={dash.color_accent} onChange={(val) => updateDashField("color_accent", val)} />
              <ColorField label="Fundo geral" value={dash.color_bg} onChange={(val) => updateDashField("color_bg", val)} />
              <ColorField label="Fundo dos cards" value={dash.color_card_bg} onChange={(val) => updateDashField("color_card_bg", val)} />
            </div>
          </Section>

          {/* === TEXTOS DA UI === */}
          <Section title="Textos da interface" icon="🔤">
            <p className="text-[11px] text-gray-500 mb-2">Labels que aparecem na sidebar, bottom-tab e cards do dashboard.</p>

            <div className="grid grid-cols-2 gap-2">
              <Field label="Aba 1 (Feed)">
                <input type="text" value={dash.label_feed}
                  onChange={(e) => updateDashField("label_feed", e.target.value)} className="w-full bg-white border border-gray-200 focus:border-gray-900 rounded-lg px-3.5 py-2.5 text-sm text-gray-900 outline-none transition-colors" />
              </Field>
              <Field label="Aba 2 (Leilão)">
                <input type="text" value={dash.label_auction}
                  onChange={(e) => updateDashField("label_auction", e.target.value)} className="w-full bg-white border border-gray-200 focus:border-gray-900 rounded-lg px-3.5 py-2.5 text-sm text-gray-900 outline-none transition-colors" />
              </Field>
              <Field label="Aba 3 (Carteira)">
                <input type="text" value={dash.label_wallet}
                  onChange={(e) => updateDashField("label_wallet", e.target.value)} className="w-full bg-white border border-gray-200 focus:border-gray-900 rounded-lg px-3.5 py-2.5 text-sm text-gray-900 outline-none transition-colors" />
              </Field>
              <Field label="Aba 4 (Perfil)">
                <input type="text" value={dash.label_profile}
                  onChange={(e) => updateDashField("label_profile", e.target.value)} className="w-full bg-white border border-gray-200 focus:border-gray-900 rounded-lg px-3.5 py-2.5 text-sm text-gray-900 outline-none transition-colors" />
              </Field>
            </div>

            <div className="border-t border-gray-200 my-2"></div>

            <Field label="Card 'Compradores online'">
              <input type="text" value={dash.label_buyers_online}
                onChange={(e) => updateDashField("label_buyers_online", e.target.value)} className="w-full bg-white border border-gray-200 focus:border-gray-900 rounded-lg px-3.5 py-2.5 text-sm text-gray-900 outline-none transition-colors" />
            </Field>
            <Field label="Card 'Top creators'">
              <input type="text" value={dash.label_top_creators}
                onChange={(e) => updateDashField("label_top_creators", e.target.value)} className="w-full bg-white border border-gray-200 focus:border-gray-900 rounded-lg px-3.5 py-2.5 text-sm text-gray-900 outline-none transition-colors" />
            </Field>
            <Field label="Card 'Leilão ativo'">
              <input type="text" value={dash.label_active_auction}
                onChange={(e) => updateDashField("label_active_auction", e.target.value)} className="w-full bg-white border border-gray-200 focus:border-gray-900 rounded-lg px-3.5 py-2.5 text-sm text-gray-900 outline-none transition-colors" />
            </Field>
            <Field label="Card 'Fechados'">
              <input type="text" value={dash.label_closed_auctions}
                onChange={(e) => updateDashField("label_closed_auctions", e.target.value)} className="w-full bg-white border border-gray-200 focus:border-gray-900 rounded-lg px-3.5 py-2.5 text-sm text-gray-900 outline-none transition-colors" />
            </Field>
          </Section>

          {/* === FEED POSTS === */}
          <Section title={`Posts do feed (${dash.feed_posts.length})`} icon="📸">
            <p className="text-[11px] text-gray-500 mb-2">
              Vendas fictícias que aparecem no feed do dashboard. Adicione, remova e reordene livremente.
            </p>

            {/* Controles de blur das fotos vendidas */}
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200 rounded-xl p-3 mb-3">
              <div className="text-xs font-bold text-purple-900 uppercase tracking-wider mb-2 flex items-center gap-1">
                🔒 Aparência das fotos vendidas
              </div>

              <Field label={`Intensidade do blur: ${dash.feed_blur_intensity}px`} hint="0px = nítida · 30px = totalmente borrada">
                <input type="range" min="0" max="30" value={dash.feed_blur_intensity}
                  onChange={(e) => updateDashField("feed_blur_intensity", parseInt(e.target.value))}
                  className="w-full accent-purple-600" />
              </Field>

              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer mt-2">
                <input type="checkbox" checked={dash.feed_grayscale}
                  onChange={(e) => updateDashField("feed_grayscale", e.target.checked)}
                  className="w-4 h-4 accent-purple-600" />
                <span>Aplicar filtro preto e branco</span>
              </label>

              <p className="text-[10px] text-purple-700 mt-2">
                💡 Mexa nesses sliders e veja o preview à direita atualizar.
              </p>
            </div>

            {dash.feed_posts.map((post, idx) => (
              <div key={post.id} className="bg-white border border-gray-200 rounded-xl p-3 mb-2">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Post {idx + 1}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => moveFeedPost(idx, -1)}
                      disabled={idx === 0}
                      className="text-xs text-gray-500 hover:text-gray-900 disabled:opacity-30 px-1.5 py-0.5"
                      title="Mover pra cima"
                    >↑</button>
                    <button
                      onClick={() => moveFeedPost(idx, 1)}
                      disabled={idx === dash.feed_posts.length - 1}
                      className="text-xs text-gray-500 hover:text-gray-900 disabled:opacity-30 px-1.5 py-0.5"
                      title="Mover pra baixo"
                    >↓</button>
                    <button
                      onClick={() => removeFeedPost(idx)}
                      className="text-xs text-red-600 hover:text-red-800 transition ml-1"
                    >Remover</button>
                  </div>
                </div>

                {/* Imagem do post */}
                <ImageUploadField
                  label="Foto do post (vendido)"
                  hint="A foto fica borrada/escondida no feed (ela já foi 'vendida')"
                  folder="background"
                  value={post.image_url}
                  onChange={(url) => updateFeedPost(idx, "image_url", url)}
                  previewBg="#1f2937"
                  previewMaxHeight={120}
                />

                <div className="grid grid-cols-2 gap-2 mt-2">
                  <Field label="@ vendedora">
                    <input type="text" value={post.seller_name}
                      onChange={(e) => updateFeedPost(idx, "seller_name", e.target.value)}
                      className="w-full bg-white border border-gray-200 focus:border-gray-900 rounded-lg px-3.5 py-2.5 text-sm text-gray-900 outline-none transition-colors" placeholder="username" />
                  </Field>
                  <Field label="Avatar (URL opcional)">
                    <input type="text" value={post.seller_avatar_url}
                      onChange={(e) => updateFeedPost(idx, "seller_avatar_url", e.target.value)}
                      className="w-full bg-white border border-gray-200 focus:border-gray-900 rounded-lg px-3.5 py-2.5 text-sm text-gray-900 outline-none transition-colors" placeholder="vazio = avatar gerado" />
                  </Field>
                </div>

                <Field label="Nome do comprador (sheik)">
                  <input type="text" value={post.buyer_name}
                    onChange={(e) => updateFeedPost(idx, "buyer_name", e.target.value)}
                    className="w-full bg-white border border-gray-200 focus:border-gray-900 rounded-lg px-3.5 py-2.5 text-sm text-gray-900 outline-none transition-colors" />
                </Field>

                <div className="grid grid-cols-2 gap-2">
                  <Field label="Cidade · País">
                    <input type="text" value={post.buyer_emirate}
                      onChange={(e) => updateFeedPost(idx, "buyer_emirate", e.target.value)}
                      className="w-full bg-white border border-gray-200 focus:border-gray-900 rounded-lg px-3.5 py-2.5 text-sm text-gray-900 outline-none transition-colors" placeholder="Dubai · UAE" />
                  </Field>
                  <Field label="Bandeira (emoji)">
                    <input type="text" value={post.buyer_flag}
                      onChange={(e) => updateFeedPost(idx, "buyer_flag", e.target.value)}
                      className="w-full bg-white border border-gray-200 focus:border-gray-900 rounded-lg px-3.5 py-2.5 text-sm text-gray-900 outline-none transition-colors" placeholder="🇦🇪" />
                  </Field>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Field label="Valor (R$)">
                    <input type="number" step="0.01" value={post.amount_brl}
                      onChange={(e) => updateFeedPost(idx, "amount_brl", parseFloat(e.target.value) || 0)}
                      className="w-full bg-white border border-gray-200 focus:border-gray-900 rounded-lg px-3.5 py-2.5 text-sm text-gray-900 outline-none transition-colors" />
                  </Field>
                  <Field label="Quantidade de lances">
                    <input type="number" value={post.bids_count}
                      onChange={(e) => updateFeedPost(idx, "bids_count", parseInt(e.target.value) || 0)}
                      className="w-full bg-white border border-gray-200 focus:border-gray-900 rounded-lg px-3.5 py-2.5 text-sm text-gray-900 outline-none transition-colors" />
                  </Field>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Field label="Tempo (texto livre)">
                    <input type="text" value={post.time_ago}
                      onChange={(e) => updateFeedPost(idx, "time_ago", e.target.value)}
                      className="w-full bg-white border border-gray-200 focus:border-gray-900 rounded-lg px-3.5 py-2.5 text-sm text-gray-900 outline-none transition-colors" placeholder="há 5min" />
                  </Field>
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-gray-500 font-semibold mb-1">Raridade</label>
                    <select
                      value={post.rarity}
                      onChange={(e) => updateFeedPost(idx, "rarity", e.target.value as any)}
                      className="w-full bg-white border border-gray-200 focus:border-gray-900 rounded-lg px-3.5 py-2.5 text-sm text-gray-900 outline-none transition-colors"
                    >
                      <option value="common">Comum</option>
                      <option value="rare">Raro</option>
                      <option value="epic">Épico</option>
                      <option value="legendary">Lendário</option>
                    </select>
                  </div>
                </div>
              </div>
            ))}

            <button
              onClick={addFeedPost}
              className="w-full border-2 border-dashed border-gray-300 hover:border-gray-500 text-gray-500 hover:text-gray-900 py-3 rounded-xl text-sm font-semibold transition"
            >
              + Adicionar post no feed
            </button>
          </Section>

          {/* === COMPRADORES (BIDDERS) === */}
          <Section title={`Compradores fictícios (${dash.bidders?.length || 0})`} icon="🤵">
            <p className="text-[11px] text-gray-500 mb-2">
              Pessoas que dão lance no leilão da usuária. Edite nome, foto, país e bandeira. A taxa de câmbio converte BRL → moeda local mostrada no lance.
            </p>

            <div className="space-y-2">
              {(dash.bidders || []).map((bidder, idx) => (
                <div key={bidder.id} className="bg-white border border-gray-200 rounded-xl p-3">
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-200 border border-gray-300 flex-shrink-0 relative group">
                      {bidder.avatar_url ? (
                        <img src={bidder.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-2xl">{bidder.flag}</div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0 space-y-1.5">
                      {/* Nome */}
                      <input
                        type="text"
                        value={bidder.name}
                        onChange={(e) => {
                          const next = [...(dash.bidders || [])];
                          next[idx] = { ...next[idx], name: e.target.value };
                          updateDashboard({ bidders: next });
                        }}
                        placeholder="Nome do comprador"
                        className="w-full text-sm font-bold text-gray-900 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 focus:border-gray-900 outline-none"
                      />

                      {/* Linha 1: Cidade · País · Bandeira */}
                      <div className="grid grid-cols-12 gap-1.5">
                        <input
                          type="text"
                          value={bidder.emirate}
                          onChange={(e) => {
                            const next = [...(dash.bidders || [])];
                            next[idx] = { ...next[idx], emirate: e.target.value };
                            updateDashboard({ bidders: next });
                          }}
                          placeholder="Cidade"
                          className="col-span-5 text-[11px] bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 focus:border-gray-900 outline-none"
                        />
                        <input
                          type="text"
                          value={bidder.country}
                          onChange={(e) => {
                            const next = [...(dash.bidders || [])];
                            next[idx] = { ...next[idx], country: e.target.value };
                            updateDashboard({ bidders: next });
                          }}
                          placeholder="País"
                          className="col-span-5 text-[11px] bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 focus:border-gray-900 outline-none"
                        />
                        <input
                          type="text"
                          value={bidder.flag}
                          onChange={(e) => {
                            const next = [...(dash.bidders || [])];
                            next[idx] = { ...next[idx], flag: e.target.value };
                            updateDashboard({ bidders: next });
                          }}
                          placeholder="🇦🇪"
                          className="col-span-2 text-base text-center bg-gray-50 border border-gray-200 rounded-lg px-1 py-1 focus:border-gray-900 outline-none"
                        />
                      </div>

                      {/* Linha 2: Moeda · Taxa BRL */}
                      <div className="grid grid-cols-12 gap-1.5">
                        <input
                          type="text"
                          value={bidder.currency}
                          onChange={(e) => {
                            const next = [...(dash.bidders || [])];
                            next[idx] = { ...next[idx], currency: e.target.value.toUpperCase().slice(0, 4) };
                            updateDashboard({ bidders: next });
                          }}
                          placeholder="AED"
                          className="col-span-3 text-[11px] uppercase bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 focus:border-gray-900 outline-none"
                        />
                        <div className="col-span-9 flex items-center gap-1.5">
                          <span className="text-[10px] text-gray-500">1 BRL =</span>
                          <input
                            type="number"
                            step="0.001"
                            value={bidder.currency_rate}
                            onChange={(e) => {
                              const next = [...(dash.bidders || [])];
                              next[idx] = { ...next[idx], currency_rate: parseFloat(e.target.value) || 0 };
                              updateDashboard({ bidders: next });
                            }}
                            className="flex-1 text-[11px] tabular-nums bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 focus:border-gray-900 outline-none"
                          />
                          <span className="text-[10px] text-gray-500">{bidder.currency}</span>
                        </div>
                      </div>

                      {/* URL da foto com preview */}
                      <div>
                        <label className="block text-[10px] uppercase tracking-wider text-gray-500 font-bold mb-1">URL da foto</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="url"
                            value={bidder.avatar_url}
                            onChange={(e) => {
                              const next = [...(dash.bidders || [])];
                              next[idx] = { ...next[idx], avatar_url: e.target.value };
                              updateDashboard({ bidders: next });
                            }}
                            placeholder="https://exemplo.com/foto.jpg"
                            className="flex-1 text-[11px] bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 focus:border-gray-900 outline-none font-mono"
                          />
                          {bidder.avatar_url && (
                            <button
                              type="button"
                              onClick={() => {
                                const next = [...(dash.bidders || [])];
                                next[idx] = { ...next[idx], avatar_url: "" };
                                updateDashboard({ bidders: next });
                              }}
                              className="px-2 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg text-[10px] font-bold transition flex-shrink-0"
                              title="Limpar URL"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                        {bidder.avatar_url && (
                          <div className="mt-2 flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg p-2">
                            <img
                              src={bidder.avatar_url}
                              alt="preview"
                              className="w-12 h-12 rounded-full object-cover border border-gray-300"
                              onError={(e) => {
                                e.currentTarget.style.display = "none";
                                const errEl = e.currentTarget.nextElementSibling as HTMLElement;
                                if (errEl) errEl.style.display = "flex";
                              }}
                              onLoad={(e) => {
                                e.currentTarget.style.display = "block";
                                const errEl = e.currentTarget.nextElementSibling as HTMLElement;
                                if (errEl) errEl.style.display = "none";
                              }}
                            />
                            <div className="w-12 h-12 rounded-full bg-red-50 border border-red-200 items-center justify-center text-red-600 text-lg flex-shrink-0" style={{ display: "none" }}>
                              ⚠
                            </div>
                            <span className="text-[10px] text-gray-600">Preview da foto</span>
                          </div>
                        )}
                      </div>

                      {/* Botões */}
                      <div className="flex gap-1 pt-1">
                        <button
                          onClick={() => {
                            if (!confirm("Remover esse comprador?")) return;
                            const next = (dash.bidders || []).filter((_, i) => i !== idx);
                            updateDashboard({ bidders: next });
                          }}
                          className="flex-1 px-2 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg text-[10px] font-bold transition"
                        >
                          Remover
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => {
                const newBidder = generateRandomBidder();
                updateDashboard({ bidders: [...(dash.bidders || []), newBidder] });
              }}
              className="mt-3 w-full border-2 border-dashed border-gray-300 hover:border-gray-500 text-gray-500 hover:text-gray-900 py-3 rounded-xl text-sm font-semibold transition"
            >
              + Adicionar comprador
            </button>
          </Section>

            </>
          )}

          </>

          <div className="h-12"></div>
        </div>

        {/* === PREVIEW === */}
        <div className="bg-gray-100 overflow-y-auto p-6 hidden lg:block">
          <div className="sticky top-0 bg-gray-100 pb-3 mb-3 z-10 flex items-center justify-between">
            <p className="text-xs uppercase tracking-wider text-gray-500 font-semibold">
              {area === "external"
                ? `Pré-visualização: ${viewport === "desktop" ? "💻 Desktop" : "📱 Mobile"}`
                : "Pré-visualização: Dashboard"}
            </p>
          </div>
          {area === "external" ? (
            <Preview config={config} viewport={viewport} />
          ) : (
            <DashboardPreview config={config} />
          )}
        </div>
      </div>
      )}
    </div>
  );
}

// ============= COMPONENTES =============

function Section({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="mb-6 bg-white border border-gray-200 rounded-2xl p-5">
      <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
        <span>{icon}</span>{title}
      </h3>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs uppercase tracking-wider text-gray-500 font-semibold mb-1">{label}</label>
      {children}
      {hint && <p className="text-[11px] text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-1">{label}</label>
      <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-2 py-1.5">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)}
          className="w-8 h-8 rounded cursor-pointer border border-gray-200" />
        <input type="text" value={value} onChange={(e) => onChange(e.target.value)}
          className="flex-1 bg-transparent text-xs font-mono text-gray-900 outline-none min-w-0" />
      </div>
    </div>
  );
}

function ImageUploadField({
  label,
  hint,
  folder,
  value,
  onChange,
  previewBg,
  previewMaxHeight,
}: {
  label: string;
  hint?: string;
  folder: "logo" | "banner" | "background";
  value: string;
  onChange: (url: string) => void;
  previewBg?: string;
  previewMaxHeight?: number;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  async function handleFile(file: File) {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setError("Imagem muito grande (máx 10MB)");
      setTimeout(() => setError(""), 3000);
      return;
    }
    if (!file.type.startsWith("image/")) {
      setError("Apenas imagens são aceitas");
      setTimeout(() => setError(""), 3000);
      return;
    }
    setUploading(true);
    setError("");
    const res = await uploadLandingAsset(file, folder);
    if (res.ok && res.url) {
      onChange(res.url);
    } else {
      setError(res.error || "Erro no upload");
      setTimeout(() => setError(""), 4000);
    }
    setUploading(false);
  }

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  return (
    <div>
      <label className="block text-xs uppercase tracking-wider text-gray-500 font-semibold mb-1">{label}</label>

      {!value && (
        <label
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className={`block cursor-pointer border-2 border-dashed rounded-xl p-6 text-center transition ${
            dragOver ? "border-gray-900 bg-gray-50" : "border-gray-300 hover:border-gray-500 bg-white"
          }`}
        >
          {uploading ? (
            <div className="flex items-center justify-center gap-2 text-gray-700">
              <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin"></div>
              <span className="text-sm font-medium">Enviando...</span>
            </div>
          ) : (
            <>
              <svg className="w-8 h-8 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              <div className="text-sm font-semibold text-gray-700">Clique ou arraste a imagem</div>
              <div className="text-[11px] text-gray-500 mt-0.5">PNG, JPG, SVG, WebP — até 10MB</div>
            </>
          )}
          <input type="file" accept="image/*" className="hidden" onChange={onInputChange} disabled={uploading} />
        </label>
      )}

      {value && (
        <>
          <div className="rounded-lg p-3 flex items-center justify-center mb-2" style={{ background: previewBg || "#f3f4f6", minHeight: 80 }}>
            <img src={value} alt="preview" style={{ maxHeight: previewMaxHeight || 120, maxWidth: "100%", objectFit: "contain" }} />
          </div>
          <div className="flex gap-2">
            <label className="flex-1 cursor-pointer bg-gray-900 hover:bg-black text-white text-xs font-semibold py-2 px-3 rounded-lg text-center transition">
              {uploading ? "Enviando..." : "Trocar imagem"}
              <input type="file" accept="image/*" className="hidden" onChange={onInputChange} disabled={uploading} />
            </label>
            <button
              type="button"
              onClick={() => onChange("")}
              className="bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold py-2 px-3 rounded-lg transition border border-red-200"
            >
              Remover
            </button>
          </div>
        </>
      )}

      <button
        type="button"
        onClick={() => setShowUrlInput(!showUrlInput)}
        className="text-[11px] text-gray-500 hover:text-gray-900 underline mt-2 transition"
      >
        {showUrlInput ? "Esconder campo de URL" : "Ou colar URL manualmente"}
      </button>

      {showUrlInput && (
        <input
          type="url"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://..."
          className="w-full mt-2 bg-gray-50 border border-gray-200 focus:border-gray-900 rounded-lg px-3 py-2 text-xs font-mono text-gray-900 outline-none"
        />
      )}

      {error && (
        <div className="mt-2 bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-2 rounded-lg">
          {error}
        </div>
      )}

      {hint && <p className="text-[11px] text-gray-400 mt-2">{hint}</p>}
    </div>
  );
}

function RichTextEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (html: string) => void;
}) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [, forceUpdate] = useState(0);
  const lastValueRef = useRef(value);
  const [highlightColor, setHighlightColor] = useState("#fef08a");
  const [textColor, setTextColor] = useState("#22c55e");

  // Atualiza editor quando value externo muda (mas evita loops)
  useEffect(() => {
    if (editorRef.current && value !== lastValueRef.current && value !== editorRef.current.innerHTML) {
      editorRef.current.innerHTML = value || "";
      lastValueRef.current = value;
    }
  }, [value]);

  function exec(command: string, val?: string) {
    document.execCommand(command, false, val);
    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      lastValueRef.current = html;
      onChange(html);
    }
    forceUpdate((n) => n + 1);
  }

  function handleInput() {
    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      lastValueRef.current = html;
      onChange(html);
    }
  }

  function applyHighlight() {
    exec("hiliteColor", highlightColor);
  }

  function applyTextColor() {
    exec("foreColor", textColor);
  }

  function clearFormat() {
    exec("removeFormat");
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      {/* Toolbar */}
      <div className="border-b border-gray-200 bg-gray-50 px-2 py-1.5 flex items-center gap-1 flex-wrap">
        <ToolbarBtn onClick={() => exec("bold")} title="Negrito (Cmd+B)">
          <strong>B</strong>
        </ToolbarBtn>
        <ToolbarBtn onClick={() => exec("italic")} title="Itálico (Cmd+I)">
          <em>I</em>
        </ToolbarBtn>
        <ToolbarBtn onClick={() => exec("underline")} title="Sublinhado (Cmd+U)">
          <u>U</u>
        </ToolbarBtn>
        <ToolbarBtn onClick={() => exec("strikeThrough")} title="Tachado">
          <s>S</s>
        </ToolbarBtn>

        <div className="h-5 w-px bg-gray-300 mx-1"></div>

        {/* Marca-texto */}
        <div className="flex items-center gap-0.5 bg-white border border-gray-200 rounded px-1 py-0.5">
          <button
            type="button"
            onClick={applyHighlight}
            title="Aplicar marca-texto"
            className="px-1.5 py-1 text-xs font-bold rounded hover:bg-gray-100 transition"
            style={{ background: highlightColor }}
          >
            ✏️
          </button>
          <input
            type="color"
            value={highlightColor}
            onChange={(e) => setHighlightColor(e.target.value)}
            className="w-5 h-5 rounded cursor-pointer border-0 p-0"
            title="Cor do marca-texto"
          />
        </div>

        {/* Cor de texto */}
        <div className="flex items-center gap-0.5 bg-white border border-gray-200 rounded px-1 py-0.5">
          <button
            type="button"
            onClick={applyTextColor}
            title="Aplicar cor"
            className="px-1.5 py-1 text-xs font-bold rounded hover:bg-gray-100 transition"
            style={{ color: textColor }}
          >
            A
          </button>
          <input
            type="color"
            value={textColor}
            onChange={(e) => setTextColor(e.target.value)}
            className="w-5 h-5 rounded cursor-pointer border-0 p-0"
            title="Cor do texto"
          />
        </div>

        <div className="h-5 w-px bg-gray-300 mx-1"></div>

        <ToolbarBtn onClick={clearFormat} title="Limpar formatação">
          <span className="text-xs">⊘</span>
        </ToolbarBtn>
      </div>

      {/* Editor */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onBlur={handleInput}
        className="rte-editor p-3 min-h-[80px] text-sm text-gray-900 focus:outline-none prose-sm"
        style={{ wordBreak: "break-word" }}
      />

      <style dangerouslySetInnerHTML={{ __html: `
        .rte-editor[contenteditable] mark {
          padding: 0 2px;
          border-radius: 2px;
        }
        .rte-editor[contenteditable]:empty::before {
          content: 'Digite a headline aqui...';
          color: #9ca3af;
        }
      ` }} />
    </div>
  );
}

function ToolbarBtn({
  onClick,
  title,
  children,
}: {
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="w-7 h-7 flex items-center justify-center text-gray-700 hover:bg-gray-200 rounded transition text-sm"
    >
      {children}
    </button>
  );
}

function ViewportLabel({ viewport }: { viewport: Viewport }) {
  return (
    <div className={`text-[10px] uppercase tracking-wider font-bold rounded-lg py-1.5 px-3 ${
      viewport === "desktop" ? "bg-blue-50 text-blue-700" : "bg-purple-50 text-purple-700"
    }`}>
      ↓ Configuração específica para {viewport === "desktop" ? "💻 DESKTOP" : "📱 MOBILE"}
    </div>
  );
}

function Preview({ config, viewport }: { config: LandingConfig; viewport: Viewport }) {
  const v = config[viewport];
  const hasImage = !!config.background_image_url;
  const gradientBg = `radial-gradient(ellipse at top, ${config.color_bg_from} 0%, ${config.color_bg_via} 60%, ${config.color_bg_to} 100%)`;

  const alignClass =
    v.logo_align === "left" ? "items-start text-left" :
    v.logo_align === "right" ? "items-end text-right" :
    "items-center text-center";

  // Largura do preview muda conforme viewport
  const widthClass = viewport === "mobile" ? "max-w-sm mx-auto" : "max-w-full";

  return (
    <div className={widthClass}>
      <div className="bg-white rounded-2xl overflow-hidden shadow-xl border border-gray-200">
        {/* Banner topo */}
        {config.banner_enabled && (
          <div className="text-center py-2 px-4 flex items-center justify-center"
               style={{ backgroundColor: config.banner_bg_color, color: config.banner_text_color }}>
            {config.banner_mode === "image" && config.banner_image_url ? (
              <img src={config.banner_image_url} alt="banner" className="max-h-10 w-auto mx-auto object-contain" />
            ) : (
              <span className="font-mono text-[10px] tracking-[0.2em] uppercase">{config.banner_text}</span>
            )}
          </div>
        )}

        <div className="relative min-h-[480px] overflow-hidden" style={{ background: gradientBg }}>
          {hasImage && (
            <>
              <img src={config.background_image_url} alt=""
                className="absolute inset-0 w-full h-full"
                style={{
                  objectFit: v.background_fit === "auto" ? "none" : v.background_fit,
                  objectPosition: `${v.background_position_x}% ${v.background_position_y}%`,
                  transform: `scale(${v.background_size / 100})`,
                  transformOrigin: `${v.background_position_x}% ${v.background_position_y}%`,
                }} />
              <div className="absolute inset-0 bg-black"
                style={{ opacity: v.background_overlay_opacity / 100 }}></div>
            </>
          )}

          <div className={`relative p-8 min-h-[480px] flex flex-col justify-center ${alignClass}`}>
            <p className="text-[10px] uppercase tracking-[0.4em] mb-4" style={{ color: config.color_primary }}>
              {config.tagline}
            </p>
            {config.logo_mode === "image" && config.logo_image_url ? (
              <img src={config.logo_image_url} alt="logo" className="mb-4"
                style={{ height: `${v.logo_size * 0.6}px`, maxWidth: "80%", objectFit: "contain" }} />
            ) : (
              <div className="mb-3">
                <div className="tracking-[0.15em] leading-none mb-1 font-serif"
                  style={{ color: config.color_primary, fontSize: `${v.logo_size * 0.5}px` }}>
                  {config.logo_primary}
                </div>
                <div className="tracking-[0.4em] leading-none text-white font-serif"
                  style={{ fontSize: `${v.logo_size * 0.25}px` }}>
                  {config.logo_secondary}
                </div>
              </div>
            )}
            <p
              className="text-white/70 mt-6 mb-6 max-w-xs"
              style={{
                fontSize: `${config.headline_size}px`,
                fontWeight: config.headline_weight,
                textAlign: config.headline_align,
                lineHeight: 1.4,
              }}
              dangerouslySetInnerHTML={{
                __html: sanitizeRichHtml(config.headline_html || config.headline),
              }}
            />
            <button className="py-3 px-8 rounded-2xl uppercase tracking-wide"
              style={{
                backgroundColor: config.color_primary, color: "#0a0a0a",
                fontSize: `${config.cta_size}px`,
                fontWeight: config.cta_weight,
                alignSelf: v.logo_align === "left" ? "flex-start" :
                            v.logo_align === "right" ? "flex-end" : "center",
              }}>
              {config.cta_text}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DashboardPreview({ config }: { config: LandingConfig }) {
  const dash = config.dashboard;
  const RARITY_COLORS: Record<string, string> = {
    common: "#6b7280",
    rare: "#3b82f6",
    epic: "#a855f7",
    legendary: "#f59e0b",
  };
  const RARITY_LABEL: Record<string, string> = {
    common: "Comum",
    rare: "Raro",
    epic: "Épico",
    legendary: "Lendário",
  };

  return (
    <div className="rounded-2xl overflow-hidden shadow-xl border border-gray-200" style={{ background: dash.color_bg }}>
      {/* Topbar */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-gray-200" style={{ background: dash.color_card_bg }}>
        <div className="flex items-baseline gap-1.5">
          {dash.logo_image_url ? (
            <img src={dash.logo_image_url} alt="logo" style={{ height: dash.logo_size * 0.28, objectFit: "contain" }} />
          ) : (
            <>
              <span className="font-serif text-lg tracking-[0.15em]" style={{ color: dash.color_primary }}>{dash.logo_primary}</span>
              <span className="font-serif text-[10px] tracking-[0.4em] text-gray-500">{dash.logo_secondary}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2 bg-gray-100 rounded-full pl-2 pr-3 py-1.5">
          <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ background: dash.color_primary }}>R</div>
          <span className="text-xs font-semibold text-gray-900">R$ 0</span>
        </div>
      </div>

      {/* Card buyers online */}
      <div className="p-3">
        <div className="rounded-xl p-3 mb-3 flex items-center gap-2" style={{ background: "#ecfdf5", border: "1px solid #a7f3d0" }}>
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
          <span className="text-xs uppercase tracking-wider text-emerald-700 font-semibold">{dash.label_buyers_online}</span>
          <span className="ml-auto text-xs font-bold text-emerald-900">12.847</span>
        </div>

        {/* Top creators */}
        <div className="rounded-xl p-3 mb-3" style={{ background: dash.color_card_bg, border: "1px solid #e5e7eb" }}>
          <h3 className="text-sm font-bold text-gray-900 mb-2">{dash.label_top_creators}</h3>
          <div className="flex gap-2 overflow-hidden">
            {dash.feed_posts.slice(0, 4).map((p, i) => (
              <div key={p.id} className="flex-1 min-w-0">
                <div className="w-full aspect-square rounded-lg bg-gray-200 mb-1 flex items-center justify-center text-[10px] text-gray-500 font-semibold">
                  #{i + 1}
                </div>
                <div className="text-[10px] text-gray-700 truncate">@{p.seller_name}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Feed posts (3 primeiros) */}
        {dash.feed_posts.slice(0, 3).map((post) => (
          <div key={post.id} className="rounded-xl mb-3 overflow-hidden" style={{ background: dash.color_card_bg, border: "1px solid #e5e7eb" }}>
            <div className="p-3 flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-gray-300 flex items-center justify-center text-[11px] font-bold text-white" style={{ background: dash.color_primary }}>
                {post.seller_name[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-gray-900 truncate">@{post.seller_name}</div>
                <div className="text-[10px] text-gray-500">{post.time_ago}</div>
              </div>
              <span className="text-[9px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full text-white" style={{ background: RARITY_COLORS[post.rarity] }}>
                {RARITY_LABEL[post.rarity]}
              </span>
            </div>
            <div className="aspect-square bg-gray-200 relative">
              {post.image_url ? (
                <img src={post.image_url} alt="" className="w-full h-full object-cover" style={{ filter: `blur(${dash.feed_blur_intensity}px) ${dash.feed_grayscale ? "grayscale(100%)" : ""}` }} />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300"></div>
              )}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="bg-white/90 rounded-full px-3 py-1 text-[10px] font-bold text-gray-900">
                  🔒 Vendido
                </div>
              </div>
            </div>
            <div className="p-3">
              <div className="flex items-center gap-1 mb-1">
                <span className="text-base">{post.buyer_flag}</span>
                <span className="text-xs font-semibold text-gray-900 truncate">{post.buyer_name}</span>
              </div>
              <div className="text-[10px] text-gray-500 mb-2">{post.buyer_emirate}</div>
              <div className="flex items-end justify-between">
                <div>
                  <div className="text-[9px] uppercase tracking-wider text-gray-500">Vendido por</div>
                  <div className="font-serif text-lg text-gray-900 tabular-nums">
                    R$ {post.amount_brl.toFixed(2).replace(".", ",")}
                  </div>
                </div>
                <div className="text-[10px] text-gray-500">{post.bids_count} lances</div>
              </div>
            </div>
          </div>
        ))}

        {dash.feed_posts.length > 3 && (
          <p className="text-[10px] text-gray-500 text-center mt-2">
            … e mais {dash.feed_posts.length - 3} {dash.feed_posts.length - 3 === 1 ? "post" : "posts"}
          </p>
        )}
      </div>

      {/* Bottom tab */}
      <div className="border-t border-gray-200 grid grid-cols-4" style={{ background: dash.color_card_bg }}>
        {[
          { l: dash.label_feed, active: true },
          { l: dash.label_auction },
          { l: dash.label_wallet },
          { l: dash.label_profile },
        ].map((t, i) => (
          <div key={i} className="text-center py-3">
            <div className={`text-[10px] font-semibold ${t.active ? "" : "text-gray-400"}`} style={t.active ? { color: dash.color_primary } : undefined}>
              {t.l}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// PAINEL DE ENVIOS — visualização dos cadastros + fotos enviadas
// =============================================================================

type Submission = {
  id: string;
  listing_id: string;
  user_id: string;
  username: string | null;
  bio: string | null;
  email: string | null;
  phone: string | null;
  full_name: string | null;
  image_url: string;
  rarity: string;
  current_bid: number;
  bid_count: number;
  starting_price: number;
  answers: Record<string, string>;
  raw_description: string | null;
  created_at: string;
  user_created_at?: string;
  last_sign_in_at?: string;
  email_confirmed_at?: string;
};

type SubmissionStats = {
  total: number;
  today: number;
  this_week: number;
  unique_users: number;
};

function SubmissionsPanel() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [stats, setStats] = useState<SubmissionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Submission | null>(null);

  async function load() {
    setLoading(true);
    setError("");
    try {
      // Pega senha de várias fontes (compat com sessões antigas)
      let password = sessionStorage.getItem("admin_password") || "";
      if (!password) {
        // Fallback: pede senha agora
        const entered = window.prompt("Senha do admin pra carregar envios:");
        if (entered) {
          password = entered;
          try { sessionStorage.setItem("admin_password", entered); } catch {}
        }
      }

      const res = await fetch("/api/admin/submissions", {
        headers: { "x-admin-password": password },
      });

      // Detecta resposta HTML (404 ou 500 sem JSON)
      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        const text = await res.text();
        if (res.status === 404) {
          setError("Endpoint /api/admin/submissions não encontrado. Faça redeploy no Vercel.");
        } else if (text.includes("<!DOCTYPE")) {
          setError(`Servidor retornou HTML em vez de JSON (status ${res.status}). Provável: variável SUPABASE_SERVICE_ROLE_KEY faltando no Vercel ou build desatualizado.`);
        } else {
          setError(`Resposta inválida (${res.status}): ${text.slice(0, 100)}`);
        }
        return;
      }

      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401) {
          // Senha errada — limpa pra próxima tentar de novo
          try { sessionStorage.removeItem("admin_password"); } catch {}
          setError("Senha inválida. Clica em recarregar pra tentar de novo.");
        } else {
          setError(data.error || `Erro ${res.status}`);
        }
      } else {
        setSubmissions(data.submissions || []);
        setStats(data.stats || null);
      }
    } catch (e: any) {
      setError(e?.message || "Erro de rede");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = submissions.filter((s) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      s.username?.toLowerCase().includes(q) ||
      s.email?.toLowerCase().includes(q) ||
      s.full_name?.toLowerCase().includes(q) ||
      s.bio?.toLowerCase().includes(q)
    );
  });

  function formatDate(iso: string): string {
    const d = new Date(iso);
    const now = Date.now();
    const diff = now - d.getTime();
    const min = Math.floor(diff / 60000);
    if (min < 1) return "agora";
    if (min < 60) return `${min}min atrás`;
    const h = Math.floor(min / 60);
    if (h < 24) return `${h}h atrás`;
    const days = Math.floor(h / 24);
    if (days < 7) return `${days}d atrás`;
    return d.toLocaleDateString("pt-BR");
  }

  function exportCSV() {
    const headers = ["data", "username", "email", "telefone", "nome_completo", "bio", "raridade", "url_foto", "respostas"];
    const rows = filtered.map((s) => [
      new Date(s.created_at).toLocaleString("pt-BR"),
      s.username || "",
      s.email || "",
      s.phone || "",
      s.full_name || "",
      (s.bio || "").replace(/[\n\r,]/g, " "),
      s.rarity || "",
      s.image_url,
      Object.entries(s.answers).map(([k, v]) => `${k}=${v}`).join(" | "),
    ]);
    const csv = [headers, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `envios-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-4 gap-2 mb-4">
          <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-3 text-white">
            <div className="text-[9px] uppercase tracking-wider text-emerald-100 font-bold">Total</div>
            <div className="font-display text-2xl tabular-nums">{stats.total}</div>
            <div className="text-[10px] text-emerald-100">envios</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-3">
            <div className="text-[9px] uppercase tracking-wider text-gray-500 font-bold">Hoje</div>
            <div className="font-display text-2xl text-gray-900 tabular-nums">{stats.today}</div>
            <div className="text-[10px] text-gray-500">últimas 24h</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-3">
            <div className="text-[9px] uppercase tracking-wider text-gray-500 font-bold">Semana</div>
            <div className="font-display text-2xl text-gray-900 tabular-nums">{stats.this_week}</div>
            <div className="text-[10px] text-gray-500">7 dias</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-3">
            <div className="text-[9px] uppercase tracking-wider text-gray-500 font-bold">Cadastros</div>
            <div className="font-display text-2xl text-gray-900 tabular-nums">{stats.unique_users}</div>
            <div className="text-[10px] text-gray-500">únicos</div>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-2 rounded-xl mb-3">
          {error}
          {error.includes("SUPABASE_SERVICE_ROLE_KEY") && (
            <p className="mt-1 text-red-600">
              Adicione a variável <code className="bg-red-100 px-1 rounded">SUPABASE_SERVICE_ROLE_KEY</code> nas Environment Variables do Vercel e faça redeploy.
            </p>
          )}
        </div>
      )}

      {/* Layout split: lista | detalhes */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(380px,420px)_1fr] gap-4 lg:h-[calc(100vh-280px)]">
        {/* Coluna esquerda: lista */}
        <div className="flex flex-col min-h-0">
          {/* Toolbar */}
          <div className="flex items-center gap-2 mb-3 flex-shrink-0">
            <div className="flex-1 relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nome, email..."
                className="w-full pl-9 pr-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:border-gray-900 outline-none"
              />
            </div>
            <button
              onClick={load}
              disabled={loading}
              title="Recarregar"
              className="px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm hover:bg-gray-50 transition disabled:opacity-50 flex-shrink-0"
            >
              <svg className={`w-4 h-4 text-gray-600 ${loading ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
            <button
              onClick={exportCSV}
              disabled={filtered.length === 0}
              className="px-3 py-2.5 bg-gray-900 text-white rounded-xl text-xs font-bold hover:bg-black transition disabled:opacity-50 flex items-center gap-1.5 flex-shrink-0"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              CSV
            </button>
          </div>

          {loading && (
            <div className="text-center py-12 text-gray-400 text-sm">Carregando envios...</div>
          )}

          {!loading && filtered.length === 0 && !error && (
            <div className="text-center py-12 text-gray-400">
              <p className="text-sm">{submissions.length === 0 ? "Nenhum envio ainda" : "Nenhum resultado pra essa busca"}</p>
            </div>
          )}

          {/* Lista scrollável */}
          {!loading && filtered.length > 0 && (
            <div className="space-y-2 overflow-y-auto flex-1 pr-1 -mr-1">
              {filtered.map((s) => {
                const isSelected = selected?.id === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => setSelected(s)}
                    className={`w-full rounded-xl p-3 transition text-left flex items-center gap-3 border ${
                      isSelected
                        ? "bg-gray-900 border-gray-900 text-white shadow-md"
                        : "bg-white border-gray-200 hover:border-gray-400"
                    }`}
                  >
                    {/* Foto thumbnail */}
                    <div className="w-14 h-14 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0 border border-gray-200">
                      {s.image_url ? (
                        <img src={s.image_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">sem foto</div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`font-bold text-sm truncate ${isSelected ? "text-white" : "text-gray-900"}`}>@{s.username || "sem-username"}</span>
                        {s.rarity && (
                          <span className={`text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded ${
                            isSelected
                              ? "bg-white/20 text-white"
                              : s.rarity.toLowerCase() === "legendary" ? "bg-amber-100 text-amber-800" :
                                s.rarity.toLowerCase() === "epic" ? "bg-purple-100 text-purple-800" :
                                s.rarity.toLowerCase() === "rare" ? "bg-blue-100 text-blue-800" :
                                "bg-gray-100 text-gray-700"
                          }`}>
                            {s.rarity}
                          </span>
                        )}
                      </div>
                      <div className={`text-xs truncate mt-0.5 ${isSelected ? "text-white/70" : "text-gray-500"}`}>{s.email || "sem email"}</div>
                      <div className={`flex items-center gap-3 mt-1 text-[10px] ${isSelected ? "text-white/60" : "text-gray-400"}`}>
                        <span>{formatDate(s.created_at)}</span>
                        {s.bid_count > 0 && (
                          <span className={`font-semibold ${isSelected ? "text-emerald-300" : "text-emerald-600"}`}>{s.bid_count} lances</span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Coluna direita: detalhes */}
        <div className="bg-gray-50 border border-gray-200 rounded-2xl overflow-hidden flex flex-col">
          {!selected ? (
            <div className="flex-1 flex items-center justify-center p-12 text-center">
              <div>
                <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-gray-200 flex items-center justify-center">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <p className="text-sm font-semibold text-gray-700 mb-1">Selecione uma submissão</p>
                <p className="text-xs text-gray-500">Clique em qualquer item da lista pra ver a foto e os dados completos</p>
              </div>
            </div>
          ) : (
            <div className="overflow-y-auto flex-1">
              {/* Layout sub-split: foto + dados lado a lado */}
              <div className="grid grid-cols-1 lg:grid-cols-[minmax(280px,420px)_1fr] gap-0 min-h-full">

                {/* Foto à esquerda */}
                <div className="bg-gradient-to-br from-gray-900 to-black p-4 flex items-start justify-center lg:sticky lg:top-0 lg:self-start">
                  {selected.image_url ? (
                    <img src={selected.image_url} alt="" className="w-full max-h-[55vh] lg:max-h-[calc(100vh-380px)] rounded-xl shadow-2xl object-contain" />
                  ) : (
                    <div className="text-white/40 text-sm py-20 text-center">
                      <p className="text-3xl mb-2">📷</p>
                      <p>Sem foto enviada</p>
                    </div>
                  )}
                </div>

                {/* Dados à direita */}
                <div className="p-5 space-y-4 bg-white">
                  {/* Header com username */}
                  <div className="flex items-start justify-between gap-3 pb-4 border-b border-gray-200">
                    <div className="min-w-0">
                      <h3 className="font-display text-2xl text-gray-900 truncate">@{selected.username || "sem-username"}</h3>
                      <p className="text-[11px] text-gray-500 mt-1">{formatDate(selected.created_at)} · {new Date(selected.created_at).toLocaleString("pt-BR")}</p>
                    </div>
                    {selected.rarity && (
                      <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded flex-shrink-0 ${
                        selected.rarity.toLowerCase() === "legendary" ? "bg-amber-100 text-amber-800" :
                        selected.rarity.toLowerCase() === "epic" ? "bg-purple-100 text-purple-800" :
                        selected.rarity.toLowerCase() === "rare" ? "bg-blue-100 text-blue-800" :
                        "bg-gray-100 text-gray-700"
                    }`}>
                      {selected.rarity}
                    </span>
                  )}
                </div>

                {/* CONTATO em destaque no topo */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <a
                    href={selected.email ? `mailto:${selected.email}` : undefined}
                    className="flex items-start gap-3 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl p-3 transition group"
                  >
                    <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[9px] uppercase tracking-wider text-gray-500 font-bold">Email</div>
                      <div className="text-xs text-gray-900 font-mono break-all leading-tight mt-0.5">{selected.email || "—"}</div>
                    </div>
                  </a>

                  <a
                    href={selected.phone ? `tel:${selected.phone}` : undefined}
                    className="flex items-start gap-3 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl p-3 transition group"
                  >
                    <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[9px] uppercase tracking-wider text-gray-500 font-bold">Telefone</div>
                      <div className="text-xs text-gray-900 font-mono break-all leading-tight mt-0.5">{selected.phone || "—"}</div>
                    </div>
                  </a>
                </div>

                {/* Dados pessoais */}
                <div>
                  <h4 className="text-[10px] uppercase tracking-wider text-gray-500 font-bold mb-2">Dados pessoais</h4>
                  <div className="bg-white border border-gray-200 rounded-xl p-3 space-y-1.5">
                    <DetailRow label="Username" value={selected.username || "—"} />
                    <DetailRow label="Nome completo" value={selected.full_name || "—"} />
                    <DetailRow label="Bio" value={selected.bio || "—"} />
                  </div>
                </div>

                {/* Respostas */}
                {selected.answers && Object.keys(selected.answers).length > 0 && (
                  <div>
                    <h4 className="text-[10px] uppercase tracking-wider text-gray-500 font-bold mb-2">Respostas do onboarding</h4>
                    <div className="bg-white border border-gray-200 rounded-xl p-3 space-y-1.5">
                      {Object.entries(selected.answers).map(([k, v]) => (
                        <DetailRow key={k} label={k} value={v} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Leilão */}
                <div>
                  <h4 className="text-[10px] uppercase tracking-wider text-gray-500 font-bold mb-2">Leilão</h4>
                  <div className="bg-white border border-gray-200 rounded-xl p-3 space-y-1.5">
                    <DetailRow label="Raridade" value={selected.rarity || "—"} />
                    <DetailRow label="Lance atual" value={`R$ ${(selected.current_bid || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`} />
                    <DetailRow label="Total de lances" value={String(selected.bid_count || 0)} />
                  </div>
                </div>

                {/* IDs */}
                <div>
                  <h4 className="text-[10px] uppercase tracking-wider text-gray-500 font-bold mb-2">Sistema</h4>
                  <div className="bg-white border border-gray-200 rounded-xl p-3 space-y-1.5">
                    <DetailRow label="user_id" value={selected.user_id} mono small />
                    <DetailRow label="listing_id" value={selected.listing_id} mono small />
                    {selected.email_confirmed_at && (
                      <DetailRow label="Email confirmado" value={new Date(selected.email_confirmed_at).toLocaleString("pt-BR")} small />
                    )}
                    {selected.last_sign_in_at && (
                      <DetailRow label="Último login" value={new Date(selected.last_sign_in_at).toLocaleString("pt-BR")} small />
                    )}
                  </div>
                </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============= COMPONENTES SUBMISSIONS =============


function DetailRow({ label, value, mono, small }: { label: string; value: string; mono?: boolean; small?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold flex-shrink-0">{label}</span>
      <span className={`text-right break-all ${mono ? "font-mono" : ""} ${small ? "text-[10px] text-gray-600" : "text-sm text-gray-900"}`}>
        {value}
      </span>
    </div>
  );
}

// ============= PAINEL DE RECUPERAÇÃO =============

type RecoveryItem = {
  id: string;
  user_id: string;
  username: string;
  full_name: string;
  first_name: string;
  email: string;
  phone: string;
  plan_id: string;
  plan_name: string;
  plan_value: number;
  status: string;
  created_at: string;
  wallet_balance: number;
  current_bid: number;
  has_sold: boolean;
};

type ContactStatus = "pending" | "contacted" | "converted" | "lost";

const RECOVERY_LS_KEY = "ff_recovery_status_v1";

// 25 nomes árabes pra usar nas mensagens (mesmos do bidder default)
const RECOVERY_BIDDER_NAMES = [
  "Khalid bin Salman", "Abdulaziz Al-Rashid", "Faisal bin Mohammed", "Saud Al-Otaibi",
  "Bandar Al-Qahtani", "Mohammed Al-Maktoum", "Ahmed bin Zayed", "Hamdan Al-Nahyan",
  "Sultan Al-Qasimi", "Rashid bin Saeed", "Tahnoun Al-Mansoori", "Tamim bin Hamad",
  "Jassim Al-Kuwari", "Abdullah Al-Attiyah", "Hamad Al-Misnad", "Sabah Al-Sabah",
  "Yousef Al-Mutawa", "Nasser Al-Khaled", "Fahad Al-Ghanim", "Hamad Al-Khalifa",
  "Salman Al-Zayani", "Khalifa Al-Dosari", "Qaboos Al-Said", "Haitham Al-Busaidi",
  "Asaad Al-Harthy",
];

function randomBidderName(): string {
  return RECOVERY_BIDDER_NAMES[Math.floor(Math.random() * RECOVERY_BIDDER_NAMES.length)];
}

function randomBidValue(): number {
  // R$ 350-420
  return Math.floor(350 + Math.random() * 70);
}

function loadStatusMap(): Record<string, ContactStatus> {
  try {
    const raw = localStorage.getItem(RECOVERY_LS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function saveStatusMap(map: Record<string, ContactStatus>) {
  try { localStorage.setItem(RECOVERY_LS_KEY, JSON.stringify(map)); } catch {}
}

function timeSince(date: string): string {
  const ms = Date.now() - new Date(date).getTime();
  const min = Math.floor(ms / 60000);
  if (min < 60) return `${min}min atrás`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h atrás`;
  const d = Math.floor(h / 24);
  return `${d}d atrás`;
}

function buildWhatsAppLink(phone: string, message: string): string {
  // Limpa o telefone (só dígitos) e adiciona +55 se não tiver
  let digits = phone.replace(/\D/g, "");
  if (digits.length === 10 || digits.length === 11) {
    digits = "55" + digits;
  }
  const encoded = encodeURIComponent(message);
  return `https://wa.me/${digits}?text=${encoded}`;
}

function RecoveryPanel() {
  const [items, setItems] = useState<RecoveryItem[]>([]);
  const [stats, setStats] = useState({ total: 0, last24h: 0, last72h: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"all" | "pending" | "contacted" | "converted">("pending");
  const [statusMap, setStatusMap] = useState<Record<string, ContactStatus>>({});
  const [search, setSearch] = useState("");

  useEffect(() => {
    setStatusMap(loadStatusMap());
  }, []);

  async function load() {
    setLoading(true);
    setError("");
    try {
      let password = sessionStorage.getItem("admin_password") || "";
      if (!password) {
        const entered = window.prompt("Senha do admin pra carregar recuperação:");
        if (entered) {
          password = entered;
          try { sessionStorage.setItem("admin_password", entered); } catch {}
        }
      }
      const res = await fetch("/api/admin/recovery", {
        headers: { "x-admin-password": password },
      });
      const ctype = res.headers.get("content-type") || "";
      if (!ctype.includes("application/json")) {
        if (res.status === 404) {
          setError("Endpoint /api/admin/recovery não encontrado. Faça redeploy no Vercel.");
        } else {
          setError(`Resposta inválida (status ${res.status}). Provável env var SUPABASE_SERVICE_ROLE_KEY faltando.`);
        }
        return;
      }
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401) {
          try { sessionStorage.removeItem("admin_password"); } catch {}
          setError("Senha inválida. Recarregue pra tentar de novo.");
        } else {
          setError(data.error || `Erro ${res.status}`);
        }
      } else {
        setItems(data.pending || []);
        setStats(data.stats || { total: 0, last24h: 0, last72h: 0 });
      }
    } catch (e: any) {
      setError(e?.message || "Erro de rede");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function setStatus(id: string, status: ContactStatus) {
    const next = { ...statusMap, [id]: status };
    setStatusMap(next);
    saveStatusMap(next);
  }

  // === DEDUPE AUTOMÁTICO ===
  // Remove duplicatas por telefone OU email (mantém só o mais recente).
  // Cenários: pessoa gera 2 PIX, cria 2 contas com mesmo número, etc.
  const dedupedItems = (() => {
    // Ordena DESC por created_at (mais novo primeiro)
    const sorted = [...items].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    const seenPhones = new Set<string>();
    const seenEmails = new Set<string>();
    const out: RecoveryItem[] = [];

    for (const it of sorted) {
      // Normaliza
      const phoneNorm = (it.phone || "").replace(/\D/g, "");
      const emailNorm = (it.email || "").toLowerCase().trim();

      // Se telefone OU email já apareceu, é duplicata (descarta)
      const phoneDup = phoneNorm && seenPhones.has(phoneNorm);
      const emailDup = emailNorm && seenEmails.has(emailNorm);
      if (phoneDup || emailDup) continue;

      // Marca como visto
      if (phoneNorm) seenPhones.add(phoneNorm);
      if (emailNorm) seenEmails.add(emailNorm);
      out.push(it);
    }

    return out;
  })();

  const duplicatesRemoved = items.length - dedupedItems.length;

  const filtered = dedupedItems.filter((it) => {
    const s = statusMap[it.id] || "pending";
    if (filter === "pending" && s !== "pending") return false;
    if (filter === "contacted" && s !== "contacted") return false;
    if (filter === "converted" && s !== "converted") return false;
    if (filter !== "all" && s === "lost") return false;

    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        (it.username || "").toLowerCase().includes(q) ||
        (it.email || "").toLowerCase().includes(q) ||
        (it.phone || "").includes(q) ||
        (it.full_name || "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  const counts = {
    pending: dedupedItems.filter((i) => (statusMap[i.id] || "pending") === "pending").length,
    contacted: dedupedItems.filter((i) => statusMap[i.id] === "contacted").length,
    converted: dedupedItems.filter((i) => statusMap[i.id] === "converted").length,
  };

  return (
    <div>
      {/* Stats */}
      {/* Stats (dedupados) */}
      {duplicatesRemoved > 0 && (
        <div className="bg-blue-50 border border-blue-200 text-blue-700 text-[11px] px-3 py-2 rounded-xl mb-2 flex items-center gap-2">
          <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          <span>
            <strong>{duplicatesRemoved}</strong> {duplicatesRemoved === 1 ? "duplicata removida" : "duplicatas removidas"} automaticamente (mesmo telefone ou email)
          </span>
        </div>
      )}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
        <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl p-3 text-white">
          <div className="text-[9px] uppercase tracking-wider text-white/80 font-bold">PIX pendentes</div>
          <div className="font-display text-2xl tabular-nums">{dedupedItems.length}</div>
          <div className="text-[10px] text-white/80">últimos 3 dias</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-3">
          <div className="text-[9px] uppercase tracking-wider text-gray-500 font-bold">24h</div>
          <div className="font-display text-2xl text-gray-900 tabular-nums">
            {dedupedItems.filter(i => Date.now() - new Date(i.created_at).getTime() < 24 * 60 * 60 * 1000).length}
          </div>
          <div className="text-[10px] text-gray-500">mais quentes</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-3">
          <div className="text-[9px] uppercase tracking-wider text-gray-500 font-bold">72h</div>
          <div className="font-display text-2xl text-gray-900 tabular-nums">
            {dedupedItems.filter(i => Date.now() - new Date(i.created_at).getTime() < 72 * 60 * 60 * 1000).length}
          </div>
          <div className="text-[10px] text-gray-500">3 dias</div>
        </div>
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-3 text-white">
          <div className="text-[9px] uppercase tracking-wider text-white/80 font-bold">Convertidos</div>
          <div className="font-display text-2xl tabular-nums">{counts.converted}</div>
          <div className="text-[10px] text-white/80">já compraram</div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-2 rounded-xl mb-3">
          {error}
        </div>
      )}

      {/* Toolbar */}
      <div className="bg-white border border-gray-200 rounded-2xl p-3 mb-3">
        <div className="flex flex-col md:flex-row gap-2">
          <input
            type="text"
            placeholder="Buscar por nome, email, telefone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:border-gray-900 outline-none"
          />
          <button
            onClick={load}
            disabled={loading}
            title="Recarregar"
            className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm hover:bg-gray-50 transition disabled:opacity-50 flex-shrink-0"
          >
            <svg className={`w-4 h-4 text-gray-600 ${loading ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>

        <div className="flex gap-1.5 mt-2 flex-wrap">
          {([
            { id: "pending" as const, label: "Não contatados", count: counts.pending, color: "bg-amber-100 text-amber-800" },
            { id: "contacted" as const, label: "Contatados", count: counts.contacted, color: "bg-blue-100 text-blue-800" },
            { id: "converted" as const, label: "Convertidos", count: counts.converted, color: "bg-emerald-100 text-emerald-800" },
            { id: "all" as const, label: "Todos", count: dedupedItems.length, color: "bg-gray-100 text-gray-700" },
          ]).map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                filter === f.id
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              <span>{f.label}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                filter === f.id ? "bg-white/20" : f.color
              }`}>{f.count}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Lista */}
      {loading && (
        <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center">
          <div className="w-8 h-8 mx-auto mb-3 border-4 border-gray-200 border-t-gray-900 rounded-full animate-spin"></div>
          <p className="text-sm text-gray-500">Carregando...</p>
        </div>
      )}

      {!loading && filtered.length === 0 && !error && (
        <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center">
          <p className="text-4xl mb-2">🎯</p>
          <p className="text-sm text-gray-500">
            {filter === "pending" && counts.pending === 0
              ? "Nenhum lead pra recuperar agora — tudo em dia!"
              : "Nenhum resultado pra esse filtro"}
          </p>
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div className="space-y-2">
          {filtered.map((it) => (
            <RecoveryCard
              key={it.id}
              item={it}
              status={statusMap[it.id] || "pending"}
              onSetStatus={(s) => setStatus(it.id, s)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function RecoveryCard({
  item,
  status,
  onSetStatus,
}: {
  item: RecoveryItem;
  status: ContactStatus;
  onSetStatus: (s: ContactStatus) => void;
}) {
  const firstName = item.first_name || item.username || "amiga";
  const bidderName = randomBidderName();
  const bidValue = randomBidValue();
  const [creatingCoupon, setCreatingCoupon] = useState(false);

  // Saldo formatado em BRL
  const fmtBRL = (v: number) => v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // Se tem saldo > 0, usa o real. Senão, gera um aleatório plausível pra mensagem.
  const hasSavedBalance = item.wallet_balance > 0;
  const displayBalance = hasSavedBalance
    ? item.wallet_balance
    : item.current_bid > 0
      ? item.current_bid * 0.9 // simula líquido (90% do lance — taxa 10%)
      : 250 + Math.random() * 170; // fallback aleatório R$ 250-420

  // Mapeia "receba até XXX mensais" por plano
  const planMonthlyMap: Record<string, string> = {
    Creator: "R$ 12.000",
    "Creator Advanced": "R$ 48.000",
    "Top Creator": "valores acima de R$ 48.000",
  };
  const planMonthly = planMonthlyMap[item.plan_name] || "valores altíssimos";

  // 2 nomes árabes pra mensagem do cupom
  const bidder1 = bidderName;
  let bidder2 = randomBidderName();
  while (bidder2 === bidder1) bidder2 = randomBidderName();

  // Cálculo do desconto 47% no Basic
  const discountedBasic = (79 * 0.53).toFixed(2).replace(".", ",");

  const message1 = `Oi ${firstName}, aqui é a assistente virtual da FootPriv.\n\n*URGENTE* — seu saldo de *R$ ${fmtBRL(displayBalance)}* está disponível pra saque, mas vai *expirar em breve*.\n\nO comprador *${bidder1}* que deu o lance pela sua foto vai receber o valor de volta caso você não ative sua conta a tempo.\n\nPorém, considerando que você é uma creator de *grande potencial* na nossa plataforma de acordo com os resultados, liberamos um *desconto exclusivo de 47% OFF* válido até a expiração:\n\n~~R$ 79~~ → *R$ ${discountedBasic}* (Creator com desconto)\n\nO desconto vale pra qualquer plano. Cupom *já aplicado* na sua conta — é só logar e finalizar:\n\nhttps://footpriv.com/dashboard`;

  // Cria cupom no banco e abre WhatsApp com a mensagem unificada
  async function ativarCupomEEnviar() {
    if (creatingCoupon) return;
    setCreatingCoupon(true);
    try {
      const password = sessionStorage.getItem("admin_password") || "";
      const res = await fetch("/api/admin/coupon", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": password,
        },
        body: JSON.stringify({ user_id: item.user_id, discount_pct: 47 }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(`Erro ao criar cupom: ${data.error || res.statusText}`);
        return;
      }
      if (status === "pending") onSetStatus("contacted");
      window.open(buildWhatsAppLink(item.phone, message1), "_blank");
    } catch (e: any) {
      alert(`Erro de rede: ${e?.message}`);
    } finally {
      setCreatingCoupon(false);
    }
  }

  const statusBadge = {
    pending: { label: "Não contatado", color: "bg-amber-100 text-amber-800", dot: "bg-amber-500" },
    contacted: { label: "Contatado", color: "bg-blue-100 text-blue-800", dot: "bg-blue-500" },
    converted: { label: "Convertido ✓", color: "bg-emerald-100 text-emerald-800", dot: "bg-emerald-500" },
    lost: { label: "Perdido", color: "bg-gray-100 text-gray-600", dot: "bg-gray-400" },
  }[status];

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-4 hover:border-gray-400 transition">
      <div className="flex items-start gap-3 mb-3">
        {/* Avatar com inicial */}
        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center font-bold text-base flex-shrink-0">
          {(firstName || "?").charAt(0).toUpperCase()}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <p className="font-bold text-gray-900 truncate">@{item.username || "sem-username"}</p>
            <span className={`text-[9px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${statusBadge.color}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${statusBadge.dot}`}></span>
              {statusBadge.label}
            </span>
          </div>
          <p className="text-[11px] text-gray-500 truncate">{item.email}</p>
          {item.phone && (
            <p className="text-[11px] text-gray-700 font-mono">📱 {item.phone}</p>
          )}
          <div className="flex items-center gap-3 mt-1.5 text-[10px] text-gray-500 flex-wrap">
            <span>{timeSince(item.created_at)}</span>
            <span className="text-gray-700 font-bold">
              Plano {item.plan_name} · R$ {item.plan_value}
            </span>
          </div>
        </div>
      </div>

      {/* Box de saldo + leilão (info da pessoa) */}
      {(hasSavedBalance || item.current_bid > 0) && (
        <div className="grid grid-cols-2 gap-2 mb-3">
          {hasSavedBalance && (
            <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200 rounded-xl p-2.5">
              <div className="text-[9px] uppercase tracking-wider text-emerald-700 font-bold mb-0.5">💰 Saldo disponível</div>
              <div className="font-display text-lg text-emerald-900 tabular-nums">
                R$ {fmtBRL(item.wallet_balance)}
              </div>
            </div>
          )}
          {item.current_bid > 0 && (
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-2.5">
              <div className="text-[9px] uppercase tracking-wider text-blue-700 font-bold mb-0.5">🎯 Lance ativo</div>
              <div className="font-display text-lg text-blue-900 tabular-nums">
                R$ {fmtBRL(item.current_bid)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Botão principal — cria cupom 47% + envia mensagem unificada via WhatsApp */}
      <button
        onClick={ativarCupomEEnviar}
        disabled={creatingCoupon || !item.phone}
        className="w-full flex items-center justify-center gap-2 px-3 py-3 bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 hover:opacity-90 text-white rounded-xl text-sm font-bold transition mb-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {creatingCoupon ? (
          <>
            <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"></div>
            Ativando cupom + abrindo WhatsApp...
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413z"/>
            </svg>
            <span>🎁 Ativar 47% OFF + enviar WhatsApp</span>
          </>
        )}
      </button>

      {/* Botões de status */}
      <div className="flex gap-1.5 flex-wrap">
        <button
          onClick={() => onSetStatus("contacted")}
          disabled={status === "contacted"}
          className={`flex-1 px-2 py-1.5 rounded-lg text-[10px] font-bold transition ${
            status === "contacted"
              ? "bg-blue-500 text-white cursor-default"
              : "bg-blue-50 text-blue-700 hover:bg-blue-100"
          }`}
        >
          {status === "contacted" ? "✓ Contatado" : "🏷 Marcar contatado"}
        </button>
        <button
          onClick={() => onSetStatus("converted")}
          disabled={status === "converted"}
          className={`flex-1 px-2 py-1.5 rounded-lg text-[10px] font-bold transition ${
            status === "converted"
              ? "bg-emerald-500 text-white cursor-default"
              : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
          }`}
        >
          {status === "converted" ? "✓ Convertido" : "✅ Converteu"}
        </button>
        <button
          onClick={() => {
            if (confirm("Marcar como perdido? Vai sumir da lista padrão.")) {
              onSetStatus("lost");
            }
          }}
          className="px-2 py-1.5 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-lg text-[10px] font-bold transition"
        >
          ❌ Perdido
        </button>
      </div>
    </div>
  );
}
