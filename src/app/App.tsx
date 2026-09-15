import { useState, useEffect } from "react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  Home, Users, Trophy, MapPin, User, Search, ChevronDown, ChevronUp,
  Bell, Plus, X, Check, ArrowLeft, Share2, Edit, LogOut, Star, Clock,
  Target, Zap, Award, TrendingUp, ChevronRight, Instagram, MessageSquare, Copy,
} from "lucide-react";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const LIME = "#C1E778";
const DARK = "#262824";
const CARD = "#2E3130";
const BORDER = "rgba(255,255,255,0.08)";
const GRAY = "#999999";

// ─── MOCK DATA ─────────────────────────────────────────────────────────────────
const leagues = [
  { id: "1", name: "Liga Terça", status: "ativa", friends: 4, matches: 12, next: "Terça 20h" },
  { id: "2", name: "Ranking Geral", status: "ativa", friends: 8, matches: 24, next: "Sex 19h" },
  { id: "3", name: "Sinuca da Vila", status: "encerrada", friends: 5, matches: 30, next: null },
];

const friends = [
  { id: "1", name: "João Silva", nick: "Joãozinho" },
  { id: "2", name: "Anderson Costa", nick: "Baroni" },
  { id: "3", name: "Felipe Santos", nick: "Cangaceiro" },
  { id: "4", name: "Pedro Oliveira", nick: "Pedrão" },
];

const rankingData = [
  { pos: 1, name: "Felipe", nick: "Cangaceiro", wins: 8, losses: 2, pct: 80 },
  { pos: 2, name: "Você", nick: "Marcelão", wins: 6, losses: 3, pct: 67 },
  { pos: 3, name: "João", nick: "Joãozinho", wins: 5, losses: 4, pct: 55 },
  { pos: 4, name: "Anderson", nick: "Baroni", wins: 3, losses: 7, pct: 30 },
];

const winRateData = [
  { d: "1", v: 50 }, { d: "5", v: 60 }, { d: "10", v: 55 },
  { d: "15", v: 70 }, { d: "20", v: 65 }, { d: "25", v: 75 }, { d: "30", v: 62 },
];

const weekData = [
  { w: "Sem1", wins: 3, losses: 1 },
  { w: "Sem2", wins: 2, losses: 2 },
  { w: "Sem3", wins: 4, losses: 1 },
  { w: "Sem4", wins: 2, losses: 3 },
];

const notifData = [
  { id: "1", type: "liga", text: "Liga Terça te convidou para participar", time: "há 2 horas", read: false },
  { id: "2", type: "amigo", text: "Pedro quer ser seu amigo", time: "há 5 horas", read: false },
  { id: "3", type: "jogatina", text: "Dia de jogatina da Liga Terça começa em 1 hora", time: "há 1 hora", read: true },
];

const locationData = [
  { id: "1", name: "Bar do Zé", rating: 4.5, reviews: 128, hours: "Seg-Dom 20h–04h", price: "R$ 30/h", distance: "2.4 km" },
  { id: "2", name: "Snooker Palace", rating: 4.8, reviews: 89, hours: "Ter-Dom 18h–02h", price: "R$ 40/h", distance: "3.1 km" },
  { id: "3", name: "Vila Sinuca", rating: 4.2, reviews: 45, hours: "Sex-Dom 19h–03h", price: "R$ 25/h", distance: "5.8 km" },
];

const players = ["Felipe", "João", "Anderson", "Você", "Pedro", "Lucas"];

// ─── PRIMITIVES ───────────────────────────────────────────────────────────────

function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  const palette = ["#3d6e50", "#6b5e28", "#5a3e6e", "#28516e", "#6e3e3e", "#3e5a6e"];
  const bg = palette[name.charCodeAt(0) % palette.length];
  const initials = name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <span style={{ color: "#fff", fontSize: size * 0.36, fontWeight: 700 }}>{initials}</span>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { bg: string; color: string; label: string }> = {
    ativa: { bg: "#1a3a25", color: "#4CAF50", label: "Ativa" },
    encerrada: { bg: "#2a2a2a", color: "#888", label: "Encerrada" },
    pendente: { bg: "#3a2e10", color: "#FFC107", label: "Pendente" },
  };
  const c = cfg[status] ?? cfg.pendente;
  return (
    <span style={{ background: c.bg, color: c.color, padding: "3px 10px", borderRadius: 4, fontSize: 11, fontWeight: 700 }}>
      {c.label}
    </span>
  );
}

function Chip({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: CARD, border: `0.5px solid ${BORDER}`, borderRadius: 8, padding: "12px 14px", ...style }}>
      {children}
    </div>
  );
}

function Inp({ placeholder, value, onChange, type = "text" }: { placeholder: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{ width: "100%", background: "#1e2020", border: `0.5px solid ${BORDER}`, borderRadius: 8, padding: 12, color: "#fff", fontSize: 14, outline: "none", boxSizing: "border-box" }}
    />
  );
}

function BtnPrimary({ children, onClick, style = {} }: { children: React.ReactNode; onClick?: () => void; style?: React.CSSProperties }) {
  return (
    <button onClick={onClick} style={{ background: LIME, color: DARK, padding: "12px 24px", borderRadius: 8, border: "none", fontWeight: 700, fontSize: 14, cursor: "pointer", width: "100%", fontFamily: "Inter, sans-serif", ...style }}>
      {children}
    </button>
  );
}

function BtnSecondary({ children, onClick, style = {} }: { children: React.ReactNode; onClick?: () => void; style?: React.CSSProperties }) {
  return (
    <button onClick={onClick} style={{ background: "transparent", color: "#ccc", padding: "12px 24px", borderRadius: 8, border: `0.5px solid ${BORDER}`, fontWeight: 600, fontSize: 14, cursor: "pointer", width: "100%", fontFamily: "Inter, sans-serif", ...style }}>
      {children}
    </button>
  );
}

function BackBtn({ onBack, label }: { onBack: () => void; label: string }) {
  return (
    <button onClick={onBack} style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, marginBottom: 14, padding: 0 }}>
      <ArrowLeft size={17} /> <span style={{ fontSize: 14 }}>{label}</span>
    </button>
  );
}

function SearchBar({ placeholder, value, onChange }: { placeholder: string; value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ position: "relative" }}>
      <Search size={15} color={GRAY} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
      <input
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ width: "100%", background: "#1e2020", border: `0.5px solid ${BORDER}`, borderRadius: 8, padding: "11px 12px 11px 34px", color: "#fff", fontSize: 14, outline: "none", boxSizing: "border-box" }}
      />
    </div>
  );
}

// ─── SPLASH ───────────────────────────────────────────────────────────────────

function SplashScreen({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2400);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: DARK }}>
      <div style={{ marginBottom: 20 }}>
        <svg width="76" height="76" viewBox="0 0 76 76" fill="none">
          <rect x="6" y="14" width="64" height="48" rx="6" fill="#364436" stroke={LIME} strokeWidth="1.5" />
          <rect x="14" y="22" width="48" height="32" rx="3" fill="#1a2c1a" />
          <circle cx="38" cy="38" r="6" fill={LIME} opacity="0.9" />
          <circle cx="27" cy="32" r="3" fill="#fff" opacity="0.65" />
          <circle cx="49" cy="32" r="3" fill="#fff" opacity="0.65" />
          <circle cx="33" cy="44" r="3" fill="#fff" opacity="0.65" />
          <circle cx="43" cy="44" r="3" fill="#fff" opacity="0.65" />
          <circle cx="12" cy="20" r="3" fill="#111" /><circle cx="64" cy="20" r="3" fill="#111" />
          <circle cx="12" cy="56" r="3" fill="#111" /><circle cx="64" cy="56" r="3" fill="#111" />
          <circle cx="38" cy="17" r="2.5" fill="#111" /><circle cx="38" cy="59" r="2.5" fill="#111" />
        </svg>
      </div>
      <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 34, fontWeight: 800, color: LIME, letterSpacing: 3 }}>ENCAÇAPEI</div>
      <div style={{ color: GRAY, fontSize: 12, marginTop: 6, letterSpacing: 2, textTransform: "uppercase" }}>Sinuca entre amigos</div>
      <div style={{ display: "flex", gap: 6, marginTop: 52 }}>
        {[0, 1, 2].map((i) => (
          <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: LIME, animation: `dot ${0.8}s ${i * 0.2}s ease-in-out infinite alternate` }} />
        ))}
      </div>
      <style>{`@keyframes dot { from { opacity: 0.2; transform: scale(0.7); } to { opacity: 1; transform: scale(1.3); } }`}</style>
    </div>
  );
}

// ─── ONBOARDING ───────────────────────────────────────────────────────────────

function OnboardingScreen({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0);
  const slides = [
    { icon: <Trophy size={48} color={LIME} />, title: "Organize suas ligas", desc: "Crie ligas de sinuca, defina regras e acompanhe o ranking em tempo real." },
    { icon: <Users size={48} color={LIME} />, title: "Acompanhe amigos", desc: "Adicione seus parceiros de jogo e veja o histórico de confrontos diretos." },
    { icon: <Share2 size={48} color={LIME} />, title: "Compartilhe resultados", desc: "Divida suas conquistas no WhatsApp, Instagram e muito mais." },
  ];
  const slide = slides[step];
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: DARK, padding: "48px 24px 36px" }}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <div style={{ marginBottom: 32, width: 100, height: 100, borderRadius: "50%", background: CARD, border: `1px solid ${LIME}22`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {slide.icon}
        </div>
        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 28, fontWeight: 700, color: "#fff", textAlign: "center", marginBottom: 12 }}>
          {slide.title}
        </div>
        <div style={{ color: GRAY, fontSize: 14, textAlign: "center", lineHeight: 1.65, maxWidth: 280 }}>{slide.desc}</div>
      </div>
      <div style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 28 }}>
        {slides.map((_, i) => (
          <div key={i} onClick={() => setStep(i)} style={{ width: i === step ? 22 : 6, height: 6, borderRadius: 3, background: i === step ? LIME : "#444", transition: "width 0.3s", cursor: "pointer" }} />
        ))}
      </div>
      {step < slides.length - 1 ? (
        <div style={{ display: "flex", gap: 10 }}>
          <BtnSecondary onClick={onDone} style={{ flex: 1 }}>Pular</BtnSecondary>
          <BtnPrimary onClick={() => setStep((s) => s + 1)} style={{ flex: 2 }}>Próximo</BtnPrimary>
        </div>
      ) : (
        <BtnPrimary onClick={onDone}>Começar →</BtnPrimary>
      )}
    </div>
  );
}

// ─── AUTH ─────────────────────────────────────────────────────────────────────

function AuthScreen({ onDone }: { onDone: () => void }) {
  const [tab, setTab] = useState<"login" | "cadastro">("login");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [step, setStep] = useState(0);
  const [nome, setNome] = useState("");
  const [apelido, setApelido] = useState("");

  const rules = {
    upper: /[A-Z]/.test(senha),
    lower: /[a-z]/.test(senha),
    number: /[0-9]/.test(senha),
    special: /[!@#$%^&*]/.test(senha),
    length: senha.length >= 8,
  };
  const ruleLabels = { upper: "Letra maiúscula", lower: "Letra minúscula", number: "Número", special: "Caractere especial", length: "8+ caracteres" };
  const stepLabels = ["Nome", "Apelido", "Email", "Foto", "Senha", "Revisão"];

  if (tab === "cadastro" && step > 0) {
    return (
      <div style={{ height: "100%", display: "flex", flexDirection: "column", background: DARK, padding: "24px 20px 32px" }}>
        <BackBtn onBack={() => (step === 1 ? setStep(0) : setStep((s) => s - 1))} label="Voltar" />
        <div style={{ display: "flex", gap: 3, marginBottom: 22 }}>
          {stepLabels.map((_, i) => (
            <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i < step ? LIME : "#333" }} />
          ))}
        </div>
        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 24, fontWeight: 700, color: "#fff", marginBottom: 20 }}>
          {stepLabels[step - 1]}
        </div>
        <div style={{ flex: 1 }}>
          {step === 1 && <Inp placeholder="Seu nome completo" value={nome} onChange={setNome} />}
          {step === 2 && <Inp placeholder='ex: Baroni' value={apelido} onChange={setApelido} />}
          {step === 3 && <Inp placeholder="nome@email.com" value={email} onChange={setEmail} />}
          {step === 4 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ background: CARD, border: `0.5px solid ${BORDER}`, borderRadius: 8, padding: 20, display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                <Avatar name={nome || "U"} size={72} />
                <div style={{ color: GRAY, fontSize: 13 }}>Foto de perfil</div>
              </div>
              <BtnPrimary>Escolher da galeria</BtnPrimary>
              <BtnSecondary>Usar foto padrão</BtnSecondary>
            </div>
          )}
          {step === 5 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <Inp placeholder="Senha" value={senha} onChange={setSenha} type="password" />
              <Chip>
                {Object.entries(ruleLabels).map(([k, label]) => {
                  const ok = rules[k as keyof typeof rules];
                  return (
                    <div key={k} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0" }}>
                      <div style={{ width: 16, height: 16, borderRadius: "50%", background: ok ? "#4CAF50" : "#FF6B6B", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Check size={9} color="#fff" />
                      </div>
                      <span style={{ fontSize: 13, color: ok ? "#4CAF50" : "#FF6B6B" }}>{label}</span>
                    </div>
                  );
                })}
              </Chip>
            </div>
          )}
          {step === 6 && (
            <Chip style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[["Nome", nome], ["Apelido", apelido], ["Email", email]].map(([lbl, val]) => (
                <div key={lbl}>
                  <div style={{ color: GRAY, fontSize: 11, marginBottom: 2 }}>{lbl}</div>
                  <div style={{ color: "#fff", fontWeight: 600 }}>{val || "—"}</div>
                </div>
              ))}
            </Chip>
          )}
        </div>
        {step < 6 ? (
          <BtnPrimary onClick={() => setStep((s) => s + 1)}>Próximo →</BtnPrimary>
        ) : (
          <BtnPrimary onClick={onDone}>Criar conta</BtnPrimary>
        )}
      </div>
    );
  }

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: DARK, padding: "44px 20px 36px" }}>
      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 30, fontWeight: 800, color: LIME, letterSpacing: 3 }}>ENCAÇAPEI</div>
        <div style={{ color: GRAY, fontSize: 11, marginTop: 5, letterSpacing: 2, textTransform: "uppercase" }}>Sinuca entre amigos</div>
      </div>
      <div style={{ display: "flex", background: CARD, borderRadius: 8, padding: 4, marginBottom: 24 }}>
        {(["login", "cadastro"] as const).map((t) => (
          <button key={t} onClick={() => { setTab(t); setStep(0); }} style={{ flex: 1, padding: "8px 0", background: tab === t ? LIME : "transparent", color: tab === t ? DARK : GRAY, border: "none", borderRadius: 6, fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
            {t === "login" ? "Login" : "Cadastro"}
          </button>
        ))}
      </div>

      {tab === "login" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 12, flex: 1 }}>
          <Inp placeholder="Email" value={email} onChange={setEmail} />
          <Inp placeholder="Senha" value={senha} onChange={setSenha} type="password" />
          <div style={{ textAlign: "right" }}>
            <span style={{ color: LIME, fontSize: 13, cursor: "pointer" }}>Esqueceu a senha?</span>
          </div>
          <div style={{ flex: 1 }} />
          <BtnPrimary onClick={onDone}>Entrar</BtnPrimary>
          <div style={{ textAlign: "center", color: GRAY, fontSize: 13 }}>
            Não tem conta?{" "}
            <span style={{ color: LIME, cursor: "pointer" }} onClick={() => setTab("cadastro")}>Cadastre-se</span>
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16, flex: 1 }}>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14 }}>
            <div style={{ fontSize: 44 }}>🎱</div>
            <div style={{ color: GRAY, fontSize: 14, textAlign: "center", lineHeight: 1.6 }}>
              Crie sua conta em 6 passos simples e comece a organizar suas ligas de sinuca.
            </div>
          </div>
          <BtnPrimary onClick={() => setStep(1)}>Começar cadastro →</BtnPrimary>
        </div>
      )}
    </div>
  );
}

// ─── HOME ─────────────────────────────────────────────────────────────────────

function HomeScreen({ navigate }: { navigate: (v: string, d?: unknown) => void }) {
  const [chartsOpen, setChartsOpen] = useState(false);
  return (
    <div style={{ height: "100%", overflowY: "auto", background: DARK }}>
      <div style={{ display: "flex", justifyContent: "space-between", padding: "14px 16px 0", color: GRAY, fontSize: 12 }}>
        <span>09:41</span><span>■■■ 100%</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px 16px" }}>
        <Avatar name="Marcelo Souza" size={48} />
        <div style={{ flex: 1 }}>
          <div style={{ color: "#fff", fontWeight: 700, fontSize: 16 }}>Marcelão</div>
          <div style={{ color: GRAY, fontSize: 12 }}>Desde Jan 2025</div>
        </div>
        <button onClick={() => navigate("notificacoes")} style={{ background: "none", border: "none", cursor: "pointer", position: "relative", padding: 4 }}>
          <Bell size={21} color={GRAY} />
          <div style={{ position: "absolute", top: 2, right: 2, width: 8, height: 8, borderRadius: "50%", background: LIME }} />
        </button>
      </div>

      {/* KPI grid */}
      <div style={{ padding: "0 16px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
        {[
          { label: "Partidas jogadas", value: "47", icon: <Target size={15} />, hi: false },
          { label: "Taxa de vitória", value: "62%", icon: <TrendingUp size={15} />, hi: true },
          { label: "Vitórias consec.", value: "5", icon: <Zap size={15} />, hi: false },
          { label: "Maiores derrotas", value: "2", icon: <Award size={15} />, hi: false },
        ].map((k, i) => (
          <Chip key={i} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5, color: GRAY }}>{k.icon}<span style={{ fontSize: 11 }}>{k.label}</span></div>
            <div style={{ fontSize: 24, fontWeight: 700, color: k.hi ? LIME : "#fff", fontFamily: "'Barlow Condensed', sans-serif" }}>{k.value}</div>
          </Chip>
        ))}
      </div>

      {/* Charts collapsible */}
      <div style={{ margin: "0 16px 14px" }}>
        <Chip style={{ padding: 0 }}>
          <button onClick={() => setChartsOpen((o) => !o)} style={{ width: "100%", background: "none", border: "none", color: "#fff", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <TrendingUp size={15} color={LIME} />
              <span style={{ fontWeight: 600, fontSize: 14 }}>Gráficos de Evolução</span>
            </div>
            {chartsOpen ? <ChevronUp size={15} color={GRAY} /> : <ChevronDown size={15} color={GRAY} />}
          </button>
          {chartsOpen && (
            <div style={{ padding: "0 14px 14px", borderTop: `0.5px solid ${BORDER}` }}>
              <div style={{ color: GRAY, fontSize: 11, margin: "12px 0 6px", textTransform: "uppercase", letterSpacing: 1 }}>Taxa de vitória — Últimos 30 dias</div>
              <ResponsiveContainer width="100%" height={170}>
                <LineChart data={winRateData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="d" tick={{ fill: GRAY, fontSize: 11 }} />
                  <YAxis tick={{ fill: GRAY, fontSize: 11 }} domain={[0, 100]} />
                  <Tooltip contentStyle={{ background: CARD, border: `0.5px solid ${BORDER}`, borderRadius: 6 }} labelStyle={{ color: "#fff" }} itemStyle={{ color: LIME }} />
                  <Line type="monotone" dataKey="v" stroke={LIME} strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
              <div style={{ color: GRAY, fontSize: 11, margin: "14px 0 6px", textTransform: "uppercase", letterSpacing: 1 }}>Vitórias / Derrotas por semana</div>
              <ResponsiveContainer width="100%" height={150}>
                <BarChart data={weekData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="w" tick={{ fill: GRAY, fontSize: 11 }} />
                  <YAxis tick={{ fill: GRAY, fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: CARD, border: `0.5px solid ${BORDER}`, borderRadius: 6 }} labelStyle={{ color: "#fff" }} />
                  <Bar dataKey="wins" fill="#4A90D9" name="Vitórias" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="losses" fill="#555" name="Derrotas" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Chip>
      </div>

      {/* Active leagues */}
      <div style={{ padding: "0 16px 24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ color: "#fff", fontWeight: 600, fontSize: 14 }}>Ligas ativas</span>
            <span style={{ color: GRAY, fontSize: 12 }}>3 ligas</span>
          </div>
          <span style={{ color: LIME, fontSize: 13, cursor: "pointer" }} onClick={() => navigate("liga-tab")}>Ver todas</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
          {leagues.map((l) => (
            <Chip key={l.id} style={{ cursor: "pointer" }} onClick={() => navigate("liga-details", l)}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 5 }}>
                <span style={{ fontWeight: 700, fontSize: 15, color: "#fff" }}>{l.name}</span>
                <StatusBadge status={l.status} />
              </div>
              <div style={{ color: GRAY, fontSize: 12 }}>{l.friends} amigos · {l.matches} partidas</div>
              {l.next && <div style={{ color: LIME, fontSize: 12, marginTop: 4 }}>Próxima: {l.next}</div>}
            </Chip>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── AMIGOS ───────────────────────────────────────────────────────────────────

function AmigosScreen({ navigate }: { navigate: (v: string, d?: unknown) => void }) {
  const [subTab, setSubTab] = useState<"amigos" | "convites">("amigos");
  const [search, setSearch] = useState("");
  const [invited, setInvited] = useState<Set<string>>(new Set());

  const searchResults = search.length > 1
    ? [{ id: "99", name: "Carlos Menezes", nick: "Carlão" }, { id: "98", name: "Paulo Ferreira", nick: "Paulinho" }]
    : [];

  return (
    <div style={{ height: "100%", overflowY: "auto", background: DARK, padding: "20px 16px 24px" }}>
      <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 24, fontWeight: 700, color: "#fff", marginBottom: 16 }}>Amigos</div>
      <div style={{ marginBottom: 14 }}><SearchBar placeholder="Buscar amigos..." value={search} onChange={setSearch} /></div>

      {searchResults.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          {searchResults.map((f) => (
            <Chip key={f.id} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <Avatar name={f.name} size={34} />
              <div style={{ flex: 1 }}>
                <div style={{ color: "#fff", fontWeight: 600, fontSize: 14 }}>{f.name}</div>
                <div style={{ color: GRAY, fontSize: 12 }}>@{f.nick}</div>
              </div>
              <button onClick={() => setInvited((s) => new Set([...s, f.id]))} style={{ background: invited.has(f.id) ? "#333" : LIME, color: invited.has(f.id) ? GRAY : DARK, border: "none", borderRadius: 6, padding: "6px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                {invited.has(f.id) ? "Enviado" : "Adicionar"}
              </button>
            </Chip>
          ))}
        </div>
      )}

      <div style={{ display: "flex", background: CARD, borderRadius: 8, padding: 4, marginBottom: 14 }}>
        {(["amigos", "convites"] as const).map((t) => (
          <button key={t} onClick={() => setSubTab(t)} style={{ flex: 1, padding: "7px 0", background: subTab === t ? LIME : "transparent", color: subTab === t ? DARK : GRAY, border: "none", borderRadius: 6, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
            {t === "amigos" ? "Seus Amigos" : "Convites"}
          </button>
        ))}
      </div>

      {subTab === "amigos" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[
            { ...friends[0], you: 6, them: 3, streak: 2, streakWin: true },
            { ...friends[1], you: 4, them: 8, streak: 1, streakWin: false },
            { ...friends[2], you: 3, them: 9, streak: 3, streakWin: false },
            { ...friends[3], you: 7, them: 2, streak: 2, streakWin: true },
          ].map((f) => {
            const total = f.you + f.them;
            const pct = Math.round((f.you / total) * 100);
            return (
              <Chip key={f.id} style={{ cursor: "pointer" }} onClick={() => navigate("h2h", f)}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <Avatar name={f.name} size={38} />
                  <div style={{ flex: 1 }}>
                    <div style={{ color: "#fff", fontWeight: 600, fontSize: 14 }}>{f.name}</div>
                    <div style={{ color: GRAY, fontSize: 12 }}>@{f.nick}</div>
                  </div>
                  {/* H2H score */}
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontFamily: "'Barlow Condensed', sans-serif", display: "flex", alignItems: "baseline", gap: 3 }}>
                      <span style={{ fontSize: 20, fontWeight: 800, color: LIME }}>{f.you}</span>
                      <span style={{ color: "#555", fontSize: 14 }}>–</span>
                      <span style={{ fontSize: 20, fontWeight: 800, color: "#fff" }}>{f.them}</span>
                    </div>
                    <div style={{ color: GRAY, fontSize: 10 }}>{total} partidas</div>
                  </div>
                  <ChevronRight size={14} color={GRAY} />
                </div>
                {/* Win bar + streak */}
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ flex: 1, height: 4, borderRadius: 2, background: "#2a2a2a", overflow: "hidden" }}>
                    <div style={{ width: `${pct}%`, height: "100%", background: pct >= 50 ? LIME : "#FF6B6B66" }} />
                  </div>
                  <span style={{ color: pct >= 50 ? LIME : "#FF6B6B", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{pct}%</span>
                  <span style={{ color: f.streakWin ? "#4CAF50" : "#FF6B6B", fontSize: 10, flexShrink: 0, background: f.streakWin ? "#1a3a2522" : "#3a1a1a22", padding: "2px 6px", borderRadius: 4 }}>
                    {f.streak}{f.streakWin ? "V" : "D"} seq
                  </span>
                </div>
              </Chip>
            );
          })}
        </div>
      ) : (
        <div>
          <Chip style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <Avatar name="Pedro Oliveira" size={36} />
            <div style={{ flex: 1 }}>
              <div style={{ color: "#fff", fontSize: 13, fontWeight: 600 }}>Pedro quer ser seu amigo</div>
              <div style={{ color: GRAY, fontSize: 11 }}>há 3 horas</div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button style={{ background: LIME, color: DARK, border: "none", borderRadius: 6, padding: "6px 10px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>✓</button>
              <button style={{ background: "#333", color: GRAY, border: "none", borderRadius: 6, padding: "6px 10px", fontSize: 12, cursor: "pointer" }}>✗</button>
            </div>
          </Chip>
          <div style={{ color: GRAY, fontSize: 13, textAlign: "center", marginTop: 16 }}>Sem mais convites no momento</div>
        </div>
      )}
    </div>
  );
}

// ─── LIGA ─────────────────────────────────────────────────────────────────────

function LigaScreen({ navigate }: { navigate: (v: string, d?: unknown) => void }) {
  const [search, setSearch] = useState("");
  const ativas = leagues.filter((l) => l.status === "ativa");
  const encerradas = leagues.filter((l) => l.status === "encerrada");

  return (
    <div style={{ height: "100%", position: "relative", background: DARK }}>
      <div style={{ height: "100%", overflowY: "auto", padding: "20px 16px 100px" }}>
        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 24, fontWeight: 700, color: "#fff", marginBottom: 14 }}>Ligas</div>

        {/* Pending invite */}
        <Chip style={{ marginBottom: 14, border: `0.5px solid ${LIME}44` }}>
          <div style={{ color: GRAY, fontSize: 11, marginBottom: 4 }}>Convite pendente</div>
          <div style={{ fontWeight: 700, color: "#fff", marginBottom: 2 }}>Liga Quinta Noturna</div>
          <div style={{ color: GRAY, fontSize: 12, marginBottom: 12 }}>Convidado por Felipe Santos · 1 dia atrás</div>
          <div style={{ display: "flex", gap: 8 }}>
            <BtnPrimary style={{ flex: 1, padding: "8px" }}>Aceitar</BtnPrimary>
            <BtnSecondary style={{ flex: 1, padding: "8px" }}>Recusar</BtnSecondary>
          </div>
        </Chip>

        <div style={{ marginBottom: 14 }}><SearchBar placeholder="Buscar ligas públicas..." value={search} onChange={setSearch} /></div>

        <div style={{ color: GRAY, fontSize: 11, fontWeight: 700, marginBottom: 8, textTransform: "uppercase", letterSpacing: 1.2 }}>Ativas</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
          {ativas.map((l) => (
            <Chip key={l.id} style={{ cursor: "pointer" }} onClick={() => navigate("liga-details", l)}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                <span style={{ fontWeight: 700, fontSize: 15, color: "#fff" }}>{l.name}</span>
                <StatusBadge status={l.status} />
              </div>
              {/* Quick stats */}
              <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                {[
                  { label: "Amigos", val: String(l.friends) },
                  { label: "Partidas", val: String(l.matches) },
                  { label: "Sua pos.", val: "2º" },
                ].map((s) => (
                  <div key={s.label} style={{ flex: 1, background: "#1e2020", borderRadius: 5, padding: "5px 0", textAlign: "center" }}>
                    <div style={{ color: "#fff", fontSize: 13, fontWeight: 700 }}>{s.val}</div>
                    <div style={{ color: GRAY, fontSize: 10 }}>{s.label}</div>
                  </div>
                ))}
              </div>
              {l.next && (
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: LIME }} />
                  <span style={{ color: LIME, fontSize: 12, fontWeight: 600 }}>Próxima: {l.next}</span>
                </div>
              )}
            </Chip>
          ))}
        </div>

        <div style={{ color: GRAY, fontSize: 11, fontWeight: 700, marginBottom: 8, textTransform: "uppercase", letterSpacing: 1.2 }}>Encerradas</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {encerradas.map((l) => (
            <Chip key={l.id} style={{ cursor: "pointer" }} onClick={() => navigate("liga-details", l)}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                <span style={{ fontWeight: 700, fontSize: 15, color: "#aaa" }}>{l.name}</span>
                <StatusBadge status={l.status} />
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                <span style={{ color: GRAY, fontSize: 12 }}>{l.friends} participantes</span>
                <span style={{ color: GRAY, fontSize: 12 }}>{l.matches} partidas</span>
                <span style={{ color: GRAY, fontSize: 12 }}>Posição final: 2º</span>
              </div>
            </Chip>
          ))}
        </div>
      </div>

      {/* FAB */}
      <button onClick={() => navigate("criar-liga")} style={{ position: "absolute", bottom: 16, right: 16, width: 50, height: 50, borderRadius: "50%", background: LIME, color: DARK, border: "none", cursor: "pointer", boxShadow: `0 4px 18px ${LIME}55`, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Plus size={22} />
      </button>
    </div>
  );
}

// ─── LOCAIS ───────────────────────────────────────────────────────────────────

function LocaisScreen() {
  const [selected, setSelected] = useState<(typeof locationData)[0] | null>(null);
  const pins = [{ id: "1", x: 37, y: 32 }, { id: "2", x: 62, y: 54 }, { id: "3", x: 24, y: 63 }];

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: DARK }}>
      <div style={{ padding: "20px 16px 12px", fontFamily: "'Barlow Condensed', sans-serif", fontSize: 24, fontWeight: 700, color: "#fff" }}>Locais</div>

      {/* Map */}
      <div style={{ flex: 1, position: "relative", margin: "0 16px 14px", borderRadius: 10, overflow: "hidden", border: `0.5px solid ${BORDER}` }}>
        <div style={{ position: "absolute", inset: 0, background: "#1a2420" }}>
          <svg width="100%" height="100%" style={{ position: "absolute", inset: 0 }}>
            <defs><pattern id="grid" width="38" height="38" patternUnits="userSpaceOnUse"><path d="M 38 0 L 0 0 0 38" fill="none" stroke="#253025" strokeWidth="0.8" /></pattern></defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
            <line x1="22%" y1="0" x2="22%" y2="100%" stroke="#2a3a2a" strokeWidth="7" />
            <line x1="48%" y1="0" x2="48%" y2="100%" stroke="#2a3a2a" strokeWidth="10" />
            <line x1="74%" y1="0" x2="74%" y2="100%" stroke="#2a3a2a" strokeWidth="6" />
            <line x1="0" y1="28%" x2="100%" y2="28%" stroke="#2a3a2a" strokeWidth="6" />
            <line x1="0" y1="58%" x2="100%" y2="58%" stroke="#2a3a2a" strokeWidth="10" />
            <line x1="0" y1="80%" x2="100%" y2="80%" stroke="#2a3a2a" strokeWidth="4" />
            <rect x="24%" y="2%" width="22%" height="24%" fill="#233023" rx="2" />
            <rect x="50%" y="2%" width="22%" height="24%" fill="#233023" rx="2" />
            <rect x="24%" y="30%" width="22%" height="25%" fill="#233023" rx="2" />
            <rect x="50%" y="30%" width="22%" height="25%" fill="#233023" rx="2" />
            <rect x="5%" y="60%" width="15%" height="18%" fill="#233023" rx="2" />
            <rect x="24%" y="60%" width="22%" height="18%" fill="#233023" rx="2" />
            <rect x="50%" y="60%" width="22%" height="18%" fill="#233023" rx="2" />
          </svg>
          {pins.map((pin) => {
            const loc = locationData.find((l) => l.id === pin.id)!;
            const sel = selected?.id === pin.id;
            return (
              <button key={pin.id} onClick={() => setSelected(sel ? null : loc)} style={{ position: "absolute", left: `${pin.x}%`, top: `${pin.y}%`, transform: "translate(-50%, -100%)", background: "none", border: "none", cursor: "pointer" }}>
                <div style={{ background: sel ? LIME : "#3a5a3a", border: `2px solid ${LIME}`, borderRadius: "50% 50% 50% 0", width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", transform: "rotate(-45deg)", boxShadow: sel ? `0 0 14px ${LIME}88` : "none" }}>
                  <span style={{ transform: "rotate(45deg)", fontSize: 13 }}>🎱</span>
                </div>
              </button>
            );
          })}
        </div>

        {selected && (
          <div style={{ position: "absolute", bottom: 10, left: 10, right: 10, background: CARD, border: `0.5px solid ${BORDER}`, borderRadius: 10, padding: 14 }}>
            <button onClick={() => setSelected(null)} style={{ position: "absolute", top: 10, right: 10, background: "none", border: "none", cursor: "pointer" }}><X size={15} color={GRAY} /></button>
            <div style={{ fontWeight: 700, fontSize: 15, color: "#fff", marginBottom: 4 }}>{selected.name}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 5 }}>
              <Star size={12} color="#FFC107" fill="#FFC107" />
              <span style={{ color: "#fff", fontSize: 13, fontWeight: 600 }}>{selected.rating}</span>
              <span style={{ color: GRAY, fontSize: 12 }}>({selected.reviews})</span>
            </div>
            <div style={{ color: GRAY, fontSize: 12, marginBottom: 2 }}><Clock size={11} style={{ display: "inline", marginRight: 4 }} />{selected.hours}</div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
              <span style={{ color: GRAY, fontSize: 12 }}>{selected.price}</span>
              <span style={{ color: LIME, fontSize: 12, fontWeight: 600 }}>{selected.distance}</span>
            </div>
            <BtnPrimary style={{ padding: "8px" }}>Traçar rota</BtnPrimary>
          </div>
        )}
      </div>

      <div style={{ padding: "0 16px 24px", display: "flex", flexDirection: "column", gap: 8 }}>
        {locationData.map((loc) => (
          <Chip key={loc.id} style={{ display: "flex", alignItems: "center", cursor: "pointer" }} onClick={() => setSelected(loc)}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, color: "#fff", fontSize: 14 }}>{loc.name}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 3 }}>
                <Star size={11} color="#FFC107" fill="#FFC107" />
                <span style={{ color: GRAY, fontSize: 12 }}>{loc.rating} · {loc.distance}</span>
              </div>
            </div>
            <span style={{ color: GRAY, fontSize: 12 }}>{loc.price}</span>
          </Chip>
        ))}
      </div>
    </div>
  );
}

// ─── PERFIL ───────────────────────────────────────────────────────────────────

function PerfilScreen({ navigate }: { navigate: (v: string, d?: unknown) => void }) {
  return (
    <div style={{ height: "100%", overflowY: "auto", background: DARK, padding: "20px 16px 24px" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 28 }}>
        <Avatar name="Marcelo Souza" size={72} />
        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 24, fontWeight: 700, color: "#fff", marginTop: 12 }}>Marcelo Souza</div>
        <div style={{ color: GRAY, fontSize: 13 }}>@Marcelão</div>
        <div style={{ display: "flex", gap: 24, marginTop: 18 }}>
          {[{ val: "47", lbl: "Partidas" }, { val: "62%", lbl: "Vitórias" }, { val: "5", lbl: "Ligas" }].map((s, i, arr) => (
            <div key={s.lbl} style={{ display: "flex", alignItems: "center", gap: 24 }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 24, fontWeight: 700, color: LIME, fontFamily: "'Barlow Condensed', sans-serif" }}>{s.val}</div>
                <div style={{ fontSize: 12, color: GRAY }}>{s.lbl}</div>
              </div>
              {i < arr.length - 1 && <div style={{ width: 1, height: 32, background: BORDER }} />}
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {[
          { icon: <Edit size={17} />, label: "Editar perfil", action: () => navigate("edit-perfil") },
          { icon: <Bell size={17} />, label: "Notificações", action: () => navigate("notificacoes") },
          { icon: <Edit size={17} />, label: "Alterar senha", action: () => {} },
        ].map((item, i) => (
          <button key={i} onClick={item.action} style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", background: CARD, border: `0.5px solid ${BORDER}`, borderRadius: 8, color: "#fff", cursor: "pointer", textAlign: "left" }}>
            <span style={{ color: LIME }}>{item.icon}</span>
            <span style={{ flex: 1, fontSize: 14, fontWeight: 500 }}>{item.label}</span>
            <ChevronRight size={15} color={GRAY} />
          </button>
        ))}
        <button style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", background: "#1c1210", border: "0.5px solid #FF6B6B44", borderRadius: 8, color: "#FF6B6B", cursor: "pointer", marginTop: 8 }}>
          <LogOut size={17} /><span style={{ fontSize: 14, fontWeight: 500 }}>Sair da conta</span>
        </button>
      </div>
    </div>
  );
}

// ─── LIGA DETAILS ─────────────────────────────────────────────────────────────

function LigaDetailsScreen({ league, onBack, navigate }: { league: { name: string; status: string; friends: number; matches: number; next?: string | null }; onBack: () => void; navigate: (v: string, d?: unknown) => void }) {
  const [tab, setTab] = useState<"ranking" | "historico" | "config">("ranking");
  const [filterResult, setFilterResult] = useState<"todos" | "vitorias" | "derrotas">("todos");
  const [filterDay, setFilterDay] = useState("todos");
  const [ruleBolaCaida, setRuleBolaCaida] = useState(true);
  const [ruleFalta, setRuleFalta] = useState(false);
  const [estilo, setEstilo] = useState<"1v1" | "duplas">("1v1");

  const jogatinas = [
    {
      day: "28 jun 2025",
      matches: [
        { time: "20:15", vs: "Felipe", vsNick: "Cangaceiro", result: "Vitória" as const },
        { time: "20:45", vs: "João", vsNick: "Joãozinho", result: "Derrota" as const },
        { time: "21:20", vs: "Anderson", vsNick: "Baroni", result: "Vitória" as const },
      ],
    },
    {
      day: "21 jun 2025",
      matches: [
        { time: "19:30", vs: "Anderson", vsNick: "Baroni", result: "Vitória" as const },
        { time: "20:10", vs: "Felipe", vsNick: "Cangaceiro", result: "Derrota" as const },
        { time: "20:50", vs: "Pedro", vsNick: "Pedrão", result: "Vitória" as const },
        { time: "21:15", vs: "João", vsNick: "Joãozinho", result: "Derrota" as const },
      ],
    },
    {
      day: "14 jun 2025",
      matches: [
        { time: "20:00", vs: "Felipe", vsNick: "Cangaceiro", result: "Derrota" as const },
        { time: "20:40", vs: "Lucas", vsNick: "Luquinhas", result: "Vitória" as const },
      ],
    },
  ];

  const filteredJogatinas = jogatinas
    .filter((j) => filterDay === "todos" || j.day === filterDay)
    .map((j) => ({
      ...j,
      matches: j.matches.filter((m) => {
        if (filterResult === "vitorias") return m.result === "Vitória";
        if (filterResult === "derrotas") return m.result === "Derrota";
        return true;
      }),
    }))
    .filter((j) => j.matches.length > 0);

  const medals = ["🥇", "🥈", "🥉"];
  const posColors = [LIME, "#C0C0C0", "#CD7F32", GRAY];

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: DARK }}>
      {/* Header */}
      <div style={{ padding: "16px 16px 0", flexShrink: 0 }}>
        <BackBtn onBack={onBack} label="Ligas" />

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
          <div>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 24, fontWeight: 700, color: "#fff" }}>{league.name}</div>
            <div style={{ color: GRAY, fontSize: 12 }}>{league.friends} participantes · {league.matches} partidas</div>
          </div>
          <StatusBadge status={league.status} />
        </div>

        {/* Quick stats row */}
        <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
          {[
            { label: "Sua posição", value: "2º" },
            { label: "Aproveit.", value: "67%" },
            { label: "Próxima", value: league.next ?? "—" },
          ].map((s) => (
            <div key={s.label} style={{ flex: 1, background: "#1e2020", borderRadius: 6, padding: "7px 8px", textAlign: "center" }}>
              <div style={{ color: LIME, fontSize: 13, fontWeight: 700 }}>{s.value}</div>
              <div style={{ color: GRAY, fontSize: 10 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", borderBottom: `1px solid ${BORDER}` }}>
          {(["ranking", "historico", "config"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} style={{ flex: 1, padding: "10px 0", background: "none", border: "none", cursor: "pointer", color: tab === t ? LIME : GRAY, fontSize: 13, fontWeight: tab === t ? 700 : 400, borderBottom: tab === t ? `2px solid ${LIME}` : "2px solid transparent" }}>
              {t === "historico" ? "Histórico" : t === "config" ? "Config" : "Ranking"}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px 20px" }}>

        {/* ── RANKING ── */}
        {tab === "ranking" && (
          <div>
            {/* Top 3 podium */}
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "center", gap: 8, marginBottom: 20 }}>
              {[rankingData[1], rankingData[0], rankingData[2]].map((p, i) => {
                const actualPos = i === 0 ? 2 : i === 1 ? 1 : 3;
                const heights = [80, 100, 68];
                return (
                  <div key={p.pos} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <div style={{ fontSize: 18, marginBottom: 4 }}>{medals[actualPos - 1]}</div>
                    <Avatar name={p.name} size={actualPos === 1 ? 40 : 34} />
                    <div style={{ color: p.name === "Você" ? LIME : "#fff", fontSize: 12, fontWeight: 700, marginTop: 5 }}>{p.name}</div>
                    <div style={{ color: GRAY, fontSize: 10 }}>{p.pct}%</div>
                    <div style={{ width: "100%", height: heights[i], marginTop: 6, borderRadius: "4px 4px 0 0", background: actualPos === 1 ? `${LIME}33` : "#ffffff0a", border: `0.5px solid ${actualPos === 1 ? LIME + "66" : BORDER}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 22, fontWeight: 800, color: posColors[actualPos - 1] }}>{actualPos}º</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Full table */}
            <div style={{ background: CARD, border: `0.5px solid ${BORDER}`, borderRadius: 8, overflow: "hidden", marginBottom: 16 }}>
              <div style={{ display: "flex", padding: "8px 12px", borderBottom: `0.5px solid ${BORDER}` }}>
                <span style={{ width: 24, color: GRAY, fontSize: 11, fontWeight: 700 }}>#</span>
                <span style={{ flex: 1, color: GRAY, fontSize: 11, fontWeight: 700 }}>Jogador</span>
                <span style={{ width: 28, textAlign: "center", color: GRAY, fontSize: 11, fontWeight: 700 }}>V</span>
                <span style={{ width: 28, textAlign: "center", color: GRAY, fontSize: 11, fontWeight: 700 }}>D</span>
                <span style={{ width: 42, textAlign: "right", color: GRAY, fontSize: 11, fontWeight: 700 }}>%</span>
              </div>
              {rankingData.map((p, i) => (
                <div key={p.pos} style={{ display: "flex", alignItems: "center", padding: "10px 12px", background: p.name === "Você" ? `${LIME}0a` : i % 2 === 0 ? "transparent" : "#ffffff04", borderLeft: p.name === "Você" ? `2px solid ${LIME}` : "2px solid transparent" }}>
                  <span style={{ width: 24, color: p.pos <= 3 ? posColors[p.pos - 1] : GRAY, fontWeight: 700, fontSize: 14 }}>
                    {p.pos <= 3 ? medals[p.pos - 1] : p.pos}
                  </span>
                  <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8 }}>
                    <Avatar name={p.name} size={26} />
                    <div>
                      <div style={{ color: p.name === "Você" ? LIME : "#fff", fontSize: 13, fontWeight: 600 }}>{p.name}</div>
                      <div style={{ color: GRAY, fontSize: 10 }}>@{p.nick}</div>
                    </div>
                  </div>
                  {/* Mini bar */}
                  <div style={{ width: 28, textAlign: "center", color: "#4CAF50", fontSize: 13, fontWeight: 600 }}>{p.wins}</div>
                  <div style={{ width: 28, textAlign: "center", color: "#FF6B6B", fontSize: 13, fontWeight: 600 }}>{p.losses}</div>
                  <div style={{ width: 42, textAlign: "right" }}>
                    <span style={{ color: LIME, fontSize: 13, fontWeight: 700 }}>{p.pct}%</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Aproveitamento bars */}
            <Chip style={{ marginBottom: 16 }}>
              <div style={{ color: GRAY, fontSize: 11, marginBottom: 10, textTransform: "uppercase", letterSpacing: 1 }}>Aproveitamento</div>
              {rankingData.map((p) => (
                <div key={p.pos} style={{ marginBottom: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                    <span style={{ color: p.name === "Você" ? LIME : "#ccc", fontSize: 12 }}>{p.name}</span>
                    <span style={{ color: LIME, fontSize: 12, fontWeight: 700 }}>{p.pct}%</span>
                  </div>
                  <div style={{ height: 5, borderRadius: 3, background: "#2a2a2a", overflow: "hidden" }}>
                    <div style={{ width: `${p.pct}%`, height: "100%", background: p.name === "Você" ? LIME : "#4A90D9", borderRadius: 3 }} />
                  </div>
                </div>
              ))}
            </Chip>

            {league.status === "ativa" && (
              <BtnPrimary onClick={() => navigate("match-1", league)}>🎱 Iniciar Partida</BtnPrimary>
            )}
          </div>
        )}

        {/* ── HISTÓRICO ── */}
        {tab === "historico" && (
          <div>
            {/* Filters */}
            <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
              <select
                value={filterDay}
                onChange={(e) => setFilterDay(e.target.value)}
                style={{ flex: 1, background: CARD, border: `0.5px solid ${BORDER}`, borderRadius: 6, color: "#fff", padding: "7px 10px", fontSize: 12, cursor: "pointer", outline: "none" }}
              >
                <option value="todos">Todos os dias</option>
                {jogatinas.map((j) => <option key={j.day} value={j.day}>{j.day}</option>)}
              </select>
              <div style={{ display: "flex", gap: 4 }}>
                {(["todos", "vitorias", "derrotas"] as const).map((f) => (
                  <button key={f} onClick={() => setFilterResult(f)} style={{ padding: "6px 8px", background: filterResult === f ? LIME : CARD, color: filterResult === f ? DARK : GRAY, border: `0.5px solid ${filterResult === f ? LIME : BORDER}`, borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                    {f === "todos" ? "Todos" : f === "vitorias" ? "✓" : "✗"}
                  </button>
                ))}
              </div>
            </div>

            {filteredJogatinas.map((j, ji) => {
              const wins = j.matches.filter((m) => m.result === "Vitória").length;
              const losses = j.matches.filter((m) => m.result === "Derrota").length;
              return (
                <div key={ji} style={{ marginBottom: 16 }}>
                  {/* Day header */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 7 }}>
                    <div>
                      <div style={{ color: "#fff", fontSize: 14, fontWeight: 700 }}>{j.day}</div>
                      <div style={{ color: GRAY, fontSize: 11 }}>{j.matches.length} partidas disputadas</div>
                    </div>
                    <div style={{ background: wins > losses ? "#1a3a25" : "#3a1a1a", borderRadius: 6, padding: "4px 10px", display: "flex", gap: 6 }}>
                      <span style={{ color: "#4CAF50", fontSize: 12, fontWeight: 700 }}>{wins}V</span>
                      <span style={{ color: GRAY, fontSize: 12 }}>/</span>
                      <span style={{ color: "#FF6B6B", fontSize: 12, fontWeight: 700 }}>{losses}D</span>
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {j.matches.map((m, mi) => (
                      <div key={mi} style={{ display: "flex", alignItems: "center", padding: "9px 12px", background: CARD, borderRadius: 7, border: `0.5px solid ${BORDER}`, borderLeft: `2px solid ${m.result === "Vitória" ? "#4CAF50" : "#FF6B6B"}` }}>
                        <span style={{ color: GRAY, fontSize: 11, width: 38 }}>{m.time}</span>
                        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 7 }}>
                          <Avatar name={m.vs} size={22} />
                          <div>
                            <div style={{ color: "#fff", fontSize: 13, fontWeight: 600 }}>vs {m.vs}</div>
                            <div style={{ color: GRAY, fontSize: 10 }}>@{m.vsNick}</div>
                          </div>
                        </div>
                        <span style={{ padding: "3px 9px", borderRadius: 4, fontSize: 11, fontWeight: 700, background: m.result === "Vitória" ? "#1a3a25" : "#3a1a1a", color: m.result === "Vitória" ? "#4CAF50" : "#FF6B6B" }}>
                          {m.result}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── CONFIG ── */}
        {tab === "config" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <div style={{ color: GRAY, fontSize: 12, marginBottom: 6 }}>Nome da liga</div>
              <Inp placeholder="Nome da liga" value={league.name} onChange={() => {}} />
            </div>
            <div>
              <div style={{ color: GRAY, fontSize: 12, marginBottom: 6 }}>Local</div>
              <Inp placeholder="Local" value="Bar do Zé" onChange={() => {}} />
            </div>
            <div>
              <div style={{ color: GRAY, fontSize: 12, marginBottom: 8 }}>Estilo de jogo</div>
              <div style={{ display: "flex", gap: 8 }}>
                {(["1v1", "duplas"] as const).map((e) => (
                  <button key={e} onClick={() => setEstilo(e)} style={{ flex: 1, padding: 9, background: estilo === e ? LIME : "#333", color: estilo === e ? DARK : GRAY, border: "none", borderRadius: 6, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                    {e === "1v1" ? "1v1" : "Duplas"}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ background: CARD, border: `0.5px solid ${BORDER}`, borderRadius: 8 }}>
              <div style={{ padding: "10px 14px", color: GRAY, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, borderBottom: `0.5px solid ${BORDER}` }}>Regras</div>
              {[
                { label: "Marca bola caída?", desc: "Ponto ao encaçapar bola do adversário", state: ruleBolaCaida, set: setRuleBolaCaida },
                { label: "Marca falta?", desc: "Desconta ponto ao cometer falta", state: ruleFalta, set: setRuleFalta },
              ].map((r, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", borderBottom: i === 0 ? `0.5px solid ${BORDER}` : "none" }}>
                  <div>
                    <div style={{ color: "#fff", fontSize: 14 }}>{r.label}</div>
                    <div style={{ color: GRAY, fontSize: 11, marginTop: 2 }}>{r.desc}</div>
                  </div>
                  <div onClick={() => r.set(!r.state)} style={{ width: 44, height: 24, borderRadius: 12, background: r.state ? LIME : "#444", position: "relative", cursor: "pointer", transition: "background 0.2s", flexShrink: 0 }}>
                    <div style={{ position: "absolute", top: 2, left: r.state ? 22 : 2, width: 20, height: 20, borderRadius: "50%", background: r.state ? DARK : "#888", transition: "left 0.2s" }} />
                  </div>
                </div>
              ))}
            </div>

            <div>
              <div style={{ color: GRAY, fontSize: 12, marginBottom: 6 }}>Horário de início</div>
              <Inp placeholder="20:00" value="20:00" onChange={() => {}} />
            </div>
            <div>
              <div style={{ color: GRAY, fontSize: 12, marginBottom: 6 }}>Horário de fim</div>
              <Inp placeholder="23:00" value="23:00" onChange={() => {}} />
            </div>

            <div style={{ marginTop: 4 }}><BtnPrimary>Salvar alterações</BtnPrimary></div>

            <div style={{ paddingTop: 4, display: "flex", flexDirection: "column", gap: 8, borderTop: `0.5px solid ${BORDER}` }}>
              <button style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "11px", background: "transparent", border: `0.5px solid ${BORDER}`, borderRadius: 8, color: "#ccc", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                <Users size={15} /> Convidar mais amigos
              </button>
              <button style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "11px", background: "#1c1210", border: "0.5px solid #FF6B6B44", borderRadius: 8, color: "#FF6B6B", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                Encerrar liga
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── H2H ─────────────────────────────────────────────────────────────────────

function H2HScreen({ friend, onBack }: { friend: { name: string; nick: string }; onBack: () => void }) {
  const [tab, setTab] = useState<"geral" | "liga" | "detalhes">("geral");
  const [filterResult, setFilterResult] = useState<"todos" | "vitorias" | "derrotas">("todos");
  const [filterLiga, setFilterLiga] = useState("todas");

  const sessions = [
    {
      date: "29 jun 2025", liga: "Liga Terça",
      matches: [{ you: 1, them: 0, time: "20:15" }, { you: 0, them: 1, time: "20:40" }, { you: 1, them: 0, time: "21:05" }],
    },
    {
      date: "22 jun 2025", liga: "Liga Terça",
      matches: [{ you: 0, them: 1, time: "20:20" }, { you: 1, them: 0, time: "20:50" }],
    },
    {
      date: "15 jun 2025", liga: "Ranking Geral",
      matches: [{ you: 1, them: 0, time: "19:30" }, { you: 1, them: 0, time: "20:00" }, { you: 0, them: 1, time: "20:25" }],
    },
    {
      date: "08 jun 2025", liga: "Ranking Geral",
      matches: [{ you: 1, them: 0, time: "19:45" }, { you: 0, them: 1, time: "20:10" }],
    },
  ];

  const allMatches = sessions.flatMap((s) => s.matches.map((m) => ({ ...m, date: s.date, liga: s.liga })));
  const totalYou = allMatches.filter((m) => m.you > m.them).length;
  const totalThem = allMatches.filter((m) => m.them > m.you).length;
  const total = allMatches.length;
  const youPct = Math.round((totalYou / total) * 100);

  const byLeague = ["Liga Terça", "Ranking Geral"].map((name) => {
    const lm = allMatches.filter((m) => m.liga === name);
    const y = lm.filter((m) => m.you > m.them).length;
    const t2 = lm.filter((m) => m.them > m.you).length;
    return { name, you: y, them: t2, total: lm.length };
  }).filter((l) => l.total > 0);

  const streak = (() => {
    let s = 0;
    const last = [...allMatches].reverse();
    if (!last[0]) return { count: 0, win: true };
    const firstWin = last[0].you > last[0].them;
    for (const m of last) { if ((m.you > m.them) === firstWin) s++; else break; }
    return { count: s, win: firstWin };
  })();

  const filteredSessions = sessions
    .filter((s) => filterLiga === "todas" || s.liga === filterLiga)
    .map((s) => ({
      ...s,
      matches: s.matches.filter((m) => {
        if (filterResult === "vitorias") return m.you > m.them;
        if (filterResult === "derrotas") return m.them > m.you;
        return true;
      }),
    }))
    .filter((s) => s.matches.length > 0);

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: DARK }}>
      {/* Fixed header section */}
      <div style={{ padding: "16px 16px 0", flexShrink: 0 }}>
        <BackBtn onBack={onBack} label="Amigos" />

        {/* Versus banner */}
        <div style={{ display: "flex", alignItems: "center", marginBottom: 14 }}>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
            <Avatar name="Marcelo Souza" size={48} />
            <div style={{ color: LIME, fontWeight: 700, fontSize: 13, marginTop: 6 }}>Você</div>
            <div style={{ color: GRAY, fontSize: 11 }}>@Marcelão</div>
          </div>
          <div style={{ flex: 1.5, textAlign: "center" }}>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 48, fontWeight: 800, lineHeight: 1, display: "flex", alignItems: "baseline", justifyContent: "center", gap: 6 }}>
              <span style={{ color: LIME }}>{totalYou}</span>
              <span style={{ color: "#444", fontSize: 28 }}>–</span>
              <span style={{ color: "#fff" }}>{totalThem}</span>
            </div>
            <div style={{ color: GRAY, fontSize: 11, marginTop: 2 }}>{total} partidas</div>
          </div>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
            <Avatar name={friend.name} size={48} />
            <div style={{ color: "#fff", fontWeight: 700, fontSize: 13, marginTop: 6 }}>{friend.name.split(" ")[0]}</div>
            <div style={{ color: GRAY, fontSize: 11 }}>@{friend.nick}</div>
          </div>
        </div>

        {/* Win bar */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ height: 7, borderRadius: 4, background: "#333", overflow: "hidden", display: "flex" }}>
            <div style={{ width: `${youPct}%`, background: LIME, transition: "width 0.5s", borderRadius: "4px 0 0 4px" }} />
            <div style={{ flex: 1, background: "#FF6B6B44" }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
            <span style={{ color: LIME, fontSize: 11, fontWeight: 700 }}>{youPct}% você</span>
            <span style={{ color: "#888", fontSize: 11 }}>{100 - youPct}% {friend.name.split(" ")[0]}</span>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", borderBottom: `1px solid ${BORDER}` }}>
          {(["geral", "liga", "detalhes"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} style={{ flex: 1, padding: "9px 0", background: "none", border: "none", cursor: "pointer", color: tab === t ? LIME : GRAY, fontSize: 12, fontWeight: tab === t ? 700 : 400, borderBottom: tab === t ? `2px solid ${LIME}` : "2px solid transparent" }}>
              {t === "geral" ? "Geral" : t === "liga" ? "Por Liga" : "Detalhes"}
            </button>
          ))}
        </div>
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px 20px" }}>
        {tab === "geral" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {[
                { label: "Total de partidas", value: String(total) },
                { label: "Taxa de vitória", value: `${youPct}%`, hi: true },
                { label: "Maior sequência", value: "3V" },
                { label: "Sequência atual", value: `${streak.count}${streak.win ? "V" : "D"}`, hi: streak.win },
              ].map((k, i) => (
                <Chip key={i} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <div style={{ color: GRAY, fontSize: 11 }}>{k.label}</div>
                  <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 28, fontWeight: 800, color: k.hi ? LIME : "#fff" }}>{k.value}</div>
                </Chip>
              ))}
            </div>

            {/* Session bar chart */}
            <Chip>
              <div style={{ color: GRAY, fontSize: 11, marginBottom: 10, textTransform: "uppercase", letterSpacing: 1 }}>Resultado por jogatina</div>
              <div style={{ display: "flex", gap: 5, height: 52, alignItems: "flex-end" }}>
                {sessions.map((s, i) => {
                  const sy = s.matches.filter((m) => m.you > m.them).length;
                  const st = s.matches.filter((m) => m.them > m.you).length;
                  const won = sy >= st;
                  return (
                    <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                      <div style={{ width: "100%", borderRadius: 4, background: won ? LIME : "#FF6B6B", display: "flex", alignItems: "center", justifyContent: "center", height: 34 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: won ? DARK : "#fff" }}>{sy}–{st}</span>
                      </div>
                      <div style={{ color: GRAY, fontSize: 9, textAlign: "center", lineHeight: 1.2 }}>
                        {s.date.split(" ").slice(0, 2).join(" ")}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Chip>

            {/* Last match */}
            <Chip>
              <div style={{ color: GRAY, fontSize: 11, marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>Última partida</div>
              <div style={{ display: "flex", alignItems: "center" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ color: "#fff", fontSize: 13, fontWeight: 600 }}>{sessions[0].date}</div>
                  <div style={{ color: GRAY, fontSize: 12 }}>{sessions[0].liga}</div>
                </div>
                <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 22, fontWeight: 800 }}>
                  <span style={{ color: LIME }}>{sessions[0].matches.filter((m) => m.you > m.them).length}</span>
                  <span style={{ color: "#555" }}> – </span>
                  <span style={{ color: "#fff" }}>{sessions[0].matches.filter((m) => m.them > m.you).length}</span>
                </div>
              </div>
            </Chip>
          </div>
        )}

        {tab === "liga" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {byLeague.map((l) => {
              const pct = Math.round((l.you / l.total) * 100);
              return (
                <Chip key={l.name}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                    <div>
                      <div style={{ color: "#fff", fontWeight: 700, fontSize: 14 }}>{l.name}</div>
                      <div style={{ color: GRAY, fontSize: 12 }}>{l.total} partidas disputadas</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontFamily: "'Barlow Condensed', sans-serif", display: "flex", alignItems: "baseline", gap: 4 }}>
                        <span style={{ fontSize: 26, fontWeight: 800, color: LIME }}>{l.you}</span>
                        <span style={{ color: "#555", fontSize: 16 }}>–</span>
                        <span style={{ fontSize: 26, fontWeight: 800, color: "#fff" }}>{l.them}</span>
                      </div>
                    </div>
                  </div>
                  <div style={{ height: 6, borderRadius: 3, background: "#2a2a2a", overflow: "hidden", marginBottom: 6 }}>
                    <div style={{ width: `${pct}%`, height: "100%", background: `linear-gradient(90deg, ${LIME}, ${LIME}99)`, borderRadius: 3 }} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: LIME, fontSize: 12, fontWeight: 600 }}>{pct}% aproveitamento</span>
                    <div style={{ display: "flex", gap: 10 }}>
                      <span style={{ color: "#4CAF50", fontSize: 12 }}>{l.you}V</span>
                      <span style={{ color: "#FF6B6B", fontSize: 12 }}>{l.them}D</span>
                    </div>
                  </div>
                </Chip>
              );
            })}
          </div>
        )}

        {tab === "detalhes" && (
          <div>
            {/* Filters */}
            <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
              <select
                value={filterLiga}
                onChange={(e) => setFilterLiga(e.target.value)}
                style={{ flex: 1, background: CARD, border: `0.5px solid ${BORDER}`, borderRadius: 6, color: "#fff", padding: "7px 10px", fontSize: 12, cursor: "pointer", outline: "none" }}
              >
                <option value="todas">Todas as ligas</option>
                <option value="Liga Terça">Liga Terça</option>
                <option value="Ranking Geral">Ranking Geral</option>
              </select>
              <div style={{ display: "flex", gap: 4 }}>
                {(["todos", "vitorias", "derrotas"] as const).map((f) => (
                  <button key={f} onClick={() => setFilterResult(f)} style={{ padding: "6px 9px", background: filterResult === f ? LIME : CARD, color: filterResult === f ? DARK : GRAY, border: `0.5px solid ${filterResult === f ? LIME : BORDER}`, borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                    {f === "todos" ? "Todos" : f === "vitorias" ? "✓ V" : "✗ D"}
                  </button>
                ))}
              </div>
            </div>

            {filteredSessions.map((s, si) => {
              const sy = s.matches.filter((m) => m.you > m.them).length;
              const st = s.matches.filter((m) => m.them > m.you).length;
              return (
                <div key={si} style={{ marginBottom: 16 }}>
                  {/* Day header */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 7 }}>
                    <div>
                      <div style={{ color: "#fff", fontSize: 13, fontWeight: 700 }}>{s.date}</div>
                      <div style={{ color: GRAY, fontSize: 11 }}>{s.liga}</div>
                    </div>
                    <div style={{ background: sy > st ? "#1a3a25" : "#3a1a1a", borderRadius: 6, padding: "3px 10px" }}>
                      <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 14, fontWeight: 800, color: sy > st ? LIME : "#FF6B6B" }}>
                        Você {sy}–{st}
                      </span>
                    </div>
                  </div>
                  {/* Individual matches */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    {s.matches.map((m, mi) => (
                      <div key={mi} style={{ display: "flex", alignItems: "center", padding: "8px 10px", background: CARD, borderRadius: 6, border: `0.5px solid ${BORDER}` }}>
                        <span style={{ color: GRAY, fontSize: 11, width: 36 }}>{m.time}</span>
                        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                          <Avatar name="Marcelo" size={20} />
                          <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 20, fontWeight: 800, color: LIME }}>{m.you}</span>
                          <span style={{ color: "#444", fontSize: 14 }}>×</span>
                          <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 20, fontWeight: 800, color: "#fff" }}>{m.them}</span>
                          <Avatar name={friend.name} size={20} />
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 700, color: m.you > m.them ? "#4CAF50" : "#FF6B6B", width: 44, textAlign: "right" }}>
                          {m.you > m.them ? "Vitória" : "Derrota"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── MATCH SCREENS ────────────────────────────────────────────────────────────

function MatchScreen1({ league, onBack, onNext }: { league: { name: string }; onBack: () => void; onNext: (p: string) => void }) {
  const [sel, setSel] = useState<string | null>(null);
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: DARK }}>
      <div style={{ padding: "16px 16px 0" }}>
        <BackBtn onBack={onBack} label="Liga" />
        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 24, fontWeight: 700, color: "#fff", marginBottom: 4 }}>Iniciar Partida</div>
        <div style={{ color: GRAY, fontSize: 13, marginBottom: 14 }}>{league.name} · Quem vai jogar?</div>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "0 16px", display: "flex", flexDirection: "column", gap: 8 }}>
        {players.map((p) => (
          <Chip key={p} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", border: `0.5px solid ${sel === p ? LIME : BORDER}` }} onClick={() => setSel(p)}>
            <Avatar name={p} size={34} />
            <span style={{ flex: 1, color: "#fff", fontWeight: 600 }}>{p}</span>
            {sel === p && <Check size={16} color={LIME} />}
          </Chip>
        ))}
      </div>
      <div style={{ padding: 16 }}>
        <BtnPrimary onClick={() => sel && onNext(sel)} style={{ opacity: sel ? 1 : 0.45 }}>Próximo →</BtnPrimary>
      </div>
    </div>
  );
}

function MatchScreen2({ league, player1, onBack, onStart }: { league: { name: string }; player1: string; onBack: () => void; onStart: (p: string) => void }) {
  const [sel, setSel] = useState<string | null>(null);
  const others = players.filter((p) => p !== player1);
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: DARK }}>
      <div style={{ padding: "16px 16px 0" }}>
        <BackBtn onBack={onBack} label="Voltar" />
        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 24, fontWeight: 700, color: "#fff", marginBottom: 14 }}>Vs quem?</div>
        <Chip style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, border: `0.5px solid ${LIME}55` }}>
          <Avatar name={player1} size={34} />
          <span style={{ color: LIME, fontWeight: 700 }}>{player1}</span>
          <span style={{ color: GRAY, fontSize: 12 }}>Jogador 1</span>
        </Chip>
        <div style={{ textAlign: "center", color: GRAY, fontWeight: 700, fontSize: 18, margin: "8px 0" }}>VS</div>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "0 16px", display: "flex", flexDirection: "column", gap: 8 }}>
        {others.map((p) => (
          <Chip key={p} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", border: `0.5px solid ${sel === p ? LIME : BORDER}` }} onClick={() => setSel(p)}>
            <Avatar name={p} size={34} />
            <span style={{ flex: 1, color: "#fff", fontWeight: 600 }}>{p}</span>
            {sel === p && <Check size={16} color={LIME} />}
          </Chip>
        ))}
      </div>
      <div style={{ padding: 16 }}>
        <BtnPrimary onClick={() => sel && onStart(sel)} style={{ opacity: sel ? 1 : 0.45 }}>Começar partida</BtnPrimary>
      </div>
    </div>
  );
}

function MatchPlayingScreen({ league, player1, player2, onResult }: { league: { name: string }; player1: string; player2: string; onResult: () => void }) {
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: DARK, padding: "20px 16px" }}>
      <div style={{ color: LIME, fontSize: 13, fontWeight: 700, marginBottom: 2 }}>{league.name}</div>
      <div style={{ color: GRAY, fontSize: 12, marginBottom: 28 }}>Dia de jogatina · 09/07/2025</div>
      <div style={{ display: "flex", justifyContent: "space-around", alignItems: "center", flex: 1 }}>
        <div style={{ textAlign: "center" }}>
          <Avatar name={player1} size={72} />
          <div style={{ color: LIME, fontWeight: 700, fontSize: 16, marginTop: 10 }}>{player1}</div>
          <div style={{ color: GRAY, fontSize: 12, marginTop: 4 }}>3 vitórias hoje</div>
        </div>
        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 38, fontWeight: 700, color: "#555" }}>VS</div>
        <div style={{ textAlign: "center" }}>
          <Avatar name={player2} size={72} />
          <div style={{ color: "#fff", fontWeight: 700, fontSize: 16, marginTop: 10 }}>{player2}</div>
          <div style={{ color: GRAY, fontSize: 12, marginTop: 4 }}>2 vitórias hoje</div>
        </div>
      </div>
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <div style={{ color: GRAY, fontSize: 12, marginBottom: 8 }}>Bolas restantes</div>
        <div style={{ display: "flex", justifyContent: "center", gap: 7 }}>
          {[1, 2, 3, 4, 5, 6, 7].map((n) => (
            <div key={n} style={{ width: 30, height: 30, borderRadius: "50%", background: n <= 4 ? LIME : "#2e2e2e", border: n <= 4 ? "none" : `1px solid #444`, display: "flex", alignItems: "center", justifyContent: "center", color: n <= 4 ? DARK : "#555", fontSize: 12, fontWeight: 700 }}>{n}</div>
          ))}
        </div>
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        <BtnPrimary onClick={onResult} style={{ flex: 1, padding: 14 }}>{player1} Venceu 🏆</BtnPrimary>
        <BtnSecondary onClick={onResult} style={{ flex: 1, padding: 14 }}>{player2} Venceu</BtnSecondary>
      </div>
    </div>
  );
}

// ─── NOTIFICATIONS ────────────────────────────────────────────────────────────

function NotificacoesScreen({ onBack }: { onBack: () => void }) {
  const [notifs, setNotifs] = useState(notifData);
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: DARK }}>
      <div style={{ padding: "16px 16px 0" }}>
        <BackBtn onBack={onBack} label="Perfil" />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 24, fontWeight: 700, color: "#fff" }}>Notificações</div>
          <button onClick={() => setNotifs((n) => n.map((x) => ({ ...x, read: true })))} style={{ background: "none", border: "none", color: GRAY, fontSize: 12, cursor: "pointer" }}>
            Limpar tudo
          </button>
        </div>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "0 16px 20px", display: "flex", flexDirection: "column", gap: 8 }}>
        {notifs.map((n) => {
          const iconMap: Record<string, React.ReactNode> = {
            liga: <Trophy size={14} color={LIME} />,
            amigo: <Users size={14} color="#4A90D9" />,
            jogatina: <Clock size={14} color="#B45FFF" />,
          };
          const bgMap: Record<string, string> = { liga: "#1a3a25", amigo: "#1a2a3a", jogatina: "#2a1a3a" };
          return (
            <Chip key={n.id} style={{ opacity: n.read ? 0.55 : 1 }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: bgMap[n.type], display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {iconMap[n.type]}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ color: "#fff", fontSize: 13, fontWeight: n.read ? 400 : 600, lineHeight: 1.45 }}>{n.text}</div>
                  <div style={{ color: GRAY, fontSize: 11, marginTop: 2 }}>{n.time}</div>
                </div>
                {!n.read && <div style={{ width: 7, height: 7, borderRadius: "50%", background: LIME, flexShrink: 0, marginTop: 5 }} />}
              </div>
              {!n.read && n.type !== "jogatina" && (
                <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                  <button style={{ flex: 1, padding: 7, background: LIME, color: DARK, border: "none", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Aceitar</button>
                  <button style={{ flex: 1, padding: 7, background: "#333", color: GRAY, border: "none", borderRadius: 6, fontSize: 12, cursor: "pointer" }}>Recusar</button>
                </div>
              )}
            </Chip>
          );
        })}
      </div>
    </div>
  );
}

// ─── CRIAR LIGA ───────────────────────────────────────────────────────────────

function CriarLigaScreen({ onBack, onDone }: { onBack: () => void; onDone: () => void }) {
  const [step, setStep] = useState(1);
  const [nome, setNome] = useState("");
  const [local, setLocal] = useState("");
  const [duracao, setDuracao] = useState<"dia" | "6meses" | "infinita">("infinita");
  const dias = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
  const [diasSel, setDiasSel] = useState<Set<number>>(new Set([1, 3]));

  const toggleDia = (i: number) => setDiasSel((s) => { const n = new Set(s); n.has(i) ? n.delete(i) : n.add(i); return n; });

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: DARK }}>
      <div style={{ padding: "16px 16px 0" }}>
        <BackBtn onBack={step === 1 ? onBack : () => setStep((s) => s - 1)} label={step === 1 ? "Ligas" : "Voltar"} />
        <div style={{ display: "flex", gap: 4, marginBottom: 20 }}>
          {[1, 2, 3, 4].map((s) => (<div key={s} style={{ flex: 1, height: 3, borderRadius: 2, background: s <= step ? LIME : "#333" }} />))}
        </div>
        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 24, fontWeight: 700, color: "#fff", marginBottom: 20 }}>
          {["Dados básicos", "Duração", "Regras", "Convites"][step - 1]}
        </div>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "0 16px" }}>
        {step === 1 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div><div style={{ color: GRAY, fontSize: 12, marginBottom: 6 }}>Nome da liga</div><Inp placeholder="Ex: Liga Terça" value={nome} onChange={setNome} /></div>
            <div><div style={{ color: GRAY, fontSize: 12, marginBottom: 6 }}>Local</div><Inp placeholder="Buscar local..." value={local} onChange={setLocal} /></div>
            <div>
              <div style={{ color: GRAY, fontSize: 12, marginBottom: 8 }}>Duração</div>
              {(["dia", "6meses", "infinita"] as const).map((d) => (
                <button key={d} onClick={() => setDuracao(d)} style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "10px 14px", background: duracao === d ? `${LIME}15` : CARD, border: `0.5px solid ${duracao === d ? LIME : BORDER}`, borderRadius: 8, color: "#fff", cursor: "pointer", marginBottom: 6, textAlign: "left" }}>
                  <div style={{ width: 16, height: 16, borderRadius: "50%", border: `2px solid ${duracao === d ? LIME : GRAY}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {duracao === d && <div style={{ width: 8, height: 8, borderRadius: "50%", background: LIME }} />}
                  </div>
                  <span style={{ fontSize: 14 }}>{d === "dia" ? "Um dia" : d === "6meses" ? "6 meses" : "Infinita"}</span>
                </button>
              ))}
            </div>
          </div>
        )}
        {step === 2 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <div style={{ color: GRAY, fontSize: 12, marginBottom: 8 }}>Dias de jogatina</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {dias.map((d, i) => (
                  <button key={d} onClick={() => toggleDia(i)} style={{ width: 40, height: 40, borderRadius: 8, background: diasSel.has(i) ? LIME : CARD, border: `0.5px solid ${diasSel.has(i) ? LIME : BORDER}`, color: diasSel.has(i) ? DARK : GRAY, fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
                    {d}
                  </button>
                ))}
              </div>
            </div>
            <div><div style={{ color: GRAY, fontSize: 12, marginBottom: 6 }}>Horário início</div><Inp placeholder="20:00" value="" onChange={() => {}} /></div>
            <div><div style={{ color: GRAY, fontSize: 12, marginBottom: 6 }}>Horário fim</div><Inp placeholder="23:00" value="" onChange={() => {}} /></div>
          </div>
        )}
        {step === 3 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <div style={{ color: GRAY, fontSize: 12, marginBottom: 8 }}>Estilo</div>
              <div style={{ display: "flex", gap: 8 }}>
                <button style={{ flex: 1, padding: 10, background: LIME, color: DARK, border: "none", borderRadius: 8, fontWeight: 700, cursor: "pointer" }}>1v1</button>
                <button style={{ flex: 1, padding: 10, background: "#333", color: GRAY, border: "none", borderRadius: 8, fontWeight: 700, cursor: "pointer" }}>Duplas</button>
              </div>
            </div>
            {[{ label: "Marca bola caída?" }, { label: "Marca falta?" }].map((r, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 0" }}>
                <span style={{ color: "#fff", fontSize: 14 }}>{r.label}</span>
                <div style={{ width: 44, height: 24, borderRadius: 12, background: i === 0 ? LIME : "#444", position: "relative", cursor: "pointer" }}>
                  <div style={{ position: "absolute", top: 2, left: i === 0 ? 22 : 2, width: 20, height: 20, borderRadius: "50%", background: i === 0 ? DARK : "#888" }} />
                </div>
              </div>
            ))}
          </div>
        )}
        {step === 4 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[{ label: "Convidar amigos", icon: <Users size={16} /> }, { label: "Gerar código", icon: <Share2 size={16} /> }].map((b) => (
              <BtnSecondary key={b.label} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                {b.icon} {b.label}
              </BtnSecondary>
            ))}
            <div style={{ textAlign: "center", color: GRAY, fontSize: 13, margin: "4px 0" }}>ou</div>
            <button onClick={onDone} style={{ background: "none", border: "none", color: GRAY, fontSize: 13, cursor: "pointer", textDecoration: "underline" }}>
              Começar sem convidar
            </button>
          </div>
        )}
      </div>
      <div style={{ padding: 16 }}>
        {step < 4 ? (
          <BtnPrimary onClick={() => setStep((s) => s + 1)}>Próximo →</BtnPrimary>
        ) : (
          <BtnPrimary onClick={onDone}>Criar liga 🎱</BtnPrimary>
        )}
      </div>
    </div>
  );
}

// ─── SHARE MODAL ──────────────────────────────────────────────────────────────

function ShareModal({ onClose }: { onClose: () => void }) {
  return (
    <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.72)", display: "flex", alignItems: "flex-end", zIndex: 50 }}>
      <div style={{ background: CARD, borderRadius: "14px 14px 0 0", padding: "22px 20px 40px", width: "100%", boxSizing: "border-box" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: "#fff" }}>Compartilhar resultado</div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={18} color={GRAY} /></button>
        </div>
        <Chip style={{ textAlign: "center", marginBottom: 16, border: `0.5px solid ${LIME}44` }}>
          <div style={{ color: GRAY, fontSize: 12, marginBottom: 6 }}>Liga Terça · 09/07/2025</div>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 32, fontWeight: 800, color: LIME }}>🏆 1º Lugar!</div>
          <div style={{ color: "#fff", fontSize: 14 }}>Marcelão — 6V 1D</div>
          <div style={{ color: GRAY, fontSize: 12, marginTop: 4 }}>#Sinuca #Encaçapei</div>
        </Chip>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {[
            { label: "Instagram", icon: <Instagram size={15} />, bg: "#C13584" },
            { label: "WhatsApp", icon: <MessageSquare size={15} />, bg: "#25D366" },
            { label: "TikTok", icon: <Share2 size={15} />, bg: "#010101" },
            { label: "Copiar link", icon: <Copy size={15} />, bg: "#2E3130" },
          ].map((s) => (
            <button key={s.label} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7, padding: 12, background: s.bg, border: s.label === "Copiar link" ? `0.5px solid ${BORDER}` : "none", borderRadius: 8, color: "#fff", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
              {s.icon} {s.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── EDIT PERFIL ──────────────────────────────────────────────────────────────

function EditPerfilScreen({ onBack }: { onBack: () => void }) {
  const [nome, setNome] = useState("Marcelo Souza");
  const [apelido, setApelido] = useState("Marcelão");
  const [email, setEmail] = useState("marcelo@email.com");
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: DARK }}>
      <div style={{ padding: "16px" }}>
        <BackBtn onBack={onBack} label="Perfil" />
        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 24, fontWeight: 700, color: "#fff", marginBottom: 24 }}>Editar Perfil</div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 24 }}>
          <Avatar name={nome} size={72} />
          <button style={{ marginTop: 10, background: "none", border: "none", color: LIME, fontSize: 13, cursor: "pointer" }}>Escolher foto</button>
        </div>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "0 16px", display: "flex", flexDirection: "column", gap: 14 }}>
        <div><div style={{ color: GRAY, fontSize: 12, marginBottom: 6 }}>Nome</div><Inp placeholder="Nome completo" value={nome} onChange={setNome} /></div>
        <div><div style={{ color: GRAY, fontSize: 12, marginBottom: 6 }}>Apelido</div><Inp placeholder="Apelido" value={apelido} onChange={setApelido} /></div>
        <div><div style={{ color: GRAY, fontSize: 12, marginBottom: 6 }}>Email</div><Inp placeholder="email@email.com" value={email} onChange={setEmail} /></div>
      </div>
      <div style={{ padding: 16 }}><BtnPrimary>Salvar alterações</BtnPrimary></div>
    </div>
  );
}

// ─── BOTTOM NAV ───────────────────────────────────────────────────────────────

function BottomNav({ active, onChange }: { active: string; onChange: (t: string) => void }) {
  const tabs = [
    { id: "home", label: "Home", Icon: Home },
    { id: "amigos", label: "Amigos", Icon: Users },
    { id: "liga", label: "Liga", Icon: Trophy },
    { id: "locais", label: "Locais", Icon: MapPin },
    { id: "perfil", label: "Perfil", Icon: User },
  ];
  return (
    <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 64, background: CARD, borderTop: `0.5px solid ${BORDER}`, display: "flex", alignItems: "center" }}>
      {tabs.map(({ id, label, Icon }) => (
        <button key={id} onClick={() => onChange(id)} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3, background: "none", border: "none", cursor: "pointer", padding: "8px 0" }}>
          <Icon size={20} color={active === id ? LIME : GRAY} />
          <span style={{ fontSize: 10, color: active === id ? LIME : GRAY, fontWeight: active === id ? 700 : 400 }}>{label}</span>
        </button>
      ))}
    </div>
  );
}

// ─── ROOT ─────────────────────────────────────────────────────────────────────

export default function App() {
  const [screen, setScreen] = useState<"splash" | "onboarding" | "auth" | "app">("splash");
  const [tab, setTab] = useState("home");
  const [subView, setSubView] = useState<string | null>(null);
  const [subData, setSubData] = useState<unknown>(null);
  const [matchP1, setMatchP1] = useState<string | null>(null);
  const [showShare, setShowShare] = useState(false);

  const navigate = (view: string, data?: unknown) => {
    if (view === "liga-tab") { setTab("liga"); return; }
    setSubView(view);
    setSubData(data ?? null);
  };

  const goBack = () => { setSubView(null); setSubData(null); setMatchP1(null); };

  const changeTab = (t: string) => { setTab(t); setSubView(null); setSubData(null); setMatchP1(null); };

  const renderSubView = () => {
    const d = subData as Record<string, unknown>;
    switch (subView) {
      case "liga-details": return <LigaDetailsScreen league={d as { name: string; status: string; friends: number; matches: number; next?: string | null }} onBack={goBack} navigate={navigate} />;
      case "h2h": return <H2HScreen friend={d as { name: string; nick: string }} onBack={goBack} />;
      case "match-1": return <MatchScreen1 league={d as { name: string }} onBack={goBack} onNext={(p) => { setMatchP1(p); setSubView("match-2"); }} />;
      case "match-2": return <MatchScreen2 league={d as { name: string }} player1={matchP1!} onBack={() => setSubView("match-1")} onStart={(p2) => { setSubData({ ...(d as object), player2: p2 }); setSubView("match-playing"); }} />;
      case "match-playing": return <MatchPlayingScreen league={d as { name: string }} player1={matchP1!} player2={(d as { player2: string }).player2} onResult={() => { setShowShare(true); goBack(); }} />;
      case "notificacoes": return <NotificacoesScreen onBack={goBack} />;
      case "criar-liga": return <CriarLigaScreen onBack={goBack} onDone={() => { goBack(); setTab("liga"); }} />;
      case "edit-perfil": return <EditPerfilScreen onBack={goBack} />;
      default: return null;
    }
  };

  const renderTab = () => {
    switch (tab) {
      case "home": return <HomeScreen navigate={navigate} />;
      case "amigos": return <AmigosScreen navigate={navigate} />;
      case "liga": return <LigaScreen navigate={navigate} />;
      case "locais": return <LocaisScreen />;
      case "perfil": return <PerfilScreen navigate={navigate} />;
      default: return <HomeScreen navigate={navigate} />;
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#111214", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Inter, sans-serif" }}>
      {/* Phone shell */}
      <div style={{ width: 380, height: 812, background: DARK, borderRadius: 44, overflow: "hidden", position: "relative", boxShadow: "0 40px 100px rgba(0,0,0,0.85), 0 0 0 1px rgba(255,255,255,0.07), inset 0 0 0 1px rgba(0,0,0,0.6)" }}>
        {/* Notch */}
        <div style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", width: 120, height: 30, background: "#0a0c0a", borderRadius: "0 0 18px 18px", zIndex: 20 }} />

        {screen === "splash" && <SplashScreen onDone={() => setScreen("onboarding")} />}
        {screen === "onboarding" && <OnboardingScreen onDone={() => setScreen("auth")} />}
        {screen === "auth" && <AuthScreen onDone={() => setScreen("app")} />}

        {screen === "app" && (
          <>
            <div style={{ position: "absolute", inset: "0 0 64px 0", overflow: "hidden" }}>
              {subView ? renderSubView() : renderTab()}
            </div>
            {!subView && <BottomNav active={tab} onChange={changeTab} />}
            {showShare && <ShareModal onClose={() => setShowShare(false)} />}
          </>
        )}
      </div>
    </div>
  );
}
