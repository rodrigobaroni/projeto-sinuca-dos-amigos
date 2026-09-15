---
tags: [auditoria, operação]
---
# Como Reproduzir os Achados

Tudo abaixo foi executado contra o [[Banco de Homologação]] em 2026-08-20. Nenhum comando escreve dados.

## 1. Baixar o snapshot de homologação
```bash
cd ~/Developer/"Projeto Sinuca dos amigos"
set -a; . ./.env.hml.local; set +a
U=$(echo "$VITE_SUPABASE_URL" | tr -d '"'); K=$(echo "$VITE_SUPABASE_ANON" | tr -d '"')

curl -s "$U/rest/v1/players?select=*" \
  -H "apikey: $K" -H "Authorization: Bearer $K" > /tmp/hml_players.json
curl -s "$U/rest/v1/matches?select=*&order=played_at.asc" \
  -H "apikey: $K" -H "Authorization: Bearer $K" > /tmp/hml_matches.json
```

## 2. Rodar o domínio real contra esses dados
Salve como `/tmp/analise.mjs` (ajuste `B` se o caminho do repo for outro):

```js
const B = "/Users/rodrigobaroni/Developer/Projeto Sinuca dos amigos";
const { specialRecordCounts, marathonRecord } = await import(`${B}/src/domain/stats.js`);
const { matchMode } = await import(`${B}/src/domain/match.js`);
const { gameDayKey } = await import(`${B}/src/utils/date.js`);
import fs from "node:fs";

const players  = JSON.parse(fs.readFileSync("/tmp/hml_players.json"));
const matches  = JSON.parse(fs.readFileSync("/tmp/hml_matches.json"));
// mesmo filtro do App.jsx:39
const finished = matches.filter((m) => m.status !== "live" && (m.winner_id || m.winner_side));
const nome = (id) => players.find((p) => p.id === id)?.name ?? "?";

// --- AUD-03: lavadas fantasma
const comLog = finished.filter((m) => (m.ball_log || []).length);
const top  = specialRecordCounts(players, finished).sort((a,b) => b.washouts - a.washouts)[0];
const real = specialRecordCounts(players, comLog ).sort((a,b) => b.washouts - a.washouts)[0];
console.log("AUD-03 exibido:", top.name, top.washouts, "| só com ball_log:", real.name, real.washouts);

// --- AUD-04: maratonista por dia UTC vs dia de jogatina
console.log("AUD-04 exibido:", marathonRecord(players, finished));
const porNoite = {};
finished.forEach((m) => {
  const d = gameDayKey(m.played_at);
  const ids = matchMode(m) === "2x2" ? [...(m.team_a||[]), ...(m.team_b||[])] : [m.player_a, m.player_b];
  ids.filter(Boolean).forEach((id) => { porNoite[`${id}|${d}`] = (porNoite[`${id}|${d}`] || 0) + 1; });
});
const best = Object.entries(porNoite).sort((a,b) => b[1] - a[1])[0];
console.log("AUD-04 correto:", nome(best[0].split("|")[0]), best[1], "na noite de", best[0].split("|")[1]);
```
```bash
node /tmp/analise.mjs
```

Saída obtida:
```
AUD-03 exibido: Rodrigo Baroni 140 | só com ball_log: Rodrigo Baroni 0
AUD-04 exibido: { value: 25, holder: 'Felipe Kchevi' }
AUD-04 correto: Rodrigo Baroni 40 na noite de 2026-06-23
```

## 3. AUD-05 — quebra de ordem pelo realtime
```js
const { rankedFrom, computeStats } = await import(`${B}/src/domain/stats.js`);
const { defaultGameDay } = await import(`${B}/src/utils/date.js`);

console.log("antes :", defaultGameDay(finished));
const comRetro = [...finished, { ...finished[5], id: "sim-retro" }];  // partida antiga chega no fim
console.log("depois:", defaultGameDay(comRetro));

const a = rankedFrom(computeStats(players, finished));
const d = rankedFrom(computeStats(players, comRetro));
a.forEach((x) => { const y = d.find((z) => z.id === x.id);
  if (y && y.curStreak !== x.curStreak) console.log(x.name, x.curStreak, "→", y.curStreak); });
```
Saída: `antes: 2026-07-27` / `depois: 2026-06-23` e `Andre Sindicú 0 → 1`.

## 4. AUD-01 — segurança
```bash
# escrita anônima deve dar 401 (e dá)
curl -s -o /dev/null -w "%{http_code}\n" -X POST "$U/rest/v1/players" \
  -H "apikey: $K" -H "Authorization: Bearer $K" \
  -H "Content-Type: application/json" -d '{"name":"__probe__"}'

# a configuração que é o problema
curl -s "$U/auth/v1/settings" -H "apikey: $K" | python3 -m json.tool | grep -E "disable_signup|\"email\""
```
Saída: `401` e `"disable_signup": false`, `"email": true`.

## 5. AUD-02 — testes
```bash
npm run test                                # falha: @tailwindcss/vite não encontrado
npx vitest run --config vite.config.js      # 18 passed
```

## 6. AUD-10/L3 — dependência de fuso
```bash
for TZ in America/Sao_Paulo UTC Asia/Tokyo; do
  TZ=$TZ node --input-type=module -e \
    'import {gameDayKey} from "./src/utils/date.js"; console.log(process.env.TZ, gameDayKey("2026-06-25T14:30:00Z"))'
done
```

Relacionado: [[Auditoria 2026-08-20]] · [[Banco de Homologação]]
