import { useEffect, useMemo, useRef, useState } from "react";
import { Ball } from "./components/balls.jsx";
import { ConfirmDialog, Sheet, Toast } from "./components/layout.jsx";
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
  const [clips, setClips] = useState([]);
  const [current, setCurrent] = useState("ranking");
  const [isAdmin, setIsAdmin] = useState(demoMode);
  const [adminUser, setAdminUser] = useState(demoMode ? { id: "demo", email: "demo" } : null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [sheet, setSheet] = useState(null);
  const [confirmRequest, setConfirmRequest] = useState(null);
  const toastTimer = useRef(null);
  const confirmResolver = useRef(null);

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
  const requestConfirm = (request) => new Promise((resolve) => {
    confirmResolver.current?.(false);
    confirmResolver.current = resolve;
    setConfirmRequest(request);
  });
  const closeConfirm = (confirmed) => {
    confirmResolver.current?.(confirmed);
    confirmResolver.current = null;
    setConfirmRequest(null);
  };

  const load = async () => {
    setLoading(true);
    setError("");
    if (demoMode) {
      const data = demoData(demoStartForm);
      setPlayers(data.players);
      setMatches(data.matches);
      setClips([]);
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
      setClips(data.clips || []);
      try {
        setAuditLogs(await repo.listAuditLogs());
      } catch {
        setAuditLogs([]);
      }
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
    repo.getSession().then((session) => {
      setIsAdmin(Boolean(session));
      setAdminUser(session?.user ? { id: session.user.id, email: session.user.email } : null);
    }).catch(() => {
      setIsAdmin(false);
      setAdminUser(null);
    });
    return repo.onAuthStateChange((session) => {
      setIsAdmin(Boolean(session));
      setAdminUser(session?.user ? { id: session.user.id, email: session.user.email } : null);
    });
  }, [repo]);

  const refreshAuditLogs = async () => {
    if (!repo) return;
    try {
      setAuditLogs(await repo.listAuditLogs());
    } catch (error) {
      showToast(`Erro ao carregar logs: ${error.message}`);
    }
  };

  const auditLog = async ({ action, entityType, entityId, message, metadata = {} }) => {
    const actor = adminUser || { id: demoMode ? "demo" : null, email: demoMode ? "demo" : "admin" };
    const localEntry = {
      id: `local-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      actor_id: actor.id,
      actor_email: actor.email || "admin",
      action,
      entity_type: entityType,
      entity_id: entityId ? String(entityId) : null,
      message,
      metadata,
      created_at: new Date().toISOString(),
    };
    setAuditLogs((items) => [localEntry, ...items].slice(0, 100));
    if (!repo) return localEntry;
    try {
      const saved = await repo.createAuditLog({
        actor_id: actor.id && actor.id !== "demo" ? actor.id : null,
        actor_email: actor.email || "admin",
        action,
        entity_type: entityType,
        entity_id: entityId ? String(entityId) : null,
        message,
        metadata,
      });
      setAuditLogs((items) => [saved, ...items.filter((item) => item.id !== localEntry.id)].slice(0, 100));
      return saved;
    } catch (error) {
      showToast(`Erro ao gravar log: ${error.message}`);
      return localEntry;
    }
  };

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
      await auditLog({
        action: "player_created",
        entityType: "player",
        entityId: player.id,
        message: `${adminUser?.email || "admin"} adicionou o jogador ${player.name}`,
        metadata: { player },
      });
      return player;
    }
    const player = await repo.addPlayer(cleanName);
    setPlayers((items) => [...items, player].sort((a, b) => a.name.localeCompare(b.name)));
    await auditLog({
      action: "player_created",
      entityType: "player",
      entityId: player.id,
      message: `${adminUser?.email || "admin"} adicionou o jogador ${player.name}`,
      metadata: { player },
    });
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
      await auditLog({
        action: "player_updated",
        entityType: "player",
        entityId: player.id,
        message: `${adminUser?.email || "admin"} alterou o jogador para ${player.name}`,
        metadata: { player, previousName: updated.name },
      });
      return player;
    }
    const player = await repo.updatePlayer(id, { name: cleanName });
    setPlayers((items) => items.map((item) => (item.id === id ? player : item)).sort((a, b) => a.name.localeCompare(b.name)));
    await auditLog({
      action: "player_updated",
      entityType: "player",
      entityId: player.id,
      message: `${adminUser?.email || "admin"} alterou o jogador para ${player.name}`,
      metadata: { player, previousName: players.find((item) => item.id === id)?.name },
    });
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
  else if (current === "jogador") content = <PlayerView players={players} finished={finished} stats={stats} clips={clips} playerById={playerById} openMatch={(id) => setSheet(<MatchSheet match={matches.find((item) => item.id === id)} clips={clips.filter((clip) => clip.match_id === id)} playerById={playerById} playerName={playerName} isAdmin={isAdmin} onDelete={async (matchId) => {
    const confirmed = await requestConfirm({
      title: "Apagar partida?",
      message: "Essa ação não dá pra desfazer.",
      confirmLabel: "Apagar",
    });
    if (!confirmed) return;
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
    const deleted = matches.find((item) => item.id === matchId);
    await auditLog({
      action: "match_deleted",
      entityType: "match",
      entityId: matchId,
      message: `${adminUser?.email || "admin"} apagou a partida ${playerName(deleted?.player_a)} x ${playerName(deleted?.player_b)}`,
      metadata: { match: deleted, players: [playerName(deleted?.player_a), playerName(deleted?.player_b)] },
    });
    showToast("Partida apagada");
  }} />)} />;
  else if (current === "partidas") content = <MatchesView finished={finished} liveMatch={liveMatch} clips={clips} isAdmin={isAdmin} playerById={playerById} openMatch={(id) => setSheet(<MatchSheet match={matches.find((item) => item.id === id)} clips={clips.filter((clip) => clip.match_id === id)} playerById={playerById} playerName={playerName} isAdmin={isAdmin} onDelete={async (matchId) => {
    const confirmed = await requestConfirm({
      title: "Apagar partida?",
      message: "Essa ação não dá pra desfazer.",
      confirmLabel: "Apagar",
    });
    if (!confirmed) return;
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
    const deleted = matches.find((item) => item.id === matchId);
    await auditLog({
      action: "match_deleted",
      entityType: "match",
      entityId: matchId,
      message: `${adminUser?.email || "admin"} apagou a partida ${playerName(deleted?.player_a)} x ${playerName(deleted?.player_b)}`,
      metadata: { match: deleted, players: [playerName(deleted?.player_a), playerName(deleted?.player_b)] },
    });
    showToast("Partida apagada");
  }} />)} go={go} />;
  else if (current === "records") content = <RecordsView players={players} finished={finished} stats={stats} />;
  else if (current === "regras") content = <RulesView />;
  else content = <AdminView repo={repo} isAdmin={isAdmin} setIsAdmin={setIsAdmin} adminUser={adminUser} auditLogs={auditLogs} auditLog={auditLog} refreshAuditLogs={refreshAuditLogs} players={players} addPlayer={addPlayer} updatePlayer={updatePlayer} liveMatch={liveMatch} finished={finished} playerById={playerById} playerName={playerName} persistMatch={persistMatch} setMatches={setMatches} load={load} showToast={showToast} requestConfirm={requestConfirm} />;

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
      <ConfirmDialog request={confirmRequest} onCancel={() => closeConfirm(false)} onConfirm={() => closeConfirm(true)} />
      <Toast message={toast} />
    </>
  );
}
