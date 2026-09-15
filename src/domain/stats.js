import { matchMode, matchSides, playerWon, teamKey, winnerSide } from "./match.js";
import { gameDayKey, sortByPlayedAt } from "../utils/date.js";

// Vencedor e perdedor de um 1x1, resolvidos por winner_side OU winner_id.
// Devolve null quando a partida nao tem vencedor definido, para nao inventar
// derrota pra ninguem.
function singlesOutcome(match) {
  const side = winnerSide(match);
  if (!side) return null;
  return side === "a"
    ? { winner: match.player_a, loser: match.player_b }
    : { winner: match.player_b, loser: match.player_a };
}

export function computeStats(players, matches) {
  const stats = Object.fromEntries(players.map((player) => [player.id, {
    id: player.id,
    name: player.name,
    wins: 0,
    losses: 0,
    total: 0,
    pct: 0,
    curStreak: 0,
    bestStreak: 0,
    history: [],
  }]));

  sortByPlayedAt(matches.filter((match) => matchMode(match) === "1x1")).forEach((match) => {
    const outcome = singlesOutcome(match);
    if (!outcome) return;
    const { winner, loser } = outcome;
    if (stats[winner]) {
      stats[winner].wins += 1;
      stats[winner].total += 1;
    }
    if (stats[loser]) {
      stats[loser].losses += 1;
      stats[loser].total += 1;
    }
    [winner, loser].forEach((id) => {
      if (stats[id]) stats[id].history.push({ match, won: id === winner });
    });
  });

  Object.values(stats).forEach((stat) => {
    stat.pct = stat.total ? Math.round((stat.wins / stat.total) * 100) : 0;
    let current = 0;
    let best = 0;
    stat.history.forEach((item) => {
      if (item.won) {
        current += 1;
        best = Math.max(best, current);
      } else {
        current = 0;
      }
    });
    stat.curStreak = current;
    stat.bestStreak = best;
  });

  return stats;
}

export function computeDoublesStats(players, matches) {
  const playerName = (id) => players.find((player) => player.id === id)?.name || "?";
  const teams = {};
  matches.filter((match) => matchMode(match) === "2x2").forEach((match) => {
    const sides = matchSides(match);
    const winningSide = winnerSide(match);
    if (!winningSide) return;
    ["a", "b"].forEach((side) => {
      const ids = sides[side].slice().sort();
      if (ids.length !== 2) return;
      const key = teamKey(ids);
      if (!teams[key]) {
        teams[key] = {
          id: key,
          playerIds: ids,
          name: ids.map(playerName).join(" + "),
          wins: 0,
          losses: 0,
          total: 0,
          pct: 0,
          history: [],
        };
      }
      teams[key].total += 1;
      const won = side === winningSide;
      if (won) teams[key].wins += 1;
      else teams[key].losses += 1;
      teams[key].history.push({ match, won });
    });
  });
  Object.values(teams).forEach((team) => {
    team.pct = team.total ? Math.round((team.wins / team.total) * 100) : 0;
  });
  return teams;
}

export function doublesPlayerStats(players, matches, playerId) {
  const playerName = (id) => players.find((player) => player.id === id)?.name || "?";
  const rows = {};
  matches.filter((match) => matchMode(match) === "2x2").forEach((match) => {
    const sides = matchSides(match);
    const side = sides.a.includes(playerId) ? "a" : sides.b.includes(playerId) ? "b" : null;
    if (!side) return;
    const partnerId = sides[side].find((id) => id !== playerId);
    if (!partnerId) return;
    if (!rows[partnerId]) rows[partnerId] = { id: partnerId, name: playerName(partnerId), total: 0, wins: 0, losses: 0 };
    rows[partnerId].total += 1;
    if (playerWon(match, playerId)) rows[partnerId].wins += 1;
    else rows[partnerId].losses += 1;
  });
  return Object.values(rows)
    .map((row) => ({ ...row, pct: row.total ? Math.round((row.wins / row.total) * 100) : 0 }))
    .sort((a, b) => b.wins - a.wins || b.total - a.total || a.name.localeCompare(b.name));
}

export function rankedFrom(stats) {
  return Object.values(stats).sort((a, b) => b.wins - a.wins || b.pct - a.pct || a.losses - b.losses || a.name.localeCompare(b.name));
}

export function ballRunRecord(players, matches) {
  let best = { count: 0, playerId: null, playerName: "" };
  matches.forEach((match) => {
    let run = 0;
    let last = null;
    (match.ball_log || []).forEach((entry) => {
      const num = Number(entry.ball);
      const isPot = entry.type !== "foul" && num >= 1 && num <= 15;
      if (isPot && entry.by === last) run += 1;
      else if (isPot) {
        run = 1;
        last = entry.by;
      } else {
        run = 0;
        last = null;
      }
      if (isPot && run > best.count) {
        best = { count: run, playerId: entry.by, playerName: players.find((player) => player.id === entry.by)?.name || "" };
      }
    });
  });
  return best;
}

export function foulCounts(players, matches) {
  const counts = Object.fromEntries(players.map((player) => [player.id, { ...player, total: 0, oponente: 0 }]));
  matches.forEach((match) => {
    (match.ball_log || []).forEach((entry) => {
      if (entry.type !== "foul" || entry.reason === "juiz" || !counts[entry.by]) return;
      counts[entry.by].total += 1;
      if (entry.reason === "oponente") counts[entry.by].oponente += 1;
    });
  });
  return Object.values(counts);
}

export function breakCounts(players, matches) {
  const counts = Object.fromEntries(players.map((player) => [player.id, { ...player, count: 0 }]));
  matches.forEach((match) => {
    (match.ball_log || []).forEach((entry) => {
      if (entry.brk && counts[entry.by]) counts[entry.by].count += 1;
    });
  });
  return Object.values(counts);
}

export function bestLosingStreak(stats) {
  return Object.values(stats).reduce((best, stat) => {
    let current = 0;
    let max = 0;
    stat.history.forEach((item) => {
      if (!item.won) {
        current += 1;
        max = Math.max(max, current);
      } else {
        current = 0;
      }
    });
    return max > best.value ? { value: max, holder: stat.name } : best;
  }, { value: 0, holder: "ninguém ainda" });
}

export function h2hRecords(players, matches) {
  const name = (id) => players.find((player) => player.id === id)?.name || "-";
  const pairs = {};
  matches.filter((match) => matchMode(match) === "1x1").forEach((match) => {
    const outcome = singlesOutcome(match);
    if (!outcome) return;
    const ids = [match.player_a, match.player_b].sort();
    const key = ids.join("|");
    if (!pairs[key]) pairs[key] = { ids, games: 0, wins: {}, losses: {} };
    pairs[key].games += 1;
    pairs[key].wins[outcome.winner] = (pairs[key].wins[outcome.winner] || 0) + 1;
    pairs[key].losses[outcome.loser] = (pairs[key].losses[outcome.loser] || 0) + 1;
  });
  const rows = Object.values(pairs);
  const classic = rows.sort((a, b) => b.games - a.games)[0];
  let fregues = { value: 0, holder: "sem registro", sub: "" };
  let carrasco = { value: 0, holder: "sem registro", sub: "" };
  rows.forEach((row) => {
    row.ids.forEach((id) => {
      const other = row.ids.find((item) => item !== id);
      const lost = row.losses[id] || 0;
      const won = row.wins[id] || 0;
      if (lost > fregues.value) fregues = { value: lost, holder: name(id), sub: `perde pra ${name(other)}` };
      if (won > carrasco.value) carrasco = { value: won, holder: name(id), sub: `domina ${name(other)}` };
    });
  });
  return {
    classic: classic ? { value: classic.games, holder: "duelo mais jogado", sub: `${name(classic.ids[0])} x ${name(classic.ids[1])}` } : { value: "-", holder: "sem registro", sub: "" },
    fregues,
    carrasco,
  };
}

export function specialRecordCounts(players, matches) {
  const counts = Object.fromEntries(players.map((player) => [player.id, {
    ...player,
    oneWins: 0,
    washouts: 0,
    scratches: 0,
    earlyOne: 0,
    donated: 0,
  }]));
  matches.filter((match) => matchMode(match) === "1x1").forEach((match) => {
    const outcome = singlesOutcome(match);
    if (!outcome) return;
    const { winner, loser } = outcome;
    const log = match.ball_log || [];
    const one = log.find((entry) => Number(entry.ball) === 1);
    if (one?.by === winner && one.type !== "foul" && counts[winner]) counts[winner].oneWins += 1;
    if (one?.type === "foul" && one.reason === "trunfo" && counts[one.by]) counts[one.by].earlyOne += 1;
    // Sem anotacao de bolas nao da pra afirmar que o adversario nao encacapou
    // nada: registrar a ordem das bolas e opcional. "Nao sei" nao e "7x0".
    if (log.length) {
      const loserPots = log.filter((entry) => entry.by === loser && entry.type !== "foul" && Number(entry.ball) >= 2 && Number(entry.ball) <= 15).length;
      if (loserPots === 0 && counts[winner]) counts[winner].washouts += 1;
    }
    log.forEach((entry) => {
      if (entry.type !== "foul" || !counts[entry.by]) return;
      if (entry.reason === "scratch" || entry.reason === "branca") counts[entry.by].scratches += 1;
      counts[entry.by].donated += 1;
    });
  });
  return Object.values(counts);
}

export function marathonRecord(players, matches) {
  const name = (id) => players.find((player) => player.id === id)?.name || "sem registro";
  const perPlayerDay = {};
  matches.forEach((match) => {
    // Dia de jogatina (12h-12h), nao dia de calendario: a jogatina vira a
    // madrugada e o dia UTC partia a mesma noite em duas.
    const day = gameDayKey(match.played_at);
    const sides = matchSides(match);
    [...sides.a, ...sides.b].forEach((id) => {
      const key = `${id}|${day}`;
      perPlayerDay[key] = (perPlayerDay[key] || 0) + 1;
    });
  });
  return Object.entries(perPlayerDay).reduce((best, [key, value]) => {
    const [id] = key.split("|");
    return value > best.value ? { value, holder: name(id) } : best;
  }, { value: 0, holder: "sem registro" });
}
