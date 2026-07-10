import { useEffect, useMemo, useState } from "react";
import { PlayerBall, PoolBall, WhiteBall } from "../components/balls.jsx";
import { DefaultPlayerPanel } from "../components/DefaultPlayerPanel.jsx";
import { ViewHead } from "../components/layout.jsx";
import { GAME_MODELS, getGameRules, KNOCKOUT_COLORS, normalizeGameSettings } from "../domain/rules.js";
import { fmtFull, fmtPeriod, gameDayKey, gameDayRange, matchesInRange } from "../utils/date.js";

const GAME_SETTINGS_KEY = "sinuca-game-settings";
const DEFAULT_GAME_SETTINGS = {
  trackBalls: true,
  gameModel: "even-odd",
  penaltyBall: "1",
  knockoutColorA: "red",
  knockoutColorB: "yellow",
};

function loadGameSettings() {
  try {
    const stored = JSON.parse(window.localStorage.getItem(GAME_SETTINGS_KEY) || "null");
    return normalizeGameSettings({ ...DEFAULT_GAME_SETTINGS, ...(stored || {}) });
  } catch {
    return normalizeGameSettings(DEFAULT_GAME_SETTINGS);
  }
}

export function AdminView({ repo, isAdmin, setIsAdmin, adminUser, auditLogs, auditLog, refreshAuditLogs, players, addPlayer, updatePlayer, liveMatch, finished, currentPlayerId, onCurrentPlayerChange, playerById, playerName, persistMatch, setMatches, load, showToast, requestConfirm }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [adminTab, setAdminTab] = useState("partida");
  const [lastWinnerId, setLastWinnerId] = useState("");

  if (!isAdmin) {
    return (
      <>
        <ViewHead eyebrow="acesso restrito" title="Painel" />
        <div className="card">
          <p className="admin-help">Faça login para acessar o painel. Quem não é admin só visualiza.</p>
          <label className="fld"><span>e-mail</span><input className="search no-margin" type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
          <label className="fld"><span>senha</span><input className="search no-margin" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>
          <button className="btn chalk" onClick={async () => {
            if (!repo) {
              setIsAdmin(true);
              return;
            }
            try {
              await repo.signIn(email.trim(), password);
              setIsAdmin(true);
            } catch (signInError) {
              setLoginError(`Não rolou: ${signInError.message}`);
            }
          }}>Entrar</button>
          {loginError && <div className="login-error">{loginError}</div>}
        </div>
      </>
    );
  }

  return (
    <>
      <div className="admin-tabs">
        <button className={adminTab === "partida" ? "active" : ""} onClick={() => setAdminTab("partida")}>Partida</button>
        <button className={adminTab === "jogadores" ? "active" : ""} onClick={() => setAdminTab("jogadores")}>Jogadores</button>
        <button className={adminTab === "configuracoes" ? "active" : ""} onClick={() => setAdminTab("configuracoes")}>Configurações</button>
        <button className={adminTab === "logs" ? "active" : ""} onClick={() => {
          setAdminTab("logs");
          refreshAuditLogs?.();
        }}>Logs</button>
        <button className="logout-mini" onClick={async () => {
          if (repo) await repo.signOut();
          setIsAdmin(false);
          showToast("Saiu do admin");
        }}>Sair</button>
      </div>
      {adminTab === "jogadores" ? (
        <PlayerAdmin players={players} addPlayer={addPlayer} updatePlayer={updatePlayer} showToast={showToast} />
      ) : adminTab === "configuracoes" ? (
        <AdminSettings adminUser={adminUser} auditLog={auditLog} showToast={showToast} />
      ) : adminTab === "logs" ? (
        <AdminLogs logs={auditLogs} refreshAuditLogs={refreshAuditLogs} />
      ) : liveMatch ? (
        <section className="panel live-admin-panel">
          <DefaultPlayerPanel players={players} currentPlayerId={currentPlayerId} onCurrentPlayerChange={onCurrentPlayerChange} />
          <LiveMatchRouter adminUser={adminUser} auditLog={auditLog} liveMatch={liveMatch} finished={finished} playerById={playerById} playerName={playerName} persistMatch={persistMatch} setMatches={setMatches} load={load} showToast={showToast} repo={repo} onFinished={setLastWinnerId} requestConfirm={requestConfirm} />
        </section>
      ) : (
        <section className="panel">
          <div className="eyebrow">admin</div>
          <div className="viewtitle">Painel</div>
          <DefaultPlayerPanel players={players} currentPlayerId={currentPlayerId} onCurrentPlayerChange={onCurrentPlayerChange} />
          <StartMatchPanel adminUser={adminUser} auditLog={auditLog} players={players} setMatches={setMatches} repo={repo} load={load} showToast={showToast} preferredPlayerA={lastWinnerId} />
        </section>
      )}
    </>
  );
}

function AdminSettings({ adminUser, auditLog, showToast }) {
  const [settings, setSettings] = useState(loadGameSettings);
  const [choicePrompt, setChoicePrompt] = useState(null);
  const rules = getGameRules(settings);

  const saveSettings = (nextSettings, changedKey, changedValue) => {
    const next = normalizeGameSettings(nextSettings);
    setSettings(next);
    window.localStorage.setItem(GAME_SETTINGS_KEY, JSON.stringify(next));
    auditLog?.({
      action: "settings_updated",
      entityType: "settings",
      entityId: changedKey,
      message: `${adminUser?.email || "admin"} alterou ${settingLabel(changedKey)} para ${settingValueLabel(changedKey, changedValue)}`,
      metadata: { key: changedKey, value: changedValue, settings: next },
    });
    return next;
  };

  const updateSetting = (key, value) => {
    saveSettings({ ...settings, [key]: value }, key, value);
    showToast("Configuração salva");
  };
  const updateGameModel = (gameModel) => {
    const next = saveSettings({ ...settings, gameModel }, "gameModel", gameModel);
    const nextRules = getGameRules(next);
    if (nextRules.penaltyOptions.length > 1) {
      setChoicePrompt("penalty");
      showToast("Escolha a bola de castigo desse modo");
      return;
    }
    if (nextRules.colorOptions.length) {
      setChoicePrompt("color");
      showToast("Escolha as cores dos adversários");
      return;
    }
    setChoicePrompt(null);
    showToast("Configuração salva");
  };
  const choosePenaltyBall = (penaltyBall) => {
    saveSettings({ ...settings, penaltyBall }, "penaltyBall", penaltyBall);
    setChoicePrompt(null);
    showToast(`Bola ${penaltyBall} definida como castigo`);
  };
  const chooseKnockoutColor = (side, colorValue) => {
    const otherKey = side === "A" ? "knockoutColorB" : "knockoutColorA";
    if (settings[otherKey] === colorValue) {
      showToast("Cada adversário precisa ter uma cor diferente");
      return;
    }
    const key = side === "A" ? "knockoutColorA" : "knockoutColorB";
    saveSettings({ ...settings, [key]: colorValue }, key, colorValue);
    showToast(`${side === "A" ? "Adversário A" : "Adversário B"}: ${settingValueLabel(key, colorValue)}`);
  };
  const closeColorChoice = () => {
    setChoicePrompt(null);
    showToast("Cores do mata a mata salvas");
  };

  return (
    <section className="panel">
      <div className="eyebrow">admin</div>
      <div className="viewtitle">Configurações</div>

      <div className="settings-section">
        <div className="record-section-title">partida</div>
        <div className="settings-list">
          <div className="settings-row">
            <div className="settings-copy">
              <strong>Anotar bolas derrubadas durante partida?</strong>
              <span>Quando ligado, a partida ao vivo registra a sequência das bolas.</span>
            </div>
            <button
              className={`switch ${settings.trackBalls ? "on" : ""}`}
              type="button"
              role="switch"
              aria-checked={settings.trackBalls}
              onClick={() => updateSetting("trackBalls", !settings.trackBalls)}
            >
              <span />
            </button>
          </div>

          <label className="settings-field">
            <span>Modelo de jogo</span>
            <select className="select no-margin" value={settings.gameModel} onChange={(event) => updateGameModel(event.target.value)}>
              {GAME_MODELS.map((model) => <option key={model.value} value={model.value}>{model.label}</option>)}
            </select>
          </label>

          {choicePrompt === "penalty" && (
            <div className="settings-choice-toast">
              <div>
                <span>bola de castigo</span>
                <strong>{rules.label}</strong>
              </div>
              <div className="penalty-ball-list">
                {rules.penaltyOptions.map((ball) => (
                  <button
                    key={ball}
                    type="button"
                    className={`penalty-ball-option ${settings.penaltyBall === ball ? "active" : ""}`}
                    onClick={() => choosePenaltyBall(ball)}
                  >
                    <PoolBall num={ball} size={38} />
                    <span>Bola {ball}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {choicePrompt === "color" && (
            <div className="settings-choice-toast">
              <div>
                <span>cores das bolas</span>
                <strong>{rules.label}</strong>
              </div>
              <div className="knockout-color-grid">
                <KnockoutColorPicker
                  title="Adversário A"
                  value={settings.knockoutColorA}
                  disabledValue={settings.knockoutColorB}
                  onChoose={(color) => chooseKnockoutColor("A", color)}
                />
                <KnockoutColorPicker
                  title="Adversário B"
                  value={settings.knockoutColorB}
                  disabledValue={settings.knockoutColorA}
                  onChoose={(color) => chooseKnockoutColor("B", color)}
                />
              </div>
              <button className="btn chalk small auto-btn" type="button" onClick={closeColorChoice}>Concluir cores</button>
            </div>
          )}

          {rules.hasPenalty && choicePrompt !== "penalty" && (
            <div className="settings-summary">
              <span>Castigo deste modo</span>
              <strong>Bola {settings.penaltyBall}</strong>
            </div>
          )}

          {rules.colorOptions.length > 0 && choicePrompt !== "color" && (
            <div className="settings-summary">
              <span>Cores do mata a mata</span>
              <strong>{settingValueLabel("knockoutColorA", settings.knockoutColorA)} x {settingValueLabel("knockoutColorB", settings.knockoutColorB)}</strong>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function settingLabel(key) {
  return {
    trackBalls: "anotação de bolas derrubadas",
    gameModel: "modelo de jogo",
    penaltyBall: "bola de castigo",
    knockoutColorA: "cor do adversário A",
    knockoutColorB: "cor do adversário B",
  }[key] || key;
}

function settingValueLabel(key, value) {
  if (key === "trackBalls") return value ? "ligado" : "desligado";
  if (key === "gameModel") return GAME_MODELS.find((model) => model.value === value)?.label || value;
  if (key === "penaltyBall") return `Bola ${value}`;
  if (key === "knockoutColorA" || key === "knockoutColorB" || key === "knockoutColor") return KNOCKOUT_COLORS.find((color) => color.value === value)?.label || value;
  return String(value);
}

function KnockoutColorPicker({ title, value, disabledValue, onChoose }) {
  return (
    <div className="knockout-color-picker">
      <span>{title}</span>
      <div className="penalty-ball-list">
        {KNOCKOUT_COLORS.map((color) => {
          const disabled = disabledValue === color.value;
          return (
            <button
              key={color.value}
              type="button"
              className={`penalty-ball-option ${value === color.value ? "active" : ""}`}
              disabled={disabled}
              onClick={() => onChoose(color.value)}
            >
              <span className="color-choice-dot" style={{ background: color.color }} />
              <span>{color.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function AdminLogs({ logs, refreshAuditLogs }) {
  const [actionFilter, setActionFilter] = useState("all");
  const actionOptions = useMemo(() => {
    const actions = [...new Set((logs || []).map((log) => log.action).filter(Boolean))].sort();
    return actions.map((action) => ({ value: action, label: auditActionLabel(action) }));
  }, [logs]);
  const filteredLogs = useMemo(() => {
    if (actionFilter === "all") return logs || [];
    return (logs || []).filter((log) => log.action === actionFilter);
  }, [logs, actionFilter]);
  const fmtLogTime = (ts) => new Date(ts).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
  return (
    <section className="panel">
      <div className="section-head compact">
        <div>
          <div className="eyebrow">admin</div>
          <div className="viewtitle no-margin">Logs</div>
        </div>
        <button className="btn ghost small" onClick={refreshAuditLogs}>Atualizar</button>
      </div>
      <label className="settings-field audit-filter">
        <span>Tipo de log</span>
        <select className="select no-margin" value={actionFilter} onChange={(event) => setActionFilter(event.target.value)}>
          <option value="all">Todos</option>
          {actionOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </label>
      <div className="audit-log-list">
        {filteredLogs.length ? filteredLogs.map((log) => (
          <article className="audit-log-row" key={log.id}>
            <div>
              <strong>{log.message}</strong>
              <span>{log.actor_email} · {fmtLogTime(log.created_at)}</span>
            </div>
            <em>{auditActionLabel(log.action)}</em>
          </article>
        )) : <div className="empty compact-empty">{logs?.length ? "Nenhum log desse tipo." : "Nenhum log registrado ainda."}</div>}
      </div>
    </section>
  );
}

function auditActionLabel(action) {
  return {
    ball_logged: "Bola anotada",
    ball_removed: "Bola removida",
    ball_undone: "Jogada desfeita",
    foul_logged: "Falta anotada",
    match_cancelled: "Partida cancelada",
    match_deleted: "Partida apagada",
    match_finished: "Partida finalizada",
    match_started: "Partida iniciada",
    player_created: "Jogador criado",
    player_updated: "Jogador alterado",
    settings_updated: "Configuração alterada",
  }[action] || action;
}

function PlayerAdmin({ players, addPlayer, updatePlayer, showToast }) {
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState("");
  const [editingName, setEditingName] = useState("");
  const [savingId, setSavingId] = useState("");
  const submit = async () => {
    try {
      const player = await addPlayer(name);
      setName("");
      showToast(`${player.name} cadastrado`);
    } catch (error) {
      showToast(`Erro: ${error.message}`);
    }
  };
  const startEditing = (player) => {
    setEditingId(player.id);
    setEditingName(player.name);
  };
  const cancelEditing = () => {
    setEditingId("");
    setEditingName("");
  };
  const saveEditing = async (player) => {
    try {
      setSavingId(player.id);
      const updated = await updatePlayer(player.id, editingName);
      cancelEditing();
      showToast(`${updated.name} atualizado`);
    } catch (error) {
      showToast(`Erro: ${error.message}`);
    } finally {
      setSavingId("");
    }
  };
  return (
    <section className="panel">
      <div className="eyebrow">admin</div>
      <div className="viewtitle">Jogadores</div>
      <div className="card">
        <div className="row2 admin-add-row">
          <input className="search no-margin" placeholder="nome do jogador" value={name} onChange={(event) => setName(event.target.value)} onKeyDown={(event) => event.key === "Enter" && submit()} />
          <button className="btn chalk small auto-btn" onClick={submit}>Adicionar</button>
        </div>
        {players.length ? (
          <div className="player-list">
            {players.map((player) => {
              const editing = editingId === player.id;
              return (
                <div className={`player-admin-row ${editing ? "editing" : ""}`} key={player.id}>
                  <PlayerBall player={player} size={30} />
                  {editing ? (
                    <>
                      <input
                        className="search no-margin player-edit-input"
                        value={editingName}
                        autoFocus
                        onChange={(event) => setEditingName(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") saveEditing(player);
                          if (event.key === "Escape") cancelEditing();
                        }}
                      />
                      <button className="btn chalk small player-row-action" disabled={savingId === player.id} onClick={() => saveEditing(player)}>{savingId === player.id ? "Salvando..." : "Salvar"}</button>
                      <button className="btn ghost small player-row-action" onClick={cancelEditing}>Cancelar</button>
                    </>
                  ) : (
                    <>
                      <div className="player-admin-main">
                        <strong>{player.name}</strong>
                        <span>jogador cadastrado</span>
                      </div>
                      <button className="btn ghost small player-row-action" onClick={() => startEditing(player)}>Editar</button>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        ) : <div className="muted-text">Cadastre a galera aqui. Depois é só lançar as partidas.</div>}
      </div>
    </section>
  );
}

function StartMatchPanel({ adminUser, auditLog, players, setMatches, repo, load, showToast, preferredPlayerA = "" }) {
  const initialPlayerA = preferredPlayerA && players.some((player) => player.id === preferredPlayerA) ? preferredPlayerA : players[0]?.id || "";
  const initialPlayerB = players.find((player) => player.id !== initialPlayerA)?.id || "";
  const [playerA, setPlayerA] = useState(initialPlayerA);
  const [playerB, setPlayerB] = useState(initialPlayerB);
  const [when, setWhen] = useState(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  });

  useEffect(() => {
    const nextA = preferredPlayerA && players.some((player) => player.id === preferredPlayerA) ? preferredPlayerA : players[0]?.id || "";
    if (!nextA) return;
    setPlayerA(nextA);
    setPlayerB((current) => current && current !== nextA ? current : players.find((player) => player.id !== nextA)?.id || "");
  }, [preferredPlayerA, players]);

  if (players.length < 2) return <div className="empty small-empty">Cadastre pelo menos 2 jogadores acima pra iniciar uma partida.</div>;
  return (
    <div className="card">
      <label className="fld"><span>jogador A (quebra)</span><select className="select" value={playerA} onChange={(event) => setPlayerA(event.target.value)}>{players.map((player) => <option key={player.id} value={player.id}>{player.name}</option>)}</select></label>
      <label className="fld"><span>jogador B</span><select className="select" value={playerB} onChange={(event) => setPlayerB(event.target.value)}>{players.map((player) => <option key={player.id} value={player.id}>{player.name}</option>)}</select></label>
      <label className="fld"><span>data e hora</span><input className="search no-margin" type="datetime-local" value={when} onChange={(event) => setWhen(event.target.value)} /></label>
      <button className="btn chalk" onClick={async () => {
        if (playerA === playerB) {
          showToast("Jogador A e B não podem ser a mesma pessoa");
          return;
        }
        const match = { player_a: playerA, player_b: playerB, played_at: new Date(when).toISOString(), ball_log: [], status: "live" };
        const playerAName = players.find((player) => player.id === playerA)?.name;
        const playerBName = players.find((player) => player.id === playerB)?.name;
        if (!repo) {
          const createdMatch = { ...match, id: `demo-live-${Date.now()}` };
          setMatches((items) => [...items, createdMatch]);
          await auditLog?.({
            action: "match_started",
            entityType: "match",
            entityId: createdMatch.id,
            message: `${adminUser?.email || "admin"} iniciou a partida ${playerAName} x ${playerBName}`,
            metadata: { match: createdMatch, players: [playerAName, playerBName] },
          });
          showToast("Partida iniciada");
          return;
        }
        try {
          const createdMatch = await repo.startMatch(match);
          await auditLog?.({
            action: "match_started",
            entityType: "match",
            entityId: createdMatch?.id,
            message: `${adminUser?.email || "admin"} iniciou a partida ${playerAName} x ${playerBName}`,
            metadata: { match: createdMatch || match, players: [playerAName, playerBName] },
          });
          await load();
          showToast("Partida iniciada");
        } catch (startError) {
          showToast(`Erro: ${startError.message}`);
        }
      }}>Iniciar partida</button>
    </div>
  );
}

function LiveMatchRouter(props) {
  const settings = loadGameSettings();
  const rules = getGameRules(settings);
  if (!settings.trackBalls || rules.simpleOnly) return <SimpleLiveMatchPanel {...props} settings={settings} rules={rules} />;
  return <LiveMatchPanel {...props} settings={settings} rules={rules} />;
}

function liveDayHeadToHead(finished, liveMatch) {
  const gameDay = gameDayKey(liveMatch.played_at);
  const { start, end } = gameDayRange(gameDay);
  const dayMatches = matchesInRange(finished, start, end).filter((match) => (
    [match.player_a, match.player_b].includes(liveMatch.player_a) &&
    [match.player_a, match.player_b].includes(liveMatch.player_b)
  ));
  return {
    gameDay,
    start,
    end,
    total: dayMatches.length,
    winsA: dayMatches.filter((match) => match.winner_id === liveMatch.player_a).length,
    winsB: dayMatches.filter((match) => match.winner_id === liveMatch.player_b).length,
  };
}

function LiveDayScore({ liveMatch, finished, playerById }) {
  const playerA = playerById(liveMatch.player_a);
  const playerB = playerById(liveMatch.player_b);
  const score = liveDayHeadToHead(finished, liveMatch);
  return (
    <section className="live-day-score">
      <div>
        <div className="eyebrow">confronto da jogatina</div>
        <span>{fmtPeriod(score.start)} até {fmtPeriod(score.end)} · {score.total} partida{score.total !== 1 ? "s" : ""} finalizada{score.total !== 1 ? "s" : ""}</span>
      </div>
      <div className="live-day-score-board">
        <strong>{playerA?.name}</strong>
        <b>{score.winsA}</b>
        <em>x</em>
        <b>{score.winsB}</b>
        <strong>{playerB?.name}</strong>
      </div>
    </section>
  );
}

function matchPlayersLabel(liveMatch, playerName) {
  return `${playerName(liveMatch.player_a)} x ${playerName(liveMatch.player_b)}`;
}

function SimpleLiveMatchPanel({ adminUser, auditLog, liveMatch, finished, playerById, playerName, persistMatch, setMatches, load, showToast, repo, onFinished, rules, requestConfirm }) {
  const [selectingWinner, setSelectingWinner] = useState(false);
  const playerA = playerById(liveMatch.player_a);
  const playerB = playerById(liveMatch.player_b);
  const finishMatch = async (winnerId) => {
    await persistMatch(liveMatch.id, { winner_id: winnerId, status: "finished" });
    await auditLog?.({
      action: "match_finished",
      entityType: "match",
      entityId: liveMatch.id,
      message: `${adminUser?.email || "admin"} definiu ${playerName(winnerId)} como vencedor da partida ${matchPlayersLabel(liveMatch, playerName)}`,
      metadata: { match: liveMatch, winnerId, winnerName: playerName(winnerId), players: [playerName(liveMatch.player_a), playerName(liveMatch.player_b)] },
    });
    onFinished?.(winnerId);
    setSelectingWinner(false);
    showToast(`Vitória de ${playerName(winnerId)} registrada`);
  };

  return (
    <div className="live-table simple-live-table">
      <div className="live-topbar">
        <div className="live-now"><span />Ao vivo</div>
        <div className="live-start-time">iniciada {fmtFull(liveMatch.played_at)}</div>
        <button className="live-cancel" onClick={async () => {
          const confirmed = await requestConfirm?.({
            title: "Cancelar partida?",
            message: "A partida em andamento será removida.",
            confirmLabel: "Cancelar partida",
          });
          if (!confirmed) return;
          setMatches((items) => items.filter((match) => match.id !== liveMatch.id));
          if (repo) {
            try {
              await repo.deleteMatch(liveMatch.id);
            } catch (deleteError) {
              showToast(`Erro: ${deleteError.message}`);
              await load();
              return;
            }
          } else await load();
          await auditLog?.({
            action: "match_cancelled",
            entityType: "match",
            entityId: liveMatch.id,
            message: `${adminUser?.email || "admin"} cancelou a partida ${matchPlayersLabel(liveMatch, playerName)}`,
            metadata: { match: liveMatch, players: [playerName(liveMatch.player_a), playerName(liveMatch.player_b)] },
          });
          showToast("Partida cancelada");
        }}>Cancelar partida</button>
      </div>

      <LiveDayScore liveMatch={liveMatch} finished={finished} playerById={playerById} />

      <div className="simple-live-mode">
        <span>{rules?.label || "Partida sem anotação de bolas"}</span>
      </div>

      <section className="simple-live-card">
        <div className="simple-live-player">
          <PlayerBall player={playerA} size={68} />
          <strong>{playerA?.name}</strong>
        </div>
        <div className="simple-live-vs">VS</div>
        <div className="simple-live-player">
          <PlayerBall player={playerB} size={68} />
          <strong>{playerB?.name}</strong>
        </div>
      </section>

      <button className="btn chalk simple-winner-btn" onClick={() => setSelectingWinner(true)}>Definir vencedor</button>

      {selectingWinner && (
        <div className="define-overlay">
          <div>
            <div className="eyebrow">quem venceu?</div>
            <div className="define-actions">
              <button className="btn chalk" onClick={() => finishMatch(liveMatch.player_a)}>{playerA?.name}</button>
              <button className="btn chalk" onClick={() => finishMatch(liveMatch.player_b)}>{playerB?.name}</button>
            </div>
            <button className="btn ghost small" onClick={() => setSelectingWinner(false)}>Cancelar</button>
          </div>
        </div>
      )}
    </div>
  );
}

function LiveMatchPanel({ adminUser, auditLog, liveMatch, finished, playerById, playerName, persistMatch, setMatches, load, showToast, repo, onFinished, rules, requestConfirm }) {
  const [pendingDefinition, setPendingDefinition] = useState(null);
  const [pendingPenalty, setPendingPenalty] = useState(false);
  const playerA = playerById(liveMatch.player_a);
  const playerB = playerById(liveMatch.player_b);
  const log = liveMatch.ball_log || [];
  const groups = rules.deriveGroups(liveMatch, log);
  const hasGroups = Boolean(groups[liveMatch.player_a] && groups[liveMatch.player_b]);
  const removedNumbered = new Set(log.map((entry) => Number(entry.ball)).filter((num) => num >= 1 && num <= 15));
  const availableGroupBalls = rules.setupBalls().filter((num) => !removedNumbered.has(num));
  const penaltyBall = rules.penaltyBall;

  const removeBall = async (ball) => {
    const removedEntry = log.find((entry) => Number(entry.ball) === Number(ball));
    const nextLog = log
      .filter((entry) => Number(entry.ball) !== Number(ball))
      .map((entry, index) => ({ ...entry, n: index + 1 }));
    await persistMatch(liveMatch.id, { ball_log: nextLog });
    await auditLog?.({
      action: "ball_removed",
      entityType: "match",
      entityId: liveMatch.id,
      message: `${adminUser?.email || "admin"} removeu a bola ${ball} da partida ${matchPlayersLabel(liveMatch, playerName)}`,
      metadata: { matchId: liveMatch.id, ball: String(ball), removedEntry, players: [playerName(liveMatch.player_a), playerName(liveMatch.player_b)] },
    });
  };

  const appendBall = async (ball, by, type = "pot", reason = "", brk = false) => {
    const entry = { n: log.length + 1, ball: String(ball), by, type, ...(reason ? { reason } : {}), ...(brk ? { brk: true } : {}) };
    const nextLog = [...log, entry];
    await persistMatch(liveMatch.id, { ball_log: nextLog });
    await auditLog?.({
      action: type === "foul" ? "foul_logged" : "ball_logged",
      entityType: "match",
      entityId: liveMatch.id,
      message: `${adminUser?.email || "admin"} anotou bola ${ball} para ${playerName(by)} na partida ${matchPlayersLabel(liveMatch, playerName)}`,
      metadata: { matchId: liveMatch.id, entry, players: [playerName(liveMatch.player_a), playerName(liveMatch.player_b)] },
    });
  };

  const entryForBall = (ball) => log.find((entry) => Number(entry.ball) === Number(ball));
  const isGroupCleared = (playerId) => {
    return rules.isGroupCleared(playerId, groups, log);
  };
  const trunfoPlayerId = [liveMatch.player_a, liveMatch.player_b].find((id) => isGroupCleared(id));
  const trunfoUnlocked = Boolean(trunfoPlayerId);

  const touchGroupBall = (ball, ownerId) => {
    if (entryForBall(ball)) {
      removeBall(ball);
      return;
    }
    if (!hasGroups) {
      setPendingDefinition({ ball });
      return;
    }
    const result = rules.classifyPot({ ball, by: ownerId, groups, log });
    if (result.type === "foul") showToast(result.reason === "oponente" ? "Falta! matou bola do oponente" : `Falta! bola ${penaltyBall} cedo demais`);
    appendBall(ball, ownerId, result.type, result.reason);
  };

  const finishWithPenalty = async (by) => {
    const canWin = isGroupCleared(by);
    const winnerId = canWin ? by : (by === liveMatch.player_a ? liveMatch.player_b : liveMatch.player_a);
    const cleanLog = log.filter((entry) => Number(entry.ball) !== Number(penaltyBall));
    const nextLog = [
      ...cleanLog,
      { n: cleanLog.length + 1, ball: String(penaltyBall), by, type: canWin ? "pot" : "foul", reason: "trunfo" },
    ].map((entry, index) => ({ ...entry, n: index + 1 }));
    setPendingPenalty(false);
    await persistMatch(liveMatch.id, { ball_log: nextLog, winner_id: winnerId, status: "finished" });
    await auditLog?.({
      action: "match_finished",
      entityType: "match",
      entityId: liveMatch.id,
      message: `${adminUser?.email || "admin"} definiu ${playerName(winnerId)} como vencedor da partida ${matchPlayersLabel(liveMatch, playerName)}`,
      metadata: { match: liveMatch, winnerId, winnerName: playerName(winnerId), penaltyBall, penaltyBallBy: by, players: [playerName(liveMatch.player_a), playerName(liveMatch.player_b)] },
    });
    onFinished?.(winnerId);
    showToast(canWin ? `${playerName(by)} venceu na bola ${penaltyBall}` : `Bola ${penaltyBall} fora da hora: vitória de ${playerName(winnerId)}`);
  };

  const undoEntry = async (indexToRemove) => {
    const removedEntry = log[indexToRemove];
    const nextLog = log
      .filter((_, index) => index !== indexToRemove)
      .map((entry, index) => ({ ...entry, n: index + 1 }));
    await persistMatch(liveMatch.id, { ball_log: nextLog });
    await auditLog?.({
      action: "ball_undone",
      entityType: "match",
      entityId: liveMatch.id,
      message: `${adminUser?.email || "admin"} desfez uma anotação de bola na partida ${matchPlayersLabel(liveMatch, playerName)}`,
      metadata: { matchId: liveMatch.id, removedEntry, players: [playerName(liveMatch.player_a), playerName(liveMatch.player_b)] },
    });
  };

  const defineGroup = (side) => {
    if (!pendingDefinition) return;
    const by = side === "a" ? liveMatch.player_a : liveMatch.player_b;
    appendBall(pendingDefinition.ball, by, "pot");
    setPendingDefinition(null);
  };

  return (
    <div className="live-table">
      <div className="live-topbar">
        <div className="live-now"><span />Ao vivo</div>
        <div className="live-start-time">iniciada {fmtFull(liveMatch.played_at)}</div>
        <button className="live-cancel" onClick={async () => {
          const confirmed = await requestConfirm?.({
            title: "Cancelar partida?",
            message: "O que já foi marcado será apagado.",
            confirmLabel: "Cancelar partida",
          });
          if (!confirmed) return;
          setMatches((items) => items.filter((match) => match.id !== liveMatch.id));
          if (repo) {
            try {
              await repo.deleteMatch(liveMatch.id);
            } catch (deleteError) {
              showToast(`Erro: ${deleteError.message}`);
              await load();
              return;
            }
          } else await load();
          await auditLog?.({
            action: "match_cancelled",
            entityType: "match",
            entityId: liveMatch.id,
            message: `${adminUser?.email || "admin"} cancelou a partida ${matchPlayersLabel(liveMatch, playerName)}`,
            metadata: { match: liveMatch, players: [playerName(liveMatch.player_a), playerName(liveMatch.player_b)] },
          });
          showToast("Partida cancelada");
        }}>Cancelar partida</button>
      </div>

      <LiveDayScore liveMatch={liveMatch} finished={finished} playerById={playerById} />

      <div className="live-game-grid">
        <LivePlayerColumn
          player={playerA}
          playerId={liveMatch.player_a}
          group={groups[liveMatch.player_a]}
          log={log}
          rules={rules}
          onBallTap={touchGroupBall}
          onPenaltyTap={() => finishWithPenalty(liveMatch.player_a)}
        />

        <div className="live-center">
          <div className={`live-control-card trunfo-card ${trunfoUnlocked ? "unlocked" : ""} ${entryForBall(penaltyBall) ? "marked-one" : ""}`}>
            <div className="eyebrow">bola {penaltyBall} — castigo</div>
            <button className="trunfo-ball" onClick={() => setPendingPenalty(true)}>
              <PoolBall num={penaltyBall} size={58} />
            </button>
            <p>{trunfoUnlocked ? `Liberada para quem zerou o grupo. Use a bola ${penaltyBall} no rack do jogador.` : `Toque aqui quando a ${penaltyBall} cair fora do rack liberado.`}</p>
          </div>

          {!hasGroups && (
            <div className="live-control-card group-setup-card">
              <div className="eyebrow">definir grupos</div>
              <p>{rules.setupText}</p>
              <div className="neutral-rack">
                {availableGroupBalls.map((ball) => <LiveBallButton key={ball} ball={ball} entry={entryForBall(ball)} onClick={() => setPendingDefinition({ ball })} />)}
              </div>
            </div>
          )}

          <div className="live-control-card live-history-card">
            <div className="eyebrow">sequência da partida</div>
            <div className="live-history">
              {log.length ? log.map((entry, index) => (
                <div className="live-history-row" key={`${entry.n}-${index}`}>
                  <span>{index + 1}</span>
                  <BallLogLabel ball={entry.ball} />
                  <strong>{playerName(entry.by)}</strong>
                  <em>{entry.type === "foul" ? "falta" : Number(entry.ball) === Number(penaltyBall) ? "castigo" : "queda"}</em>
                  <button className="history-undo" onClick={() => undoEntry(index)}>Desfazer</button>
                </div>
              )) : <p>Nenhuma bola marcada ainda.</p>}
            </div>
          </div>
        </div>

        <LivePlayerColumn
          player={playerB}
          playerId={liveMatch.player_b}
          group={groups[liveMatch.player_b]}
          log={log}
          rules={rules}
          mirrored
          onBallTap={touchGroupBall}
          onPenaltyTap={() => finishWithPenalty(liveMatch.player_b)}
        />
      </div>

      {pendingDefinition && (
        <div className="define-overlay">
          <div>
            <div className="eyebrow">quem encaçapou?</div>
            <PoolBall num={pendingDefinition.ball} size={58} />
            <div className="define-actions">
              <button className="btn chalk" onClick={() => defineGroup("a")}>{playerA?.name}</button>
              <button className="btn chalk" onClick={() => defineGroup("b")}>{playerB?.name}</button>
            </div>
            <button className="btn ghost small" onClick={() => setPendingDefinition(null)}>Cancelar</button>
          </div>
        </div>
      )}

      {pendingPenalty && (
        <div className="define-overlay">
          <div>
            <div className="eyebrow">quem derrubou a {penaltyBall}?</div>
            <PoolBall num={penaltyBall} size={58} />
            <p className="define-copy">Se esse jogador ainda tiver bolas na mesa, ele perde automaticamente.</p>
            <div className="define-actions">
              <button className="btn chalk" onClick={() => finishWithPenalty(liveMatch.player_a)}>{playerA?.name}</button>
              <button className="btn chalk" onClick={() => finishWithPenalty(liveMatch.player_b)}>{playerB?.name}</button>
            </div>
            <button className="btn ghost small" onClick={() => setPendingPenalty(false)}>Cancelar</button>
          </div>
        </div>
      )}
    </div>
  );
}

function LivePlayerColumn({ player, playerId, group, log, rules, mirrored = false, onBallTap, onPenaltyTap }) {
  const groupBallsList = group ? rules.groupBalls(group) : [];
  const visibleBalls = groupBallsList.filter((ball) => !log.some((item) => Number(item.ball) === ball));
  const groupCleared = Boolean(group && visibleBalls.length === 0);
  const penaltyDown = log.some((item) => Number(item.ball) === Number(rules.penaltyBall));
  const pottedCount = groupBallsList.filter((ball) => {
    const entry = log.find((item) => Number(item.ball) === ball);
    return entry && entry.type !== "foul" && entry.by === playerId;
  }).length;

  return (
    <section className={`live-player-column ${mirrored ? "mirrored" : ""}`}>
      <div className="live-player-head">
        <div>
          <h3>{player?.name}</h3>
          <span>{group ? rules.groupLabel(group) : "grupo indefinido"}</span>
        </div>
      </div>
      <div className="live-count">
        <strong>{pottedCount}</strong>
        <span>/ {groupBallsList.length || 0} na mesa</span>
      </div>
      <div className="live-player-area">
        {group ? (
          <div className="player-rack">
            {visibleBalls.length ? visibleBalls.map((ball) => (
              <LiveBallButton key={ball} ball={ball} onClick={(event) => {
                event.stopPropagation();
                onBallTap(ball, playerId);
              }} />
            )) : groupCleared && !penaltyDown ? (
              <LiveBallButton ball={rules.penaltyBall} onClick={(event) => {
                event.stopPropagation();
                onPenaltyTap();
              }} />
            ) : <div className="rack-empty cleared">Grupo zerado.</div>}
          </div>
        ) : (
          <div className="rack-empty">As bolas aparecem aqui quando o grupo for definido.</div>
        )}
      </div>
    </section>
  );
}

function LiveBallButton({ ball, entry, onClick }) {
  return (
    <button className={`live-ball-btn ${entry ? "marked" : ""} ${entry?.type === "foul" ? "foul" : ""}`} onClick={onClick}>
      <PoolBall num={ball} size={46} />
      {entry && <span>{entry.type === "foul" ? "!" : "✓"}</span>}
    </button>
  );
}

function BallLogLabel({ ball }) {
  if (ball === "branca") return <WhiteBall size={26} />;
  const num = Number(ball);
  if (num >= 1 && num <= 15) return <PoolBall num={num} size={26} />;
  return <b>{ball}</b>;
}
