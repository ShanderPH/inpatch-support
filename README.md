# 🌐 inPatch Suporte

Uma aplicação web moderna para acompanhar o desenvolvimento dos principais projetos e automações do time de Suporte da inChurch. Funciona como um Patch Notes dinâmico, exibindo o progresso em tempo real dos projetos em desenvolvimento.

## ✨ Características

- **Interface Moderna**: Design responsivo com Mobile First approach
- **Tema Dark/Light**: Transições suaves entre temas com gradientes personalizados
- **Liquid Glass Effect**: Efeito visual moderno usando Hero UI
- **Animações Fluidas**: Transições e animações suaves com Framer Motion
- **Cards de Projeto**: Visualização clara do progresso, plataformas e responsáveis
- **Dados Dinâmicos**: Estrutura preparada para integração futura com Trello API

## 🛠️ Tecnologias Utilizadas

- **Next.js 15.5** - Framework React para produção
- **React 19.1** - Versão mais recente para performance otimizada
- **Tailwind CSS v4** - Framework CSS utility-first com gradientes personalizados
- **Hero UI** - Biblioteca de componentes com efeitos Liquid Glass
- **React Icons** - Biblioteca de ícones para badges e elementos UI
- **Framer Motion** - Animações e transições suaves
- **TypeScript** - Segurança de tipos e melhor experiência de desenvolvimento
- **next-themes** - Sistema de tema Dark/Light com transições suaves

## 🎨 Design System

### Cores
- **Primária**: `hsl(96, 44%, 42%)` e suas variações
- **Background Light**: Gradiente `white → hsl(120, 14%, 99%)`
- **Background Dark**: Gradiente `hsl(60, 2%, 8%) → hsl(93, 19%, 11%)`

### Componentes
- **Liquid Glass Cards**: Efeito de vidro com backdrop-filter
- **Progress Bars**: Barras de progresso animadas
- **Platform Badges**: Tags coloridas para N8N, Jira, Hubspot, Backoffice, Google Workspace
- **Stats Dashboard**: Cards de estatísticas com ícones

## 📂 Estrutura do Projeto

```
├── app/                    # App Router do Next.js
│   ├── layout.tsx         # Layout principal com providers
│   └── page.tsx           # Página principal com dashboard
├── components/            
│   ├── project-card.tsx   # Componente de card de projeto
│   ├── navbar.tsx         # Barra de navegação
│   └── theme-switch.tsx   # Alternador de tema
├── data/
│   └── mock-projects.ts   # Dados mockados (futura integração Trello)
├── types/
│   └── project.ts         # Tipos TypeScript para projetos
├── styles/
│   └── globals.css        # Estilos globais e liquid glass
└── config/
    ├── site.ts            # Configurações do site
    └── fonts.ts           # Configurações de fontes
```

## 🚀 Como Executar

### Pré-requisitos
- Node.js 18+ 
- npm, yarn, pnpm ou bun

### Instalação

1. Clone o repositório:
```bash
git clone [url-do-repositorio]
cd inpatch-suporte
```

2. Instale as dependências:
```bash
npm install
```

3. Execute em modo de desenvolvimento:
```bash
npm run dev
```

4. Acesse http://localhost:3000 no navegador

### Scripts Disponíveis

```bash
npm run dev      # Servidor de desenvolvimento
npm run build    # Build de produção
npm run start    # Servidor de produção
npm run lint     # Verificação de lint
```

## 🔮 Integrações Futuras

O projeto foi estruturado pensando em futuras integrações:

### Trello API Integration
- Função `fetchProjectsFromTrello()` já preparada em `/data/mock-projects.ts`
- Estrutura de dados compatível com boards do Trello
- Sistema de cache e atualização automática

### Funcionalidades Planejadas
- Notificações push para atualizações de projetos
- Filtros por responsável, plataforma e status
- Histórico de mudanças de progresso
- Dashboard administrativo
- Relatórios de performance

## 👥 Time de Responsáveis

- **Guilherme Souza** - Desenvolvimento de Automações
- **Felipe Braat** - Integrações e Dashboards
- **Tiago Triani** - Sistemas e Monitoramento

## 🏗️ Plataformas Suportadas

- **N8N** - Automação de workflows
- **Jira** - Gestão de tickets e projetos
- **Hubspot** - CRM e marketing automation
- **Backoffice** - Sistemas internos
- **Google Workspace** - Ferramentas de produtividade

## 📱 Responsividade

O projeto segue o padrão **Mobile First**:
- **Mobile**: Design otimizado para telas pequenas
- **Tablet**: Layout adaptado para telas médias
- **Desktop**: Experiência completa em telas grandes

## 🎯 Status dos Projetos

- **Planning** - Em planejamento
- **Development** - Em desenvolvimento
- **Testing** - Em fase de testes
- **Completed** - Concluído
- **On-hold** - Pausado temporariamente

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

---

**© 2024 inChurch - Time de Suporte**

*Desenvolvido com ❤️ usando Next.js e Hero UI*