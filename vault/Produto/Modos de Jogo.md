---
tags: [produto, domínio]
---
# Modos de Jogo

Definidos em `src/domain/rules.js`. O modo escolhido determina como as bolas são divididas em grupos e qual é a bola de castigo.

| Modo | `value` | Grupos | Bola de castigo | Anota bolas? |
| --- | --- | --- | --- | --- |
| Numerada (Ímpares e Pares) | `even-odd` | pares `2..14` / ímpares `1..15` | 1 ou 15 (padrão **1**) | Sim |
| Numerada (Lisas e Listradas) | `solids-stripes` | lisas `1..8` / listradas `9..15` | 1 ou 8 (padrão **8**) | Sim |
| Numerada (Maiores e Menores) | `high-low` | menores `1..7` / maiores `9..15` | **8** | Sim |
| Mata a Mata | `knockout` | — (cores: vermelhas/amarelas/azuis) | nenhuma | Não (`simpleOnly`) |
| 3 bolas | `three-balls` | — | nenhuma | Não (`simpleOnly`) |

## Como os grupos são definidos numa partida
`GameRules.deriveGroups()` (`src/domain/rules.js:176`) olha a **primeira bola encaçapada que não foi falta e não foi na quebra**. O grupo dessa bola vira o grupo de quem a matou; o adversário fica com o grupo oposto.

## Classificação de uma tacada
`GameRules.classifyPot()` (`src/domain/rules.js:198`):
- Encaçapou a **bola de castigo** → é `pot` (vitória) se o grupo dele já estiver limpo, senão é `foul` com `reason: "trunfo"`.
- Encaçapou bola **do próprio grupo** (ou os grupos ainda não foram definidos) → `pot`.
- Encaçapou bola **do adversário** → `foul` com `reason: "oponente"`.

> [!warning] Onde a configuração mora
> O modo de jogo é salvo em **`localStorage`** do navegador (`sinuca-game-settings`), não no banco. Duas mesas podem estar operando com regras diferentes e a partida nem registra sob qual modo foi jogada. Ver [[AUD-08 Configurações vivem no localStorage]].

> [!bug] Texto de falta sempre diz "bola 1"
> `foulReasonText()` (`src/domain/rules.js:233`) usa um `defaultRules` fixo em `even-odd`, então a mensagem de trunfo diz "bola 1 fora da hora" mesmo numa partida de lisas e listradas, onde a bola de castigo é a 8. Ver [[AUD-10 Achados latentes e menores]].

Relacionado: [[Partida ao Vivo]] · [[Glossário]]
