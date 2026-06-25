import { useEffect, useMemo, useRef, useState } from "react";
import { Ball } from "./components/balls.jsx";
import { Sheet, Toast } from "./components/layout.jsx";
import { MatchSheet, PlayerSheet } from "./components/sheets.jsx";
import { NAV } from "./constants.js";
import { computeStats, rankedFrom } from "./domain/stats.js";
import { demoData } from "./fixtures/demoData.js";
import { createRepository } from "./services/supabaseRepository.js";
import { AdminView } from "./views/AdminView.jsx";
import { MatchesView } from "./views/MatchesView.jsx";
import { PlayerView } from "./views/PlayerView.jsx";
import { RankingView } from "./views/RankingView.jsx";
import { RecordsView } from "./views/RecordsView.jsx";
import { RulesView } from "./views/RulesView.jsx";

export function App({ supabaseClient }) {
  const query = useMemo(() => new URLSearchParams(window.location.search), []);
  const demoMode = query.has("demo");
  const demoStartForm = query.get("demo") === "start";
  const sb = demoMode ? null : supabaseClient;
  const repo = useMemo(() => (sb ? createRepository(sb) : null), [sb]);

  const [players, setPlayers] = useState([]);
  const [matches, setMatches] = useState([]);
  const [current, setCurrent] = useState("ranking");
  const [isAdmin, setIsAdmin] = useState(demoMode);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [sheet, setSheet] = useState(null);
  const toastTimer = useRef(null);

  const finished = useMemo(() => matches.filter((match) => match.status !== "live" && match.winner_id), [matches]);
  const liveMatch = useMemo(() => matches.find((match) => match.status === "live") || null, [matches]);
  const stats = useMemo(() => computeStats(players, finished), [players, finished]);
  const ranked = useMemo(() => rankedFrom(stats), [stats]);

  const playerById = (id) => players.find((player) => player.id === id);
  const playerName = (id) => playerById(id)?.name || "?";
  const showToast = (message) => {
    setToast(message);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(""), 2200);
  };

  const load = async () => {
    setLoading(true);
    setError("");
    if (demoMode) {
      const data = demoData(demoStartForm);
      setPlayers(data.players);
      setMatches(data.matches);
      setLoading(false);
      return;
    }
    if (!repo) {
      setError("Configure o Supabase nas variáveis VITE_SUPABASE_URL e VITE_SUPABASE_ANON, ou abra com ?demo=1.");
      setLoading(false);
      return;
    }
    try {
      const data = await repo.loadScoreboard();
      setPlayers(data.players);
      setMatches(data.matches);
    } catch (loadError) {
      setError(loadError.message);
      setLoading(false);
      return;
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!repo) return;
    repo.getSession().then((session) => setIsAdmin(Boolean(session))).catch(() => setIsAdmin(false));
    return repo.onAuthStateChange((session) => setIsAdmin(Boolean(session)));
  }, [repo]);

  const persistMatch = async (id, patch) => {
    setMatches((items) => items.map((match) => (match.id === id ? { ...match, ...patch } : match)));
    if (!repo) return;
    try {
      await repo.updateMatch(id, patch);
    } catch (updateError) {
      showToast(`Erro: ${updateError.message}`);
      await load();
    }
  };

  const addPlayer = async (name) => {
    const cleanName = name.trim();
    if (!cleanName) throw new Error("Digite um nome");
    const existing = players.find((player) => player.name.toLowerCase() === cleanName.toLowerCase());
    if (existing) return existing;
    if (!repo) {
      const player = { id: `demo-${cleanName.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`, name: cleanName };
      setPlayers((items) => [...items, player].sort((a, b) => a.name.localeCompare(b.name)));
      return player;
    }
    const player = await repo.addPlayer(cleanName);
    setPlayers((items) => [...items, player].sort((a, b) => a.name.localeCompare(b.name)));
    return player;
  };

  const updatePlayer = async (id, name) => {
    const cleanName = name.trim();
    if (!cleanName) throw new Error("Digite um nome");
    const existing = players.find((player) => player.id !== id && player.name.toLowerCase() === cleanName.toLowerCase());
    if (existing) throw new Error("Já existe um jogador com esse nome");
    if (!repo) {
      const updated = players.find((player) => player.id === id);
      if (!updated) throw new Error("Jogador não encontrado");
      const player = { ...updated, name: cleanName };
      setPlayers((items) => items.map((item) => (item.id === id ? player : item)).sort((a, b) => a.name.localeCompare(b.name)));
      return player;
    }
    const player = await repo.updatePlayer(id, { name: cleanName });
    setPlayers((items) => items.map((item) => (item.id === id ? player : item)).sort((a, b) => a.name.localeCompare(b.name)));
    return player;
  };

  const go = (key) => {
    setCurrent(key);
    window.scrollTo({ top: 0 });
  };

  let content;
  if (loading) content = <div className="loading">engizAndo o taco...</div>;
  else if (error) content = <div className="empty">Nao consegui conectar no banco.<br /><small style={{ color: "var(--clay)" }}>{error}</small></div>;
  else if (current === "ranking") content = <RankingView players={players} finished={finished} stats={stats} ranked={ranked} isAdmin={isAdmin} showToast={showToast} playerById={playerById} openPlayer={(id) => setSheet(<PlayerSheet stat={stats[id]} rank={ranked.findIndex((item) => item.id === id) + 1} playerById={playerById} />)} />;
  else if (current === "jogador") content = <PlayerView players={players} finished={finished} stats={stats} playerById={playerById} openMatch={(id) => setSheet(<MatchSheet match={matches.find((item) => item.id === id)} playerById={playerById} playerName={playerName} isAdmin={isAdmin} onDelete={async (matchId) => {
    if (!window.confirm("Apagar essa partida? Não dá pra desfazer.")) return;
    setMatches((items) => items.filter((match) => match.id !== matchId));
    if (repo) {
      try {
        await repo.deleteMatch(matchId);
      } catch (deleteError) {
        showToast(`Erro: ${deleteError.message}`);
        await load();
        return;
      }
    }
    setSheet(null);
    showToast("Partida apagada");
  }} />)} />;
  else if (current === "partidas") content = <MatchesView finished={finished} liveMatch={liveMatch} isAdmin={isAdmin} playerById={playerById} openMatch={(id) => setSheet(<MatchSheet match={matches.find((item) => item.id === id)} playerById={playerById} playerName={playerName} isAdmin={isAdmin} onDelete={async (matchId) => {
    if (!window.confirm("Apagar essa partida? Não dá pra desfazer.")) return;
    setMatches((items) => items.filter((match) => match.id !== matchId));
    if (repo) {
      try {
        await repo.deleteMatch(matchId);
      } catch (deleteError) {
        showToast(`Erro: ${deleteError.message}`);
        await load();
        return;
      }
    }
    setSheet(null);
    showToast("Partida apagada");
  }} />)} go={go} />;
  else if (current === "records") content = <RecordsView players={players} finished={finished} stats={stats} />;
  else if (current === "regras") content = <RulesView />;
  else content = <AdminView repo={repo} isAdmin={isAdmin} setIsAdmin={setIsAdmin} players={players} addPlayer={addPlayer} updatePlayer={updatePlayer} liveMatch={liveMatch} playerById={playerById} playerName={playerName} persistMatch={persistMatch} setMatches={setMatches} load={load} showToast={showToast} />;

  return (
    <>
      <div className="app">
        <header>
          <div className="brand">
            <span className="ball8"><Ball size={30} color="#1c1c1c" num={8} /></span>
            <h1>Placar da Sinuca<small>RESENHA OFICIAL</small></h1>
          </div>
          <div className="who">{isAdmin ? <><b>{demoMode ? "demo" : "admin"}</b><br />pode lançar</> : "modo leitura"}</div>
        </header>
        <main id="view">{content}</main>
      </div>
      <nav>
        <div className="nav-in">
          {NAV.filter((item) => !item.hidden).map((item) => (
            <button key={item.key} className={`nav-btn ${item.key === "admin" ? "admin" : ""} ${current === item.key ? "active" : ""}`} onClick={() => go(item.key)}>
              <svg viewBox="0 0 24 24" dangerouslySetInnerHTML={{ __html: item.icon }} />
              {item.key === "admin" && isAdmin ? item.adminLabel : item.label}
            </button>
          ))}
        </div>
      </nav>
      <Sheet onClose={() => setSheet(null)}>{sheet}</Sheet>
      <Toast message={toast} />
    </>
  );
}
