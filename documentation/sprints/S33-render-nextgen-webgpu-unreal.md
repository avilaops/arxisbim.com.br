# S33 · Next-Gen Rendering: WebGPU & Unreal Engine Integration

**Fase:** Evolução e Performance (Utopia 3D)  
**Status:** Pendente  
**Depende de:** S32 (Release Candidate)  
**Bloqueia:** S34 (Processamento de Geometria no Servidor)

---

## Objetivo

Transicionar o pipeline gráfico do visualizador do Three.js/WebGL herdado para um motor híbrido de última geração: suporte a WebGPU local (via Babylon.js ou WebGPU Three) para visualização em tempo real de alta performance no navegador, e integração com Unreal Engine 5 via Pixel Streaming na nuvem para renderização fotorealista (Lumen e Nanite) em apresentações premium de alto impacto.

---

## Fora de Escopo

- Modelagem direta ou edição de geometria 3D dentro do visualizador.
- Suporte a headsets VR independentes sem streaming (Standalone Quest sem link).
- Hospedagem local das instâncias de GPU da Unreal Engine (foco exclusivo em instâncias Cloud auto-scaláveis).

---

## Por que importa a longo prazo

O mercado de visualização BIM é dividido entre ferramentas técnicas leves e apresentações comerciais ultra-realistas. Unindo WebGPU no navegador e Unreal Engine na nuvem, o ArxisVR alcança a "utopia 3D": roda modelos massivos localmente em qualquer computador moderno usando WebGPU, e com um clique, chaveia para uma máquina virtual com placa de vídeo dedicada gerando sombras reais, reflexos realistas e vegetação fotorealista que encantam investidores e clientes.

---

## Decisões arquiteturais

| Decisão | Escolha | Razão |
|---|---|---|
| Pipeline Híbrido | WebGPU Local (Padrão) + Unreal Pixel Streaming (Premium) | Garante acessibilidade no dia a dia e realismo máximo para reuniões de diretoria |
| Engine WebGPU | Babylon.js WebGPU Engine | Maturidade superior no suporte a WebGPU e Compute Shaders em comparação ao Three.js |
| Pixel Streaming | Unreal Engine 5.x em instâncias AWS G5 (NVIDIA A10G) | Nanite permite bilhões de polígonos sem simplificação; Lumen dá iluminação global em tempo real |
| Sincronização de Estado | Protocolo JSON via WebRTC Data Channel | Estado da câmera, visibilidade e filtros sincronizam entre a Unreal e o HUD do frontend |
| Auto-scaling de GPU | Kubernetes (EKS) + KEDA com escala baseada em fila de conexões WebRTC | Reduz custo desligando instâncias GPU quando não há apresentações ativas |

---

## Estrutura de dados

```typescript
type RenderEngineType = 'webgl' | 'webgpu' | 'pixel_streaming';

interface RenderConfig {
  engine: RenderEngineType;
  qualityPreset: 'low' | 'medium' | 'high' | 'ultra';
  unrealStreamingUrl?: string;
  enablePostProcessing: boolean;
  enableSSAO: boolean;
}

interface CameraStateSync {
  position: { x: number; y: number; z: number };
  rotation: { pitch: number; yaw: number; roll: number };
  fov: number;
}

interface InteractionEvent {
  type: 'select' | 'hover' | 'isolate' | 'hide';
  expressIds: number[];
  color?: string;
}
```

---

## Arquivos principais

```
backend/src/modules/streaming/
  streaming-orchestrator.service.ts  ← Aloca e gerencia instâncias de GPU da Unreal Engine sob demanda
  streaming.routes.ts                ← POST /streaming/session (solicita sessão Unreal)

frontend/src/viewer/render/
  WebGPURenderer.ts                  ← Motor de renderização local Babylon.js WebGPU
  PixelStreamingView.tsx             ← Player WebRTC de vídeo H.264/H.265 integrado ao HUD
  RenderManager.ts                   ← Gerenciador que chaveia dinamicamente entre WebGPU e Streaming
```

---

## Riscos

| Risco | Mitigação |
|---|---|
| Custo elevado de infraestrutura de GPU (AWS G5) | Limite rígido de tempo por sessão de streaming (ex: 30 minutos) e shutdown automático de instâncias ociosas após 2 minutos |
| Latência de rede degradando a experiência de Pixel Streaming | Usar infraestrutura multi-região (Edge) do Render/AWS e fallback imediato e transparente para WebGPU local se o ping passar de 150ms |
| Dispositivos de clientes sem suporte a WebGPU | Fallback automático para WebGL 2 com aviso de degradação de performance |

---

## Definition of Done (global)

Build · type-check · lint · testes passam · sem regressões conhecidas · documentação atualizada · demo executável em até 5 minutos.

---

## Critérios de aceite

- [ ] Renderizador WebGPU local carrega modelo IFC de 500MB com mais de 60 FPS estável no Chrome
- [ ] Chaveamento para Unreal Engine Pixel Streaming com tempo de setup < 10 segundos
- [ ] Iluminação realista Lumen e vegetação ativa renderizando a > 30 FPS no modo Streaming
- [ ] Interações no frontend (esconder elemento, clicar em parede) refletem instantaneamente no feed da Unreal
- [ ] Sessão de streaming encerra e desaloca GPU se a aba do navegador for fechada ou ficar inativa por 5 minutos
