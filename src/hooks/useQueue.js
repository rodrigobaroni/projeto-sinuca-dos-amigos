import { useEffect, useMemo, useState } from "react";
import { removeBy, upsertBy } from "../domain/collection.js";
import { buildQueue, playersToReenqueue } from "../domain/queue.js";
import { gameDayKey } from "../utils/date.js";

const sortTables = (items) =>
  items.slice().sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));

// Estado da fila da noite: mesas, presença e a fila já composta (holders +
// entries), com as ações de escrita e os dois canais de realtime. Fica em
// hook próprio, não em App.jsx, por tamanho - ~120 linhas entre estado, dois
// efeitos de realtime, um de carga e cinco ações - e o AdminView já recebe
// muitas props. Com o hook, App.jsx cresce duas linhas e o AdminView ganha
// só uma prop a mais.
//
// gameDay recalcula em visibilitychange/focus, nao so na montagem: o caso
// que morde e o tablet ligado da sexta a noite ate sabado a noite - sem
// isso, o gameDay do estado continua sendo o de sexta, a fila mostra a
// presenca da noite passada como se fosse a de hoje, e o filtro de realtime
// de attendance (ver onAttendanceChange) descarta silenciosamente todos os
// eventos de hoje por serem de outro game_day. setInterval foi descartado:
// o navegador estrangula timer em background, entao um evento ligado a
// interacao real (aba volta a ficar visivel, janela recebe foco) e o unico
// jeito confiavel de perceber a virada sem gastar bateria a noite toda.
//
// enabled: a fila é feature de admin. Sem isso, todo visitante do placar
// público dispararia a carga da fila e abriria dois canais de realtime a
// mais só para jogar fora o resultado.
export function useQueue({ repo, matches, enabled }) {
  const [gameDay, setGameDay] = useState(() => gameDayKey(Date.now()));
  const [tables, setTables] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [available, setAvailable] = useState(true);
  // loaded so vira true depois que o primeiro loadQueue resolve - inclusive
  // quando available sai false (banco sem a migração 20260915), senão quem
  // não rodou a migração ficaria travado pra sempre esperando um loaded que
  // nunca chega. Existe pra StartMatchPanel não liberar "iniciar partida"
  // sem table_id durante a janela (normalmente <1s) em que tables ainda está
  // [] e activeTables.length <= 1 dá falso positivo de "regra desligada".
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    const recomputeGameDay = () => {
      if (document.visibilityState === "hidden") return;
      setGameDay((current) => {
        const next = gameDayKey(Date.now());
        return next === current ? current : next;
      });
    };
    // Recalcula na hora, não só nos próximos eventos: sem isso, uma página
    // aberta antes do meio-dia e um admin que loga depois da virada sem
    // trocar de aba nem focar a janela ficaria preso no gameDay de antes.
    recomputeGameDay();
    document.addEventListener("visibilitychange", recomputeGameDay);
    window.addEventListener("focus", recomputeGameDay);
    return () => {
      document.removeEventListener("visibilitychange", recomputeGameDay);
      window.removeEventListener("focus", recomputeGameDay);
    };
  }, [enabled]);

  useEffect(() => {
    if (!repo || !enabled) return;
    let cancelled = false;
    repo.loadQueue(gameDay).then((data) => {
      if (cancelled) return;
      setTables(data.tables);
      setAttendance(data.attendance);
      setAvailable(data.available);
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [repo, gameDay, enabled]);

  useEffect(() => {
    if (!repo || !enabled) return;
    return repo.onPoolTablesChange(({ eventType, new: newRow, old: oldRow }) => {
      setTables((items) => {
        if (eventType === "DELETE") return removeBy(items, oldRow.id);
        return upsertBy(items, newRow, { sort: sortTables, newerBy: "updated_at" });
      });
    });
  }, [repo, enabled]);

  useEffect(() => {
    if (!repo || !enabled) return;
    return repo.onAttendanceChange(({ eventType, new: newRow, old: oldRow }) => {
      // DELETE manda só a PK em oldRow (sem REPLICA IDENTITY FULL) - não dá
      // pra checar game_day nesse ramo, e não precisa: remover um id que não
      // está na lista já é no-op. O filtro por game_day vale só pra
      // INSERT/UPDATE, onde newRow vem completo; sem ele o realtime
      // injetaria linhas de outra noite que a query (filtrada por game_day)
      // nunca traria.
      if (eventType === "DELETE") {
        setAttendance((items) => removeBy(items, oldRow.id));
        return;
      }
      if (newRow?.game_day !== gameDay) return;
      setAttendance((items) => upsertBy(items, newRow, { newerBy: "updated_at" }));
    });
  }, [repo, gameDay, enabled]);

  const activeTables = useMemo(() => tables.filter((table) => table.active), [tables]);
  const { holders, entries } = useMemo(
    () => buildQueue({ tables, gameDay, matches, attendance }),
    [tables, gameDay, matches, attendance],
  );

  // Escritas aplicam a resposta HTTP com upsertBy + newerBy: "updated_at",
  // nunca addIfAbsentBy. attendance e pool_tables não são só-insert como
  // matches - enqueuePlayer é upsert (chave única game_day+player_id) e
  // markDeparture/updateTable são sempre update de linha existente, então
  // addIfAbsentBy (que devolve a lista inalterada quando o id já existe)
  // jogaria a resposta fora sempre que a linha já estivesse no estado local:
  // "foi embora" nunca apareceria na tela, e "voltou"/"perdeu e volta pro
  // fim" ficariam com o enqueued_at velho, até o realtime chegar. newerBy
  // resolve isso sem risco de regredir uma escrita mais nova vinda de outro
  // admin pelo realtime: só substitui se updated_at for igual ou maior.
  // Sem patch otimista: são operações raras contra um banco na mesma região.
  const markArrived = async (playerId) => {
    const row = await repo.enqueuePlayer({ gameDay, playerId });
    setAttendance((items) => upsertBy(items, row, { newerBy: "updated_at" }));
    return row;
  };

  // Perdedor volta pro fim da fila. No 2x2 os dois perdedores voltam juntos;
  // carimbos 1ms apartados (base, base+1, ...) garantem ordem determinística
  // entre eles - sem isso dois enqueuePlayer em paralelo poderiam colidir no
  // mesmo milissegundo e cair no desempate por id de queueForDay, que não
  // tem relação nenhuma com quem perdeu primeiro.
  const enqueuePlayers = async (playerIds) => {
    // Quem o admin marcou como tendo ido embora nao volta pra fila ao
    // perder: o upsert de enfileirar limpa o left_at, entao sem esse filtro
    // a pessoa reaparece na fila sozinha e a marcacao do admin some sem
    // aviso. Filtrado aqui, e nao no repositorio, pra nao mexer no contrato
    // de enqueuePlayer (que segue sendo o primitivo unico de chegou/voltou).
    const alvos = playersToReenqueue({ playerIds, gameDay, attendance });
    if (!alvos.length) return [];
    const base = Date.now();
    const rows = await Promise.all(
      alvos.map((playerId, index) =>
        repo.enqueuePlayer({ gameDay, playerId, enqueuedAt: new Date(base + index).toISOString() }),
      ),
    );
    setAttendance((items) => rows.reduce((acc, row) => upsertBy(acc, row, { newerBy: "updated_at" }), items));
    return rows;
  };

  const markDeparture = async (playerId) => {
    const row = await repo.markDeparture({ gameDay, playerId });
    setAttendance((items) => upsertBy(items, row, { newerBy: "updated_at" }));
    return row;
  };

  const addTable = async (name) => {
    const row = await repo.addPoolTable(name);
    setTables((items) => upsertBy(items, row, { sort: sortTables, newerBy: "updated_at" }));
    return row;
  };

  const updateTable = async (id, patch) => {
    const row = await repo.updatePoolTable(id, patch);
    setTables((items) => upsertBy(items, row, { sort: sortTables, newerBy: "updated_at" }));
    return row;
  };

  const deleteTable = async (id) => {
    await repo.deletePoolTable(id);
    setTables((items) => removeBy(items, id));
  };

  return {
    gameDay,
    tables,
    activeTables,
    // matches cru sai daqui pra quem precisa RECOMPOR a fila com outra lista
    // de mesas (o AdminView faz isso quando as mesas estao desligadas). Sem
    // isso o chamador remontaria a lista de liveMatches + finished, e esses
    // dois nao somam o mesmo conjunto: finished, no App, exige vencedor
    // (winner_id || winner_side), enquanto buildQueue quer status
    // "finished" - uma partida finalizada sem vencedor mudaria quem e dono
    // da mesa entre uma composicao e outra.
    matches,
    attendance,
    available,
    loaded,
    holders,
    entries,
    markArrived,
    markDeparture,
    enqueuePlayers,
    addTable,
    updateTable,
    deleteTable,
  };
}
