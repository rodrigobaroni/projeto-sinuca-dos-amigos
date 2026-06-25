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

  matches.forEach((match) => {
    const loser = match.winner_id === match.player_a ? match.player_b : match.player_a;
    if (stats[match.winner_id]) {
      stats[match.winner_id].wins += 1;
      stats[match.winner_id].total += 1;
    }
    if (stats[loser]) {
      stats[loser].losses += 1;
      stats[loser].total += 1;
    }
    [match.winner_id, loser].forEach((id) => {
      if (stats[id]) stats[id].history.push({ match, won: id === match.winner_id });
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
  matches.forEach((match) => {
    const ids = [match.player_a, match.player_b].sort();
    const key = ids.join("|");
    const loser = match.winner_id === match.player_a ? match.player_b : match.player_a;
    if (!pairs[key]) pairs[key] = { ids, games: 0, wins: {}, losses: {} };
    pairs[key].games += 1;
    pairs[key].wins[match.winner_id] = (pairs[key].wins[match.winner_id] || 0) + 1;
    pairs[key].losses[loser] = (pairs[key].losses[loser] || 0) + 1;
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
  matches.forEach((match) => {
    const loser = match.winner_id === match.player_a ? match.player_b : match.player_a;
    const one = (match.ball_log || []).find((entry) => Number(entry.ball) === 1);
    if (one?.by === match.winner_id && one.type !== "foul" && counts[match.winner_id]) counts[match.winner_id].oneWins += 1;
    if (one?.type === "foul" && one.reason === "trunfo" && counts[one.by]) counts[one.by].earlyOne += 1;
    const loserPots = (match.ball_log || []).filter((entry) => entry.by === loser && entry.type !== "foul" && Number(entry.ball) >= 2 && Number(entry.ball) <= 15).length;
    if (loserPots === 0 && counts[match.winner_id]) counts[match.winner_id].washouts += 1;
    (match.ball_log || []).forEach((entry) => {
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
    const day = new Date(match.played_at).toISOString().slice(0, 10);
    [match.player_a, match.player_b].forEach((id) => {
      const key = `${id}|${day}`;
      perPlayerDay[key] = (perPlayerDay[key] || 0) + 1;
    });
  });
  return Object.entries(perPlayerDay).reduce((best, [key, value]) => {
    const [id] = key.split("|");
    return value > best.value ? { value, holder: name(id) } : best;
  }, { value: 0, holder: "sem registro" });
}
