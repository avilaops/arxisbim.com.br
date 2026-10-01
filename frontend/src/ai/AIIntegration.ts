/**
 * AI Integration - Integração completa do sistema de IA
 * 
 * Este arquivo demonstra como usar todos os sistemas de ML juntos
 */

import { bimAI } from './BIMAIEngine';
import { tensorflowEngine } from './TensorFlowEngine';
import { nlpEngine } from './NLPEngine';
import { predictiveAnalytics } from './PredictiveAnalytics';
import { aiAssistant } from './AIAssistant';
import { AIDashboard } from '../shared/components/ui/AIDashboard';

export class AIIntegration {
  private static instance: AIIntegration;
  private dashboard: AIDashboard | null = null;
  private initialized: boolean = false;

  private constructor() {
    console.log('AI Integration initialized');
  }

  static getInstance(): AIIntegration {
    if (!AIIntegration.instance) {
      AIIntegration.instance = new AIIntegration();
    }
    return AIIntegration.instance;
  }

  /**
   * Inicializar TODOS os sistemas de IA
   */
  async initializeAll(): Promise<void> {
    if (this.initialized) {
      console.log('IA já inicializada');
      return;
    }

    console.log('Inicializando sistema completo de IA...');
    console.log('Este processo pode levar alguns segundos...');

    const startTime = Date.now();

    try {
      // 1. TensorFlow Engine (base para todos)
      console.log('1. Inicializando TensorFlow Engine...');
      await tensorflowEngine.initialize();
      console.log('   TensorFlow pronto');

      // 2. NLP Engine (para chatbot)
      console.log('2. Inicializando NLP Engine...');
      await nlpEngine.initialize();
      console.log('   NLP pronto');

      // 3. Predictive Analytics
      console.log('3. Inicializando Predictive Analytics...');
      await predictiveAnalytics.initialize();
      console.log('   Predictive Analytics pronto');

      // 4. AI Assistant
      console.log('4. Inicializando AI Assistant...');
      await aiAssistant.initialize();
      console.log('   AI Assistant pronto');

      // 5. Dashboard UI
      console.log('5. Criando AI Dashboard...');
      this.dashboard = new AIDashboard();
      console.log('   Dashboard pronto');

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log(`Sistema de IA completo em ${elapsed}s`);
      
      this.initialized = true;
      
      // Mostrar info
      this.printSystemInfo();
    } catch (error) {
      console.error('Erro ao inicializar IA:', error);
      throw error;
    }
  }

  /**
   * Análise COMPLETA de um projeto IFC
   */
  async analyzeProject(elements: any[]): Promise<{
    summary: string;
    clashes: any[];
    costs: any;
    timeline: any;
    risks: any[];
    clusters: any[];
    anomalies: any[];
    optimizations: any[];
  }> {
    console.log(`Análise completa de ${elements.length} elementos...`);

    // Registrar elementos
    bimAI.registerElements(elements);

    // Atualizar contexto do assistente
    aiAssistant.updateContext({
      elementCount: elements.length,
      clashCount: 0,
      totalCost: 0,
      activeElements: new Set(elements.map(e => e.expressID))
    });

    // 1. FEATURE EXTRACTION
    console.log('Extraindo atributos...');
    const features = tensorflowEngine.extractFeatures(elements);

    // 2. CLUSTERING
    console.log('Agrupando elementos similares...');
    const clusters = await tensorflowEngine.clusterElements(features, 5);

    // 3. ANOMALY DETECTION
    console.log('Detectando anomalias...');
    const anomalies = await tensorflowEngine.detectAnomalies(features);
    const anomalyElements = anomalies.filter(a => a.isAnomaly);

    // 4. CLASH DETECTION
    console.log('Detectando colisões...');
    const clashes = await bimAI.detectClashes({
      progressCallback: (p) => {
        if (p % 10 === 0) console.log(`   ${p.toFixed(0)}%`);
      }
    });

    // 5. COST ESTIMATION
    console.log('Estimando custos...');
    const costAnalysis = await bimAI.estimateCosts();
    
    // 5b. Predictive Costs (ML)
    console.log('Previsão ML de custos...');
    const mlCostPredictions = await predictiveAnalytics.predictCosts(elements);
    const mlTotalCost = mlCostPredictions.reduce((sum, p) => sum + p.predictedCost, 0);

    // 6. TIMELINE PREDICTION
    console.log('Prevendo cronograma...');
    const timeline = await predictiveAnalytics.predictTimeline(elements);

    // 7. RISK ASSESSMENT
    console.log('Avaliando riscos...');
    const risks = await predictiveAnalytics.assessRisks(elements);
    const criticalRisks = risks.filter(r => r.riskLevel === 'critical');

    // 8. OPTIMIZATION SUGGESTIONS
    console.log('Gerando sugestões...');
    const optimizations = bimAI.generateOptimizationSuggestions();

    // Atualizar contexto do assistente
    aiAssistant.updateContext({
      elementCount: elements.length,
      clashCount: clashes.length,
      totalCost: costAnalysis.totalEstimated,
      activeElements: new Set(elements.map(e => e.expressID))
    });

    // Gerar sumário
    const summary = this.generateSummary({
      elementCount: elements.length,
      clashes: clashes.length,
      cost: costAnalysis.totalEstimated,
      mlCost: mlTotalCost,
      timeline: timeline.projectDuration,
      clusters: clusters.length,
      anomalies: anomalyElements.length,
      criticalRisks: criticalRisks.length,
      optimizations: optimizations.length
    });

    console.log('Análise completa');
    console.log(summary);

    return {
      summary,
      clashes,
      costs: costAnalysis,
      timeline,
      risks,
      clusters,
      anomalies: anomalyElements,
      optimizations
    };
  }

  /**
   * Gerar sumário da análise
   */
  private generateSummary(data: any): string {
     return `
  ANÁLISE COMPLETA DO PROJETO

  ELEMENTOS
   Total: ${data.elementCount} elementos
   Grupos similares: ${data.clusters}
   Anomalias detectadas: ${data.anomalies}

  COLISÕES
   Total detectadas: ${data.clashes}
    Status: ${data.clashes === 0 ? 'Nenhuma colisão' : `Revisar ${data.clashes} conflitos`}

  CUSTOS
   Estimativa tradicional: R$ ${data.cost.toLocaleString('pt-BR')}
   Previsão ML (ensemble): R$ ${data.mlCost.toLocaleString('pt-BR')}
   Diferença: R$ ${Math.abs(data.cost - data.mlCost).toLocaleString('pt-BR')}

  CRONOGRAMA
   Prazo estimado: ${data.timeline} dias
   Marcos principais: ${Math.ceil(data.timeline / 30)} fases

  RISCOS
   Elementos críticos: ${data.criticalRisks}
    Status: ${data.criticalRisks === 0 ? 'Baixo risco' : `${data.criticalRisks} itens críticos`}

  OTIMIZAÇÃO
   Sugestões disponíveis: ${data.optimizations}
   Potencial de economia: Até 15% do custo

  Gerado por Arxis AI Analytics
    `.trim();
  }

  /**
   * Chat com IA (com NLP real)
   */
  async chat(message: string): Promise<string> {
    const result = await aiAssistant.ask(message);
    return result.answer;
  }

  /**
   * Mostrar dashboard
   */
  showDashboard(): void {
    if (!this.dashboard) {
      throw new Error('Dashboard não inicializado. Chame initializeAll() primeiro.');
    }
    this.dashboard.show();
  }

  /**
   * Esconder dashboard
   */
  hideDashboard(): void {
    this.dashboard?.hide();
  }

  /**
   * Toggle dashboard
   */
  toggleDashboard(): void {
    this.dashboard?.toggle();
  }

  /**
   * Informações do sistema
   */
  printSystemInfo(): void {
    const memory = tensorflowEngine.getMemoryInfo();
    const models = tensorflowEngine.listModels();

     console.log(`
  SISTEMA DE IA INICIALIZADO

  TensorFlow.js
    Backend: ${tensorflowEngine.getBackend()}
   Memória GPU: ${(memory.numBytes / 1024 / 1024).toFixed(2)} MB
   Tensors ativos: ${memory.numTensors}

  Modelos carregados
   ${models.join('\n   ')}

  NLP Engine
   Vocabulário: 200+ palavras especializadas
   Embeddings: 50 dimensões
   Intenções: 9 categorias

  Predictive Analytics
   Modelos ensemble: 5 modelos
   Confidence Interval: 95%
   Risk Categories: 5 tipos

  AI Assistant
   Status: Pronto para conversar
   NLP: Ativado
   Histórico: Vazio

  AI Dashboard
   Status: Pronto
   Abas: Chat, Colisões, Custos, Otimização
    `.trim());
  }

  /**
   * Exemplo de uso rápido
   */
  async quickDemo(): Promise<void> {
    console.log('Demo rápido do sistema de IA\n');

    // 1. Chat
    console.log('Chat com IA:');
    const q1 = await this.chat("Olá!");
    console.log(`   Você: Olá!`);
    console.log(`   IA: ${q1}\n`);

    const q2 = await this.chat("O que você pode fazer?");
    console.log(`   Você: O que você pode fazer?`);
    console.log(`   IA: ${q2}\n`);

    // 2. NLP
    console.log('NLP Engine:');
    const intent = await nlpEngine.classifyIntent("Quantas janelas tem?");
    console.log(`   Pergunta: "Quantas janelas tem?"`);
    console.log(`   Intenção: ${intent.name} (${(intent.confidence * 100).toFixed(1)}%)`);
    console.log(`   Entidades: ${intent.entities.map(e => e.value).join(', ')}\n`);

    // 3. Similaridade
    console.log('Similaridade semântica:');
    const sim = nlpEngine.calculateSimilarity(
      "Quantas paredes existem?",
      "Número de paredes no projeto"
    );
    console.log(`   Frase 1: "Quantas paredes existem?"`);
    console.log(`   Frase 2: "Número de paredes no projeto"`);
    console.log(`   Similaridade: ${(sim * 100).toFixed(1)}%\n`);

    // 4. Sentiment
    console.log('Análise de sentimento:');
    const sentiment = nlpEngine.analyzeSentiment("Projeto está ótimo!");
    console.log(`   Texto: "Projeto está ótimo!"`);
    console.log(`   Sentimento: ${sentiment.label} (score: ${sentiment.score.toFixed(2)})\n`);

    console.log('Demo completo');
  }

  /**
   * Limpar memória
   */
  dispose(): void {
    tensorflowEngine.dispose();
    nlpEngine.dispose();
    predictiveAnalytics.dispose();
    
    console.log('Sistema de IA limpo');
  }

  /**
   * Verificar se está inicializado
   */
  isInitialized(): boolean {
    return this.initialized;
  }
}

// Singleton export
export const aiIntegration = AIIntegration.getInstance();

// Helper global para acesso rápido
if (typeof window !== 'undefined') {
  (window as any).ai = aiIntegration;
  console.log('Sistema de IA disponível globalmente: window.ai');
}
