# Prompt de Implementação da API do Trello para inPatch Suporte

## 🎯 Objetivo

Este prompt detalha a implementação da integração com a API do Trello para a plataforma `inPatch Suporte`, substituindo o web scraping atual por uma abordagem mais robusta e precisa. O objetivo é permitir a recuperação, criação, atualização e exclusão de cards do Trello, garantindo a correta exibição de membros, labels e status, e integrando-se perfeitamente com a arquitetura existente do projeto.

## 📋 Contexto do Projeto inPatch Suporte

A plataforma `inPatch Suporte` é um dashboard web moderno para o time de Suporte da inChurch, desenvolvido com Next.js 15.5.0, React 19.1.0, TypeScript 5.6.3 e Tailwind CSS 4.1.11. Atualmente, a aplicação utiliza web scraping para obter dados do Trello, o que tem causado problemas de precisão e modernidade na exibição dos cards. A integração com a API oficial do Trello é crucial para resolver esses problemas.

### Arquitetura Relevante:

- **Stack Principal**: Next.js, React, TypeScript, Tailwind CSS, HeroUI, Supabase (opcional), Zustand.
- **Estrutura de Diretórios**: `app/`, `components/`, `lib/`, `types/`, `config/`, `data/`, `supabase/`, `styles/`.
- **Integração Trello Existente**: O arquivo `lib/trello.ts` e o serviço `lib/services/trello-sync.ts` são os pontos de entrada para a lógica de integração com o Trello. Existe um `webhook` em `/api/trello-webhook/` para sincronização em tempo real.
- **Variáveis de Ambiente**: `NEXT_PUBLIC_TRELLO_API_KEY`, `NEXT_PUBLIC_TRELLO_API_TOKEN`, `NEXT_PUBLIC_TRELLO_BOARD_ID` já estão configuradas no `.env.local`.
- **Mapeamento de Dados**: O projeto já possui um mapeamento definido para `Card Name` -> `project.title`, `Card Description` -> `project.description`, `Card Labels` -> `project.platforms`, `Card Members` -> `project.responsible`, `Card List` -> `project.status`, `Card Due Date` -> `project.estimatedEndDate`, `Card Checklists` -> `project.progress`, `Card Activity` -> `project.startDate`.
- **Modelos de Dados**: A interface `Project` em `types/project.ts` define a estrutura esperada dos dados dos cards.

## 🛠️ Detalhes da Implementação da API do Trello

O `windsurf cascade` e o `claude code` devem focar na refatoração da lógica de integração com o Trello, utilizando a API REST oficial. A implementação deve ser feita principalmente nos arquivos `lib/trello.ts` e `lib/services/trello-sync.ts`, e quaisquer outros arquivos relevantes que necessitem de ajustes.

### 1. Autenticação

Utilizar as variáveis de ambiente `NEXT_PUBLIC_TRELLO_API_KEY` e `NEXT_PUBLIC_TRELLO_API_TOKEN` para autenticar todas as requisições à API do Trello. Estas devem ser passadas como parâmetros de query em todas as chamadas.

### 2. Recuperação de Cards (GET)

Refatorar a função de recuperação de cards para utilizar o endpoint `GET /boards/{id}/cards` ou `GET /lists/{id}/cards` da API do Trello. É crucial que a recuperação inclua:

- **Todos os Cards** do board `N2 + Gestão` (ID: `RVFcbKeF`).
- **Membros**: Incluir os membros atribuídos a cada card. A API permite obter `idMembers` e, com chamadas adicionais, os detalhes dos membros.
- **Labels**: Obter todas as labels associadas a cada card. A API retorna `idLabels` e, com chamadas adicionais, os detalhes das labels.
- **Status (Listas)**: Mapear o `idList` de cada card para o `project.status` conforme o `STATUS_MAPPING` já existente no projeto.
- **Checklists**: Para o cálculo do `project.progress`, obter os checklists e seus itens para calcular a porcentagem de conclusão.
- **Campos Customizados**: Se houver campos customizados no Trello que correspondam a dados no `Project` (ex: `priority`), estes devem ser recuperados e mapeados.

**Endpoints Relevantes:**
- `GET /boards/{id}/cards`
- `GET /cards/{id}` (para detalhes específicos de um card, se necessário)
- `GET /members/{id}` (para detalhes dos membros)
- `GET /labels/{id}` (para detalhes das labels)
- `GET /cards/{id}/checklists`

### 3. Criação de Cards (POST)

Implementar a funcionalidade de criação de novos cards utilizando o endpoint `POST /cards`. A função deve aceitar um objeto `Project` e mapear seus campos para os parâmetros da API do Trello:

- `name` (do `project.title`)
- `desc` (do `project.description`)
- `idList` (mapeado do `project.status`)
- `idMembers` (mapeado do `project.responsible`)
- `idLabels` (mapeado do `project.platforms`)
- `due` (do `project.estimatedEndDate`)

### 4. Atualização de Cards (PUT)

Implementar a funcionalidade de atualização de cards existentes utilizando o endpoint `PUT /cards/{id}`. A função deve aceitar o `id` do card do Trello e um objeto `Project` (ou um subconjunto de campos a serem atualizados) e mapear os campos para os parâmetros da API:

- `name`, `desc`, `closed`, `idMembers`, `idList`, `idLabels`, `due`, `pos`.

### 5. Exclusão de Cards (DELETE)

Implementar a funcionalidade de exclusão de cards utilizando o endpoint `DELETE /cards/{id}`. A função deve aceitar o `id` do card do Trello.

### 6. Tratamento de Erros e Rate Limiting

Manter e aprimorar o `Error Handling Robusto` e a `Sincronização Bidirecional com Rate Limiting` já mencionados no contexto do projeto. A API do Trello possui limites de taxa, que devem ser respeitados para evitar bloqueios.

### 7. Integração com o Sistema de Sincronização em Tempo Real

Atualizar a `Estratégia de 3 Camadas` (Webhook Push, Smart Polling, Manual Refresh) para que todas as operações de sincronização utilizem a API oficial do Trello. O `webhook` (`/api/trello-webhook`) deve ser configurado para receber eventos do Trello e acionar as atualizações na aplicação via API.

## 💡 Sugestões de Melhorias e Funcionalidades

Além da integração básica, considere as seguintes melhorias para a gestão de projetos da equipe N2:

### 1. Melhorias na Estruturação dos Cards do Trello

- **Padronização de Labels**: Criar um conjunto fixo de labels no Trello para categorias de projetos (ex: `Bug`, `Feature`, `Melhoria`, `Suporte N2`, `Infraestrutura`). Isso facilitará a filtragem e organização.
- **Uso de Campos Personalizados (Custom Fields)**: O Trello permite adicionar campos personalizados. Sugiro criar campos para:
    - **Prioridade**: Um campo de seleção com `Baixa`, `Média`, `Alta` (já mapeado no `ProjectPriority`).
    - **Estimativa de Tempo**: Um campo numérico para estimar horas ou dias de trabalho.
    - **Sprint/Período**: Um campo de texto ou data para associar o card a um ciclo de desenvolvimento específico.
    - **Cliente/Produto Afetado**: Um campo de texto para identificar o cliente ou produto relacionado.
- **Templates de Cards**: Criar templates de cards no Trello para tipos comuns de tarefas (ex: 


 `Bug Report`, `Nova Funcionalidade`, `Tarefa de Manutenção`), garantindo que todos os campos essenciais sejam preenchidos e que a documentação inicial seja consistente.
- **Definição de Critérios de Aceitação**: Incentivar a inclusão de critérios de aceitação claros na descrição de cada card, para que o time N2 saiba exatamente o que precisa ser entregue para considerar a tarefa concluída.

### 2. Melhorias na Plataforma inPatch Suporte

- **Visualização de Campos Personalizados**: Exibir os campos personalizados do Trello na interface do `inPatch Suporte`, permitindo que o time visualize e filtre os cards por prioridade, estimativa, etc.
- **Edição Direta de Campos**: Permitir a edição de campos como `priority`, `estimatedEndDate`, `responsible` e `platforms` diretamente na interface do `inPatch Suporte`, com a alteração sendo sincronizada de volta para o Trello via API.
- **Criação de Cards na Plataforma**: Adicionar uma funcionalidade para criar novos cards diretamente no `inPatch Suporte`, preenchendo os campos necessários e enviando-os para o Trello.
- **Filtros Avançados**: Implementar filtros mais robustos baseados nos campos personalizados do Trello (ex: filtrar por estimativa, por cliente, por sprint).
- **Notificações Personalizadas**: Configurar notificações no `inPatch Suporte` para alertar o time sobre:
    - Cards próximos do vencimento (`estimatedEndDate`).
    - Cards que mudaram de status (ex: de `a-fazer` para `em-andamento`).
    - Novos comentários em cards atribuídos.
- **Relatórios e Métricas**: Gerar relatórios simples sobre o desempenho do time, como:
    - Número de cards concluídos por semana/mês.
    - Tempo médio para conclusão de cards.
    - Distribuição de cards por prioridade e status.
- **Integração com Ferramentas de Comunicação**: Considerar a integração com ferramentas como Slack ou Google Chat para enviar notificações automáticas sobre atualizações de cards.

### 3. Processos de Gestão de Projetos

- **Definição de Fluxo de Trabalho Claro**: Estabelecer um fluxo de trabalho bem definido para os cards no Trello, com listas que representem cada etapa do processo (ex: `Backlog`, `A Fazer`, `Em Andamento`, `Revisão`, `Concluído`).
- **Reuniões de Stand-up Diárias**: Implementar reuniões diárias curtas (stand-ups) para que o time N2 possa discutir o progresso, identificar impedimentos e planejar as atividades do dia, utilizando o `inPatch Suporte` como ferramenta de apoio visual.
- **Refinamento de Backlog**: Realizar reuniões periódicas para refinar o backlog de projetos, priorizar tarefas e garantir que os cards estejam bem detalhados antes de iniciar o desenvolvimento.
- **Retrospectivas**: Conduzir retrospectivas regulares para analisar o que funcionou bem, o que pode ser melhorado e como otimizar os processos de trabalho.
- **Documentação de Conhecimento**: Incentivar a documentação de soluções e procedimentos em cards específicos ou em uma base de conhecimento integrada, para facilitar a consulta e o compartilhamento de informações dentro do time.

## 🚀 Próximos Passos para o `windsurf cascade` e `claude code`

1.  **Refatorar `lib/trello.ts`**: Implementar as funções para `GET`, `POST`, `PUT` e `DELETE` cards, utilizando a API oficial do Trello e as variáveis de ambiente para autenticação.
2.  **Atualizar `lib/services/trello-sync.ts`**: Adaptar o serviço de sincronização para utilizar as novas funções da API, garantindo que o mapeamento de dados (`STATUS_MAPPING`, etc.) seja aplicado corretamente.
3.  **Ajustar Componentes de UI**: Modificar `components/project-card.tsx`, `components/project-group.tsx` e `app/page.tsx` para exibir os dados completos dos cards (membros, labels, status, progresso) obtidos via API.
4.  **Implementar Funcionalidades de Edição/Criação**: Adicionar a lógica para permitir a criação e atualização de cards através da interface do `inPatch Suporte`, chamando as novas funções da API.
5.  **Testes**: Realizar testes abrangentes para garantir que a integração da API funcione corretamente, que os dados sejam sincronizados de forma precisa e que o `rate limiting` seja respeitado.

Este prompt serve como um guia detalhado para a transição do web scraping para a API do Trello, visando uma solução mais robusta, escalável e rica em funcionalidades para a gestão de projetos da equipe N2.

