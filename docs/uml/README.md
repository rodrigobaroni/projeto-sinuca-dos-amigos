# Diagramas UML — Encaçapei

Este projeto tem **dois momentos distintos**, analisados separadamente:

1. **Projeto base (atual, em produção)** — "Placar da Sinuca": app React + Vite +
   Supabase, grupo único de amigos, admin único, sem contas de usuário. Reflete
   o código real em `src/` e `schema.sql`.
2. **Projeto final (idealizado)** — "Encaçapei": app multiusuário com login,
   amigos, múltiplas ligas, locais no mapa e notificações. Reflete o mockup
   navegável em `public/encacapei-mockup.html`. **Ainda não implementado** —
   os diagramas abaixo representam um modelo proposto, a ser validado antes de
   virar código.

Formato: [PlantUML](https://plantuml.com/). Para visualizar, use a extensão
"PlantUML" do VS Code/JetBrains, o servidor online (plantuml.com/plantuml),
ou `plantuml *.puml` localmente.

## Projeto base — Placar da Sinuca

| Diagrama | Arquivo |
|---|---|
| Classes (domínio + serviços + app) | [base-classes.puml](base-classes.puml) |
| Casos de uso (Visitante / Admin) | [base-casos-de-uso.puml](base-casos-de-uso.puml) |
| Sequência: registrar partida (Admin) | [base-sequencia-registrar-partida.puml](base-sequencia-registrar-partida.puml) |

## Projeto final — Encaçapei (proposto)

| Diagrama | Arquivo |
|---|---|
| Classes (Identidade, Ligas, Partidas, Locais, Notificações) | [final-classes.puml](final-classes.puml) |
| Casos de uso (Visitante / Usuário / Dono da liga) | [final-casos-de-uso.puml](final-casos-de-uso.puml) |
| Sequência: criar liga + convidar amigos | [final-sequencia-criar-liga.puml](final-sequencia-criar-liga.puml) |
| Sequência: jogar partida ao vivo | [final-sequencia-partida-ao-vivo.puml](final-sequencia-partida-ao-vivo.puml) |
| Sequência: consultar ranking / H2H | [final-sequencia-ranking-h2h.puml](final-sequencia-ranking-h2h.puml) |

## Principais diferenças de modelo entre os dois projetos

- **Contas**: base não tem conta de jogador (só admin único); final tem
  `Usuario` com login/cadastro para todos.
- **Escopo social**: base é um grupo fechado; final introduz `Amizade` e
  múltiplas `Liga` independentes, cada uma com seus próprios membros e regras.
- **Regras de jogo**: base tem `GameRules` detalhado (grupos pares/ímpares,
  lisas/listradas, penalidade, faltas classificadas); final, no mockup, mostra
  uma versão simplificada (Venceu/Perdeu, bolas 1–8 clicáveis).
- **Local físico**: só o projeto final modela `Local` (bares no mapa,
  avaliação, vínculo com liga).
- **Notificações**: só o projeto final tem central de notificações
  (convites de liga, convites de amizade, avisos de jogatina).
