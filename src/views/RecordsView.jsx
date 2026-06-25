import { ViewHead } from "../components/layout.jsx";
import { Record, RecordSection } from "../components/recordCards.jsx";
import { bestLosingStreak, computeStats, h2hRecords, marathonRecord, rankedFrom, specialRecordCounts } from "../domain/stats.js";

export function RecordsView({ players, finished }) {
  const set = finished;
  const setStats = computeStats(players, set);
  const rankedStats = rankedFrom(setStats);
  if (!finished.length) return <><ViewHead eyebrow="hall da fama" title="Records" /><div className="empty">Sem records ainda. Joguem aí!</div></>;

  const values = Object.values(setStats);
  const mostWins = rankedStats[0];
  const bestStreak = values.slice().sort((a, b) => b.bestStreak - a.bestStreak)[0];
  const mostGames = values.slice().sort((a, b) => b.total - a.total)[0];
  const bestPct = values.filter((stat) => stat.total >= 3).sort((a, b) => b.pct - a.pct)[0];
  const lanterna = values.filter((stat) => stat.total > 0).sort((a, b) => b.losses - a.losses)[0];
  const coldFeet = bestLosingStreak(setStats);
  const h2h = h2hRecords(players, set);
  const special = specialRecordCounts(players, set);
  const topSpecial = (field) => special.slice().sort((a, b) => b[field] - a[field])[0];
  const washouts = topSpecial("washouts");
  const marathon = marathonRecord(players, set);
  const hold = (item, value) => (item && value ? item.name : "ninguém ainda");
  const recordValue = (value) => value || "-";

  return (
    <section className="records-page">
      <ViewHead eyebrow="hall da fama" title="Records" />
      <div className="records-period-pills" aria-label="Filtro de período visual">
        <span className="mchip active">Geral</span>
        <span className="mchip">Jun/26</span>
      </div>

      <RecordSection title="hall da fama">
        <Record label="mais vitórias" desc="Quem mais saiu vencedor nas partidas." value={mostWins.wins} holder={mostWins.name} />
        <Record label="pé-quente" desc="Maior sequência de vitórias jogo após jogo." value={bestStreak.bestStreak || "-"} holder={bestStreak.bestStreak ? bestStreak.name : "ninguém ainda"} sub="vitórias seguidas" />
        <Record label="clássico da resenha" desc="A dupla que mais se enfrentou na mesa." value={recordValue(h2h.classic.value)} holder={h2h.classic.holder} sub={h2h.classic.sub} />
        <Record label="melhor aproveitamento" desc="Maior percentual de vitórias com pelo menos 3 jogos." value={bestPct ? `${bestPct.pct}%` : "-"} holder={bestPct?.name || "sem registro"} sub="(3+ jogos)" />
        <Record label="mais jogos" desc="Quem mais apareceu para jogar." value={mostGames.total} holder={mostGames.name} />
      </RecordSection>

      <RecordSection title="hall da vergonha" tone="shame">
        <Record label="pé-frio" desc="Maior sequência de derrotas seguidas." value={recordValue(coldFeet.value)} holder={coldFeet.value ? coldFeet.holder : "ninguém ainda"} sub="derrotas seguidas" />
        <Record label="lanterna (mais derrotas)" desc="Quem acumulou mais derrotas no histórico." value={recordValue(lanterna?.losses)} holder={hold(lanterna, lanterna?.losses)} />
        <Record label="freguês" desc="Quem mais perdeu para o mesmo adversário." value={recordValue(h2h.fregues.value)} holder={h2h.fregues.holder} sub={h2h.fregues.sub} />
        <Record label="carrasco" desc="Maior domínio contra um adversário específico." value={recordValue(h2h.carrasco.value)} holder={h2h.carrasco.holder} sub={h2h.carrasco.sub} />
        <Record label="lavador / 7x0" desc="Mais vitórias sem o adversário encaçapar bola do grupo." value={recordValue(washouts?.washouts)} holder={hold(washouts, washouts?.washouts)} />
        <Record label="maratonista" desc="Quem mais jogou partidas em um único dia." value={recordValue(marathon.value)} holder={marathon.value ? marathon.holder : "sem registro"} sub="partidas num dia" />
      </RecordSection>
    </section>
  );
}
