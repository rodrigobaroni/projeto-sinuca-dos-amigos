import { useEffect, useMemo, useRef, useState } from "react";
import { PlayerBall, PoolBall, WhiteBall } from "../components/balls.jsx";
import { DefaultPlayerPanel } from "../components/DefaultPlayerPanel.jsx";
import { FinishMatchButton } from "../components/FinishMatchButton.jsx";
import { ViewHead } from "../components/layout.jsx";
import { PlayerPickerModal } from "../components/PlayerPickerModal.jsx";
import { QueuePanel } from "../components/QueuePanel.jsx";
import { getGameRules } from "../domain/rules.js";
import { addMatchIfAbsent, matchMode, matchPlayerIds, matchSides, sideLabel, teamKey, winnerSide } from "../domain/match.js";
import { eligibleForTable } from "../domain/queue.js";
import { loadGameSettings } from "../services/gameSettingsStorage.js";
import { fmtFull, fmtPeriod, gameDayKey, gameDayRange, matchesInRange } from "../utils/date.js";
import { AdminSettings } from "./AdminSettings.jsx";

// queue (estado da fila, ver src/hooks/useQueue.js) alimenta a secao "fila"
// das configuracoes (TablesAdmin), o QueuePanel do painel (atras do
// interruptor showQueuePanel), a mesa gravada em toda partida iniciada
// (StartMatchPanel) e o retorno do perdedor pro fim da fila ao finalizar
// (handleMatchFinished, ver onFinished nos tres pontos que finalizam
// partida: LiveMatchRouter, o FinishMatchButton do card e finishWithPenalty).
export function AdminView({ repo, isAdmin, setIsAdmin, adminUser, auditLogs, auditLog, refreshAuditLogs, players, addPlayer, updatePlayer, liveMatches, finished, currentPlayerId, onCurrentPlayerChange, playerById, playerName, persistMatch, setMatches, load, showToast, requestConfirm, queue }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [adminTab, setAdminTab] = useState("partida");
  // prefill substitui o antigo lastWinnerId: alem do vencedor (jogador A),
  // carrega a mesa da partida que terminou e quem deveria entrar como
  // adversario (jogador B), calculados uma vez aqui e so aplicados pelo
  // StartMatchPanel - nunca reimpostos a cada render dele (ver o efeito de
  // stamp la, que e a parte que corrige o bug de sobrescrever escolha manual
  // do admin).
  const [prefill, setPrefill] = useState(null);
  const [selectedLiveMatchId, setSelectedLiveMatchId] = useState("");
  const [gameSettings, setGameSettings] = useState(loadGameSettings);
  const selectedLiveMatch = liveMatches.find((match) => match.id === selectedLiveMatchId) || null;

  // Perdedor(es) voltam pro fim da fila em qualquer caminho que finalize uma
  // partida - isso independe de autoPickPlayers, que so controla o
  // pre-preenchimento do formulario. Falha ao enfileirar não desfaz a
  // partida finalizada (ela já foi gravada); só avisa, igual a qualquer
  // outra escrita da fila.
  const handleMatchFinished = async ({ winnerIds, loserIds, tableId, mode: finishedMode }) => {
    if (loserIds.length && queue.available !== false) {
      try {
        await queue.enqueuePlayers(loserIds);
      } catch (error) {
        showToast(`Erro: ${error.message}`);
      }
    }
    if (!gameSettings.autoPickPlayers) return;
    // A mesa só entra no prefill se ainda estiver ativa - desativada entre o
    // fim da partida e agora, ou apagada, ela não pode ser pré-selecionada.
    const validTableId = tableId && queue.activeTables.some((table) => table.id === tableId) ? tableId : "";
    // Lado B vem da fila ANTES de enqueuePlayers aplicar (o estado só
    // atualiza no próximo render): os próprios perdedores desta partida
    // nunca entram como sugestão de adversário imediato, o que é o
    // comportamento certo - eles acabaram de voltar pro fim da fila.
    const neededB = finishedMode === "2x2" ? 2 : 1;
    const nextB = validTableId
      ? eligibleForTable(validTableId, queue.entries).slice(0, neededB).map((entry) => entry.player_id)
      : [];
    setPrefill({ stamp: Date.now(), mode: finishedMode, tableId: validTableId, a: winnerIds, b: nextB });
  };

  if (!isAdmin) {
    return (
      <>
        <ViewHead eyebrow="acesso restrito" title="Painel" />
        <div className="card">
          <p className="admin-help">Faça login para acessar o painel. Quem não é admin só visualiza.</p>
          <label className="fld"><span>e-mail</span><input className="search no-margin" type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
          <label className="fld"><span>senha</span><input className="search no-margin" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>
          <button className="btn chalk" onClick={async () => {
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
          await repo.signOut();
          setIsAdmin(false);
          showToast("Saiu do admin");
        }}>Sair</button>
      </div>
      {adminTab === "jogadores" ? (
        <PlayerAdmin players={players} addPlayer={addPlayer} updatePlayer={updatePlayer} showToast={showToast} />
      ) : adminTab === "configuracoes" ? (
        <AdminSettings settings={gameSettings} onSettingsChange={setGameSettings} adminUser={adminUser} auditLog={auditLog} showToast={showToast} queue={queue} requestConfirm={requestConfirm} />
      ) : adminTab === "logs" ? (
        <AdminLogs logs={auditLogs} refreshAuditLogs={refreshAuditLogs} />
      ) : selectedLiveMatch ? (
        <section className="panel live-admin-panel">
          {liveMatches.length > 1 && (
            <button className="btn ghost small" onClick={() => setSelectedLiveMatchId("")}>← outras partidas ao vivo ({liveMatches.length - 1})</button>
          )}
          <DefaultPlayerPanel players={players} currentPlayerId={currentPlayerId} onCurrentPlayerChange={onCurrentPlayerChange} />
          <LiveMatchRouter settings={gameSettings} adminUser={adminUser} auditLog={auditLog} liveMatch={selectedLiveMatch} finished={finished} playerById={playerById} playerName={playerName} persistMatch={persistMatch} setMatches={setMatches} load={load} showToast={showToast} repo={repo} onFinished={handleMatchFinished} requestConfirm={requestConfirm} />
        </section>
      ) : (
        <section className="panel">
          <div className="eyebrow">admin</div>
          <div className="viewtitle">Painel</div>
          <DefaultPlayerPanel players={players} currentPlayerId={currentPlayerId} onCurrentPlayerChange={onCurrentPlayerChange} />
          {/* Wrappers so de layout (ver styles.css, bloco @media (min-width:768px)):
              em iPad/desktop as partidas ao vivo viram grid e a fila fica ao
              lado do formulario. Abaixo de 768px nao ha regra nenhuma neles,
              entao o empilhamento de hoje continua identico. */}
          {liveMatches.length > 0 && (
          <div className="panel-live-grid">
            {liveMatches.map((match) => (
              // Dois botoes nativos irmaos, nao um aninhado dentro do outro: o
              // keydown de Enter/Espaço no botao de "Definir vencedor" nao pode
              // borbulhar e tambem abrir a partida (ver ADENDO D1).
              <div key={match.id} className="card live-card">
                <button type="button" className="live-card-open" onClick={() => setSelectedLiveMatchId(match.id)}>
                  <div className="live-label"><span /> <span className="eyebrow">ao vivo agora</span></div>
                  <div className="live-row">
                    <strong>{sideLabel(match, "a", playerName)} <span>vs</span> {sideLabel(match, "b", playerName)}</strong>
                    <span className="rank-sub">{(match.ball_log || []).length} bolas</span>
                  </div>
                </button>
                {gameSettings.finishFromPanel && (
                  <FinishMatchButton match={match} playerName={playerName} persistMatch={persistMatch} auditLog={auditLog} adminUser={adminUser} showToast={showToast} onFinished={handleMatchFinished} buttonClassName="btn chalk small" />
                )}
              </div>
            ))}
          </div>
          )}
          <div className="panel-start-grid">
            {gameSettings.showQueuePanel && (
              <QueuePanel queue={queue} liveMatches={liveMatches} players={players} playerById={playerById} showToast={showToast} />
            )}
            <StartMatchPanel adminUser={adminUser} auditLog={auditLog} players={players} liveMatches={liveMatches} activeTables={queue.activeTables} queueLoaded={queue.loaded} repo={repo} setMatches={setMatches} showToast={showToast} prefill={prefill} onStarted={(id) => { if (gameSettings.openMatchOnStart) setSelectedLiveMatchId(id); }} />
          </div>
        </section>
      )}
    </>
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
    table_created: "Mesa criada",
    table_updated: "Mesa alterada",
    table_deleted: "Mesa removida",
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

function StartMatchPanel({ adminUser, auditLog, players, liveMatches = [], activeTables = [], queueLoaded = false, repo, setMatches, showToast, prefill, onStarted }) {
  const busyPlayerIds = new Set(liveMatches.flatMap(matchPlayerIds));
  const availablePlayers = players.filter((player) => !busyPlayerIds.has(player.id));
  const busyPlayers = players.filter((player) => busyPlayerIds.has(player.id));

  // Default so pro primeiro uso da noite (sem prefill ainda): joga o
  // primeiro disponivel em A, o segundo em B, pra nao abrir o formulario
  // vazio. Calculado so na montagem - depois disso quem manda e o prefill
  // (aplicado uma vez por stamp, efeito abaixo) e a escolha manual do admin.
  const initialPlayerA = availablePlayers[0]?.id || "";
  const initialPlayerB = availablePlayers.find((player) => player.id !== initialPlayerA)?.id || "";
  const [mode, setMode] = useState("1x1");
  const [playerA, setPlayerA] = useState(initialPlayerA);
  const [playerA2, setPlayerA2] = useState("");
  const [playerB, setPlayerB] = useState(initialPlayerB);
  const [playerB2, setPlayerB2] = useState("");
  // Com 0 ou 1 mesa ativa nao ha campo pra escolher - a unica mesa (se
  // houver) e usada direto, sem UI, pro formulario continuar identico ao de
  // hoje nesse caso (ver tableHolders, que so rastreia dono de mesa quando a
  // partida carrega table_id).
  const [tableId, setTableId] = useState(() => (activeTables.length === 1 ? activeTables[0].id : ""));
  const [pickerFor, setPickerFor] = useState(null);
  const [starting, setStarting] = useState(false);
  const [when, setWhen] = useState(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  });
  // Guarda o ultimo stamp aplicado pra aplicar o prefill exatamente uma vez
  // por partida finalizada - nao a cada render. Sem isso (era o bug: um
  // unico efeito reagindo a players/liveMatches) o formulario sobrescrevia a
  // escolha manual do admin toda vez que QUALQUER partida comecava ou
  // terminava em QUALQUER mesa, nao so quando este prefill mudava.
  const appliedPrefillStamp = useRef(null);
  // dirty marca que o admin mexeu na mao (escolheu jogador, mode ou mesa)
  // desde o ultimo prefill aplicado. Existe pra cobrir o caso que o guard de
  // stamp sozinho nao cobre: o admin monta a proxima partida da Mesa 1 na
  // mao enquanto uma partida da Mesa 2 termina em outro lugar do painel -
  // isso gera um stamp novo, valido, de uma mesa diferente da que ele esta
  // montando. Sem dirty, esse prefill de outra mesa apagaria a escolha dele.
  const [dirty, setDirty] = useState(false);

  // Efeito 1: aplica o prefill (mesa, dupla A, dupla B) uma vez por stamp -
  // exceto quando o formulario esta sujo com uma mesa diferente da do
  // prefill, caso em que so consome o stamp (pra nao aplicar atrasado depois)
  // sem tocar em nenhum campo.
  useEffect(() => {
    if (!prefill || prefill.stamp === appliedPrefillStamp.current) return;
    appliedPrefillStamp.current = prefill.stamp;
    if (dirty && prefill.tableId !== tableId) return;
    setMode(prefill.mode === "2x2" ? "2x2" : "1x1");
    setPlayerA(prefill.a?.[0] || "");
    setPlayerA2(prefill.a?.[1] || "");
    // b vazio (ninguem elegivel pra essa mesa na fila) e resultado valido:
    // o campo fica vazio, sem erro, e o admin escolhe na mao.
    setPlayerB(prefill.b?.[0] || "");
    setPlayerB2(prefill.b?.[1] || "");
    setTableId(prefill.tableId || (activeTables.length === 1 ? activeTables[0].id : ""));
    setDirty(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefill]);

  // Efeito 2: so REMOVE selecoes que viraram invalidas (jogador entrou em
  // partida ao vivo em outra mesa, mesa foi desativada) - nunca impõe uma
  // nova escolha. E o que faz um toque em "iniciar partida" alhures, ou
  // desativar mesa, não atropelar quem o admin já tinha selecionado aqui.
  useEffect(() => {
    const clearIfInvalid = (id) => (id && availablePlayers.some((player) => player.id === id) ? id : "");
    setPlayerA((current) => clearIfInvalid(current));
    setPlayerA2((current) => clearIfInvalid(current));
    setPlayerB((current) => clearIfInvalid(current));
    setPlayerB2((current) => clearIfInvalid(current));
    setTableId((current) => {
      if (current && activeTables.some((table) => table.id === current)) return current;
      return activeTables.length === 1 ? activeTables[0].id : "";
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [players, liveMatches, activeTables]);

  if (players.length < 2) return <div className="empty small-empty">Cadastre pelo menos 2 jogadores acima pra iniciar uma partida.</div>;
  if (availablePlayers.length < 2) return <div className="empty small-empty">Todo mundo cadastrado já está em partida ao vivo agora.</div>;
  const selections = { a: playerA, a2: playerA2, b: playerB, b2: playerB2 };
  const requiredSlots = mode === "2x2" ? ["a", "a2", "b", "b2"] : ["a", "b"];
  const valid = requiredSlots.every((slot) => selections[slot])
    && new Set(requiredSlots.map((slot) => selections[slot])).size === requiredSlots.length
    && (activeTables.length <= 1 || Boolean(tableId))
    // Enquanto a fila do admin ainda não carregou, tables está [] e
    // activeTables.length <= 1 dá falso positivo de "regra desligada" -
    // deixaria iniciar sem table_id mesmo com duas mesas no banco. A janela
    // é menor que 1s; travar o botão até loadQueue resolver evita a partida
    // órfã (sem mesa, some do rastreio da fila em silêncio).
    && queueLoaded;
  const pickerLabels = {
    a: "Quem começa (quebra)?",
    a2: "Parceiro de quem quebra",
    b: "Primeiro adversário",
    b2: "Parceiro adversário",
  };
  return (
    <div className="card">
      {busyPlayers.length > 0 && (
        <p className="admin-help">
          Ocultamos da lista (já em partida ao vivo): {busyPlayers.map((player) => player.name).join(", ")}.
        </p>
      )}
      <div className="fld"><span>modalidade</span><div className="mode-switch compact"><button type="button" className={mode === "1x1" ? "active" : ""} onClick={() => { setMode("1x1"); setDirty(true); }}>1x1</button><button type="button" className={mode === "2x2" ? "active" : ""} onClick={() => { setMode("2x2"); setDirty(true); }}>2x2</button></div></div>
      {activeTables.length > 1 && (
        <label className="fld">
          <span>mesa</span>
          <select className="select no-margin" value={tableId} onChange={(event) => { setTableId(event.target.value); setDirty(true); }}>
            <option value="">Selecionar mesa</option>
            {activeTables.map((table) => <option key={table.id} value={table.id}>{table.name}</option>)}
          </select>
        </label>
      )}
      <div className={mode === "2x2" ? "team-picker-grid" : ""}>
        <div className="team-picker-side">
          {mode === "2x2" && <strong>Dupla A</strong>}
          <label className="fld"><span>jogador A (quebra)</span><button type="button" className="select" onClick={() => setPickerFor("a")}>{availablePlayers.find((player) => player.id === playerA)?.name || "Selecionar jogador"}</button></label>
          {mode === "2x2" && <label className="fld"><span>parceiro A</span><button type="button" className="select" onClick={() => setPickerFor("a2")}>{availablePlayers.find((player) => player.id === playerA2)?.name || "Selecionar jogador"}</button></label>}
        </div>
        <div className="team-picker-side">
          {mode === "2x2" && <strong>Dupla B</strong>}
          <label className="fld"><span>jogador B</span><button type="button" className="select" onClick={() => setPickerFor("b")}>{availablePlayers.find((player) => player.id === playerB)?.name || "Selecionar jogador"}</button></label>
          {mode === "2x2" && <label className="fld"><span>parceiro B</span><button type="button" className="select" onClick={() => setPickerFor("b2")}>{availablePlayers.find((player) => player.id === playerB2)?.name || "Selecionar jogador"}</button></label>}
        </div>
      </div>
      <label className="fld"><span>data e hora</span><input className="search no-margin" type="datetime-local" value={when} onChange={(event) => setWhen(event.target.value)} /></label>
      {pickerFor && (
        <PlayerPickerModal
          title={pickerLabels[pickerFor]}
          players={availablePlayers.filter((player) => !requiredSlots.some((slot) => slot !== pickerFor && selections[slot] === player.id))}
          onChoose={(id) => {
            if (pickerFor === "a") setPlayerA(id);
            else if (pickerFor === "a2") setPlayerA2(id);
            else if (pickerFor === "b") setPlayerB(id);
            else setPlayerB2(id);
            setDirty(true);
            setPickerFor(null);
          }}
          onClose={() => setPickerFor(null)}
        />
      )}
      <button className="btn chalk" disabled={starting || !valid || (mode === "2x2" && availablePlayers.length < 4)} onClick={async () => {
        // Sem esta trava, dois toques criam duas partidas ao vivo com os mesmos
        // jogadores - e o banco nao impede, porque varias mesas sao esperadas.
        if (starting) return;
        setStarting(true);
        const match = {
          mode,
          player_a: playerA,
          player_b: playerB,
          breaker_id: playerA,
          team_a: mode === "2x2" ? [playerA, playerA2] : null,
          team_b: mode === "2x2" ? [playerB, playerB2] : null,
          played_at: new Date(when).toISOString(),
          ball_log: [],
          status: "live",
          // table_id fora do payload quando nao ha mesa: table_id: null fixo
          // faria o PostgREST devolver 400 num banco sem a migração 20260915,
          // e iniciar partida é o caminho mais quente do painel.
          ...(tableId ? { table_id: tableId } : {}),
        };
        const playerAName = players.find((player) => player.id === playerA)?.name;
        const playerBName = players.find((player) => player.id === playerB)?.name;
        try {
          const createdMatch = await repo.startMatch(match);
          // Resposta do insert: so preenche a lacuna se o realtime ainda nao
          // tiver chegado primeiro com uma versao mais nova (ver domain/match.js).
          setMatches((items) => addMatchIfAbsent(items, createdMatch));
          // Partida efetivamente iniciada: o que estava "sujo" acabou de virar
          // uma partida ao vivo (o efeito 2 ja limpa os jogadores, que agora
          // estao ocupados) - um prefill futuro pode voltar a aplicar normal.
          setDirty(false);
          await auditLog?.({
            action: "match_started",
            entityType: "match",
            entityId: createdMatch?.id,
            message: `${adminUser?.email || "admin"} iniciou a partida ${sideLabel(match, "a", (id) => players.find((player) => player.id === id)?.name)} x ${sideLabel(match, "b", (id) => players.find((player) => player.id === id)?.name)}`,
            metadata: { match: createdMatch, players: matchPlayerIds(match).map((id) => players.find((player) => player.id === id)?.name) },
          });
          onStarted?.(createdMatch.id);
          showToast("Partida iniciada");
        } catch (startError) {
          showToast(`Erro: ${startError.message}`);
        } finally {
          setStarting(false);
        }
      }}>{starting ? "Iniciando..." : "Iniciar partida"}</button>
    </div>
  );
}

function LiveMatchRouter({ settings, ...props }) {
  // As settings agora vivem no AdminView (D5: AdminSettings e LiveMatchRouter
  // sao ramos mutuamente exclusivos do mesmo ternario, entao nunca mudam sob os
  // pes de uma partida ao vivo aberta). O useMemo evita recriar o objeto de
  // regras a cada render enquanto a referencia de settings nao mudar.
  const rules = useMemo(() => getGameRules(settings), [settings]);
  if (matchMode(props.liveMatch) === "2x2" || !settings.trackBalls || rules.simpleOnly) return <SimpleLiveMatchPanel {...props} settings={settings} rules={rules} />;
  return <LiveMatchPanel {...props} settings={settings} rules={rules} />;
}

function liveDayHeadToHead(finished, liveMatch) {
  const gameDay = gameDayKey(liveMatch.played_at);
  const { start, end } = gameDayRange(gameDay);
  const liveSides = matchSides(liveMatch);
  const dayMatches = matchesInRange(finished, start, end).filter((match) => {
    if (matchMode(match) !== matchMode(liveMatch)) return false;
    const sides = matchSides(match);
    return [teamKey(sides.a), teamKey(sides.b)].includes(teamKey(liveSides.a))
      && [teamKey(sides.a), teamKey(sides.b)].includes(teamKey(liveSides.b));
  });
  const liveAKey = teamKey(liveSides.a);
  return {
    gameDay,
    start,
    end,
    total: dayMatches.length,
    winsA: dayMatches.filter((match) => teamKey(matchSides(match)[winnerSide(match)]) === liveAKey).length,
    winsB: dayMatches.filter((match) => teamKey(matchSides(match)[winnerSide(match)]) !== liveAKey).length,
  };
}

function LiveDayScore({ liveMatch, finished, playerById }) {
  const score = liveDayHeadToHead(finished, liveMatch);
  return (
    <section className="live-day-score">
      <div>
        <div className="eyebrow">confronto da jogatina</div>
        <span>{fmtPeriod(score.start)} até {fmtPeriod(score.end)} · {score.total} partida{score.total !== 1 ? "s" : ""} finalizada{score.total !== 1 ? "s" : ""}</span>
      </div>
      <div className="live-day-score-board">
        <strong>{sideLabel(liveMatch, "a", (id) => playerById(id)?.name)}</strong>
        <b>{score.winsA}</b>
        <em>x</em>
        <b>{score.winsB}</b>
        <strong>{sideLabel(liveMatch, "b", (id) => playerById(id)?.name)}</strong>
      </div>
    </section>
  );
}

function matchPlayersLabel(liveMatch, playerName) {
  return `${sideLabel(liveMatch, "a", playerName)} x ${sideLabel(liveMatch, "b", playerName)}`;
}

function SimpleLiveMatchPanel({ adminUser, auditLog, liveMatch, finished, playerById, playerName, persistMatch, setMatches, load, showToast, repo, onFinished, rules, requestConfirm }) {
  const playerA = playerById(liveMatch.player_a);
  const playerB = playerById(liveMatch.player_b);

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
          try {
            await repo.deleteMatch(liveMatch.id);
          } catch (deleteError) {
            showToast(`Erro: ${deleteError.message}`);
            await load();
            return;
          }
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
          <strong>{sideLabel(liveMatch, "a", playerName)}</strong>
        </div>
        <div className="simple-live-vs">VS</div>
        <div className="simple-live-player">
          <PlayerBall player={playerB} size={68} />
          <strong>{sideLabel(liveMatch, "b", playerName)}</strong>
        </div>
      </section>

      <FinishMatchButton match={liveMatch} playerName={playerName} persistMatch={persistMatch} auditLog={auditLog} adminUser={adminUser} showToast={showToast} onFinished={onFinished} buttonClassName="btn chalk simple-winner-btn" />
    </div>
  );
}

function LiveMatchPanel({ adminUser, auditLog, liveMatch, finished, playerById, playerName, persistMatch, setMatches, load, showToast, repo, onFinished, rules, requestConfirm }) {
  const [pendingDefinition, setPendingDefinition] = useState(null);
  const [pendingPenalty, setPendingPenalty] = useState(false);
  // Cada anotacao reescreve o ball_log inteiro a partir da copia local. Sem esta
  // trava, dois toques rapidos leem o mesmo log e o segundo apaga a bola do
  // primeiro. (Nao resolve duas mesas anotando junto - isso precisa de escrita
  // atomica no banco, ver AUD-06 no vault.)
  const [writing, setWriting] = useState(false);
  const serialize = async (run) => {
    if (writing) return;
    setWriting(true);
    try {
      await run();
    } finally {
      setWriting(false);
    }
  };
  const playerA = playerById(liveMatch.player_a);
  const playerB = playerById(liveMatch.player_b);
  const log = liveMatch.ball_log || [];
  const groups = rules.deriveGroups(liveMatch, log);
  const hasGroups = Boolean(groups[liveMatch.player_a] && groups[liveMatch.player_b]);
  const removedNumbered = new Set(log.map((entry) => Number(entry.ball)).filter((num) => num >= 1 && num <= 15));
  const availableGroupBalls = rules.setupBalls().filter((num) => !removedNumbered.has(num));
  const penaltyBall = rules.penaltyBall;

  const removeBall = (ball) => serialize(async () => {
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
  });

  const appendBall = (ball, by, type = "pot", reason = "", brk = false) => serialize(async () => {
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
  });

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

  const finishWithPenalty = (by) => serialize(async () => {
    const canWin = isGroupCleared(by);
    const winnerId = canWin ? by : (by === liveMatch.player_a ? liveMatch.player_b : liveMatch.player_a);
    const cleanLog = log.filter((entry) => Number(entry.ball) !== Number(penaltyBall));
    const nextLog = [
      ...cleanLog,
      { n: cleanLog.length + 1, ball: String(penaltyBall), by, type: canWin ? "pot" : "foul", reason: "trunfo" },
    ].map((entry, index) => ({ ...entry, n: index + 1 }));
    setPendingPenalty(false);
    const ok = await persistMatch(liveMatch.id, { ball_log: nextLog, winner_id: winnerId, status: "finished", ended_at: new Date().toISOString() });
    // persistMatch ja mostrou o toast de erro e recarregou o estado; sem o
    // sinal de sucesso a gente mandaria o perdedor pra fila de uma partida
    // que nao terminou de verdade no banco (mesmo bug que o FinishMatchButton
    // ja evitava - so nao tinha sido copiado pra cá ainda).
    if (!ok) return;
    await auditLog?.({
      action: "match_finished",
      entityType: "match",
      entityId: liveMatch.id,
      message: `${adminUser?.email || "admin"} definiu ${playerName(winnerId)} como vencedor da partida ${matchPlayersLabel(liveMatch, playerName)}`,
      metadata: { match: liveMatch, winnerId, winnerName: playerName(winnerId), penaltyBall, penaltyBallBy: by, players: [playerName(liveMatch.player_a), playerName(liveMatch.player_b)] },
    });
    const side = winnerId === liveMatch.player_a ? "a" : "b";
    const loserSide = side === "a" ? "b" : "a";
    onFinished?.({
      match: liveMatch,
      winnerSide: side,
      winnerIds: matchSides(liveMatch)[side],
      loserIds: matchSides(liveMatch)[loserSide],
      tableId: liveMatch.table_id ?? null,
      mode: matchMode(liveMatch),
    });
    showToast(canWin ? `${playerName(by)} venceu na bola ${penaltyBall}` : `Bola ${penaltyBall} fora da hora: vitória de ${playerName(winnerId)}`);
  });

  const undoEntry = (indexToRemove) => serialize(async () => {
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
  });

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
          try {
            await repo.deleteMatch(liveMatch.id);
          } catch (deleteError) {
            showToast(`Erro: ${deleteError.message}`);
            await load();
            return;
          }
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
