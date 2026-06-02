# Snapshots PNG - Implementação Completa

## 📸 Overview

Sistema de captura, gerenciamento e exportação de snapshots (screenshots) do viewer 3D BIM/IFC em alta resolução com suporte a overlays, metadados e captura em lote.

---

## 🎯 Features Implementadas

### Frontend
- ✅ Captura de snapshots do canvas WebGL
- ✅ Múltiplas resoluções (screen, HD, Full HD, 4K, 8K, custom)
- ✅ Múltiplos formatos (PNG, JPEG, WebP)
- ✅ Controle de qualidade (0.0 - 1.0)
- ✅ Pixel ratio para displays retina
- ✅ Overlays (watermark, custom)
- ✅ Captura em lote (múltiplas vistas)
- ✅ Metadados (câmera, projeto, tags)
- ✅ Preview e download
- ✅ Galeria local com filtros
- ✅ Sistema de eventos (onCaptured, onProgress)
- ✅ Extensibilidade (custom overlays)

---

## 💻 Usage

### Captura Básica

```typescript
import { SnapshotsPNGService } from './features/snapshots-png';

// Obter referência ao canvas do viewer
const canvas = viewerHost.getCanvas();

// Captura simples (resolução da tela)
const result = await SnapshotsPNGService.captureSnapshot(canvas, {
  format: 'png',
  resolution: 'screen',
  quality: 0.92
});

// Download imediato
SnapshotsPNGService.downloadSnapshot(result.blob, 'meu-projeto.png');
```

### Captura em Alta Resolução

```typescript
// Captura 4K com alta qualidade
const highRes = await SnapshotsPNGService.captureSnapshot(canvas, {
  format: 'png',
  resolution: '4k',
  quality: 1.0,
  pixelRatio: 2  // 2x resolution para displays retina
});

// Ou usar helper
const highRes = await SnapshotsPNGService.captureHighRes(canvas);
```

### Captura Customizada

```typescript
// Dimensões customizadas
const custom = await SnapshotsPNGService.captureSnapshot(canvas, {
  format: 'jpeg',
  resolution: 'custom',
  width: 2560,
  height: 1440,
  quality: 0.85
});
```

### Captura com Watermark

```typescript
// Adicionar watermark
const withWatermark = await SnapshotsPNGService.captureWithOverlay(
  canvas,
  {
    type: 'watermark',
    text: 'Confidencial - Projeto ABC',
    position: 'bottom-right',
    fontSize: 24,
    color: '#FFFFFF',
    opacity: 0.7
  },
  {
    format: 'png',
    resolution: 'full-hd'
  }
);
```

### Overlay Customizado

```typescript
// Registrar overlay customizado
SnapshotsPNGService.registerOverlay('grid', (canvas, config) => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  
  // Desenhar grid
  ctx.strokeStyle = '#CCCCCC';
  ctx.lineWidth = 1;
  
  const gridSize = 50;
  for (let x = 0; x < canvas.width; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }
  for (let y = 0; y < canvas.height; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }
});

// Usar overlay customizado
const withGrid = await SnapshotsPNGService.captureWithOverlay(
  canvas,
  { type: 'grid' }
);
```

### Captura em Lote (Tour)

```typescript
// Definir vistas
const views: CameraView[] = [
  {
    position: [0, 10, 20],
    target: [0, 0, 0],
    name: 'Vista Frontal'
  },
  {
    position: [20, 10, 0],
    target: [0, 0, 0],
    name: 'Vista Lateral'
  },
  {
    position: [0, 20, 0],
    target: [0, 0, 0],
    name: 'Vista Superior'
  }
];

// Funções de integração com viewer
function setCameraView(view: CameraView) {
  viewer.camera.position.set(...view.position);
  viewer.camera.lookAt(...view.target);
  viewer.camera.updateProjectionMatrix();
}

function renderFrame() {
  viewer.renderer.render(viewer.scene, viewer.camera);
}

// Capturar tour completo
const snapshots = await SnapshotsPNGService.captureBatch(
  canvas,
  views,
  setCameraView,
  renderFrame,
  {
    format: 'png',
    resolution: 'full-hd'
  }
);

// Download de todos
snapshots.forEach((snapshot, i) => {
  SnapshotsPNGService.downloadSnapshot(
    snapshot.blob,
    `vista-${i + 1}-${snapshot.metadata.viewName}.png`
  );
});
```

### Upload para Storage

```typescript
// Função de upload (integração com backend)
async function uploadToStorage(blob: Blob, filename: string): Promise<string> {
  const formData = new FormData();
  formData.append('file', blob, filename);
  
  const response = await fetch('/api/v1/storage/upload', {
    method: 'POST',
    body: formData
  });
  
  const data = await response.json();
  return data.url;
}

// Capturar e fazer upload
const snapshot = await SnapshotsPNGService.captureSnapshot(canvas);

const url = await SnapshotsPNGService.uploadSnapshot(
  snapshot.blob,
  {
    projectId: 'proj-123',
    modelId: 'model-456',
    viewName: 'Fachada Principal',
    tags: ['apresentação', 'cliente']
  },
  uploadToStorage
);

console.log(`Snapshot salvo em: ${url}`);
```

### Galeria e Filtros

```typescript
// Listar todos os snapshots
const allSnapshots = SnapshotsPNGService.listSnapshots();

// Filtrar por projeto
const projectSnapshots = SnapshotsPNGService.listSnapshots({
  projectId: 'proj-123'
});

// Filtrar por data
const recentSnapshots = SnapshotsPNGService.listSnapshots({
  dateFrom: new Date('2026-06-01'),
  dateTo: new Date('2026-06-02')
});

// Filtrar por tags
const clientSnapshots = SnapshotsPNGService.listSnapshots({
  tags: ['cliente', 'apresentação']
});

// Exibir galeria
allSnapshots.forEach(snapshot => {
  console.log(`ID: ${snapshot.id}`);
  console.log(`URL: ${snapshot.url}`);
  console.log(`Size: ${snapshot.metadata.fileSize} bytes`);
  console.log(`Date: ${snapshot.metadata.timestamp}`);
});
```

### Eventos

```typescript
// Listener de captura
const unsubCapture = SnapshotsPNGService.onSnapshotCaptured((blob) => {
  console.log('Snapshot capturado:', blob.size, 'bytes');
  
  // Auto-upload
  uploadToStorage(blob, 'auto-snapshot.png');
});

// Listener de progresso (para batch)
const unsubProgress = SnapshotsPNGService.onCaptureProgress((progress) => {
  console.log(`Progresso: ${(progress * 100).toFixed(0)}%`);
  
  // Atualizar UI
  progressBar.value = progress;
});

// Cleanup
unsubCapture();
unsubProgress();
```

### Configuração Padrão

```typescript
// Definir opções padrão para todas as capturas
SnapshotsPNGService.setSnapshotDefaults({
  format: 'png',
  resolution: 'full-hd',
  quality: 0.95,
  pixelRatio: window.devicePixelRatio
});

// Agora todas as capturas usam essas configurações
const snapshot = await SnapshotsPNGService.captureSnapshot(canvas);
```

### Helpers Rápidos

```typescript
// Captura rápida (configuração padrão)
const blob = await SnapshotsPNGService.quickCapture(canvas);

// Captura em alta resolução (4K)
const highResBlob = await SnapshotsPNGService.captureHighRes(canvas);

// Preview temporário
const url = SnapshotsPNGService.previewSnapshot(blob);
previewImage.src = url;

// Cleanup
URL.revokeObjectURL(url);
```

---

## ⚙️ Opções de Snapshot

| Opção | Tipo | Padrão | Descrição |
|-------|------|--------|-----------|
| `format` | `'png' \| 'jpeg' \| 'webp'` | `'png'` | Formato da imagem |
| `resolution` | `'screen' \| 'hd' \| 'full-hd' \| '4k' \| '8k' \| 'custom'` | `'full-hd'` | Resolução preset |
| `width` | `number` | - | Largura customizada (resolution='custom') |
| `height` | `number` | - | Altura customizada (resolution='custom') |
| `quality` | `number` (0.0-1.0) | `0.92` | Qualidade JPEG/WebP |
| `transparent` | `boolean` | `false` | Fundo transparente (PNG only) |
| `pixelRatio` | `number` | `1` | Multiplicador de densidade de pixels |
| `antialiasing` | `number` | `4` | Samples de anti-aliasing |
| `includeMetadata` | `boolean` | `false` | Incluir metadados no filename |

---

## 📐 Resoluções Presets

| Preset | Dimensões |
|--------|-----------|
| `screen` | Canvas atual |
| `hd` | 1280x720 |
| `full-hd` | 1920x1080 |
| `4k` | 3840x2160 |
| `8k` | 7680x4320 |
| `custom` | width × height |

---

## 🧪 Testing

```typescript
// Unit test
describe('SnapshotsPNGService', () => {
  let canvas: HTMLCanvasElement;

  beforeEach(() => {
    canvas = document.createElement('canvas');
    canvas.width = 1920;
    canvas.height = 1080;
  });

  test('captureSnapshot returns blob', async () => {
    const result = await SnapshotsPNGService.captureSnapshot(canvas);
    
    expect(result.blob).toBeInstanceOf(Blob);
    expect(result.blob.type).toBe('image/png');
    expect(result.fileSize).toBeGreaterThan(0);
    expect(result.metadata).toBeDefined();
  });

  test('captureWithOverlay applies watermark', async () => {
    const result = await SnapshotsPNGService.captureWithOverlay(
      canvas,
      {
        type: 'watermark',
        text: 'Test Watermark',
        position: 'bottom-right'
      }
    );
    
    expect(result.blob).toBeInstanceOf(Blob);
  });

  test('captureBatch captures multiple views', async () => {
    const views = [
      { position: [0, 10, 20], target: [0, 0, 0], name: 'View 1' },
      { position: [20, 10, 0], target: [0, 0, 0], name: 'View 2' }
    ];

    const results = await SnapshotsPNGService.captureBatch(
      canvas,
      views,
      () => {},
      () => {}
    );
    
    expect(results).toHaveLength(2);
    expect(results[0].metadata.viewName).toBe('View 1');
  });
});
```

---

## 🚀 Próximos Passos

- [ ] Integração com backend storage (upload/download permanente)
- [ ] UI de galeria com preview grid
- [ ] Exportação em múltiplos formatos simultâneos
- [ ] Compressão otimizada (WebP/AVIF)
- [ ] Comparação lado a lado de snapshots
- [ ] Anotações interativas antes da captura
- [ ] Tour automático com navegação smooth
- [ ] Exportação em vídeo (sequência de snapshots)
- [ ] Integração com relatórios PDF
- [ ] Sincronização com cloud storage (S3, Azure Blob)

---

## 📚 References

- [Frontend Types](../frontend/src/features/snapshots-png/snapshots-png.types.ts)
- [Frontend Service](../frontend/src/features/snapshots-png/snapshots-png.service.ts)
- [Canvas API - toBlob](https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/toBlob)
- [Canvas 2D Rendering Context](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D)
