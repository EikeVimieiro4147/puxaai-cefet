# Smart Schedule Planner

Um planejador de horários de cursos inteligente para estudantes universitários. Esta ferramenta ajuda os alunos a visualizar sua grade semanal, planejar os próximos semestres, detectar conflitos de horário e rastrear créditos de disciplinas.

> **Nota:** Modelos de Linguagem de Grande Escala (LLMs) foram usados extensivamente no desenvolvimento deste projeto.

## 🚀 Funcionalidades

- **Grade de Horários Interativa**: Visualize sua semana rapidamente (Segunda a Sábado, 07:00–22:00).
- **Detecção Inteligente de Conflitos**: Identifica e destaca automaticamente horários de cursos sobrepostos.
- **Filtragem Avançada**: Filtre cursos por nome, professor, semestre (período) e intervalo de horas.
- **Arrastar para Filtrar**: Clique e arraste na grade de horários para filtrar cursos disponíveis em janelas de tempo específicas.
- **Rastreamento de Pré-requisitos**: Bloqueia cursos cujos pré-requisitos não foram atendidos.
- **Visualização de Ocupação**: Acompanhe a capacidade das turmas com indicadores visuais de vagas totais, ocupadas e solicitadas.
- **Contador de Créditos**: Cálculo em tempo real do total de créditos em sua grade planejada.

## 🛠️ Tecnologias

- **Framework**: [React 18](https://reactjs.org/)
- **Ferramenta de Build**: [Vite](https://vitejs.dev/)
- **Linguagem**: [TypeScript](https://www.typescriptlang.org/)
- **Estilização**: [Tailwind CSS](https://tailwindcss.com/)
- **Componentes de UI**: [shadcn/ui](https://ui.shadcn.com/) (baseado no [Radix UI](https://www.radix-ui.com/))
- **Ícones**: [Lucide React](https://lucide.dev/)
- **Gerenciamento de Estado**: React Hooks (`useMemo`, `useCallback`, `useState`)
- **Testes**: [Vitest](https://vitest.dev/)

## 📂 Estrutura do Projeto

```
src/
├── components/       # Componentes de UI (Grade, Barra Lateral, Painel de Filtros, etc.)
│   └── ui/           # Componentes compartilhados shadcn/ui
├── data/             # Dados simulados e constantes
├── hooks/            # Hooks React personalizados (lógica para agendamento e filtragem)
├── lib/              # Funções utilitárias
├── pages/            # Páginas da aplicação (Índice Principal, NotFound)
├── types/            # Interfaces e tipos TypeScript
└── test/             # Arquivos de teste
```

## 🚦 Primeiros Passos

### Pré-requisitos

- [Node.js](https://nodejs.org/) (v18 ou superior)
- [npm](https://www.npmjs.com/)

### Instalação

1. Clone o repositório:
   ```bash
   git clone <repository-url>
   cd smart-schedule-planner
   ```

2. Instale as dependências:
   ```bash
   npm install
   ```

3. Inicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```

4. Execute os testes:
   ```bash
   npm run test
   ```

## 🧪 Testes

O projeto utiliza **Vitest** para testes unitários e de integração. A lógica principal de agendamento (detecção de conflitos, filtragem) é coberta para garantir a confiabilidade.

```bash
# Executar testes uma vez
npm run test

# Executar testes em modo watch
npm run test:watch
```

## 📄 Licença

Este projeto está licenciado sob a Licença MIT.
