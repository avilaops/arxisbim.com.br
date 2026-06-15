# S34 · High-Performance IFC: Server-Side Processing & Geometry Decimation

**Fase:** Performance e Escala (Utopia IFC)  
**Status:** Pendente  
**Depende de:** S33 (WebGPU & Unreal)  
**Bloqueia:** S35 (Motor de Simulação 4D)

---

## Objetivo

Mover o gargalo de processamento de modelos IFC pesados (acima de 200MB) do cliente para o servidor. Desenvolver uma pipeline assíncrona em Rust/C++ nativo para fazer o parsing dos arquivos IFC carregados, decimar malhas redundantes (geometry decimation), comprimir texturas e gerar arquivos glTF altamente otimizados e fragmentados (3D Tiles). O visualizador web carregará apenas os dados necessários para o campo de visão atual da câmera.

---

## Fora de Escopo

- Conversão reversa (glTF/3D Tiles de volta para IFC).
- Edição de metadados e salvamento de novo arquivo IFC modificado.
- Renderização de geometrias 2D de plantas baixas contidas no IFC.

---

## Por que importa a longo prazo

Atualmente, carregar um IFC de 800MB no navegador consome gigabytes de RAM e costuma travar navegadores mobile ou computadores de escritório. Processar tudo no servidor e enviar malhas 3D decimadas e compactadas com Draco/Meshopt permite abrir maquetes do tamanho de aeroportos ou estádios de futebol em qualquer celular de obra, carregando instantaneamente e consumindo o mínimo de memória.

---

## Decisões arquiteturais

| Decisão | Escolha | Razão |
|---|---|---|
| Motor de Parsing | Engine Nativa em Rust (`ifc-rs` ou wrapper `web-ifc-node` em C++) | Velocidade de execução e uso seguro de multithreading no servidor |
| Pipeline de Entrega | Conversão para 3D Tiles (especificação OGC) | Permite streaming de geometria baseado em LOD (Level of Detail) e proximidade da câmera |
| Compressão | Meshopt + Draco Compression | Reduz o tamanho de tráfego de rede em até 90% sem perda visual perceptível |
| Extração de Metadados | Geração de banco SQLite/JSON fragmentado por elemento | O visualizador carrega a maquete 3D limpa e só puxa as propriedades de uma parede se o usuário clicar nela |
| Caching | Armazenamento no Cloudflare R2 com CDN | Modelos populares carregam em milissegundos a partir da borda da rede |

---

## Estrutura de dados

```typescript
interface GeometryChunk {
  chunk_id: string;
  lod_level: number;       // 0 = Detalhe máximo, 2 = Caixa delimitadora (simplificada)
  bounding_volume: {
    center: [number, number, number];
    radius: number;
  };
  gltf_url: string;        // URL do arquivo binário compactado (.glb)
  element_ids: number[];   // IDs IFC contidos neste chunk para linkar propriedades
}

interface BIMSpatialStructure {
  project_id: string;
  model_version_id: string;
  hierarchy: BIMNode;      // Árvore JSON leve contendo a estrutura de níveis/ambientes
}

interface BIMNode {
  expressId: number;
  type: string;
  name: string;
  children: BIMNode[];
}
```

---

## Arquivos principais

```
backend/src/modules/bim-processor/
  pipeline.rust/             ← Código fonte do compilador nativo (BIM Rust compiler)
  bim-converter.service.ts   ← Orquestra o job assíncrono de conversão (IFC -> 3D Tiles)
  gltf-optimizer.service.ts  ← Aplica decimação de malhas e compressão Draco

frontend/src/viewer/bim/
  BIMTilesLoader.ts          ← Gerencia o streaming dinâmico de 3D Tiles no visualizador
  PropertyLoader.ts          ← Busca metadados IFC sob demanda do servidor via ID do elemento
```

---

## Riscos

| Risco | Mitigação |
|---|---|
| Estouro de CPU e Memória no servidor durante uploads concorrentes | Executar a pipeline de conversão em Workers isolados com limite rígido de CPU e fila de processamento no BullMQ |
| Perda de identificação de elementos (ExpressID) após decimação | Mapear e injetar o ExpressID original nas propriedades customizadas da malha glTF antes da otimização |
| Erros de arquivos IFC fora de padrão (inválidos) quebrando o parser nativo | Mecanismo de fallback que reporta exatamente a linha e o erro do esquema IFC e cancela o job de forma amigável |

---

## Definition of Done (global)

Build · type-check · lint · testes passam · sem regressões conhecidas · documentação atualizada · demo executável em até 5 minutos.

---

## Critérios de aceite

- [ ] Arquivo IFC de 300MB processado e convertido no servidor em menos de 1 minuto
- [ ] Tamanho do pacote de download gráfico reduzido em no mínimo 75% comparado ao IFC original
- [ ] Streaming de geometria 3D Tiles carregando malhas em blocos baseado na posição da câmera
- [ ] Uso de RAM no navegador reduzido para menos de 250MB ao visualizar o modelo processado
- [ ] Clique no elemento renderizado retorna com sucesso suas propriedades originais lidas dinamicamente
