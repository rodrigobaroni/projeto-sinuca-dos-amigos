# Prompt para Figma Make - Encaçapei App
## Design System & Wireframing

**Status:** Pronto para Gerar Wireframes  
**Plataforma:** Mobile iOS/Flutter (380px viewport)  
**Tema:** Dark Forest + Lime  

---

## 1. VISÃO GERAL DO APP

**Nome:** Encaçapei  
**Descrição:** App de gerenciamento de partidas de sinuca entre amigos, com sistema de escalação, ranking por liga e histórico consolidado de confrontos.

**Principios de Design:**
- Mobile-first (380px)
- Paleta: Dark Forest #262824 (backgrounds), Lime #C1E778 (CTAs/highlights), White/Light Gray (cards)
- Cards com 0.5px borders, 8-12px border-radius
- Bottom tab navigation com 5 abas
- Modals para ações críticas
- Gráficos simples e claros

**Navegação Principal:** 5 abas na base
1. Home (dashboard)
2. Amigos (rede social)
3. Liga (core)
4. Locais (mapa)
5. Perfil (settings + notificações)

---

## 2. FLUXO PRÉ-NAVEGAÇÃO (Onboarding)

### 2.1 Splash Screen
- Logo centralizado
- Loading animation (3-5 seg)
- Sem texto adicional
- Background: Dark Forest

### 2.2 Onboarding Carrossel
- 2-3 telas swipeáveis
- Tela 1: "Organize suas ligas" (mostra ícone de ranking)
- Tela 2: "Acompanhe amigos" (mostra ícone de amigos)
- Tela 3: "Compartilhe resultados" (mostra ícone de compartilhamento)
- Botão "Começar" no final

### 2.3 Login/Cadastro
**Tabs:** "Login" | "Cadastro"

**Login Screen:**
- Email input
- Senha input
- "Esqueceu a senha?" link
- CTA "Entrar"
- Link "Não tem conta? Cadastre-se"

**Cadastro Screen (Modal/Wizard - 6 telas):**
1. Nome completo
2. Apelido (sem caracteres especiais, hint "ex: Baroni")
3. Email (com hint "nome@email.com")
4. Foto (botão "Escolher da galeria" ou "Usar foto padrão")
5. Senha com validação em tempo real:
   - Checklist visual: Maiúscula ✓, Minúscula ✓, Número ✓, Especial ✓, 8+ chars ✓
   - Cor: vermelho quando não atende, verde quando atende
6. Revisão (mostrar dados inseridos, editar ou confirmar)
- Botão final: "Criar conta"

---

## 3. ABA 1: HOME (Dashboard)

### Layout da Home
```
[Status Bar: hora | bateria]
[Header: foto circular + nome + "Desde Jan 2025"]
[Seção: KPI Cards 2x2]
[Seção: Gráficos Expandível]
[Seção: Ligas Ativas]
[CTA: "Ver todas as ligas"]
[Bottom Tab Nav]
```

### 3.1 Header
- Foto circular (48px), espaçada 12px do nome
- Nome em bold 16px
- Subtítulo cinza 12px: "Desde [mês/ano]"
- Click → vai para Perfil

### 3.2 KPI Cards (Grid 2x2)
Cada card: label 12px cinza + número 20px bold

| Card 1 | Card 2 |
| --- | --- |
| Partidas jogadas | Taxa de vitória |
| 47 | 62% |
| Card 3 | Card 4 |
| Vitórias consecutivas | Maiores derrotas |
| 5 | 2 |

- Background: Light Gray (#f5f5f5)
- Border: 0.5px cinza
- Border-radius: 8px
- Padding: 12px

### 3.3 Seção "Gráficos de Evolução" (Expandível)
**Default:** Colapsada, mostra texto "Gráficos de Evolução" + ícone chevron

**Ao Expandir:**
1. **Gráfico 1: Linha (Taxa de Vitória - Últimos 30 dias)**
   - Eixo X: dias
   - Eixo Y: % (0-100)
   - Linha: Lime #C1E778
   - Fundo: White com grid suave
   - Altura: 200px

2. **Gráfico 2: Barras (Vitórias/Derrotas por Semana)**
   - Eixo X: semanas (Sem1, Sem2, Sem3, Sem4)
   - Eixo Y: contagem
   - Barras azul (vitórias) e cinza (derrotas), lado a lado
   - Altura: 180px

- Spacing entre gráficos: 16px
- Click no titulo para colapsar

### 3.4 Seção "Ligas Ativas"
- Label "Ligas ativas" + contagem "3 ligas"
- Até 3 cards (se tiver mais, mostra "Ver todas")
- Cada card:
  - Nome liga (bold)
  - Badge de status (Ativa=verde, Encerrada=cinza)
  - "X amigos • Y partidas" (12px cinza)
  - Border: 0.5px cinza
  - Padding: 12px
  - Click → vai para detalhes da liga

**Empty State (se sem ligas):**
- Ícone representativo
- Texto: "Você ainda não está em nenhuma liga"
- CTA: "Criar ou entrar em uma liga"

---

## 4. ABA 2: AMIGOS (Rede Social)

### Layout da Aba Amigos
```
[Seção: Busca Global]
[Seção: Seus Amigos]
[Aba: Convites Pendentes]
[Bottom Tab Nav]
```

### 4.1 Busca Global de Amigos
- TextField com placeholder: "Buscar amigos..."
- Icon search (lupa) antes do input
- Quando clica, abre results com lista de usuários encontrados
- Cada resultado: foto, nome, apelido, botão "Adicionar"
- Ao clicar "Adicionar": muda para "Convite enviado" (disabled)

### 4.2 Seção "Seus Amigos"
- Lista de amigos adicionados
- Cada amigo: foto pequena (36px), nome, apelido cinza
- Ao clicar → tela de histórico H2H

### 4.3 Aba "Convites Pendentes"
- Tab ao lado de "Seus Amigos"
- Mostra convites recebidos: "João te convidou para ser amigo"
- Botões: "Aceitar" | "Recusar"
- Se vazio: "Sem convites no momento"

### 4.4 Tela de Histórico H2H
**Layout:**
```
[Header: foto + nome amigo + "Histórico com você"]
[Placar Consolidado Grande]
[Tabs: Consolidado | Detalhes]
[Lista de Dias ou Partidas]
[Filtros: Liga | Período]
```

- Placar em grande: "Você 5 vs João 3"
- Fonte: 28px bold, Lime para seu numero, gray para dele
- Cards por dia de jogatina:
  - Data: "29 de junho 2025"
  - Placar: "Você 2 vs João 1"
  - Filtros por liga (dropdown) e período (date range)

---

## 5. ABA 3: LIGA (Core da Aplicação)

### Layout Principal da Aba Liga
```
[Seção: Convites Pendentes - SE HOUVER]
[Busca Global de Ligas]
[Listagem de Ligas Ativas/Encerradas]
[Botão Flutuante: "+ Criar Liga"]
[Bottom Tab Nav]
```

### 5.1 Seção "Convites Pendentes de Liga"
**Aparece apenas se houver convites**

Cada convite é um card:
- "Liga [Nome da Liga]"
- "Convidado por [Nome Amigo]"
- Data do convite (cinza 12px)
- 2 botões: "Aceitar" (Lime) | "Recusar" (cinza)
- Ao aceitar: some do card, aparece em "Ligas Ativas"

Se vazio: (não mostra esta seção)

### 5.2 Busca Global de Ligas
- TextField: "Buscar ligas públicas..."
- Ao buscar, mostra resultados:
  - Nome liga
  - Admin (criador)
  - "X participantes"
  - Botão "Solicitar entrada" (envia request ao admin)

### 5.3 Listagem de Ligas
**Segregação por Status:**
- **Ativas** (topo)
- **Encerradas** (embaixo)

Cada card de liga:
```
Liga [Nome]            [Status Badge]
4 amigos • 12 partidas
Próxima: Terça 20h
```
- Status Badge: verde (Ativa), cinza (Encerrada)
- Click → vai para Detalhes da Liga

**Empty State:** "Nenhuma liga" + CTA "Criar liga"

### 5.4 Tela de Detalhes da Liga
**Tabs:** Ranking | Histórico | Config

#### 5.4.1 Tab "Ranking"
- Tabela com colunas: Posição | Foto+Nome | Vitórias | Derrotas | % Aproveitamento
- Exemplo:
  ```
  1.  👤 Felipe    | 8 | 2 | 80%
  2.  👤 João      | 5 | 4 | 55%
  3.  👤 Anderson  | 3 | 7 | 30%
  ```
- Ordenado por % (decrescente)
- Cores alternadas nas linhas

#### 5.4.2 Tab "Histórico"
- Filtros: por dia de jogatina (dropdown), por resultado (Ganho/Perdido)
- Lista de partidas: Data | Horário | "Você vs Adversário" | Resultado (Vitória/Derrota)
- Cada linha clicável → detalhes da partida

#### 5.4.3 Tab "Config"
- Nome da liga (edit)
- Local (edit)
- Estilo de jogo (edit): "1v1" | "Duplas"
- Regras: "Marca bola caída?" (toggle), "Marca falta?" (toggle)
- Horário jogatina: início (timepicker) - fim (timepicker)
- Status: Ativa | Encerrada
- Botão "Salvar" (Lime)
- Se admin: Botão "Convidar mais amigos", "Gerar código", "Encerrar liga" (vermelho)

### 5.5 Fluxo "Iniciar Partida"
**Tela 1: Seleção do Primeiro Jogador**
- Campo de busca: "Quem vai jogar?"
- Lista de participantes da liga com fotos
- Click em jogador → selecionado (checkmark, fundo Lime)

**Tela 2: Seleção do Segundo Jogador**
- Botão voltar (X ou chevron)
- Jogador 1 já aparece no topo (fixo)
- "vs"
- Campo de busca: "Quem vai jogar contra?"
- Botão "Começar partida" (Lime)

**Tela 3: Partida em Andamento**
```
[Topo: Liga [nome] | Dia de jogatina [data + hora]]
[Grande: Jogador 1 vs Jogador 2]
[Foto circular 72px + Nome + Vitórias hoje]
[Bolas restantes (1-8) - visual de escalação]
[Botões: "Venceu" (Lime) | "Perdeu" (cinza)]
```

- Ao clicar "Venceu":
  - Mostra "Parabéns!"
  - Vencedor fica pré-selecionado para próxima
  - Volta pra Tela 2 (seleção de novo adversário)
  - Perdedor sai

**Fluxo de Compartilhamento (após finalizar dia):**
- Modal: "Você ficou em [posição] no dia de jogatina de [liga]!"
- Preview card com ranking do dia
- Botões (pré-preenchidos com msg):
  - Instagram (abre com texto: "Fui 1º lugar no dia de jogatina de [liga]! 📱 #Sinuca #Encaçapei")
  - TikTok (similar)
  - WhatsApp (abre chat com mensagem)
  - Copiar para clipboard

### 5.6 Fluxo "Criar Liga"
**Modal/Wizard com 5 steps:**

1. **Dados Básicos**
   - Nome (required)
   - Local (autocomplete de Locais)
   - Duração: Rádio buttons (Um dia | 6 meses | Infinita)

2. **Se "Um dia":**
   - Data (datepicker)
   - Horário início (timepicker)
   - Horário fim (timepicker)

3. **Se "6 meses":**
   - Data início (datepicker)
   - Data fim (datepicker)
   - Dias de jogatina (checkboxes: seg-dom)
   - Horário (timepicker: início-fim)

4. **Se "Infinita":**
   - Dias de jogatina (checkboxes)
   - Horário (timepicker)

5. **Regras**
   - Estilo: toggle 1v1 ou duplas
   - Bola caída: toggle sim/não
   - Falta: toggle sim/não

6. **Convites (último step)**
   - "Convidar amigos" button
   - ou "Gerar código" button
   - Ou "Começar sem convidar"

Botões: "Voltar" | "Próximo" | "Criar liga" (final)

---

## 6. ABA 4: LOCAIS (Mapa)

### Layout Principal
```
[Mapa com pins]
[Cada pin clicável → card com detalhes]
[Se admin: opção de atrelar liga]
[Bottom Tab Nav]
```

### 6.1 Mapa
- Google Maps style
- Pins com ícone de mesa de sinuca
- Ao clicar no pin, abre card:

### 6.2 Card de Detalhes do Local
- Foto do bar
- Nome do bar
- Avaliação (stars + número): ⭐ 4.5 (128 avaliações)
- Horário funcionamento: "Seg-Dom 20h-04h"
- Valor: "R$ 30/hora"
- Distância: "2.4 km"
- Botão "Traçar rota" (abre Google Maps/Apple Maps)
- Se é jogador comum: "Ligas que jogam aqui: Liga Terça, Ranking Geral"
- Se é admin: Botão "Atrelar liga"

### 6.3 Fluxo "Atrelar Liga" (Admin)
- Modal com seleção de liga
- Dropdown: "Qual liga joga neste local?"
- Botão "Atrelar" (Lime)
- Sucesso: "Liga atrelada com sucesso!"

---

## 7. ABA 5: PERFIL (Configurações + Notificações)

### Layout Principal
```
[Seção: Dados do Jogador]
[Seção: Editar Perfil]
[Aba: Notificações]
[Botão: Sair]
[Bottom Tab Nav]
```

### 7.1 Seção "Seu Perfil"
- Foto circular clicável (48px)
- Nome (bold 16px)
- Apelido cinza (12px)
- Estatísticas:
  - Partidas: 47
  - Taxa vitória global: 62%

### 7.2 Botões de Configuração
- "Editar perfil" (abre form)
- "Alterar senha" (abre form)
- "Sair da conta" (confirmação)

### 7.3 Form "Editar Perfil"
- Foto (botão "Escolher foto")
- Nome
- Apelido
- Email (edit)
- Botão "Salvar" (Lime)

### 7.4 Form "Alterar Senha"
- Senha atual (input)
- Senha nova (com validação igual ao cadastro)
- Confirmar senha
- Botão "Atualizar" (Lime)

### 7.5 Aba "Notificações"
**Centro de Notificações com histórico**

Grupos por tipo (colapsável):
1. **Convites de Liga**
   - "Liga [nome] te convidou"
   - Data/hora: "há 2 horas"
   - Ações: Aceitar | Recusar | Visualizar
   - Ícone: envelope

2. **Convites de Amigos**
   - "[Nome] quer ser seu amigo"
   - Data/hora
   - Ações: Aceitar | Recusar

3. **Avisos de Jogatina**
   - "Seu dia de jogatina da Liga [nome] começa em 1 hora"
   - Data/hora
   - Ação: Visualizar

**Funcionalidades:**
- Checkbox "Marcar como lida" por notificação
- Botão "Limpar histórico" (topo)
- Se vazio: "Sem notificações"

---

## 8. COMPONENTES REUTILIZÁVEIS

### Cards
- Border: 0.5px #ccc
- Border-radius: 8px
- Padding: 12px-16px
- Background: White

### Buttons
- **Primary (CTA - Lime):** Background #C1E778, text Dark Forest, padding 12px 24px, border-radius 8px, cursor pointer
- **Secondary (gray):** Background transparent, border 0.5px gray, padding 12px 24px, border-radius 8px
- **Danger (red):** Background #FF6B6B, text white, padding 12px 24px

### Input Fields
- Border: 0.5px gray
- Padding: 12px
- Border-radius: 8px
- Focus: border Lime, shadow subtle
- Placeholder: #999

### Badges/Status
- Ativa: Background #D4EDDA (green), text #155724
- Encerrada: Background #F8F9FA (gray), text #6C757D
- Pendente: Background #FFF3CD (yellow), text #856404
- Padding: 4px 12px, border-radius 4px, font-size 11px

### Modals
- Overlay: rgba(0,0,0,0.5)
- Card: white, border-radius 12px
- Header: bold 18px
- Body: padding 16px
- Footer: botões alinhados direita

### Tab Navigation (Bottom)
- 5 abas: Home | Amigos | Liga | Locais | Perfil
- Background: Light Gray
- Active: texto Lime, ícone destacado
- Inactive: texto cinza
- Altura: 60px (com ícone + label)

---

## 9. FLUXOS CRÍTICOS (Resumo)

### Fluxo 1: Cadastro Completo
Splash → Onboarding → Login/Cadastro (6 steps) → Home

### Fluxo 2: Criar e Entrar em Liga
Home → Liga → "Criar liga" (5 steps) → Convidar amigos → Iniciar partida

### Fluxo 3: Escalação de Partidas
Liga → "Iniciar partida" → Seleção J1 → Seleção J2 → Tela partida em andamento → Registrar resultado → Próxima partida

### Fluxo 4: Histórico H2H
Amigos → Amigo → Histórico consolidado + filtros + detalhes

### Fluxo 5: Notificações
Perfil → Notificações → Aceitar/recusar convites

### Fluxo 6: Compartilhamento
Fim do dia de jogatina → "Compartilhar resultado" → Modal preview → Rede social

---

## 10. ESPECIFICAÇÕES VISUAIS FINAIS

### Paleta de Cores
- **Dark Forest:** #262824 (backgrounds, textos principais)
- **Lime (Accent):** #C1E778 (CTAs, highlights, números importantes)
- **White:** #FFFFFF (cards, background)
- **Light Gray:** #F5F5F5 (secondary backgrounds)
- **Gray:** #999999 (textos secundários, borders)
- **Red (Danger):** #FF6B6B
- **Green (Success):** #4CAF50
- **Yellow (Warning):** #FFC107

### Tipografia
- **Headings (H1):** 22px, bold
- **Headings (H2):** 18px, bold
- **Headings (H3):** 16px, bold
- **Body:** 14px, regular
- **Small:** 12px, regular
- **Labels:** 11px, regular

### Spacing
- **Padding:** 16px (padrão), 12px (components), 8px (interno)
- **Gap:** 16px (entre sections), 12px (entre cards)
- **Margin-bottom:** 16px (entre sections)

### Border-Radius
- **Cards:** 8px
- **Modals:** 12px
- **Buttons:** 8px
- **Inputs:** 8px
- **Badges:** 4px

### Shadows
- Minimal: apenas hover effects
- Cards: 0.5px border (no shadow)
- Modals: subtle shadow on overlay

### Viewport
- **Mobile:** 380px (iPhone 12/13/14 standard)
- **Orientação:** Portrait only
- **Top Safe Area:** 20px (notch compensation)
- **Bottom Safe Area:** 60px (tab bar)

---

## 11. INSTRUÇÕES FINAIS PARA IA DO FIGMA

1. **Crie frames separados para cada tela/seção mencionada**
2. **Use componentes reutilizáveis** para cards, buttons, inputs, badges
3. **Aplique a paleta de cores exatamente como especificado**
4. **Respeite o viewport 380px** (mobile-first)
5. **Crie 2-3 estados para botões** (default, hover, active)
6. **Adicione labels e anotações** nas telas explicando interações
7. **Organize os frames em "pages"** por aba (Home, Amigos, Liga, Locais, Perfil)
8. **Prioritize wireframes claros e estrutura lógica** sobre design visual polido
9. **Use linhas e grids** para alinhar elementos consistentemente
10. **Salve como "Encaçapei-Wireframes-[data]"**

---

**Fim do Prompt**  
Data: Janeiro 2025  
Versão: 1.0