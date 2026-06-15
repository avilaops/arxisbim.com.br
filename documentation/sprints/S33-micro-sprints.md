# Detalhamento de Micro-Sprints · S33.01 a S33.15

Este documento subdivide o **S33 (Visualização WebGPU e Unreal Engine)** em 15 micro-sprints autocontidos. Cada micro-sprint é planejado para ser concluído em uma única iteração/chamada de desenvolvimento.

---

## 🗺️ Mapa de Micro-Sprints

```
[MÓDULO 1: WebGPU LOCAL] ────> S33.01: Setup & Deps ────> S33.02: Canvas/Engine
                             └──> S33.03: Mesh Loader ───> S33.04: Camera Orbit
                             └──> S33.05: Selection Raycast ──> S33.06: Material Shaders

[MÓDULO 2: ORQUESTRADOR API] ─> S33.07: AWS SDK Setup ──> S33.08: Lifecycle Service
                             └──> S33.09: Routing/Pool

[MÓDULO 3: PIXEL STREAMING] ──> S33.10: WebRTC View Layout ──> S33.11: Signaling Conn
                             └──> S33.12: Media Streams ───> S33.13: Camera Sync Data
                             └──> S33.14: Bi-directional Actions ──> S33.15: Fallback & QA
```

---

## 📦 MÓDULO 1: Visualizador WebGPU Local (Babylon.js)

### S33.01 · Dependências e Infraestrutura TS
* **Objetivo:** Instalar bibliotecas necessárias para rodar Babylon.js em WebGPU e configurar os tipos globais.
* **Modifica:** `backend/package.json`, `frontend/package.json`, `frontend/tsconfig.json`
* **Entregáveis:** 
  - Dependências `@babylonjs/core`, `@babylonjs/loaders` e `@babylonjs/havok` (physics opcional) no frontend.
  - Configuração do compilador TypeScript para reconhecer tipos do WebGPU (`navigator.gpu`).
* **Critério de Aceite:** `npm install` e `npm run type-check` passam sem erros.

---

### S33.02 · Inicialização da Engine WebGPU e Canvas
* **Objetivo:** Criar a classe base do renderizador WebGPU e integrá-la ao ciclo de vida do componente React.
* **Cria:** `frontend/src/viewer/render/WebGPURenderer.ts`
* **Modifica:** `frontend/src/viewer/ViewerContainer.tsx`
* **Entregáveis:**
  - Inicialização assíncrona da engine WebGPU com fallback seguro para WebGL caso a GPU não suporte.
  - Criação da cena padrão (Scene), câmera padrão e luz ambiente básica.
  - Resize automático atrelado ao tamanho do container DOM.
* **Critério de Aceite:** Canvas WebGPU renderiza uma tela limpa preta/cinza em computadores compatíveis com WebGPU.

---

### S33.03 · Pipeline de Carregamento de Geometria (glTF/Mesh)
* **Objetivo:** Implementar o parser que converte dados brutos geométricos (glTF/OBJ vindos do backend) para nós Babylon.js.
* **Cria:** `frontend/src/viewer/render/MeshLoader.ts`
* **Entregáveis:**
  - Carregador de arquivos `.gltf`/`.glb` assíncrono com suporte a cache local.
  - Mapeamento de ids de malhas (nodes) para os ExpressIDs originais do IFC.
* **Critério de Aceite:** Um modelo 3D de teste (glTF) é carregado e renderizado na cena Babylon com as texturas corretas.

---

### S33.04 · Mapeamento de Câmera e Controles Orbit
* **Objetivo:** Implementar os controles de câmera (Pan, Zoom, Orbit) equivalentes aos controles Three.js anteriores.
* **Modifica:** `frontend/src/viewer/render/WebGPURenderer.ts` (integração do ArcRotateCamera)
* **Entregáveis:**
  - Configuração do `ArcRotateCamera` do Babylon.js.
  - Vinculação de eventos de mouse (esquerdo: orbitar, direito: pan, scroll: zoom).
  - Restrições de colisão de câmera para evitar que o usuário atravesse o solo do modelo.
* **Critério de Aceite:** Navegação pelo modelo 3D idêntica à navegação do visualizador antigo, sem travamentos.

---

### S33.05 · Raycasting e Seleção de Elementos IFC
* **Objetivo:** Detectar o clique do mouse em elementos da cena 3D e extrair suas informações/ID IFC.
* **Cria:** `frontend/src/viewer/render/InteractionRaycast.ts`
* **Entregáveis:**
  - Raycaster configurado no evento `pointerDown` para testar colisão com malhas ativas.
  - Retorno do ExpressID do elemento selecionado para o container React.
  - Efeito visual de contorno (OutlineRenderer) ou highlight amarelo no elemento clicado.
* **Critério de Aceite:** Clicar em uma viga/parede destaca o elemento visualmente e exibe seu ID no console/HUD.

---

### S33.06 · Custom Shaders para Filtros (Hide, Isolate, Color Override)
* **Objetivo:** Implementar aplicação em lote de cores e visibilidade baseada nos ExpressIDs (filtros 3D).
* **Cria:** `frontend/src/viewer/render/FilterShaderMaterial.ts`
* **Entregáveis:**
  - Shader personalizado WebGPU (WGSL) ou material node que permite alterar a transparência e cor de múltiplos elementos instantaneamente.
  - Implementação das funções `hideElements(ids)`, `isolateElements(ids)` e `setColorOverride(ids, color)`.
* **Critério de Aceite:** Esconder ou isolar 10.000 elementos via código atualiza a cena em menos de 16ms (sem lag).

---

## 🖥️ MÓDULO 2: Orquestrador de Instâncias de GPU (Backend)

### S33.07 · Setup de Credenciais e SDK AWS EKS
* **Objetivo:** Configurar o cliente AWS e as variáveis de ambiente necessárias para controlar a infraestrutura de streaming.
* **Modifica:** `backend/src/core/config/` (gerenciador de envs), `.env.production`
* **Cria:** `backend/src/core/aws/eks-client.ts`
* **Entregáveis:**
  - Inicialização do SDK AWS com credenciais de produção para EKS.
  - Validação de conexão e saúde das credenciais ao bootar a API.
* **Critério de Aceite:** O servidor sobe em modo produção exibindo "AWS EKS client initialized successfully" nos logs.

---

### S33.08 · Serviço de Alocação e Ciclo de Vida da Unreal
* **Objetivo:** Escrever o serviço que cria pods Kubernetes (com imagem da Unreal Engine) sob demanda.
* **Cria:** `backend/src/modules/streaming/streaming-orchestrator.service.ts`
* **Entregáveis:**
  - Função `allocateInstance(userId, projectId)` que gera a definição yaml de um pod GPU e aplica no cluster.
  - Monitoramento de status do Pod (Pending, Running, Failed) até que ele retorne o IP público de streaming.
  - Algoritmo de limpeza (reclamation) que deleta pods inativos por mais de 5 minutos.
* **Critério de Aceite:** Testes unitários validam a lógica de criação de pods e o envio de requisições à API Kubernetes.

---

### S33.09 · Rotas da API e Pool de Sessões
* **Objetivo:** Disponibilizar os endpoints REST para que o frontend solicite conexões Unreal Engine.
* **Cria:** `backend/src/modules/streaming/streaming.routes.ts`
* **Entregáveis:**
  - Endpoint `POST /api/v1/streaming/session` (exige autenticação, retorna URL do pod sinalizador).
  - Endpoint `DELETE /api/v1/streaming/session/:id` (fecha sessão de streaming manualmente).
  - Tabela em memória/Redis para rastrear sessões ativas por usuário e prevenir duplicatas.
* **Critério de Aceite:** Requisição POST gera um registro de sessão no Redis e inicia a alocação em segundo plano.

---

## 🌐 MÓDULO 3: Integração WebRTC Pixel Streaming (Frontend)

### S33.10 · Layout do Componente Pixel Streaming e HUD
* **Objetivo:** Desenvolver a casca da interface React que irá renderizar a tag `<video>` do streaming.
* **Cria:** `frontend/src/viewer/render/PixelStreamingView.tsx`
* **Entregáveis:**
  - Componente de container flexível com estado de carregamento (Loading, Connecting, Connected, Disconnected).
  - HUD overlay com botões de fechar streaming, medidor de ping e seletor de preset de qualidade.
* **Critério de Aceite:** O componente renderiza corretamente no visualizador com animação de loading ao simular conexão.

---

### S33.11 · Conexão com Servidor de Sinalização (Signaling)
* **Objetivo:** Conectar o frontend ao WebSocket sinalizador da Unreal Engine para iniciar a negociação WebRTC.
* **Cria:** `frontend/src/viewer/render/SignalingClient.ts`
* **Entregáveis:**
  - Cliente WebSocket robusto com reconexão automática.
  - Envio e processamento de mensagens de protocolo padrão do Pixel Streaming (Offer, Answer, ICE Candidates).
* **Critério de Aceite:** Logs do console mostram "WebRTC Offer received" e "WebRTC Answer sent" com sucesso.

---

### S33.12 · Vinculação de Streams de Mídia (Vídeo/Áudio)
* **Objetivo:** Receber o stream de vídeo da Unreal Engine e injetá-lo na tag `<video>` de forma eficiente.
* **Modifica:** `frontend/src/viewer/render/PixelStreamingView.tsx`
* **Entregáveis:**
  - Instanciação de `RTCPeerConnection` com servidores STUN/TURN de produção.
  - Vinculação automática do track de vídeo recebido (`ontrack`) ao elemento HTML correspondente.
  - Tratamento de autoplay bloqueado pelo navegador (auto-mute fallback).
* **Critério de Aceite:** O feed de vídeo do servidor Unreal substitui a tela de carregamento e exibe a imagem gerada no servidor.

---

### S33.13 · Canal de Dados e Sincronização de Câmera
* **Objetivo:** Sincronizar a posição da câmera 3D do browser para que a Unreal renderize o mesmo ângulo.
* **Cria:** `frontend/src/viewer/render/DataChannelSync.ts`
* **Entregáveis:**
  - Inicialização do `RTCDataChannel` para tráfego de dados de baixa latência.
  - Envio serializado em JSON das coordenadas de posição, rotação e alvo (target) da câmera do browser a cada alteração.
* **Critério de Aceite:** Mover a câmera local envia comandos pelo Data Channel em menos de 10ms.

---

### S33.14 · Sincronização Bidirecional de Eventos de Interação
* **Objetivo:** Garantir que seleções de elementos e ocultações feitas no visualizador 3D reflitam na Unreal.
* **Modifica:** `frontend/src/viewer/render/DataChannelSync.ts`
* **Entregáveis:**
  - Envio de eventos `select`, `hide` e `isolate` com array de IDs pelo canal de dados.
  - Recepção de eventos da Unreal (caso o usuário interaja diretamente com o feed de vídeo) e repasse para o estado da app React.
* **Critério de Aceite:** Selecionar um elemento na Unreal altera sua ficha técnica no painel do browser de forma síncrona.

---

### S33.15 · Orquestrador de Fallbacks e Testes Finais (QA)
* **Objetivo:** Unificar os motores WebGPU e Pixel Streaming em uma interface unificada com tratamento de erros.
* **Cria:** `frontend/src/viewer/render/RenderManager.ts`
* **Entregáveis:**
  - Implementação de monitoramento de ping: se a latência no Pixel Streaming passar de 150ms por mais de 5s, reverter automaticamente para WebGPU local.
  - Testes automatizados de conexões de rede e simulação de perda de sinal de rede.
* **Critério de Aceite:** Desconectar a internet ou simular queda de sinal reverte a maquete para o modo offline WebGPU de forma transparente, sem travar a interface do usuário.
