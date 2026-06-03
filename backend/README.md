# Sistema Inteligente de Mistura Automatizada (SIMA) - Backend

Backend responsável por gerenciar regras de negócios e intermediar a comunicação em tempo real (via WebSocket e MQTT) entre a interface web e o controlador de automação ESP32.

## Tecnologias Utilizadas

*   **FastAPI**: Framework web em Python com suporte nativo a `async/await` (alta performance e perfeito para WebSockets).
*   **SQLAlchemy + SQLite**: ORM para manipulação de dados locais, simplificando o deployment em plataformas gratuitas sem depender de um servidor de banco dedicado, facilitando muito o modelo acadêmico.
*   **Paho MQTT**: Biblioteca oficial Paho Client para conexão ao broker da HiveMQ Cloud.
*   **WebSockets**: Permite envio bidirecional de mensagens, usado para notificar a Web (Frontend) sem que ela precise "perguntar" o progresso do ESP32 constantemente (Long-Polling).

## Estrutura e Padrão de Projeto

A arquitetura escolhida foi a **Modularizada em Camadas** (*Layered Architecture*), recomendada em projetos FastAPI modernos:

```
app/
 ┣ api/          # Endpoints HTTP e rotas de WebSocket (Controllers)
 ┣ core/         # Configurações com Pydantic Settings e leitura de variáveis (.env)
 ┣ database/     # Configuração de Engine e Sessions do SQLAlchemy
 ┣ models/       # Mapeamento Objeto-Relacional (Classes que espelham tabelas do Banco de Dados)
 ┣ mqtt/         # Cliente em Background, callbacks de telemetria e injeção do progresso pro WebSocket
 ┣ schemas/      # Modelos Pydantic para serialização/deserialização (Validação de Input/Output das APIs)
 ┗ websocket/    # Connection Manager que orquestra conexões com o Frontend
```

## Comunicação em Tempo Real

1. O ESP32 posta status para `sima/telemetry/status` (via MQTT).
2. O Backend (Paho MQTT em background) captura essa mensagem na callback `on_message`.
3. O Backend injeta o payload no gerenciador de `WebSocket`.
4. O Frontend React consome e atualiza a barra de progresso.