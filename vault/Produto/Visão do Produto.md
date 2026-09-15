---
tags: [produto]
---
# Visão do Produto

App recreativo para registrar e consultar o histórico de partidas de sinuca de um grupo de amigos. O objetivo declarado em `SPEC.md` é ser **fácil e gostoso de consultar pela galera** — não é uma ferramenta de torneio, é o placar da resenha.

## Para quem
- **A galera (leitura pública).** Qualquer pessoa com o link vê ranking, histórico, records e perfis. Não precisa login.
- **O admin (escrita).** Um único usuário logado registra partidas, cadastra jogadores e opera a [[Partida ao Vivo]].

## O que o app entrega
1. **Ranking geral** — vitórias, derrotas, aproveitamento, sequência atual e melhor sequência. Ver [[Estatísticas e Ranking]].
2. **Ranking do dia de jogatina** — recorte de 12h às 12h do dia seguinte, porque a jogatina vira a madrugada. Ver [[Dia de Jogatina]].
3. **Histórico de partidas** com filtro por nome e detalhe da ordem das bolas.
4. **Confronto direto (H2H)** entre dois jogadores.
5. **Perfil do jogador** com stats, evolução e últimos jogos.
6. **Records** — o "hall da fama" e o "hall da vergonha". Ver [[Records]].
7. **Partida ao vivo** — anotação bola a bola durante o jogo, sincronizada entre mesas.
8. **Duplas 2x2** — ranking de parcerias. Ver [[Duplas 2x2]].
9. **Imagem de compartilhamento** do vencedor do dia (`src/share/winnerShareImage.js`).

## Identidade visual
Tema mesa de feltro: fundo verde, dourado para o vencedor, azul giz para interação, latão nos detalhes. Jogadores são representados como bolas de sinuca. Mobile-first com navegação por barra inferior.

O sistema visual completo vive em `DESIGN-SYSTEM.md` na raiz do repositório. **Não existe design system formalizado em ferramenta** — o padrão vive no markdown e no código.

## Onde o produto está hoje
Em produção, com uso real. O banco de [[Banco de Homologação|homologação]] tem 406 partidas e 11 jogadores registrados, o que dá uma boa ideia da escala: um grupo pequeno, muitas partidas por noite.

> [!warning] Três recordes exibidos hoje estão errados
> "Lavador / 7x0" e "Maratonista" mostram números que não correspondem à realidade. Ver [[AUD-03 Record lavador é fictício]] e [[AUD-04 Maratonista usa dia UTC]].

Relacionado: [[Escopo]] · [[Modos de Jogo]] · [[Visão Geral da Arquitetura]]
