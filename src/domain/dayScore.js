import { matchMode, matchSides, teamKey, winnerSide } from "./match.js";
import { gameDayKey, gameDayRange, matchesInRange } from "../utils/date.js";

// Placar do confronto DESTA jogatina entre os dois lados que estão jogando
// agora. Morava dentro do AdminView, onde não dava para testar; a regra tem
// três recortes que valem a pena travar: a janela da noite (12h-12h), o modo
// (um 2x2 entre as mesmas pessoas não conta no 1x1) e a identidade dos dois
// lados independente de quem foi o lado A em cada partida.
export function liveDayHeadToHead(finished, liveMatch) {
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
