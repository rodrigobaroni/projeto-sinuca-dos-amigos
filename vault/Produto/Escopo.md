---
tags: [produto]
---
# Escopo

Fonte: `SPEC.md` na raiz do repositório.

## Dentro do escopo (v1)
- Registrar partida: jogador A, jogador B, vencedor, data/hora.
- Ordem das bolas encaçapadas — **opcional** por partida.
- Ranking geral com vitórias, derrotas, % de aproveitamento, sequência atual e melhor sequência.
- Ranking por [[Dia de Jogatina]], com recorte automático de 12h até 12h do dia seguinte.
- Histórico de partidas com filtro por nome e detalhe (incluindo ordem das bolas).
- Confronto direto (H2H) entre dois jogadores.
- Perfil do jogador com stats e últimos jogos.
- [[Records]]: mais vitórias, maior sequência, mais bolas em sequência, mais jogos, melhor aproveitamento (3+ jogos), quem está embalado agora.
- Acesso: leitura pública, escrita só pro admin logado.

Adicionado depois da v1 (visível no código e no schema):
- [[Duplas 2x2]] e ranking de parcerias.
- [[Partida ao Vivo]] com múltiplas mesas simultâneas.
- Logs de auditoria (`audit_logs`).
- Clipes de vídeo vinculados à partida (`match_clips`, alimentado pelo app iOS — ver `CLIPS-IOS-CONTRACT.md`).

## Fora do escopo (v1)
- Foto de jogador.
- Comentários por partida.
- Edição da ordem das bolas depois de salvar (o caminho é apagar e relançar).
- Notificações.

> [!tip] Para o PM/PO
> Se um pedido cair na lista "fora de escopo", sinalize antes de virar card. A lista é uma decisão de produto registrada, não um esquecimento.

## Consequência de escopo que virou bug
A ordem das bolas ser **opcional** é uma decisão de produto legítima — mas o cálculo do record "lavador / 7x0" não trata o caso de `ball_log` vazio e conta toda partida sem anotação como uma lavada. Nos dados de homologação isso são **335 de 406 partidas (83%)**. Ver [[AUD-03 Record lavador é fictício]].

Relacionado: [[Visão do Produto]] · [[Records]]
