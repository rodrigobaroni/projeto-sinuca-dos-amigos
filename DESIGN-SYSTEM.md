# Design System - Mesa de feltro

Sistema visual fixo do Placar da Sinuca, extraido do prototipo `Prototipo Sinuca.dc.html`.

## Cores

| Token | Valor | Uso |
| --- | --- | --- |
| `--felt-900` | `#07271c` | fundo mais escuro, inputs, sheets, nav |
| `--felt-800` | `#0c3b2a` | fundo principal |
| `--felt-700` | `#103f2f` | superficie intermediaria |
| `--felt-600` | `#15523b` | cards e paineis |
| `--cream-100` | `#f4efe3` | texto principal |
| `--cream-200` | `#e7f0ea` | texto de apoio claro |
| `--cream-300` | `#d6e4dc` | texto longo |
| `--muted-100` | `#acc6b9` | subtitulos e dados secundarios |
| `--muted-200` | `#9fbdac` | labels auxiliares |
| `--gold` | `#f4c430` | vencedor, destaque, acao primaria |
| `--brass` | `#cdaa54` | eyebrows, divisorias, detalhes |
| `--chalk` | `#46c2e0` | acao secundaria, foco, admin/ao vivo |
| `--clay` | `#e2745a` | erro, derrota, cancelamento |

## Tipografia

- Display e placares: `Anton`, sempre uppercase quando for titulo.
- Interface: `Archivo`.
- Dados, labels e numeros tabulares: `Space Mono`.
- Texto dentro de componentes compactos deve evitar quebra; usar `text-overflow: ellipsis`.

## Componentes Base

- Cards: raio `14px` a `18px`, `border: 1px solid var(--line)`, superficie `--surface-1` ou `--surface-2`.
- Acoes normais: alvo minimo `48px`.
- Acoes da partida ao vivo: alvo minimo `56px`.
- Botao primario: `--gold` com texto `#22180a`.
- Botao secundario/admin: `--chalk` com texto `#062028`.
- Perigo/cancelamento: `--clay`.
- Filtros segmentados/chips: pílulas com borda `--line`; ativo com `--gold`.

## Bolas

- `PoolBall` e `PlayerBall` sao a assinatura visual do produto.
- Nao criar novas versoes avulsas de bola por tela.
- Iniciais de jogador sempre via `PlayerBall`/`InitialBall`.

## Layout

- Largura maxima da app: `1180px`.
- Fundo global: radial verde do feltro.
- Header e nav usam blur/transparencia sobre `--felt-900`.
- Seções operacionais devem ser densas e escaneaveis; evitar hero marketing.
