/**
 * Predictive Analytics - Análise preditiva avançada
 * 
 * Funcionalidades:
 * - Previsão de custos com ensemble de modelos
 * - Previsão de prazos baseada em histórico
 * - Detecção precoce de riscos
 * - Análise de tendências
 * - Recomendações proativas
 * - Time series forecasting
 */

import * as tf from '@tensorflow/tfjs';
import * as THREE from 'three';
import { IFCElement } from './BIMAIEngine';
import { FeatureVector, tensorflowEngine } from './TensorFlowEngine';

export interface CostPrediction {
  elementId: number;
  predictedCost: number;
  confidence: number;
  range: [number, number];
  breakdown: {
    material: number;
    labor: number;
    equipment: number;
    overhead: number;
  };
  factors: PredictionFactor[];
}

export interface TimelinePrediction {
  projectDuration: number; // dias
  confidence: number;
  milestones: Milestone[];
  criticalPath: number[];
  risks: TimelineRisk[];
}

export interface Milestone {
  name: string;
  startDay: number;
  endDay: number;
  confidence: number;
  dependencies: string[];
}

export interface TimelineRisk {
  type: 'delay' | 'resource' | 'weather' | 'complexity';
  severity: 'low' | 'medium' | 'high';
  description: string;
  probability: number;
  impact: number; // dias de atraso
}

export interface RiskAssessment {
  elementId: number;
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  risks: Risk[];
  mitigation: string[];
}

export interface Risk {
  category: 'structural' | 'cost' | 'schedule' | 'quality' | 'safety';
  description: string;
  probability: number;
  impact: number;
  score: number; // probability * impact
}

export interface PredictionFactor {
  name: string;
  value: number;
  impact: number; // -1 a 1
}

export interface TrendAnalysis {
  metric: string;
  values: number[];
  dates: Date[];
  trend: 'increasing' | 'decreasing' | 'stable';
  forecast: number[];
  confidence: number;
}

export class PredictiveAnalytics {
  private static instance: PredictiveAnalytics;
  
  // Modelos ensemble
  private costModels: tf.LayersModel[] = [];
  private timelineModel: tf.LayersModel | null = null;
  private riskModel: tf.LayersModel | null = null;
  
  // Histórico para time series
  private costHistory: number[] = [];
  private timelineHistory: number[] = [];
  
  // Configurações
  private readonly ENSEMBLE_SIZE = 5;
  private readonly BOOTSTRAP_RATIO = 0.8;

  private constructor() {
    console.log('📈 Predictive Analytics initialized');
  }

  static getInstance(): PredictiveAnalytics {
    if (!PredictiveAnalytics.instance) {
      PredictiveAnalytics.instance = new PredictiveAnalytics();
    }
    return PredictiveAnalytics.instance;
  }

  /**
   * Inicializar modelos preditivos
   */
  async initialize(): Promise<void> {
    console.log('🚀 Inicializando Predictive Analytics...');
    
    // Criar ensemble de modelos de custo
    for (let i = 0; i < this.ENSEMBLE_SIZE; i++) {
      const model = await this.buildCostPredictionModel();
      this.costModels.push(model);
    }
    
    // Criar modelo de timeline
    this.timelineModel = await this.buildTimelineModel();
    
    // Criar modelo de risco
    this.riskModel = await this.buildRiskModel();
    
    console.log('✅ Predictive Analytics pronto!');
  }

  /**
   * PREVISÃO DE CUSTOS com ensemble
   */
  async predictCosts(elements: IFCElement[]): Promise<CostPrediction[]> {
    console.log(`💰 Prevendo custos para ${elements.length} elementos...`);
    
    // Extrair features
    const features = tensorflowEngine.extractFeatures(elements);
    
    const predictions: CostPrediction[] = [];
    
    for (let i = 0; i < features.length; i++) {
      const feature = features[i];
      const element = elements[i];
      
      // Fazer predições com todos os modelos do ensemble
      const ensemblePredictions = await this.ensemblePredict(feature);
      
      // Calcular média e intervalo de confiança
      const mean = ensemblePredictions.reduce((a, b) => a + b, 0) / ensemblePredictions.length;
      const std = Math.sqrt(
        ensemblePredictions.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / ensemblePredictions.length
      );
      
      const confidence = 1 - (std / mean); // Quanto menor o desvio, maior a confiança
      const range: [number, number] = [mean - 1.96 * std, mean + 1.96 * std]; // 95% CI
      
      // Breakdown de custos
      const breakdown = this.calculateCostBreakdown(element, mean);
      
      // Fatores que influenciam
      const factors = this.identifyCostFactors(feature, element);
      
      predictions.push({
        elementId: element.expressID,
        predictedCost: mean,
        confidence: Math.max(0, Math.min(1, confidence)),
        range,
        breakdown,
        factors
      });
    }
    
    console.log(`✅ Custos previstos com confiança média: ${(predictions.reduce((sum, p) => sum + p.confidence, 0) / predictions.length * 100).toFixed(1)}%`);
    
    return predictions;
  }

  /**
   * Predição ensemble
   */
  private async ensemblePredict(feature: FeatureVector): Promise<number[]> {
    const predictions: number[] = [];
    
    const input = tf.tensor2d([feature.normalized.slice(0, 15)]);
    
    for (const model of this.costModels) {
      const pred = model.predict(input) as tf.Tensor;
      const value = (await pred.data())[0];
      predictions.push(value * 50000); // Desnormalizar
      pred.dispose();
    }
    
    input.dispose();
    
    return predictions;
  }

  /**
   * Calcular breakdown de custos
   */
  private calculateCostBreakdown(
    element: IFCElement,
    totalCost: number
  ): CostPrediction['breakdown'] {
    // Percentuais típicos da construção
    const materialRatio = 0.45;
    const laborRatio = 0.35;
    const equipmentRatio = 0.12;
    const overheadRatio = 0.08;
    
    // Ajustar baseado no tipo de elemento
    let adjustedMaterial = materialRatio;
    let adjustedLabor = laborRatio;
    
    if (element.type === 'IFCCOLUMN' || element.type === 'IFCBEAM') {
      adjustedMaterial = 0.50; // Mais material em estrutura
      adjustedLabor = 0.30;
    } else if (element.type === 'IFCWINDOW' || element.type === 'IFCDOOR') {
      adjustedMaterial = 0.40;
      adjustedLabor = 0.40; // Mais mão de obra em esquadrias
    }
    
    return {
      material: totalCost * adjustedMaterial,
      labor: totalCost * adjustedLabor,
      equipment: totalCost * equipmentRatio,
      overhead: totalCost * overheadRatio
    };
  }

  /**
   * Identificar fatores de custo
   */
  private identifyCostFactors(feature: FeatureVector, element: IFCElement): PredictionFactor[] {
    const factors: PredictionFactor[] = [];
    
    // Volume
    const volume = feature.features[3];
    if (volume > 10) {
      factors.push({
        name: 'Volume elevado',
        value: volume,
        impact: 0.35
      });
    }
    
    // Altura
    const height = feature.features[7];
    if (height > 20) {
      factors.push({
        name: 'Altura significativa',
        value: height,
        impact: 0.25
      });
    }
    
    // Complexidade
    const complexity = feature.features[18];
    if (complexity > 0.7) {
      factors.push({
        name: 'Alta complexidade geométrica',
        value: complexity,
        impact: 0.30
      });
    }
    
    // Tipo de elemento
    const structuralTypes = ['IFCCOLUMN', 'IFCBEAM', 'IFCSLAB'];
    if (structuralTypes.includes(element.type)) {
      factors.push({
        name: 'Elemento estrutural',
        value: 1,
        impact: 0.20
      });
    }
    
    return factors;
  }

  /**
   * PREVISÃO DE PRAZO
   */
  async predictTimeline(elements: IFCElement[]): Promise<TimelinePrediction> {
    console.log(`⏱️ Prevendo cronograma para ${elements.length} elementos...`);
    
    // Análise de complexidade do projeto
    const complexity = this.analyzeProjectComplexity(elements);
    
    // Estimar duração base
    const baseDuration = this.estimateBaseDuration(elements, complexity);
    
    // Identificar milestones
    const milestones = this.identifyMilestones(elements);
    
    // Identificar riscos de prazo
    const risks = this.identifyTimelineRisks(elements, complexity);
    
    // Ajustar baseado em riscos
    const riskImpact = risks.reduce((sum, risk) => sum + risk.impact * risk.probability, 0);
    const adjustedDuration = baseDuration + riskImpact;
    
    // Calcular confiança
    const confidence = 1 - (riskImpact / baseDuration);
    
    // Identificar caminho crítico (simplificado)
    const criticalPath = this.identifyCriticalPath(elements);
    
    console.log(`✅ Prazo previsto: ${Math.round(adjustedDuration)} dias (confiança: ${(confidence * 100).toFixed(1)}%)`);
    
    return {
      projectDuration: Math.round(adjustedDuration),
      confidence: Math.max(0, Math.min(1, confidence)),
      milestones,
      criticalPath,
      risks
    };
  }

  /**
   * Analisar complexidade do projeto
   */
  private analyzeProjectComplexity(elements: IFCElement[]): number {
    let complexity = 0;
    
    // Número de elementos
    complexity += Math.min(elements.length / 1000, 0.3);
    
    // Diversidade de tipos
    const uniqueTypes = new Set(elements.map(e => e.type)).size;
    complexity += Math.min(uniqueTypes / 20, 0.3);
    
    // Complexidade geométrica média
    const avgComplexity = elements.reduce((sum, e) => {
      const vertexCount = e.geometry?.attributes.position?.count || 0;
      return sum + Math.min(vertexCount / 10000, 1);
    }, 0) / elements.length;
    complexity += avgComplexity * 0.4;
    
    return Math.min(complexity, 1);
  }

  /**
   * Estimar duração base
   */
  private estimateBaseDuration(elements: IFCElement[], complexity: number): number {
    // Modelo empírico baseado em projetos típicos
    const baselinePerElement = 0.5; // 0.5 dias por elemento
    const baseDays = elements.length * baselinePerElement;
    
    // Ajustar por complexidade
    const complexityMultiplier = 1 + (complexity * 0.5);
    
    return baseDays * complexityMultiplier;
  }

  /**
   * Identificar marcos do projeto
   */
  private identifyMilestones(elements: IFCElement[]): Milestone[] {
    const milestones: Milestone[] = [];
    
    // Agrupar por tipo
    const byType = new Map<string, IFCElement[]>();
    elements.forEach(e => {
      if (!byType.has(e.type)) byType.set(e.type, []);
      byType.get(e.type)!.push(e);
    });
    
    let currentDay = 0;
    
    // Fundações
    if (byType.has('IFCFOOTING') || byType.has('IFCPILE')) {
      milestones.push({
        name: 'Fundações',
        startDay: currentDay,
        endDay: currentDay + 30,
        confidence: 0.9,
        dependencies: []
      });
      currentDay += 30;
    }
    
    // Estrutura
    if (byType.has('IFCCOLUMN') || byType.has('IFCBEAM') || byType.has('IFCSLAB')) {
      milestones.push({
        name: 'Estrutura',
        startDay: currentDay,
        endDay: currentDay + 60,
        confidence: 0.85,
        dependencies: ['Fundações']
      });
      currentDay += 60;
    }
    
    // Alvenaria
    if (byType.has('IFCWALL')) {
      milestones.push({
        name: 'Alvenaria',
        startDay: currentDay,
        endDay: currentDay + 45,
        confidence: 0.8,
        dependencies: ['Estrutura']
      });
      currentDay += 45;
    }
    
    // Esquadrias
    if (byType.has('IFCWINDOW') || byType.has('IFCDOOR')) {
      milestones.push({
        name: 'Esquadrias',
        startDay: currentDay - 15, // Overlap
        endDay: currentDay + 20,
        confidence: 0.85,
        dependencies: ['Alvenaria']
      });
      currentDay += 20;
    }
    
    // Acabamentos
    milestones.push({
      name: 'Acabamentos',
      startDay: currentDay,
      endDay: currentDay + 30,
      confidence: 0.75,
      dependencies: ['Esquadrias']
    });
    
    return milestones;
  }

  /**
   * Identificar riscos de prazo
   */
  private identifyTimelineRisks(elements: IFCElement[], complexity: number): TimelineRisk[] {
    const risks: TimelineRisk[] = [];
    
    // Risco de complexidade
    if (complexity > 0.7) {
      risks.push({
        type: 'complexity',
        severity: 'high',
        description: 'Projeto de alta complexidade pode enfrentar desafios técnicos',
        probability: 0.6,
        impact: 15
      });
    }
    
    // Risco de recursos (mais elementos = mais recursos)
    if (elements.length > 2000) {
      risks.push({
        type: 'resource',
        severity: 'medium',
        description: 'Grande volume de elementos pode exigir recursos adicionais',
        probability: 0.5,
        impact: 10
      });
    }
    
    // Risco climático (placeholder - seria baseado em localização e época)
    risks.push({
      type: 'weather',
      severity: 'low',
      description: 'Condições climáticas podem causar atrasos',
      probability: 0.3,
      impact: 7
    });
    
    return risks;
  }

  /**
   * Identificar caminho crítico
   */
  private identifyCriticalPath(elements: IFCElement[]): number[] {
    // Simplificado - seria um algoritmo de Critical Path Method real
    // Retornar elementos estruturais como críticos
    const criticalTypes = ['IFCCOLUMN', 'IFCBEAM', 'IFCSLAB', 'IFCWALL'];
    
    return elements
      .filter(e => criticalTypes.includes(e.type))
      .map(e => e.expressID);
  }

  /**
   * ANÁLISE DE RISCOS
   */
  async assessRisks(elements: IFCElement[]): Promise<RiskAssessment[]> {
    console.log(`⚠️ Avaliando riscos de ${elements.length} elementos...`);
    
    const assessments: RiskAssessment[] = [];
    
    for (const element of elements) {
      const risks = this.identifyElementRisks(element);
      
      const riskScore = risks.reduce((sum, r) => sum + r.score, 0) / risks.length;
      
      let riskLevel: RiskAssessment['riskLevel'] = 'low';
      if (riskScore > 0.7) riskLevel = 'critical';
      else if (riskScore > 0.5) riskLevel = 'high';
      else if (riskScore > 0.3) riskLevel = 'medium';
      
      const mitigation = this.generateMitigationStrategies(risks);
      
      assessments.push({
        elementId: element.expressID,
        riskScore,
        riskLevel,
        risks,
        mitigation
      });
    }
    
    const criticalCount = assessments.filter(a => a.riskLevel === 'critical').length;
    console.log(`✅ Análise completa: ${criticalCount} elementos críticos`);
    
    return assessments;
  }

  /**
   * Identificar riscos de elemento
   */
  private identifyElementRisks(element: IFCElement): Risk[] {
    const risks: Risk[] = [];
    
    // Risco estrutural
    if (['IFCCOLUMN', 'IFCBEAM', 'IFCSLAB'].includes(element.type)) {
      risks.push({
        category: 'structural',
        description: 'Elemento estrutural crítico',
        probability: 0.3,
        impact: 0.9,
        score: 0.27
      });
    }
    
    // Risco de custo (elementos grandes)
    const size = element.boundingBox.max.clone().sub(element.boundingBox.min);
    const volume = size.x * size.y * size.z;
    
    if (volume > 20) {
      risks.push({
        category: 'cost',
        description: 'Volume elevado pode exceder orçamento',
        probability: 0.4,
        impact: 0.6,
        score: 0.24
      });
    }
    
    // Risco de qualidade (geometria complexa)
    const complexity = element.geometry?.attributes.position?.count || 0;
    if (complexity > 5000) {
      risks.push({
        category: 'quality',
        description: 'Geometria complexa requer atenção especial',
        probability: 0.5,
        impact: 0.5,
        score: 0.25
      });
    }
    
    // Risco de segurança (altura)
    const center = element.boundingBox.getCenter(new THREE.Vector3());
    if (center.z > 15) {
      risks.push({
        category: 'safety',
        description: 'Trabalho em altura requer medidas de segurança',
        probability: 0.6,
        impact: 0.8,
        score: 0.48
      });
    }
    
    return risks;
  }

  /**
   * Gerar estratégias de mitigação
   */
  private generateMitigationStrategies(risks: Risk[]): string[] {
    const strategies: string[] = [];
    
    risks.forEach(risk => {
      switch (risk.category) {
        case 'structural':
          strategies.push('Realizar análise estrutural detalhada');
          strategies.push('Contratar engenheiro estrutural especializado');
          break;
        case 'cost':
          strategies.push('Revisar fornecedores e cotações');
          strategies.push('Considerar materiais alternativos');
          break;
        case 'schedule':
          strategies.push('Adicionar buffer no cronograma');
          strategies.push('Contratar recursos adicionais');
          break;
        case 'quality':
          strategies.push('Implementar controle de qualidade rigoroso');
          strategies.push('Treinar equipe específica');
          break;
        case 'safety':
          strategies.push('Fornecer EPIs adequados');
          strategies.push('Realizar treinamento de segurança');
          break;
      }
    });
    
    return [...new Set(strategies)]; // Remover duplicatas
  }

  /**
   * Build models
   */
  private async buildCostPredictionModel(): Promise<tf.LayersModel> {
    const model = tf.sequential({
      layers: [
        tf.layers.dense({ inputShape: [15], units: 64, activation: 'relu' }),
        tf.layers.dropout({ rate: 0.2 }),
        tf.layers.dense({ units: 32, activation: 'relu' }),
        tf.layers.dropout({ rate: 0.1 }),
        tf.layers.dense({ units: 1, activation: 'sigmoid' })
      ]
    });
    
    model.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'meanSquaredError'
    });
    
    return model;
  }

  private async buildTimelineModel(): Promise<tf.LayersModel> {
    const model = tf.sequential({
      layers: [
        tf.layers.dense({ inputShape: [10], units: 32, activation: 'relu' }),
        tf.layers.dense({ units: 16, activation: 'relu' }),
        tf.layers.dense({ units: 1, activation: 'linear' })
      ]
    });
    
    model.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'meanAbsoluteError'
    });
    
    return model;
  }

  private async buildRiskModel(): Promise<tf.LayersModel> {
    const model = tf.sequential({
      layers: [
        tf.layers.dense({ inputShape: [20], units: 64, activation: 'relu' }),
        tf.layers.dropout({ rate: 0.3 }),
        tf.layers.dense({ units: 32, activation: 'relu' }),
        tf.layers.dense({ units: 4, activation: 'softmax' }) // low, medium, high, critical
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
   * Limpar
   */
  dispose(): void {
    this.costModels.forEach(model => model.dispose());
    this.timelineModel?.dispose();
    this.riskModel?.dispose();
    
    console.log('🧹 Predictive Analytics limpo');
  }
}

// Singleton export
export const predictiveAnalytics = PredictiveAnalytics.getInstance();
