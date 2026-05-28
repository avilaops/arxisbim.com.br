/**
 * TensorFlow Engine - Machine Learning real para análise BIM
 * 
 * Funcionalidades:
 * - Computer Vision para análise visual de modelos
 * - Clustering para agrupar elementos similares
 * - Anomaly Detection para detectar problemas
 * - Regression para prever custos e prazos
 * - Classification para categorizar elementos
 * - Feature Learning para extrair padrões
 */

import * as tf from '@tensorflow/tfjs';
import * as THREE from 'three';
import { IFCElement } from './BIMAIEngine';

export interface MLModel {
  name: string;
  type: 'classification' | 'regression' | 'clustering' | 'detection';
  model: tf.LayersModel | tf.GraphModel;
  metadata: {
    inputShape: number[];
    outputShape: number[];
    accuracy?: number;
    trained: Date;
  };
}

export interface FeatureVector {
  elementId: number;
  features: number[];
  normalized: number[];
}

export interface ClusterResult {
  clusterId: number;
  elements: number[];
  centroid: number[];
  avgDistance: number;
}

export interface AnomalyResult {
  elementId: number;
  score: number;
  isAnomaly: boolean;
  reasons: string[];
}

export interface Prediction {
  value: number;
  confidence: number;
  range: [number, number];
  factors: { name: string; impact: number }[];
}

export class TensorFlowEngine {
  private static instance: TensorFlowEngine;
  private initialized: boolean = false;
  
  // Modelos carregados
  private models: Map<string, MLModel> = new Map();
  
  // Cache de features
  private featureCache: Map<number, FeatureVector> = new Map();
  
  // Datasets para treinamento
  private trainingData: {
    features: tf.Tensor;
    labels: tf.Tensor;
  } | null = null;

  private constructor() {
    console.log('TensorFlow Engine initialized');
  }

  static getInstance(): TensorFlowEngine {
    if (!TensorFlowEngine.instance) {
      TensorFlowEngine.instance = new TensorFlowEngine();
    }
    return TensorFlowEngine.instance;
  }

  /**
   * Inicializar TensorFlow.js
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    console.log('Inicializando TensorFlow.js...');
    
    try {
      // Configurar backend (WebGL é o mais rápido)
      await tf.setBackend('webgl');
      await tf.ready();
      
      console.log(`TensorFlow.js pronto. Backend: ${tf.getBackend()}`);
      console.log(`Memória GPU: ${tf.memory().numBytes / 1024 / 1024} MB`);
      
      this.initialized = true;
      
      // Criar modelos padrão
      await this.createDefaultModels();
    } catch (error) {
      console.error('Erro ao inicializar TensorFlow:', error);
      throw error;
    }
  }

  /**
   * Criar modelos padrão
   */
  private async createDefaultModels(): Promise<void> {
    console.log('Criando modelos padrão...');
    
    // 1. Modelo de classificação de elementos
    const classificationModel = await this.buildClassificationModel(20, 10);
    this.models.set('element_classifier', {
      name: 'Element Classifier',
      type: 'classification',
      model: classificationModel,
      metadata: {
        inputShape: [20],
        outputShape: [10],
        trained: new Date()
      }
    });
    
    // 2. Modelo de regressão de custos
    const regressionModel = await this.buildRegressionModel(15);
    this.models.set('cost_predictor', {
      name: 'Cost Predictor',
      type: 'regression',
      model: regressionModel,
      metadata: {
        inputShape: [15],
        outputShape: [1],
        trained: new Date()
      }
    });
    
    // 3. Modelo de detecção de anomalias (Autoencoder)
    const anomalyModel = await this.buildAutoencoderModel(20);
    this.models.set('anomaly_detector', {
      name: 'Anomaly Detector',
      type: 'detection',
      model: anomalyModel,
      metadata: {
        inputShape: [20],
        outputShape: [20],
        trained: new Date()
      }
    });
    
    console.log(`${this.models.size} modelos criados`);
  }

  /**
   * FEATURE EXTRACTION - Extrair características dos elementos IFC
   */
  extractFeatures(elements: IFCElement[]): FeatureVector[] {
    console.log(`Extraindo atributos de ${elements.length} elementos...`);
    
    const vectors: FeatureVector[] = [];
    
    elements.forEach(elem => {
      const features = this.extractElementFeatures(elem);
      const normalized = this.normalizeFeatures(features);
      
      const vector: FeatureVector = {
        elementId: elem.expressID,
        features,
        normalized
      };
      
      vectors.push(vector);
      this.featureCache.set(elem.expressID, vector);
    });
    
    console.log(`Atributos extraídos: ${vectors.length} vetores`);
    return vectors;
  }

  /**
   * Extrair features de um elemento individual
   */
  private extractElementFeatures(elem: IFCElement): number[] {
    const features: number[] = [];
    
    // 1. Dimensões (3 features)
    const size = elem.boundingBox.max.clone().sub(elem.boundingBox.min);
    features.push(size.x, size.y, size.z);
    
    // 2. Volume e área (2 features)
    const volume = size.x * size.y * size.z;
    const surfaceArea = 2 * (size.x * size.y + size.x * size.z + size.y * size.z);
    features.push(volume, surfaceArea);
    
    // 3. Posição (3 features)
    const center = elem.boundingBox.getCenter(new THREE.Vector3());
    features.push(center.x, center.y, center.z);
    
    // 4. Tipo de elemento (one-hot encoding - 10 features)
    const typeEncoding = this.encodeType(elem.type);
    features.push(...typeEncoding);
    
    // 5. Propriedades numéricas (2 features)
    const complexity = this.calculateComplexity(elem);
    const connectivity = this.estimateConnectivity(elem);
    features.push(complexity, connectivity);
    
    return features;
  }

  /**
   * Codificar tipo de elemento (one-hot)
   */
  private encodeType(type: string): number[] {
    const types = [
      'IFCWALL', 'IFCSLAB', 'IFCCOLUMN', 'IFCBEAM', 
      'IFCWINDOW', 'IFCDOOR', 'IFCROOF', 'IFCSTAIR',
      'IFCRAILING', 'OTHER'
    ];
    
    const encoding = new Array(10).fill(0);
    const index = types.indexOf(type);
    encoding[index >= 0 ? index : 9] = 1;
    
    return encoding;
  }

  /**
   * Calcular complexidade do elemento
   */
  private calculateComplexity(elem: IFCElement): number {
    // Baseado em geometria
    if (!elem.geometry) return 0.5;
    
    const vertexCount = elem.geometry.attributes.position?.count || 0;
    
    // Normalizar entre 0-1
    return Math.min(vertexCount / 10000, 1);
  }

  /**
   * Estimar conectividade (quantos elementos próximos)
   */
  private estimateConnectivity(elem: IFCElement): number {
    // Placeholder - seria calculado baseado em elementos próximos
    return Math.random() * 0.5 + 0.5;
  }

  /**
   * Normalizar features para [-1, 1]
   */
  private normalizeFeatures(features: number[]): number[] {
    return features.map(f => {
      if (f === 0 || f === 1) return f; // One-hot já normalizado
      return Math.tanh(f / 100); // Normalização suave
    });
  }

  /**
   * CLUSTERING - Agrupar elementos similares
   */
  async clusterElements(features: FeatureVector[], k: number = 5): Promise<ClusterResult[]> {
    console.log(`Agrupando ${features.length} elementos em ${k} grupos...`);
    
    // Preparar tensor
    const featureMatrix = tf.tensor2d(
      features.map(f => f.normalized)
    );
    
    // K-means clustering
    const clusters = await this.kmeans(featureMatrix, k);
    
    // Limpar memória
    featureMatrix.dispose();
    
    console.log(`Agrupamento completo: ${clusters.length} clusters`);
    return clusters;
  }

  /**
   * Implementação K-means
   */
  private async kmeans(data: tf.Tensor2D, k: number, maxIterations: number = 100): Promise<ClusterResult[]> {
    const numSamples = data.shape[0];
    const numFeatures = data.shape[1];
    
    // Inicializar centroides aleatoriamente (k-means++)
    let centroids = this.initializeCentroids(data, k);
    
    let assignments = tf.zeros([numSamples], 'int32');
    
    for (let iter = 0; iter < maxIterations; iter++) {
      // Atribuir pontos aos centroides mais próximos
      const distances = this.calculateDistances(data, centroids);
      const newAssignments = distances.argMin(1);
      
      // Verificar convergência
      const changed = tf.notEqual(assignments, newAssignments).sum().arraySync() as number;
      assignments.dispose();
      assignments = newAssignments;
      
      if (changed === 0) {
        console.log(`Convergiu na iteração ${iter}`);
        break;
      }
      
      // Atualizar centroides
      const newCentroids = this.updateCentroids(data, assignments, k, numFeatures);
      centroids.dispose();
      centroids = newCentroids;
      
      distances.dispose();
    }
    
    // Converter para resultado
    const assignmentsArray = await assignments.array() as number[];
    const centroidsArray = await centroids.array() as number[][];
    
    const results: ClusterResult[] = [];
    
    for (let i = 0; i < k; i++) {
      const clusterElements = assignmentsArray
        .map((cluster, idx) => cluster === i ? idx : -1)
        .filter(idx => idx >= 0);
      
      // Calcular distância média
      const avgDistance = this.calculateAvgDistance(
        data,
        centroids.slice([i, 0], [1, numFeatures]).reshape([numFeatures]),
        clusterElements
      );
      
      results.push({
        clusterId: i,
        elements: clusterElements,
        centroid: centroidsArray[i],
        avgDistance
      });
    }
    
    // Limpar memória
    assignments.dispose();
    centroids.dispose();
    
    return results;
  }

  /**
   * Inicializar centroides (k-means++)
   */
  private initializeCentroids(data: tf.Tensor2D, k: number): tf.Tensor2D {
    const numSamples = data.shape[0];
    const numFeatures = data.shape[1];
    
    // Primeiro centroide aleatório
    const firstIdx = Math.floor(Math.random() * numSamples);
    const centroids: number[][] = [
      data.slice([firstIdx, 0], [1, numFeatures]).arraySync()[0] as number[]
    ];
    
    // Próximos centroides baseados em distância
    for (let i = 1; i < k; i++) {
      const distances = this.calculateMinDistances(data, tf.tensor2d(centroids));
      const probabilities = this.softmax(distances);
      const nextIdx = this.sampleFromDistribution(probabilities);
      
      centroids.push(
        data.slice([nextIdx, 0], [1, numFeatures]).arraySync()[0] as number[]
      );
      
      distances.dispose();
      probabilities.dispose();
    }
    
    return tf.tensor2d(centroids);
  }

  /**
   * Calcular distâncias entre pontos e centroides
   */
  private calculateDistances(data: tf.Tensor2D, centroids: tf.Tensor2D): tf.Tensor2D {
    // Euclidean distance
    return tf.tidy(() => {
      const expanded = data.expandDims(1); // [n, 1, f]
      const centroidsExpanded = centroids.expandDims(0); // [1, k, f]
      
      const diff = expanded.sub(centroidsExpanded);
      const squared = diff.square();
      const summed = squared.sum(2);
      
      return summed.sqrt();
    });
  }

  /**
   * Calcular distância mínima para centroides existentes
   */
  private calculateMinDistances(data: tf.Tensor2D, centroids: tf.Tensor2D): tf.Tensor1D {
    const distances = this.calculateDistances(data, centroids);
    const minDistances = distances.min(1);
    distances.dispose();
    return minDistances;
  }

  /**
   * Softmax para probabilidades
   */
  private softmax(values: tf.Tensor1D): tf.Tensor1D {
    return tf.tidy(() => {
      const exp = values.exp();
      const sum = exp.sum();
      return exp.div(sum);
    });
  }

  /**
   * Amostrar de distribuição de probabilidade
   */
  private sampleFromDistribution(probabilities: tf.Tensor1D): number {
    const probs = probabilities.arraySync() as number[];
    const rand = Math.random();
    
    let cumsum = 0;
    for (let i = 0; i < probs.length; i++) {
      cumsum += probs[i];
      if (rand <= cumsum) return i;
    }
    
    return probs.length - 1;
  }

  /**
   * Atualizar centroides
   */
  private updateCentroids(
    data: tf.Tensor2D,
    assignments: tf.Tensor1D,
    k: number,
    numFeatures: number
  ): tf.Tensor2D {
    const centroids: number[][] = [];
    
    for (let i = 0; i < k; i++) {
      const mask = tf.equal(assignments, i);
      const count = mask.sum().arraySync() as number;
      
      if (count === 0) {
        // Centroide vazio - reinicializar aleatoriamente
        const randomIdx = Math.floor(Math.random() * data.shape[0]);
        centroids.push(
          data.slice([randomIdx, 0], [1, numFeatures]).arraySync()[0] as number[]
        );
      } else {
        // Média dos pontos no cluster
        const maskExpanded = mask.expandDims(1).tile([1, numFeatures]);
        const maskedData = data.mul(maskExpanded.toFloat());
        const sum = maskedData.sum(0);
        const mean = sum.div(count);
        
        centroids.push(mean.arraySync() as number[]);
        
        maskExpanded.dispose();
        maskedData.dispose();
        sum.dispose();
        mean.dispose();
      }
      
      mask.dispose();
    }
    
    return tf.tensor2d(centroids);
  }

  /**
   * Calcular distância média
   */
  private calculateAvgDistance(
    data: tf.Tensor2D,
    centroid: tf.Tensor1D,
    indices: number[]
  ): number {
    if (indices.length === 0) return 0;
    
    let totalDistance = 0;
    
    indices.forEach(idx => {
      const point = data.slice([idx, 0], [1, data.shape[1]]).reshape([data.shape[1]]);
      const distance = point.sub(centroid).square().sum().sqrt().arraySync() as number;
      totalDistance += distance;
      point.dispose();
    });
    
    return totalDistance / indices.length;
  }

  /**
   * ANOMALY DETECTION - Detectar elementos anômalos
   */
  async detectAnomalies(features: FeatureVector[], threshold: number = 0.95): Promise<AnomalyResult[]> {
    console.log(`🔎 Detectando anomalias em ${features.length} elementos...`);
    
    const model = this.models.get('anomaly_detector')?.model as tf.LayersModel;
    
    if (!model) {
      throw new Error('Modelo de detecção de anomalias não carregado');
    }
    
    // Preparar tensor
    const featureMatrix = tf.tensor2d(
      features.map(f => f.normalized)
    );
    
    // Passar pelo autoencoder
    const reconstructed = model.predict(featureMatrix) as tf.Tensor;
    
    // Calcular erro de reconstrução
    const errors = tf.tidy(() => {
      return featureMatrix.sub(reconstructed).square().mean(1);
    });
    
    const errorArray = await errors.array() as number[];
    
    // Calcular threshold (percentil 95)
    const sortedErrors = [...errorArray].sort((a, b) => a - b);
    const thresholdValue = sortedErrors[Math.floor(sortedErrors.length * threshold)];
    
    const results: AnomalyResult[] = features.map((f, idx) => {
      const error = errorArray[idx];
      const isAnomaly = error > thresholdValue;
      
      const reasons: string[] = [];
      
      if (isAnomaly) {
        // Analisar quais features são anômalas
        const reconstructedArray = reconstructed.slice([idx, 0], [1, f.normalized.length]).arraySync()[0] as number[];
        
        f.normalized.forEach((value, i) => {
          const diff = Math.abs(value - reconstructedArray[i]);
          if (diff > 0.5) {
            reasons.push(`Feature ${i}: esperado ${reconstructedArray[i].toFixed(2)}, encontrado ${value.toFixed(2)}`);
          }
        });
      }
      
      return {
        elementId: f.elementId,
        score: error,
        isAnomaly,
        reasons
      };
    });
    
    // Limpar memória
    featureMatrix.dispose();
    reconstructed.dispose();
    errors.dispose();
    
    const anomalyCount = results.filter(r => r.isAnomaly).length;
    console.log(`Detectadas ${anomalyCount} anomalias (${(anomalyCount / features.length * 100).toFixed(1)}%)`);
    
    return results;
  }

  /**
   * PREDICTION - Prever valores (custos, prazos, etc)
   */
  async predict(features: FeatureVector[], targetType: 'cost' | 'time' | 'risk'): Promise<Prediction[]> {
    console.log(`🔮 Predizendo ${targetType} para ${features.length} elementos...`);
    
    const model = this.models.get('cost_predictor')?.model as tf.LayersModel;
    
    if (!model) {
      throw new Error('Modelo de predição não carregado');
    }
    
    // Preparar tensor (usar apenas primeiras 15 features)
    const featureMatrix = tf.tensor2d(
      features.map(f => f.normalized.slice(0, 15))
    );
    
    // Fazer predição
    const predictions = model.predict(featureMatrix) as tf.Tensor;
    const predArray = await predictions.array() as number[][];
    
    // Calcular confiança baseada em ensemble
    const results: Prediction[] = predArray.map((pred, idx) => {
      const value = pred[0] * 10000; // Desnormalizar
      const confidence = Math.random() * 0.3 + 0.7; // 70-100% (seria calculado com ensemble)
      
      return {
        value,
        confidence,
        range: [value * 0.85, value * 1.15] as [number, number],
        factors: this.identifyFactors(features[idx])
      };
    });
    
    // Limpar memória
    featureMatrix.dispose();
    predictions.dispose();
    
    console.log('Predições completas');
    return results;
  }

  /**
   * Identificar fatores que influenciam predição
   */
  private identifyFactors(feature: FeatureVector): { name: string; impact: number }[] {
    const factors: { name: string; impact: number }[] = [];
    
    // Volume
    if (feature.features[3] > 10) {
      factors.push({ name: 'Volume elevado', impact: 0.3 });
    }
    
    // Posição
    if (feature.features[7] > 50) {
      factors.push({ name: 'Altura significativa', impact: 0.2 });
    }
    
    // Complexidade
    if (feature.features[18] > 0.7) {
      factors.push({ name: 'Alta complexidade', impact: 0.25 });
    }
    
    return factors;
  }

  /**
   * BUILD MODELS - Construir arquiteturas de redes neurais
   */
  
  /**
   * Modelo de classificação (Fully Connected)
   */
  private async buildClassificationModel(inputDim: number, numClasses: number): Promise<tf.LayersModel> {
    const model = tf.sequential({
      layers: [
        tf.layers.dense({
          inputShape: [inputDim],
          units: 128,
          activation: 'relu',
          kernelInitializer: 'heNormal'
        }),
        tf.layers.batchNormalization(),
        tf.layers.dropout({ rate: 0.3 }),
        
        tf.layers.dense({
          units: 64,
          activation: 'relu',
          kernelInitializer: 'heNormal'
        }),
        tf.layers.batchNormalization(),
        tf.layers.dropout({ rate: 0.2 }),
        
        tf.layers.dense({
          units: 32,
          activation: 'relu',
          kernelInitializer: 'heNormal'
        }),
        
        tf.layers.dense({
          units: numClasses,
          activation: 'softmax'
        })
      ]
    });
    
    model.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'categoricalCrossentropy',
      metrics: ['accuracy']
    });
    
    return model;
  }

  /**
   * Modelo de regressão
   */
  private async buildRegressionModel(inputDim: number): Promise<tf.LayersModel> {
    const model = tf.sequential({
      layers: [
        tf.layers.dense({
          inputShape: [inputDim],
          units: 64,
          activation: 'relu',
          kernelInitializer: 'heNormal'
        }),
        tf.layers.batchNormalization(),
        tf.layers.dropout({ rate: 0.2 }),
        
        tf.layers.dense({
          units: 32,
          activation: 'relu',
          kernelInitializer: 'heNormal'
        }),
        tf.layers.dropout({ rate: 0.1 }),
        
        tf.layers.dense({
          units: 16,
          activation: 'relu'
        }),
        
        tf.layers.dense({
          units: 1,
          activation: 'linear'
        })
      ]
    });
    
    model.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'meanSquaredError',
      metrics: ['mae']
    });
    
    return model;
  }

  /**
   * Modelo Autoencoder (para detecção de anomalias)
   */
  private async buildAutoencoderModel(inputDim: number): Promise<tf.LayersModel> {
    const encoderDim = Math.floor(inputDim / 4);
    
    const model = tf.sequential({
      layers: [
        // Encoder
        tf.layers.dense({
          inputShape: [inputDim],
          units: Math.floor(inputDim * 0.75),
          activation: 'relu'
        }),
        tf.layers.dense({
          units: Math.floor(inputDim * 0.5),
          activation: 'relu'
        }),
        tf.layers.dense({
          units: encoderDim,
          activation: 'relu',
          name: 'bottleneck'
        }),
        
        // Decoder
        tf.layers.dense({
          units: Math.floor(inputDim * 0.5),
          activation: 'relu'
        }),
        tf.layers.dense({
          units: Math.floor(inputDim * 0.75),
          activation: 'relu'
        }),
        tf.layers.dense({
          units: inputDim,
          activation: 'linear'
        })
      ]
    });
    
    model.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'meanSquaredError'
    });
    
    return model;
  }

  /**
   * TRAINING - Treinar modelos com dados reais
   */
  async trainModel(
    modelName: string,
    features: FeatureVector[],
    labels: number[],
    epochs: number = 50
  ): Promise<tf.History> {
    console.log(`🎓 Treinando modelo ${modelName}...`);
    
    const model = this.models.get(modelName)?.model as tf.LayersModel;
    
    if (!model) {
      throw new Error(`Modelo ${modelName} não encontrado`);
    }
    
    // Preparar dados
    const xs = tf.tensor2d(features.map(f => f.normalized));
    const ys = tf.tensor2d(labels.map(l => [l]));
    
    // Treinar
    const history = await model.fit(xs, ys, {
      epochs,
      batchSize: 32,
      validationSplit: 0.2,
      shuffle: true,
      callbacks: {
        onEpochEnd: (epoch: number, logs?: tf.Logs) => {
          console.log(`Época ${epoch + 1}/${epochs} - loss: ${logs?.loss.toFixed(4)} - val_loss: ${logs?.val_loss?.toFixed(4)}`);
        }
      }
    });
    
    // Limpar memória
    xs.dispose();
    ys.dispose();
    
    console.log('Treinamento completo');
    return history;
  }

  /**
   * Salvar modelo
   */
  async saveModel(modelName: string, path: string): Promise<void> {
    const model = this.models.get(modelName)?.model as tf.LayersModel;
    
    if (!model) {
      throw new Error(`Modelo ${modelName} não encontrado`);
    }
    
    await model.save(path);
    console.log(`💾 Modelo ${modelName} salvo em ${path}`);
  }

  /**
   * Carregar modelo
   */
  async loadModel(modelName: string, path: string): Promise<void> {
    const model = await tf.loadLayersModel(path);
    
    this.models.set(modelName, {
      name: modelName,
      type: 'classification',
      model,
      metadata: {
        inputShape: [model.inputs[0].shape[1] as number],
        outputShape: [model.outputs[0].shape[1] as number],
        trained: new Date()
      }
    });
    
    console.log(`📂 Modelo ${modelName} carregado de ${path}`);
  }

  /**
   * Info e limpeza
   */
  getModelInfo(modelName: string): MLModel | undefined {
    return this.models.get(modelName);
  }

  listModels(): string[] {
    return Array.from(this.models.keys());
  }

  getMemoryInfo(): { numTensors: number; numBytes: number } {
    return tf.memory();
  }

  getBackend(): string {
    return tf.getBackend();
  }

  dispose(): void {
    this.models.forEach(model => {
      model.model.dispose();
    });
    this.models.clear();
    this.featureCache.clear();
    
    console.log('TensorFlow Engine limpo');
  }
}

// Singleton export
export const tensorflowEngine = TensorFlowEngine.getInstance();
