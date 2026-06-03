# Sistema Inteligente de Mistura Automatizada (SIMA) - Frontend

Este é o Frontend do projeto acadêmico SIMA, um dashboard industrial moderno para controle de um misturador automatizado via IoT.

## Tecnologias Utilizadas

*   **Next.js 14 (App Router)**: Framework React para produção.
*   **TailwindCSS**: Estilização utilitária para um design rápido e moderno.
*   **Zustand**: Gerenciamento de estado global leve.
*   **Lucide React**: Ícones minimalistas.
*   **Recharts**: Biblioteca para construção dos gráficos de monitoramento.
*   **Sonner**: Notificações toast elegantes.
*   **Axios**: Cliente HTTP para comunicação com o backend FastAPI.

## Estrutura do Projeto

*   `src/app/`: Contém as rotas da aplicação (Dashboard, Controle, Receitas, Histórico, Recipientes, Configurações, Monitoramento).
*   `src/components/`: Componentes reutilizáveis de UI (GlassCard, StatusBadge) e Layout (Sidebar).
*   `src/store/`: Configuração do Zustand para o estado global do sistema.
*   `src/services/`: Configuração do Axios para chamadas à API do backend.

