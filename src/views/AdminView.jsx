import { useEffect, useState } from "react";
import { PlayerBall, PoolBall, WhiteBall } from "../components/balls.jsx";
import { ViewHead } from "../components/layout.jsx";
import { classifyPot, deriveGroups, groupBalls, groupLabel } from "../domain/rules.js";
import { fmtFull } from "../utils/date.js";

export function AdminView({ repo, isAdmin, setIsAdmin, players, addPlayer, updatePlayer, liveMatch, playerById, playerName, persistMatch, setMatches, load, showToast }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [adminTab, setAdminTab] = useState("partida");
  const [lastWinnerId, setLastWinnerId] = useState("");

  if (!isAdmin) {
    return (
      <>
        <ViewHead eyebrow="acesso restrito" title="Admin" />
        <div className="card">
          <p className="admin-help">Faça login pra lançar partidas. Quem não é admin só visualiza.</p>
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
        <button className="logout-mini" onClick={async () => {
          if (repo) await repo.signOut();
          setIsAdmin(false);
          showToast("Saiu do admin");
        }}>Sair</button>
      </div>
      {adminTab === "jogadores" ? (
        <PlayerAdmin players={players} addPlayer={addPlayer} updatePlayer={updatePlayer} showToast={showToast} />
      ) : liveMatch ? (
        <section className="panel live-admin-panel">
          <LiveMatchPanel liveMatch={liveMatch} playerById={playerById} playerName={playerName} persistMatch={persistMatch} setMatches={setMatches} load={load} showToast={showToast} repo={repo} onFinished={setLastWinnerId} />
        </section>
      ) : (
        <section className="panel">
          <div className="eyebrow">admin</div>
          <div className="viewtitle">Iniciar partida</div>
          <StartMatchPanel players={players} setMatches={setMatches} repo={repo} load={load} showToast={showToast} preferredPlayerA={lastWinnerId} />
        </section>
      )}
    </>
  );
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

function StartMatchPanel({ players, setMatches, repo, load, showToast, preferredPlayerA = "" }) {
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
        if (!repo) {
          setMatches((items) => [...items, { ...match, id: `demo-live-${Date.now()}` }]);
          showToast("Partida iniciada");
          return;
        }
        try {
          await repo.startMatch(match);
          await load();
          showToast("Partida iniciada");
        } catch (startError) {
          showToast(`Erro: ${startError.message}`);
        }
      }}>Iniciar partida</button>
    </div>
  );
}

function LiveMatchPanel({ liveMatch, playerById, playerName, persistMatch, setMatches, load, showToast, repo, onFinished }) {
  const [pendingDefinition, setPendingDefinition] = useState(null);
  const [pendingOne, setPendingOne] = useState(false);
  const playerA = playerById(liveMatch.player_a);
  const playerB = playerById(liveMatch.player_b);
  const log = liveMatch.ball_log || [];
  const groups = deriveGroups(liveMatch, log);
  const hasGroups = Boolean(groups[liveMatch.player_a] && groups[liveMatch.player_b]);
  const removedNumbered = new Set(log.map((entry) => Number(entry.ball)).filter((num) => num >= 1 && num <= 15));
  const availableGroupBalls = Array.from({ length: 14 }, (_, index) => index + 2).filter((num) => !removedNumbered.has(num));

  const removeBall = async (ball) => {
    const nextLog = log
      .filter((entry) => Number(entry.ball) !== Number(ball))
      .map((entry, index) => ({ ...entry, n: index + 1 }));
    await persistMatch(liveMatch.id, { ball_log: nextLog });
  };

  const appendBall = async (ball, by, type = "pot", reason = "", brk = false) => {
    const nextLog = [...log, { n: log.length + 1, ball: String(ball), by, type, ...(reason ? { reason } : {}), ...(brk ? { brk: true } : {}) }];
    await persistMatch(liveMatch.id, { ball_log: nextLog });
  };

  const entryForBall = (ball) => log.find((entry) => Number(entry.ball) === Number(ball));
  const isGroupCleared = (playerId) => {
    const group = groups[playerId];
    if (!group) return false;
    return groupBalls(group).every((ball) => removedNumbered.has(ball));
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
    const result = classifyPot({ ball, by: ownerId, groups, log });
    if (result.type === "foul") showToast(result.reason === "oponente" ? "Falta! matou bola do oponente" : "Falta! bola 1 cedo demais");
    appendBall(ball, ownerId, result.type, result.reason);
  };

  const finishWithOne = async (by) => {
    const canWin = isGroupCleared(by);
    const winnerId = canWin ? by : (by === liveMatch.player_a ? liveMatch.player_b : liveMatch.player_a);
    const cleanLog = log.filter((entry) => Number(entry.ball) !== 1);
    const nextLog = [
      ...cleanLog,
      { n: cleanLog.length + 1, ball: "1", by, type: canWin ? "pot" : "foul", reason: "trunfo" },
    ].map((entry, index) => ({ ...entry, n: index + 1 }));
    setPendingOne(false);
    await persistMatch(liveMatch.id, { ball_log: nextLog, winner_id: winnerId, status: "finished" });
    onFinished?.(winnerId);
    showToast(canWin ? `${playerName(by)} venceu na bola 1` : `Bola 1 fora da hora: vitória de ${playerName(winnerId)}`);
  };

  const undoEntry = async (indexToRemove) => {
    const nextLog = log
      .filter((_, index) => index !== indexToRemove)
      .map((entry, index) => ({ ...entry, n: index + 1 }));
    await persistMatch(liveMatch.id, { ball_log: nextLog });
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
          if (!window.confirm("Cancelar a partida em andamento? O que já foi marcado será apagado.")) return;
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
          showToast("Partida cancelada");
        }}>Cancelar partida</button>
      </div>

      <div className="live-game-grid">
        <LivePlayerColumn
          player={playerA}
          playerId={liveMatch.player_a}
          group={groups[liveMatch.player_a]}
          log={log}
          onBallTap={touchGroupBall}
          onOneTap={() => finishWithOne(liveMatch.player_a)}
        />

        <div className="live-center">
          <div className={`live-control-card trunfo-card ${trunfoUnlocked ? "unlocked" : ""} ${entryForBall(1) ? "marked-one" : ""}`}>
            <div className="eyebrow">a bola 1 — o trunfo</div>
            <button className="trunfo-ball" onClick={() => setPendingOne(true)}>
              <PoolBall num={1} size={58} />
            </button>
            <p>{trunfoUnlocked ? "Liberada para quem zerou o grupo. Use a bola 1 no rack do jogador." : "Toque aqui quando a 1 cair fora do rack liberado."}</p>
          </div>

          {!hasGroups && (
            <div className="live-control-card group-setup-card">
              <div className="eyebrow">definir grupos</div>
              <p>Toque na primeira bola encaçapada e escolha quem matou. Ela define pares e ímpares.</p>
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
                  <em>{entry.type === "foul" ? "falta" : Number(entry.ball) === 1 ? "trunfo" : "queda"}</em>
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
          mirrored
          onBallTap={touchGroupBall}
          onOneTap={() => finishWithOne(liveMatch.player_b)}
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

      {pendingOne && (
        <div className="define-overlay">
          <div>
            <div className="eyebrow">quem derrubou a 1?</div>
            <PoolBall num={1} size={58} />
            <p className="define-copy">Se esse jogador ainda tiver bolas na mesa, ele perde automaticamente.</p>
            <div className="define-actions">
              <button className="btn chalk" onClick={() => finishWithOne(liveMatch.player_a)}>{playerA?.name}</button>
              <button className="btn chalk" onClick={() => finishWithOne(liveMatch.player_b)}>{playerB?.name}</button>
            </div>
            <button className="btn ghost small" onClick={() => setPendingOne(false)}>Cancelar</button>
          </div>
        </div>
      )}
    </div>
  );
}

function LivePlayerColumn({ player, playerId, group, log, mirrored = false, onBallTap, onOneTap }) {
  const groupBallsList = group ? groupBalls(group) : [];
  const visibleBalls = groupBallsList.filter((ball) => !log.some((item) => Number(item.ball) === ball));
  const groupCleared = Boolean(group && visibleBalls.length === 0);
  const oneDown = log.some((item) => Number(item.ball) === 1);
  const pottedCount = groupBallsList.filter((ball) => {
    const entry = log.find((item) => Number(item.ball) === ball);
    return entry && entry.type !== "foul" && entry.by === playerId;
  }).length;

  return (
    <section className={`live-player-column ${mirrored ? "mirrored" : ""}`}>
      <div className="live-player-head">
        <div>
          <h3>{player?.name}</h3>
          <span>{group ? groupLabel(group) : "grupo indefinido"}</span>
        </div>
      </div>
      <div className="live-count">
        <strong>{pottedCount}</strong>
        <span>/ 7 na mesa</span>
      </div>
      <div className="live-player-area">
        {group ? (
          <div className="player-rack">
            {visibleBalls.length ? visibleBalls.map((ball) => (
              <LiveBallButton key={ball} ball={ball} onClick={(event) => {
                event.stopPropagation();
                onBallTap(ball, playerId);
              }} />
            )) : groupCleared && !oneDown ? (
              <LiveBallButton ball={1} onClick={(event) => {
                event.stopPropagation();
                onOneTap();
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
