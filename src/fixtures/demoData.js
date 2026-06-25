export function demoData(startForm = false) {
  const names = ["Rodrigo", "Felipe", "Leo", "Bia", "Gui", "Nina", "Caio", "Tati"];
  const players = names.map((name) => ({ id: name.toLowerCase(), name }));
  const days = [1, 3, 4, 7, 9, 12, 14, 16, 18, 21, 23, 25, 27, 29];
  const matches = days.map((day, index) => {
    const playerA = players[index % players.length];
    const playerB = players[(index + 3) % players.length];
    const winner = index % 3 ? playerA : playerB;
    return {
      id: `demo-${index}`,
      player_a: playerA.id,
      player_b: playerB.id,
      winner_id: winner.id,
      status: "finished",
      played_at: new Date(2026, 5, day, 21, 15).toISOString(),
      ball_log: [2, 5, 8, 11, 4, 13, 1].slice(0, 3 + (index % 5)).map((ball, ballIndex) => ({
        n: ballIndex + 1,
        ball: String(ball),
        by: ballIndex % 2 ? playerA.id : playerB.id,
        type: "pot",
        brk: ballIndex === 0 && index % 4 === 0,
      })),
    };
  });
  if (!startForm) {
    matches.push({
      id: "demo-live",
      player_a: players[0].id,
      player_b: players[1].id,
      status: "live",
      played_at: new Date().toISOString(),
      ball_log: [
        { n: 1, ball: "2", by: players[0].id, type: "pot", brk: false },
        { n: 2, ball: "3", by: players[1].id, type: "pot", brk: false },
        { n: 3, ball: "4", by: players[0].id, type: "pot", brk: false },
        { n: 4, ball: "7", by: players[1].id, type: "foul", brk: false },
      ],
    });
  }
  return { players, matches };
}
