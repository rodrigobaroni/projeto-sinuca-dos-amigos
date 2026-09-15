import { useEffect, useMemo, useState } from "react";
import { addIfAbsentBy, removeBy, upsertBy } from "../domain/collection.js";
import { buildQueue } from "../domain/queue.js";
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
// gameDay é fixado na montagem. Recalcular na virada do meio-dia com o
// tablet ligado a noite toda é tratado à parte (fora desta rodada).
export function useQueue({ repo, matches }) {
  const gameDay = useMemo(() => gameDayKey(Date.now()), []);
  const [tables, setTables] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [available, setAvailable] = useState(true);

  useEffect(() => {
    if (!repo) return;
    let cancelled = false;
    repo.loadQueue(gameDay).then((data) => {
      if (cancelled) return;
      setTables(data.tables);
      setAttendance(data.attendance);
      setAvailable(data.available);
    });
    return () => {
      cancelled = true;
    };
  }, [repo, gameDay]);

  useEffect(() => {
    if (!repo) return;
    return repo.onPoolTablesChange(({ eventType, new: newRow, old: oldRow }) => {
      setTables((items) => {
        if (eventType === "DELETE") return removeBy(items, oldRow.id);
        return upsertBy(items, newRow, { sort: sortTables });
      });
    });
  }, [repo]);

  useEffect(() => {
    if (!repo) return;
    return repo.onAttendanceChange(({ eventType, new: newRow, old: oldRow }) => {
      // A query de loadQueue já filtra por game_day (bate com o índice); sem
      // esse descarte aqui, o realtime injetaria linhas de outra noite que a
      // query nunca traria (consequência obrigatória da Tarefa 4 do plano).
      const row = eventType === "DELETE" ? oldRow : newRow;
      if (row?.game_day !== gameDay) return;
      setAttendance((items) => {
        if (eventType === "DELETE") return removeBy(items, oldRow.id);
        return upsertBy(items, newRow);
      });
    });
  }, [repo, gameDay]);

  const activeTables = useMemo(() => tables.filter((table) => table.active), [tables]);
  const { holders, entries } = useMemo(
    () => buildQueue({ tables, gameDay, matches, attendance }),
    [tables, gameDay, matches, attendance],
  );

  // Escritas aplicam a resposta HTTP com addIfAbsentBy, nunca upsertBy - é o
  // bug corrigido em addMatchIfAbsent: a resposta do insert pode chegar
  // depois do evento do WebSocket e voltaria a lista pra uma versão velha.
  // updateTable é exceção legítima: devolve a linha nova, não há lacuna.
  // Sem patch otimista: são operações raras contra um banco na mesma região.
  const markArrived = async (playerId) => {
    const row = await repo.enqueuePlayer({ gameDay, playerId });
    setAttendance((items) => addIfAbsentBy(items, row));
    return row;
  };

  const markDeparture = async (playerId) => {
    const row = await repo.markDeparture({ gameDay, playerId });
    setAttendance((items) => addIfAbsentBy(items, row));
    return row;
  };

  const addTable = async (name) => {
    const row = await repo.addPoolTable(name);
    setTables((items) => addIfAbsentBy(items, row, { sort: sortTables }));
    return row;
  };

  const updateTable = async (id, patch) => {
    const row = await repo.updatePoolTable(id, patch);
    setTables((items) => upsertBy(items, row, { sort: sortTables }));
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
    attendance,
    available,
    holders,
    entries,
    markArrived,
    markDeparture,
    addTable,
    updateTable,
    deleteTable,
  };
}
