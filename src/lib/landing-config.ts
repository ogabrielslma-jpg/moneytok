// Config da landing — editável via /admin
// Campos visuais separados pra Desktop e Mobile

import { createClient } from "./supabase-client";

// Configurações que mudam entre desktop e mobile
export type ViewportConfig = {
  logo_size: number;          // 40-250
  logo_align: "left" | "center" | "right";
  background_position_x: number; // 0-100
  background_position_y: number; // 0-100
  background_size: number;       // 50-250
  background_overlay_opacity: number; // 0-100
  background_fit: "cover" | "contain" | "auto";
};

// Opção de uma pergunta
export type QuestionOption = {
  emoji: string;     // emoji (ou string vazia)
  text: string;      // texto da opção
  color: string;     // cor de destaque (ex: "#22c55e")
};

// Pergunta customizável
export type Question = {
  id: string;          // identificador interno (q1, q2…)
  title: string;       // pergunta principal
  subtitle: string;    // subtítulo/explicação
  options: QuestionOption[];
};

// Post fictício do feed do dashboard
export type FeedPost = {
  id: string;
  seller_name: string;
  seller_avatar_url: string;  // pode ser vazio (gera fallback)
  buyer_name: string;          // ex: "Khalid bin Faisal"
  buyer_emirate: string;       // ex: "Dubai · UAE"
  buyer_flag: string;          // emoji 🇦🇪
  amount_brl: number;          // valor da venda
  bids_count: number;          // quantidade de lances
  rarity: "common" | "rare" | "epic" | "legendary";
  time_ago: string;            // "há 12min" ou "agora"
  image_url: string;           // foto borrada/escondida
};

// Vídeo do TikTok (puxado via scraper)
// Ainda não tem IA — slot reservado pra quando o dev plugar
export type TikTokVideo = {
  id: string;
  thumbnail_url: string;       // imagem da capa do vídeo
  caption: string;             // texto/legenda
  views: number;               // visualizações
  likes: number;               // curtidas
  comments: number;            // comentários
  shares: number;              // compartilhamentos
  duration_sec: number;        // duração em segundos
  posted_at: string;           // ISO ou "há X dias"
  video_url: string;           // link do TikTok (opcional, p/ abrir externo)
  ai_analyzed: boolean;        // se a IA já analisou (placeholder pro futuro)
  ai_score: number | null;     // score 0-100 (null = não analisado ainda)
};

// Perfil TikTok do usuário (quando ele "vincula" via @username)
export type TikTokProfile = {
  username: string;
  display_name: string;
  avatar_url: string;
  followers: number;
  following: number;
  total_likes: number;
  bio: string;
  verified: boolean;
};

// Config do dashboard (tudo que o usuário logado vê)
export type DashboardConfig = {
  // Logo (pode ser igual ou diferente da landing)
  logo_mode: "text" | "image" | "same_as_landing";
  logo_primary: string;
  logo_secondary: string;
  logo_image_url: string;
  logo_size: number; // 40-200

  // Cores
  color_primary: string;
  color_accent: string;
  color_bg: string;        // fundo geral (default: #f9fafb)
  color_card_bg: string;   // fundo dos cards (default: #ffffff)

  // Textos da UI (sidebar/bottom-tab/labels)
  label_feed: string;
  label_auction: string;
  label_wallet: string;
  label_profile: string;
  label_my_auction: string;       // "Meu Leilão"
  label_active_auction: string;   // "Leilão ativo"
  label_closed_auctions: string;  // "Fechados"
  label_buyers_online: string;    // "Compradores online"
  label_top_creators: string;     // "Top creators"
  label_recent_sales: string;     // "Vendas recentes"

  // MoneyTok: mostra aba "Meu Leilão / Análise IA" no menu? (default false)
  // A lógica de leilão fica no código, só esconde da navegação.
  show_auction_tab: boolean;

  // Blur das fotos vendidas
  feed_blur_intensity: number;  // 0-30 (px do blur)
  feed_grayscale: boolean;      // se aplica filtro preto e branco

  // Posts do feed (gerenciado manualmente no admin)
  feed_posts: FeedPost[];

  // Vídeos TikTok placeholder (pra mostrar na aba Feed enquanto o scraper não está plugado)
  tiktok_videos: TikTokVideo[];

  // Compradores fictícios que dão lance no leilão (gerenciado no admin)
  bidders: Bidder[];

  // === MoneyTokPay: configs do popup, carteirinha e cadastro ===
  // Carteirinha (sidebar/topo)
  mtpay_card_label: string;                  // "MoneyTokPay"
  mtpay_card_balance_label: string;          // "Carteira" ou "Saldo"
  mtpay_card_locked_cta: string;             // "Criar conta agora →"
  mtpay_card_unlocked_cta: string;           // "Acessar carteira →"
  mtpay_card_locked_from: string;            // gradient cinza FROM
  mtpay_card_locked_to: string;              // gradient cinza TO
  mtpay_card_unlocked_from: string;          // gradient ativo FROM
  mtpay_card_unlocked_to: string;            // gradient ativo TO
  mtpay_card_text_color: string;             // cor do texto sobre o card
  mtpay_logo_url: string;                    // URL da imagem do logo MoneyTokPay (vazio = usa icone default)

  // === Cores de fundo por tela ===
  mtpay_dashboard_bg: string;                // fundo da dashboard logada
  mtpay_popup_bg: string;                    // fundo do modal popup MoneyTokPay
  mtpay_cadastro_bg: string;                 // fundo da pagina /moneytok-pay/cadastro
  mtpay_planos_bg: string;                   // fundo da pagina /moneytok-pay/planos

  // Popup bloqueante
  mtpay_popup_title: string;
  mtpay_popup_description: string;
  mtpay_popup_benefit_1: string;
  mtpay_popup_benefit_2: string;
  mtpay_popup_benefit_3: string;
  mtpay_popup_button: string;
  mtpay_popup_logout_text: string;
  mtpay_popup_icon_from: string;
  mtpay_popup_icon_to: string;
  mtpay_popup_button_from: string;
  mtpay_popup_button_to: string;

  // Cadastro page
  mtpay_cadastro_title: string;              // "MoneyTokPay"
  mtpay_cadastro_subtitle: string;           // "Sua carteira dentro do MoneyTok"
  mtpay_cadastro_step1_title: string;        // "Seus dados"
  mtpay_cadastro_step1_subtitle: string;     // "Pra identificar voce na plataforma"
  mtpay_cadastro_step2_title: string;        // "Como voce quer receber?"
  mtpay_cadastro_step2_subtitle: string;     // "Voce pode pular e adicionar depois"
  mtpay_cadastro_step3_title: string;        // "Conta criada!"
  mtpay_cadastro_step3_message: string;
  mtpay_cadastro_progress_from: string;      // gradient progress FROM
  mtpay_cadastro_progress_to: string;        // gradient progress TO

  // Cores dos textos da pagina de cadastro
  mtpay_cadastro_headline_color: string;     // cor do titulo principal
  mtpay_cadastro_subheadline_color: string;  // cor do subtitulo

  // Videos em destaque
  mtpay_videos_title: string;                // "Videos em destaque"
  mtpay_videos_count: number;                // 3, 5, 10
  mtpay_videos_show_ranking: boolean;        // mostra badges 1, 2, 3

  // === Onboarding (modal educativo antes do cadastro MoneyTokPay) ===
  mtpay_onboarding_title: string;
  mtpay_onboarding_button_label: string;
  mtpay_onboarding_finish_label: string;
  mtpay_onboarding_steps: {
    title: string;
    description: string;
    image_url: string;
    bullets: string[];
    checkbox_label: string;
    bg_color: string;
    title_color: string;
    text_color: string;
    bullets_bg_from: string;
    bullets_bg_to: string;
    bullets_text_color: string;
    button_from: string;
    button_to: string;
    button_text_color: string;
    checkbox_color: string;
    progress_from: string;
    progress_to: string;
  }[];

  // === FAQ da pagina de planos ===
  mtpay_planos_faq_title: string;            // "Perguntas frequentes"
  mtpay_planos_faq_subtitle: string;          // "Tire suas duvidas sobre..."
  mtpay_planos_faq_headline_color: string;   // cor do titulo do FAQ
  mtpay_planos_faq_subheadline_color: string; // cor do subtitulo do FAQ
  mtpay_planos_faq_items: { question: string; answer: string }[];

  // === Planos de moedas (compra obrigatoria pos-cadastro MoneyTokPay) ===
  mtpay_planos_title: string;                // "Ative sua conta"
  mtpay_planos_subtitle: string;             // "Escolha um plano de moedas..."
  mtpay_planos_headline_color: string;       // cor do titulo
  mtpay_planos_subheadline_color: string;    // cor do subtitulo
  mtpay_planos_coin_image_url: string;        // imagem da moeda (aparece em cada card de plano)
  mtpay_planos_recommended_badge: string;    // "Mais escolhido"
  mtpay_planos_pix_title: string;            // "Pague com PIX"
  mtpay_planos_pix_instruction: string;      // "Escaneie o QR Code abaixo..."
  mtpay_planos_simulate_button: string;      // "Ja paguei (simular)"
  mtpay_planos_recommended_from: string;     // gradient destaque FROM
  mtpay_planos_recommended_to: string;       // gradient destaque TO
  mtpay_planos_default_border: string;       // borda dos planos sem destaque

  // 3 planos (cada um: moedas, preco em centavos, label opcional, descricao)
  plan_1_coins: number;
  plan_1_price_cents: number;
  plan_1_label: string;
  plan_2_coins: number;
  plan_2_price_cents: number;
  plan_2_label: string;
  plan_3_coins: number;
  plan_3_price_cents: number;
  plan_3_label: string;
};

// Comprador fictício
export type Bidder = {
  id: string;
  name: string;
  emirate: string;        // cidade
  country: string;        // país
  flag: string;           // emoji
  currency: string;       // ex: AED
  currency_rate: number;  // BRL → moeda local
  avatar_url: string;     // foto da pessoa
};

// Config completa
export type LandingConfig = {
  // Logo
  logo_mode: "text" | "image";
  logo_primary: string;
  logo_secondary: string;
  logo_image_url: string;
  // Estilo logo_primary
  logo_primary_size: number;     // 12-120 (px)
  logo_primary_weight: number;   // 300-900
  logo_primary_color: string;    // hex
  logo_primary_case: "normal" | "upper" | "lower" | "capitalize";
  logo_primary_font: string;     // nome da fonte (ex: "serif", "sans", "Inter")
  // Estilo logo_secondary
  logo_secondary_size: number;
  logo_secondary_weight: number;
  logo_secondary_color: string;
  logo_secondary_case: "normal" | "upper" | "lower" | "capitalize";
  logo_secondary_font: string;

  // Textos
  tagline: string;
  tagline_html: string;          // HTML rich (bold/italic etc)
  tagline_size: number;          // 8-32
  tagline_weight: number;        // 300-900
  tagline_align: "left" | "center" | "right";
  tagline_color: string;         // hex
  tagline_case: "normal" | "upper" | "lower" | "capitalize";
  tagline_font: string;
  headline: string;       // texto plano (fallback)
  headline_html: string;  // HTML rich (com bold/italic/underline/highlight)
  headline_size: number;       // 12-72 (px)
  headline_weight: number;     // 300-900
  headline_align: "left" | "center" | "right";
  headline_color: string;       // hex
  headline_case: "normal" | "upper" | "lower" | "capitalize";
  headline_font: string;

  // Input @ e botão CTA (cores customizáveis)
  input_bg_color: string;
  input_text_color: string;
  input_border_color: string;
  cta_on_bg_color: string;
  cta_on_text_color: string;
  cta_off_bg_color: string;
  cta_off_text_color: string;

  // Header (logo top-left + Entrar top-right)
  show_header_logo: boolean;
  show_header_login: boolean;

  cta_text: string;
  cta_size: number;        // 12-32
  cta_weight: number;      // 300-900

  // Perguntas (5 padrão, mas customizáveis)
  questions: Question[];

  // Banner topo (livre)
  banner_enabled: boolean;
  banner_mode: "text" | "image";
  banner_text: string;
  banner_image_url: string;
  banner_bg_color: string;
  banner_text_color: string;
  banner_link_url: string; // opcional, banner clicável

  // Cores gerais
  color_primary: string;
  color_accent: string;
  color_bg_from: string;
  color_bg_via: string;
  color_bg_to: string;

  // Imagem de fundo
  background_image_url: string;

  // Configs específicas por viewport
  desktop: ViewportConfig;
  mobile: ViewportConfig;

  faqs: { q: string; a: string }[];

  // Config do dashboard (pós-login)
  dashboard: DashboardConfig;
};

const DEFAULT_VIEWPORT: ViewportConfig = {
  logo_size: 100,
  logo_align: "center",
  background_position_x: 50,
  background_position_y: 50,
  background_size: 100,
  background_overlay_opacity: 40,
  background_fit: "cover",
};

const DEFAULT_FEED_POSTS: FeedPost[] = [
  {
    id: "post-1",
    seller_name: "isabella_22",
    seller_avatar_url: "",
    buyer_name: "Khalid bin Faisal",
    buyer_emirate: "Dubai · UAE",
    buyer_flag: "🇦🇪",
    amount_brl: 287.50,
    bids_count: 14,
    rarity: "rare",
    time_ago: "há 3min",
    image_url: "",
  },
  {
    id: "post-2",
    seller_name: "mariana.s",
    seller_avatar_url: "",
    buyer_name: "Mohammed Al Saud",
    buyer_emirate: "Riyadh · KSA",
    buyer_flag: "🇸🇦",
    amount_brl: 342.00,
    bids_count: 11,
    rarity: "epic",
    time_ago: "há 8min",
    image_url: "",
  },
  {
    id: "post-3",
    seller_name: "carolina_lf",
    seller_avatar_url: "",
    buyer_name: "Ahmed bin Hamad",
    buyer_emirate: "Doha · QAT",
    buyer_flag: "🇶🇦",
    amount_brl: 219.90,
    bids_count: 9,
    rarity: "common",
    time_ago: "há 12min",
    image_url: "",
  },
  {
    id: "post-4",
    seller_name: "julia.melo",
    seller_avatar_url: "",
    buyer_name: "Tariq Al Maktoum",
    buyer_emirate: "Abu Dhabi · UAE",
    buyer_flag: "🇦🇪",
    amount_brl: 399.70,
    bids_count: 17,
    rarity: "legendary",
    time_ago: "há 19min",
    image_url: "",
  },
  {
    id: "post-5",
    seller_name: "beatriz_a",
    seller_avatar_url: "",
    buyer_name: "Hamdan bin Rashid",
    buyer_emirate: "Kuwait City · KWT",
    buyer_flag: "🇰🇼",
    amount_brl: 256.40,
    bids_count: 12,
    rarity: "rare",
    time_ago: "há 27min",
    image_url: "",
  },
  {
    id: "post-6",
    seller_name: "rafaela.t",
    seller_avatar_url: "",
    buyer_name: "Saif bin Zayed",
    buyer_emirate: "Manama · BHR",
    buyer_flag: "🇧🇭",
    amount_brl: 312.10,
    bids_count: 13,
    rarity: "epic",
    time_ago: "há 34min",
    image_url: "",
  },
];

// Vídeos placeholder pro feed enquanto o scraper não está plugado
// Usa thumbnails do Picsum (substituível via admin)
export const DEFAULT_TIKTOK_VIDEOS: TikTokVideo[] = [
  {
    id: "video-1",
    thumbnail_url: "https://picsum.photos/seed/mtk1/540/960",
    caption: "Os 3 erros que travaram meu crescimento no TikTok 🚀",
    views: 1247000,
    likes: 89400,
    comments: 1820,
    shares: 4310,
    duration_sec: 47,
    posted_at: "há 2 dias",
    video_url: "",
    ai_analyzed: false,
    ai_score: null,
  },
  {
    id: "video-2",
    thumbnail_url: "https://picsum.photos/seed/mtk2/540/960",
    caption: "Como transformei 1 vídeo em 4 fontes de renda 💸",
    views: 342000,
    likes: 24700,
    comments: 612,
    shares: 1102,
    duration_sec: 62,
    posted_at: "há 4 dias",
    video_url: "",
    ai_analyzed: false,
    ai_score: null,
  },
  {
    id: "video-3",
    thumbnail_url: "https://picsum.photos/seed/mtk3/540/960",
    caption: "O algoritmo do TikTok quer ISSO de você (testado)",
    views: 891000,
    likes: 67200,
    comments: 1340,
    shares: 2870,
    duration_sec: 38,
    posted_at: "há 6 dias",
    video_url: "",
    ai_analyzed: false,
    ai_score: null,
  },
  {
    id: "video-4",
    thumbnail_url: "https://picsum.photos/seed/mtk4/540/960",
    caption: "Roteiro pronto que viralizou (copia e cola) ✍️",
    views: 156000,
    likes: 11800,
    comments: 287,
    shares: 542,
    duration_sec: 55,
    posted_at: "há 1 semana",
    video_url: "",
    ai_analyzed: false,
    ai_score: null,
  },
  {
    id: "video-5",
    thumbnail_url: "https://picsum.photos/seed/mtk5/540/960",
    caption: "POV: você descobriu que dá pra viver disso",
    views: 2104000,
    likes: 198000,
    comments: 4720,
    shares: 12400,
    duration_sec: 29,
    posted_at: "há 1 semana",
    video_url: "",
    ai_analyzed: false,
    ai_score: null,
  },
  {
    id: "video-6",
    thumbnail_url: "https://picsum.photos/seed/mtk6/540/960",
    caption: "3 nichos invisíveis que pagam MUITO bem 🤫",
    views: 487000,
    likes: 38900,
    comments: 891,
    shares: 1670,
    duration_sec: 71,
    posted_at: "há 2 semanas",
    video_url: "",
    ai_analyzed: false,
    ai_score: null,
  },
];

export const DEFAULT_BIDDERS: Bidder[] = [
  // Arábia Saudita 🇸🇦 (SAR)
  { id: "bidder-1", name: "Khalid bin Salman Al-Farsi", emirate: "Riyadh", country: "Arábia Saudita", flag: "🇸🇦", currency: "SAR", currency_rate: 0.75, avatar_url: "" },
  { id: "bidder-2", name: "Abdulaziz Al-Rashid", emirate: "Jeddah", country: "Arábia Saudita", flag: "🇸🇦", currency: "SAR", currency_rate: 0.75, avatar_url: "" },
  { id: "bidder-3", name: "Faisal bin Mohammed", emirate: "Mecca", country: "Arábia Saudita", flag: "🇸🇦", currency: "SAR", currency_rate: 0.75, avatar_url: "" },
  { id: "bidder-4", name: "Saud Al-Otaibi", emirate: "Medina", country: "Arábia Saudita", flag: "🇸🇦", currency: "SAR", currency_rate: 0.75, avatar_url: "" },
  { id: "bidder-5", name: "Bandar Al-Qahtani", emirate: "Dammam", country: "Arábia Saudita", flag: "🇸🇦", currency: "SAR", currency_rate: 0.75, avatar_url: "" },
  // Emirados Árabes 🇦🇪 (AED)
  { id: "bidder-6", name: "Mohammed Al-Maktoum", emirate: "Dubai", country: "Emirados Árabes", flag: "🇦🇪", currency: "AED", currency_rate: 0.74, avatar_url: "" },
  { id: "bidder-7", name: "Ahmed bin Zayed", emirate: "Abu Dhabi", country: "Emirados Árabes", flag: "🇦🇪", currency: "AED", currency_rate: 0.74, avatar_url: "" },
  { id: "bidder-8", name: "Hamdan Al-Nahyan", emirate: "Sharjah", country: "Emirados Árabes", flag: "🇦🇪", currency: "AED", currency_rate: 0.74, avatar_url: "" },
  { id: "bidder-9", name: "Sultan Al-Qasimi", emirate: "Ajman", country: "Emirados Árabes", flag: "🇦🇪", currency: "AED", currency_rate: 0.74, avatar_url: "" },
  { id: "bidder-10", name: "Rashid bin Saeed", emirate: "Ras Al Khaimah", country: "Emirados Árabes", flag: "🇦🇪", currency: "AED", currency_rate: 0.74, avatar_url: "" },
  { id: "bidder-11", name: "Tahnoun Al-Mansoori", emirate: "Fujairah", country: "Emirados Árabes", flag: "🇦🇪", currency: "AED", currency_rate: 0.74, avatar_url: "" },
  // Catar 🇶🇦 (QAR)
  { id: "bidder-12", name: "Tamim bin Hamad Al-Thani", emirate: "Doha", country: "Catar", flag: "🇶🇦", currency: "QAR", currency_rate: 0.73, avatar_url: "" },
  { id: "bidder-13", name: "Jassim Al-Kuwari", emirate: "Al Wakrah", country: "Catar", flag: "🇶🇦", currency: "QAR", currency_rate: 0.73, avatar_url: "" },
  { id: "bidder-14", name: "Abdullah Al-Attiyah", emirate: "Al Khor", country: "Catar", flag: "🇶🇦", currency: "QAR", currency_rate: 0.73, avatar_url: "" },
  { id: "bidder-15", name: "Hamad Al-Misnad", emirate: "Doha", country: "Catar", flag: "🇶🇦", currency: "QAR", currency_rate: 0.73, avatar_url: "" },
  // Kuwait 🇰🇼 (KWD)
  { id: "bidder-16", name: "Sabah Al-Sabah", emirate: "Kuwait City", country: "Kuwait", flag: "🇰🇼", currency: "KWD", currency_rate: 0.061, avatar_url: "" },
  { id: "bidder-17", name: "Yousef Al-Mutawa", emirate: "Hawalli", country: "Kuwait", flag: "🇰🇼", currency: "KWD", currency_rate: 0.061, avatar_url: "" },
  { id: "bidder-18", name: "Nasser Al-Khaled", emirate: "Salmiya", country: "Kuwait", flag: "🇰🇼", currency: "KWD", currency_rate: 0.061, avatar_url: "" },
  { id: "bidder-19", name: "Fahad Al-Ghanim", emirate: "Farwaniya", country: "Kuwait", flag: "🇰🇼", currency: "KWD", currency_rate: 0.061, avatar_url: "" },
  // Bahrein 🇧🇭 (BHD)
  { id: "bidder-20", name: "Hamad Al-Khalifa", emirate: "Manama", country: "Bahrein", flag: "🇧🇭", currency: "BHD", currency_rate: 0.075, avatar_url: "" },
  { id: "bidder-21", name: "Salman Al-Zayani", emirate: "Riffa", country: "Bahrein", flag: "🇧🇭", currency: "BHD", currency_rate: 0.075, avatar_url: "" },
  { id: "bidder-22", name: "Khalifa Al-Dosari", emirate: "Muharraq", country: "Bahrein", flag: "🇧🇭", currency: "BHD", currency_rate: 0.075, avatar_url: "" },
  // Omã 🇴🇲 (OMR)
  { id: "bidder-23", name: "Qaboos Al-Said", emirate: "Muscat", country: "Omã", flag: "🇴🇲", currency: "OMR", currency_rate: 0.077, avatar_url: "" },
  { id: "bidder-24", name: "Haitham Al-Busaidi", emirate: "Salalah", country: "Omã", flag: "🇴🇲", currency: "OMR", currency_rate: 0.077, avatar_url: "" },
  { id: "bidder-25", name: "Asaad Al-Harthy", emirate: "Sohar", country: "Omã", flag: "🇴🇲", currency: "OMR", currency_rate: 0.077, avatar_url: "" },
];

// Pool de templates pra "+ Adicionar comprador" — gera dados aleatórios prontos
const BIDDER_TEMPLATES: Omit<Bidder, "id" | "avatar_url">[] = [
  { name: "Sheikh Al-Nuaimi", emirate: "Dubai", country: "Emirados Árabes", flag: "🇦🇪", currency: "AED", currency_rate: 0.74 },
  { name: "Saif bin Rashid", emirate: "Sharjah", country: "Emirados Árabes", flag: "🇦🇪", currency: "AED", currency_rate: 0.74 },
  { name: "Hassan Al-Suwaidi", emirate: "Abu Dhabi", country: "Emirados Árabes", flag: "🇦🇪", currency: "AED", currency_rate: 0.74 },
  { name: "Turki Al-Faisal", emirate: "Riyadh", country: "Arábia Saudita", flag: "🇸🇦", currency: "SAR", currency_rate: 0.75 },
  { name: "Mansour Al-Saud", emirate: "Jeddah", country: "Arábia Saudita", flag: "🇸🇦", currency: "SAR", currency_rate: 0.75 },
  { name: "Walid Al-Ibrahim", emirate: "Dammam", country: "Arábia Saudita", flag: "🇸🇦", currency: "SAR", currency_rate: 0.75 },
  { name: "Khalifa Al-Thani", emirate: "Doha", country: "Catar", flag: "🇶🇦", currency: "QAR", currency_rate: 0.73 },
  { name: "Mohammed Al-Sulaiti", emirate: "Al Rayyan", country: "Catar", flag: "🇶🇦", currency: "QAR", currency_rate: 0.73 },
  { name: "Jaber Al-Sabah", emirate: "Kuwait City", country: "Kuwait", flag: "🇰🇼", currency: "KWD", currency_rate: 0.061 },
  { name: "Ali Al-Salem", emirate: "Hawalli", country: "Kuwait", flag: "🇰🇼", currency: "KWD", currency_rate: 0.061 },
  { name: "Isa Al-Khalifa", emirate: "Manama", country: "Bahrein", flag: "🇧🇭", currency: "BHD", currency_rate: 0.075 },
  { name: "Tariq Al-Lawati", emirate: "Muscat", country: "Omã", flag: "🇴🇲", currency: "OMR", currency_rate: 0.077 },
];

export function generateRandomBidder(): Bidder {
  const t = BIDDER_TEMPLATES[Math.floor(Math.random() * BIDDER_TEMPLATES.length)];
  return {
    id: `bidder-${Date.now()}-${Math.floor(Math.random() * 9999)}`,
    name: t.name,
    emirate: t.emirate,
    country: t.country,
    flag: t.flag,
    currency: t.currency,
    currency_rate: t.currency_rate,
    avatar_url: "",
  };
}

const DEFAULT_DASHBOARD_CONFIG: DashboardConfig = {
  logo_mode: "same_as_landing",
  logo_primary: "FOOT",
  logo_secondary: "PRIV",
  logo_image_url: "",
  logo_size: 100,

  color_primary: "#22c55e",
  color_accent: "#a3e635",
  color_bg: "#f9fafb",
  color_card_bg: "#ffffff",

  label_feed: "Meus Vídeos",
  label_auction: "Análise IA",
  label_wallet: "Carteira",
  label_profile: "Perfil",
  label_my_auction: "Análise IA",
  label_active_auction: "Em análise",
  label_closed_auctions: "Analisados",
  label_buyers_online: "Creators online",
  label_top_creators: "Top creators",
  label_recent_sales: "Análises recentes",

  show_auction_tab: false,

  feed_blur_intensity: 12,
  feed_grayscale: false,

  feed_posts: DEFAULT_FEED_POSTS,
  tiktok_videos: DEFAULT_TIKTOK_VIDEOS,
  bidders: DEFAULT_BIDDERS,

  // === MoneyTokPay defaults ===
  mtpay_card_label: "MoneyTokPay",
  mtpay_card_balance_label: "Carteira",
  mtpay_card_locked_cta: "Criar conta agora →",
  mtpay_card_unlocked_cta: "Acessar carteira →",
  mtpay_card_locked_from: "#374151",
  mtpay_card_locked_to: "#111827",
  mtpay_card_unlocked_from: "#FE2C55",
  mtpay_card_unlocked_to: "#F97316",
  mtpay_card_text_color: "#ffffff",
  mtpay_logo_url: "",

  mtpay_dashboard_bg: "#f9fafb",
  mtpay_popup_bg: "#ffffff",
  mtpay_cadastro_bg: "#fdf2f8",
  mtpay_planos_bg: "#fdf2f8",

  mtpay_popup_title: "Crie sua conta MoneyTokPay",
  mtpay_popup_description: "Pra continuar monetizando seu perfil, voce precisa criar sua conta MoneyTokPay.",
  mtpay_popup_benefit_1: "Receba sua monetizacao via PIX (instantaneo) ou conta bancaria (D+1)",
  mtpay_popup_benefit_2: "Saldo em moedas pra usar dentro da plataforma",
  mtpay_popup_benefit_3: "Acesso a planos e features exclusivas",
  mtpay_popup_button: "Criar minha conta agora",
  mtpay_popup_logout_text: "Sair da conta",
  mtpay_popup_icon_from: "#FE2C55",
  mtpay_popup_icon_to: "#F97316",
  mtpay_popup_button_from: "#FE2C55",
  mtpay_popup_button_to: "#F97316",

  mtpay_cadastro_title: "MoneyTokPay",
  mtpay_cadastro_subtitle: "Sua carteira dentro do MoneyTok",
  mtpay_cadastro_step1_title: "Seus dados",
  mtpay_cadastro_step1_subtitle: "Pra identificar voce na plataforma",
  mtpay_cadastro_step2_title: "Como voce quer receber?",
  mtpay_cadastro_step2_subtitle: "Voce pode pular e adicionar depois nas configuracoes",
  mtpay_cadastro_step3_title: "Conta criada!",
  mtpay_cadastro_step3_message: "Sua conta MoneyTokPay esta pronta. Agora voce pode continuar usando o MoneyTok normalmente.",
  mtpay_cadastro_progress_from: "#FE2C55",
  mtpay_cadastro_progress_to: "#F97316",
  mtpay_cadastro_headline_color: "#111827",
  mtpay_cadastro_subheadline_color: "#6b7280",

  mtpay_videos_title: "Vídeos em destaque",
  mtpay_videos_count: 10,
  mtpay_videos_show_ranking: true,

  mtpay_onboarding_title: "Como funciona o MoneyTokPay",
  mtpay_onboarding_button_label: "Continuar",
  mtpay_onboarding_finish_label: "Comecar cadastro",
  mtpay_onboarding_steps: [
    {
      title: "Bem-vindo a plataforma",
      description: "O MoneyTokPay e a sua carteira digital dentro do MoneyTok. Voce pode acompanhar seus ganhos, comprar moedas para usar em features premium e sacar valores em dinheiro.",
      image_url: "",
      bullets: [
        "Carteira digital integrada ao MoneyTok",
        "Saques via PIX (instantaneo) ou banco (D+1)",
        "Saldo de moedas para features premium",
      ],
      checkbox_label: "Eu entendi",
      bg_color: "#ffffff",
      title_color: "#111827",
      text_color: "#4b5563",
      bullets_bg_from: "#fdf2f8",
      bullets_bg_to: "#fff7ed",
      bullets_text_color: "#374151",
      button_from: "#FE2C55",
      button_to: "#F97316",
      button_text_color: "#ffffff",
      checkbox_color: "#FE2C55",
      progress_from: "#FE2C55",
      progress_to: "#F97316",
    },
    {
      title: "Como voce vai receber",
      description: "Apos cadastrar seus dados de pagamento, todos os ganhos da plataforma sao depositados na sua conta MoneyTokPay. Voce decide quando sacar.",
      image_url: "",
      bullets: [
        "PIX: ate 2 minutos",
        "Conta bancaria: D+1 util",
        "Sem taxa de saque ate o limite mensal",
      ],
      checkbox_label: "Eu entendi como receber",
      bg_color: "#ffffff",
      title_color: "#111827",
      text_color: "#4b5563",
      bullets_bg_from: "#fdf2f8",
      bullets_bg_to: "#fff7ed",
      bullets_text_color: "#374151",
      button_from: "#FE2C55",
      button_to: "#F97316",
      button_text_color: "#ffffff",
      checkbox_color: "#FE2C55",
      progress_from: "#FE2C55",
      progress_to: "#F97316",
    },
    {
      title: "Pronto pra ativar?",
      description: "Pra ativar sua conta, voce precisa preencher os dados e escolher um plano de moedas. E rapido e voce libera todas as features da plataforma.",
      image_url: "",
      bullets: [
        "Cadastro em menos de 2 minutos",
        "Dados protegidos com criptografia",
        "Plano de moedas ativa as features premium",
      ],
      checkbox_label: "Estou pronto pra cadastrar",
      bg_color: "#ffffff",
      title_color: "#111827",
      text_color: "#4b5563",
      bullets_bg_from: "#fdf2f8",
      bullets_bg_to: "#fff7ed",
      bullets_text_color: "#374151",
      button_from: "#FE2C55",
      button_to: "#F97316",
      button_text_color: "#ffffff",
      checkbox_color: "#FE2C55",
      progress_from: "#FE2C55",
      progress_to: "#F97316",
    },
  ],

  mtpay_planos_faq_title: "Perguntas frequentes",
  mtpay_planos_faq_subtitle: "Tire suas duvidas sobre o MoneyTokPay e os planos de moedas",
  mtpay_planos_faq_headline_color: "#111827",
  mtpay_planos_faq_subheadline_color: "#6b7280",
  mtpay_planos_faq_items: [
    { question: "O que sao as moedas MoneyTokPay?", answer: "As moedas sao a moeda interna da plataforma. Voce usa para acessar features premium, analise de IA dos seus videos e outras funcionalidades exclusivas." },
    { question: "Posso sacar as moedas em dinheiro?", answer: "As moedas tem uso interno na plataforma. Para receber valores em dinheiro, cadastre seus dados bancarios ou PIX no cadastro do MoneyTokPay." },
    { question: "Como funciona o pagamento via PIX?", answer: "Apos escolher o plano, voce recebe um QR Code PIX. Apos confirmar o pagamento no seu banco, suas moedas sao ativadas instantaneamente." },
    { question: "Posso comprar mais moedas depois?", answer: "Sim! Voce pode comprar mais moedas a qualquer momento dentro da plataforma." },
  ],

  mtpay_planos_title: "Ative sua conta MoneyTokPay",
  mtpay_planos_subtitle: "Escolha um plano de moedas para começar a usar a plataforma. Você pode usar moedas em features premium e análises de IA.",
  mtpay_planos_headline_color: "#111827",
  mtpay_planos_subheadline_color: "#6b7280",
  mtpay_planos_coin_image_url: "",
  mtpay_planos_recommended_badge: "Mais escolhido",
  mtpay_planos_pix_title: "Pague com PIX",
  mtpay_planos_pix_instruction: "Escaneie o QR Code ou copie o código PIX. Apos confirmar o pagamento, suas moedas são ativadas automaticamente.",
  mtpay_planos_simulate_button: "Ja paguei (simular)",
  mtpay_planos_recommended_from: "#FE2C55",
  mtpay_planos_recommended_to: "#F97316",
  mtpay_planos_default_border: "#e5e7eb",

  plan_1_coins: 1400,
  plan_1_price_cents: 8740,
  plan_1_label: "",
  plan_2_coins: 2000,
  plan_2_price_cents: 9740,
  plan_2_label: "Mais escolhido",
  plan_3_coins: 3000,
  plan_3_price_cents: 10940,
  plan_3_label: "",
};

export const DEFAULT_LANDING_CONFIG: LandingConfig = {
  logo_mode: "text",
  logo_primary: "MONEY",
  logo_secondary: "TOK",
  logo_image_url: "",
  logo_primary_size: 64,
  logo_primary_weight: 700,
  logo_primary_color: "#FE2C55",
  logo_primary_case: "upper",
  logo_primary_font: "serif",
  logo_secondary_size: 64,
  logo_secondary_weight: 300,
  logo_secondary_color: "#FFFFFF",
  logo_secondary_case: "upper",
  logo_secondary_font: "serif",

  tagline: "IA · Análise · Monetização",
  tagline_html: "",
  tagline_size: 11,
  tagline_weight: 400,
  tagline_align: "center",
  tagline_color: "#FE2C55",
  tagline_case: "upper",
  tagline_font: "sans",
  headline: "A IA que transforma seus vídeos do TikTok em renda real",
  headline_html: "A IA que transforma seus <strong>vídeos do TikTok</strong> em <span style=\"color:#25F4EE\">renda real</span>",
  headline_size: 18,
  headline_weight: 300,
  headline_align: "center",
  headline_color: "#E5E7EB",
  headline_case: "normal",
  headline_font: "sans",

  input_bg_color: "#1f1f1f",
  input_text_color: "#ffffff",
  input_border_color: "#2a2a2a",
  cta_on_bg_color: "#FE2C55",
  cta_on_text_color: "#ffffff",
  cta_off_bg_color: "#2a2a2a",
  cta_off_text_color: "#6b7280",

  show_header_logo: true,
  show_header_login: true,

  cta_text: "Localizar meu perfil",
  cta_size: 14,
  cta_weight: 700,

  questions: [
    {
      id: "q1",
      title: "Qual seu nicho principal no TikTok?",
      subtitle: "Isso ajuda nossa IA a calibrar a análise.",
      options: [
        { emoji: "💼", text: "Negócios / Empreendedorismo", color: "#FE2C55" },
        { emoji: "🎨", text: "Lifestyle / Moda / Beleza", color: "#25F4EE" },
        { emoji: "🎬", text: "Entretenimento / Humor", color: "#a855f7" },
        { emoji: "📚", text: "Educação / Tutoriais", color: "#f59e0b" },
        { emoji: "🤷", text: "Ainda estou descobrindo", color: "#6b7280" },
      ],
    },
    {
      id: "q2",
      title: "Quantos seguidores você tem hoje?",
      subtitle: "Sua faixa atual define o caminho de monetização.",
      options: [
        { emoji: "🌱", text: "Menos de 1.000", color: "#22c55e" },
        { emoji: "🚀", text: "Entre 1.000 e 10.000", color: "#FE2C55" },
        { emoji: "🔥", text: "Entre 10.000 e 100.000", color: "#25F4EE" },
        { emoji: "💎", text: "Mais de 100.000", color: "#f59e0b" },
      ],
    },
    {
      id: "q3",
      title: "Há quanto tempo você posta no TikTok?",
      subtitle: "Tempo de plataforma muda a estratégia recomendada.",
      options: [
        { emoji: "🆕", text: "Menos de 3 meses", color: "#22c55e" },
        { emoji: "📅", text: "Entre 3 meses e 1 ano", color: "#FE2C55" },
        { emoji: "⏳", text: "Entre 1 e 3 anos", color: "#25F4EE" },
        { emoji: "🏆", text: "Mais de 3 anos", color: "#f59e0b" },
      ],
    },
    {
      id: "q4",
      title: "Você já monetiza de alguma forma?",
      subtitle: "Pra IA saber por onde começar a sugerir.",
      options: [
        { emoji: "❌", text: "Ainda não monetizo nada", color: "#22c55e" },
        { emoji: "🎁", text: "Só recebo presentes nas lives", color: "#FE2C55" },
        { emoji: "🤝", text: "Faço parcerias / publis", color: "#25F4EE" },
        { emoji: "💰", text: "Vendo infoproduto próprio", color: "#f59e0b" },
      ],
    },
    {
      id: "q5",
      title: "Qual seu objetivo principal?",
      subtitle: "Vamos focar a análise no que importa pra você.",
      options: [
        { emoji: "📈", text: "Crescer audiência rapidamente", color: "#22c55e" },
        { emoji: "💸", text: "Transformar conteúdo em infoproduto", color: "#FE2C55" },
        { emoji: "🎯", text: "Fechar mais publis pagas", color: "#25F4EE" },
        { emoji: "🛍️", text: "Vender produto físico próprio", color: "#f59e0b" },
      ],
    },
  ],

  banner_enabled: false,
  banner_mode: "text",
  banner_text: "",
  banner_image_url: "",
  banner_bg_color: "#FE2C55",
  banner_text_color: "#ffffff",
  banner_link_url: "",

  color_primary: "#FE2C55",
  color_accent: "#25F4EE",
  color_bg_from: "#161823",
  color_bg_via: "#010101",
  color_bg_to: "#000000",

  background_image_url: "",

  desktop: { ...DEFAULT_VIEWPORT },
  mobile: { ...DEFAULT_VIEWPORT },

  faqs: [
    { q: "Como funciona a análise de IA?", a: "Você conecta seu @ do TikTok, nós puxamos seus vídeos públicos e nossa IA analisa cada um pra te mostrar oportunidades de monetização — desde infoproduto até parcerias e venda direta." },
    { q: "Eu preciso liberar acesso à minha conta?", a: "Não. A MoneyTok lê apenas dados públicos do seu perfil — os mesmos que qualquer pessoa vê quando entra no seu TikTok. Não pedimos senha nem login do TikTok." },
    { q: "Quando a análise de IA fica disponível?", a: "Estamos finalizando os últimos detalhes da nossa IA proprietária. Quem entra agora garante acesso prioritário assim que liberarmos." },
  ],

  dashboard: DEFAULT_DASHBOARD_CONFIG,
};

// Migra config antiga (sem desktop/mobile) pra nova estrutura
function migrateConfig(raw: any): LandingConfig {
  const merged: any = { ...DEFAULT_LANDING_CONFIG, ...raw };

  // Se viertor de versão antiga, copia campos legados
  if (!raw?.desktop || typeof raw.desktop !== "object") {
    merged.desktop = {
      logo_size: raw?.logo_size ?? DEFAULT_VIEWPORT.logo_size,
      logo_align: raw?.logo_align ?? DEFAULT_VIEWPORT.logo_align,
      background_position_x: raw?.background_position_x ?? DEFAULT_VIEWPORT.background_position_x,
      background_position_y: raw?.background_position_y ?? DEFAULT_VIEWPORT.background_position_y,
      background_size: raw?.background_size ?? DEFAULT_VIEWPORT.background_size,
      background_overlay_opacity: raw?.background_overlay_opacity ?? DEFAULT_VIEWPORT.background_overlay_opacity,
      background_fit: raw?.background_fit ?? DEFAULT_VIEWPORT.background_fit,
    };
  }
  if (!raw?.mobile || typeof raw.mobile !== "object") {
    merged.mobile = { ...merged.desktop };
  }

  // Migra banner_top → banner se existir
  if (raw?.banner_top_text && !merged.banner_text) {
    merged.banner_enabled = !!raw.banner_top_enabled;
    merged.banner_mode = "text";
    merged.banner_text = raw.banner_top_text;
  }

  // Se headline_html não existir, usa headline plano
  if (!raw?.headline_html && raw?.headline) {
    merged.headline_html = raw.headline;
  }

  // Se questions não existir, usa as default
  if (!Array.isArray(raw?.questions) || raw.questions.length === 0) {
    merged.questions = DEFAULT_LANDING_CONFIG.questions;
  }

  // Se dashboard não existir, usa default
  if (!raw?.dashboard || typeof raw.dashboard !== "object") {
    merged.dashboard = DEFAULT_DASHBOARD_CONFIG;
  } else {
    // Merge: preserva o que já tem mas garante todos os campos
    merged.dashboard = { ...DEFAULT_DASHBOARD_CONFIG, ...raw.dashboard };
    // Se feed_posts não existir, usa default
    if (!Array.isArray(merged.dashboard.feed_posts) || merged.dashboard.feed_posts.length === 0) {
      merged.dashboard.feed_posts = DEFAULT_FEED_POSTS;
    }
    // Se tiktok_videos não existir, usa default
    if (!Array.isArray(merged.dashboard.tiktok_videos) || merged.dashboard.tiktok_videos.length === 0) {
      merged.dashboard.tiktok_videos = DEFAULT_TIKTOK_VIDEOS;
    }
    // Se bidders não existir, usa default (compat configs antigas)
    if (!Array.isArray(merged.dashboard.bidders) || merged.dashboard.bidders.length === 0) {
      merged.dashboard.bidders = DEFAULT_BIDDERS;
    }
  }

  return merged as LandingConfig;
}

export async function fetchLandingConfig(): Promise<LandingConfig> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("landing_config")
      .select("data")
      .eq("id", "main")
      .single();

    if (error || !data) return DEFAULT_LANDING_CONFIG;
    return migrateConfig(data.data);
  } catch {
    return DEFAULT_LANDING_CONFIG;
  }
}

export async function saveLandingConfig(config: LandingConfig): Promise<{ ok: boolean; error?: string }> {
  try {
    const supabase = createClient();
    const { error } = await supabase
      .from("landing_config")
      .upsert({ id: "main", data: config, updated_at: new Date().toISOString() });

    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err.message || "Erro desconhecido" };
  }
}

// Upload de asset pra Supabase Storage
export async function uploadLandingAsset(file: File, folder: "logo" | "banner" | "background"): Promise<{ ok: boolean; url?: string; error?: string }> {
  try {
    const supabase = createClient();
    const ext = file.name.split(".").pop() || "jpg";
    const safeName = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("landing-assets")
      .upload(safeName, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) return { ok: false, error: uploadError.message };

    const { data } = supabase.storage.from("landing-assets").getPublicUrl(safeName);
    return { ok: true, url: data.publicUrl };
  } catch (err: any) {
    return { ok: false, error: err.message || "Erro no upload" };
  }
}

// Sanitiza HTML pra renderizar com dangerouslySetInnerHTML
// Aceita apenas tags inline seguras: strong, em, u, mark, span (com style background/color), s, br
export function sanitizeRichHtml(html: string): string {
  if (!html) return "";
  // Remove scripts, iframes, eventos onXxx
  let safe = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "");
  safe = safe.replace(/<iframe[^>]*>[\s\S]*?<\/iframe>/gi, "");
  safe = safe.replace(/\son\w+="[^"]*"/gi, "");
  safe = safe.replace(/\son\w+='[^']*'/gi, "");
  safe = safe.replace(/javascript:/gi, "");
  return safe;
}
