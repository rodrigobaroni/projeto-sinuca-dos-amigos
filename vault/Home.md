---
tags: [moc]
---
# 🎱 Placar da Sinuca — Vault

Documentação viva do projeto **Sinuca dos Amigos**. Abra esta pasta (`vault/`) direto no Obsidian.

> [!info] O que é este app
> App recreativo para registrar e consultar as partidas de sinuca de um grupo de amigos. Formato "vai quem ganha", 1x1 e 2x2. Leitura pública, escrita só para o admin.
> Stack: **React 19 + Vite + Supabase**. Sem servidor próprio.

## Comece por aqui

| Se você quer... | Vá para |
| --- | --- |
| Entender o produto | [[Visão do Produto]] |
| Entender como o código está organizado | [[Mapa do Código]] |
| Entender as contas (ranking, streak, records) | [[Estatísticas e Ranking]] |
| Entender por que o "dia" começa ao meio-dia | [[Dia de Jogatina]] |
| Subir o app na sua máquina | [[Rodando Localmente]] |
| Ver o que está quebrado hoje | [[Auditoria 2026-08-20]] ⚠️ |
| Ver o histórico de sessões de trabalho | [[Diario de Trabalho]] |
| Ver o que o time está fazendo agora | [[Kanban]] |

## Mapa

### Produto
- [[Visão do Produto]] — o que é, para quem, o que resolve
- [[Escopo]] — o que está dentro e o que ficou fora
- [[Modos de Jogo]] — numerada, mata a mata, 3 bolas
- [[Glossário]] — vocabulário da resenha e do código

### Arquitetura
- [[Visão Geral da Arquitetura]] — as peças e como conversam
- [[Modelo de Dados]] — tabelas, colunas, constraints
- [[Segurança e RLS]] — quem pode ler e escrever ⚠️
- [[Tempo Real]] — como as telas se sincronizam entre mesas
- [[Ambientes]] — produção, homologação e variáveis

### Domínio (as regras que geram os números)
- [[Estatísticas e Ranking]]
- [[Dia de Jogatina]]
- [[Partida ao Vivo]]
- [[Duplas 2x2]]
- [[Records]]

### Código
- [[Mapa do Código]]
- [[Camada de Domínio]]
- [[Camada de Views]]
- [[Serviços e Supabase]]
- [[Código Morto e Duplicado]] ⚠️

### Operação
- [[Kanban]] — board do time, fonte da verdade das pendências
- [[Rodando Localmente]]
- [[Testes]]
- [[Banco de Homologação]]

### Auditoria
- [[Auditoria 2026-08-20]] — relatório completo, **12 achados** (1 crítico, 6 altos); a maioria corrigida em 20/08
- [[Como Reproduzir os Achados]]

### Registro
- [[Diario de Trabalho]] — índice cronológico das sessões de trabalho — os comandos exatos, contra homologação

## Convenções deste vault
- `⚠️` marca uma nota que descreve algo quebrado ou arriscado hoje.
- Notas de achado usam o prefixo `AUD-NN` e vivem em `Auditoria/`.
- Referências a código usam o formato `arquivo:linha` (ex.: `src/domain/stats.js:216`).
- Nada aqui é gerado automaticamente: se o código mudar, a nota precisa ser atualizada na mão.
