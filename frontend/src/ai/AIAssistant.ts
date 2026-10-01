/**
 * AI Assistant - Chatbot inteligente para projetos BIM
 * 
 * Funcionalidades:
 * - Responder perguntas sobre o projeto
 * - Buscar propriedades de elementos IFC
 * - Fornecer recomendações
 * - Análise de contexto
 */

import { IFCElement, ClashResult, CostAnalysis } from './BIMAIEngine';
import { nlpEngine, Intent } from './NLPEngine';

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface AssistantContext {
  projectName?: string;
  elementCount: number;
  clashCount: number;
  totalCost?: number;
  activeElements: Set<number>;
}

export interface QueryResult {
  answer: string;
  confidence: number;
  sources: string[];
  suggestions?: string[];
  relatedElements?: number[];
}

export class AIAssistant {
  private static instance: AIAssistant;
  private conversationHistory: Message[] = [];
  private context: AssistantContext = {
    elementCount: 0,
    clashCount: 0,
    activeElements: new Set()
  };

  // Base de conhecimento
  private knowledgeBase: Map<string, string[]> = new Map([
    // Perguntas sobre quantidades
    ['quantos', ['elementos', 'paredes', 'janelas', 'portas', 'pilares', 'vigas']],
    ['quantidade', ['elementos', 'paredes', 'janelas', 'portas', 'pilares', 'vigas']],
    ['total', ['elementos', 'custo', 'área', 'volume']],
    
    // Perguntas sobre colisões
    ['colisão', ['clash', 'conflito', 'interseção', 'problema']],
    ['conflito', ['clash', 'colisão', 'interseção']],
    ['problema', ['colisão', 'erro', 'clash', 'conflito']],
    
    // Perguntas sobre custos
    ['custo', ['preço', 'valor', 'orçamento', 'estimativa']],
    ['preço', ['custo', 'valor', 'orçamento']],
    ['orçamento', ['custo', 'valor', 'estimativa']],
    
    // Perguntas sobre otimização
    ['otimizar', ['melhorar', 'reduzir', 'economizar']],
    ['melhorar', ['otimizar', 'aprimorar', 'eficiência']],
    ['economizar', ['reduzir', 'custo', 'otimizar']],
    
    // Perguntas sobre localização
    ['onde', ['localização', 'posição', 'coordenadas']],
    ['localização', ['onde', 'posição', 'coordenadas']],
    
    // Perguntas sobre propriedades
    ['propriedade', ['atributo', 'característica', 'informação']],
    ['material', ['propriedade', 'tipo', 'característica']],
    ['dimensão', ['tamanho', 'medida', 'área', 'volume']]
  ]);

  private constructor() {
    console.log('AI Assistant initialized');
    this.addSystemMessage('Olá! Sou o assistente BIM do Arxis. Como posso apoiar sua revisão?');
  }

  static getInstance(): AIAssistant {
    if (!AIAssistant.instance) {
      AIAssistant.instance = new AIAssistant();
    }
    return AIAssistant.instance;
  }

  /**
   * Atualiza contexto do projeto
   */
  updateContext(context: Partial<AssistantContext>): void {
    this.context = { ...this.context, ...context };
  }

  /**
   * Processa pergunta do usuário com NLP real
   */
  async ask(question: string): Promise<QueryResult> {
    console.log(`Pergunta: ${question}`);
    
    // Adicionar à história
    this.addUserMessage(question);
    
    // Usar NLP Engine para classificar intenção
    const intent = await nlpEngine.classifyIntent(question);
    console.log(`Intenção detectada: ${intent.name} (${(intent.confidence * 100).toFixed(1)}%)`);
    
    // Análise de sentimento
    const sentiment = nlpEngine.analyzeSentiment(question);
    
    // Processar baseado na intenção
    let result: QueryResult;
    
    // Extrair valores de entidades
    const entities = intent.entities.map(e => e.value);
    const normalized = question.toLowerCase().trim();
    
    switch (intent.name) {
      case 'count_query':
        result = this.handleCountQuery(normalized, entities);
        break;
      
      case 'clash_query':
        result = this.handleClashQuery(normalized, entities);
        break;
      
      case 'cost_query':
        result = this.handleCostQuery(normalized, entities);
        break;
      
      case 'optimization':
        result = this.handleOptimizationQuery(normalized, entities);
        break;
      
      case 'location_query':
        result = this.handleLocationQuery(normalized, entities);
        break;
      
      case 'property_query':
        result = this.handlePropertyQuery(normalized, entities);
        break;
      
      case 'greeting':
        result = this.handleGreeting(sentiment.label);
        break;
      
      case 'help':
        result = this.handleHelp();
        break;
      
      case 'general':
      default:
        result = this.handleGeneralQuery(normalized);
        break;
    }
    
    // Adicionar resposta à história
    this.addAssistantMessage(result.answer, { confidence: result.confidence });
    
    return result;
  }

  /**
   * Inicializar NLP Engine
   */
  async initialize(): Promise<void> {
    console.log('Inicializando AI Assistant com NLP...');
    try {
      await nlpEngine.initialize();
      console.log('AI Assistant pronto');
    } catch (error) {
      console.error('Erro ao inicializar NLP:', error);
      throw error;
    }
  }

  /**
   * Manipuladores de perguntas específicas
   */
  private handleGreeting(sentiment: string): QueryResult {
    const greetings = [
      'Olá! Como posso ajudar você hoje?',
      'Oi! Estou aqui para ajudar com seu projeto BIM.',
      'Olá! Pronto para analisar seu projeto?'
    ];
    
    const answer = greetings[Math.floor(Math.random() * greetings.length)];
    
    return {
      answer,
      confidence: 1.0,
      sources: ['Sistema de saudações'],
      suggestions: [
        'Pergunte sobre quantidades de elementos',
        'Solicite análise de colisões',
        'Peça estimativa de custos'
      ]
    };
  }
  
  private handleHelp(): QueryResult {
    return {
            answer: 'Sou um assistente BIM corporativo. Posso ajudar com:\n\n' +
              '• Quantidades e quantitativos\n' +
              '• Detecção de colisões\n' +
              '• Estimativa de custos\n' +
              '• Sugestões de otimização\n' +
              '• Localização de elementos\n' +
              '• Propriedades de elementos\n' +
              '• Análises preditivas\n\n' +
              'Faça uma pergunta sobre o modelo ou a coordenação BIM.',
      confidence: 1.0,
      sources: ['Sistema de ajuda'],
      suggestions: [
        'Quantos pilares tem o projeto?',
        'Tem alguma colisão?',
        'Qual o custo estimado?'
      ]
    };
  }
  
  private handleCountQuery(question: string, entities: string[]): QueryResult {
    const { elementCount } = this.context;
    
    let answer = `O projeto possui ${elementCount} elementos ao total.`;
    const sources = ['Análise de elementos IFC'];
    const suggestions: string[] = [];
    
    if (entities.length > 0) {
      answer = `Vou verificar a quantidade de ${entities.join(', ')}...`;
      suggestions.push('Use o menu "Análise" > "Quantitativos" para ver detalhes');
    } else {
      suggestions.push(
        'Pergunte sobre tipos específicos: "Quantas paredes?"',
        'Use "Análise" > "Quantitativos" para ver por categoria'
      );
    }
    
    return {
      answer,
      confidence: 0.9,
      sources,
      suggestions
    };
  }

  private handleClashQuery(question: string, entities: string[]): QueryResult {
    const { clashCount } = this.context;
    
    let answer = ``;
    const sources = ['Sistema de detecção de colisões'];
    const suggestions: string[] = [];
    
    if (clashCount === 0) {
      answer = 'Não foram detectadas colisões no projeto. Use "Análise" > "Detectar Colisões" para executar uma verificação completa.';
      suggestions.push('Execute uma análise de colisões para verificar conflitos');
    } else if (clashCount > 0) {
      answer = `Foram detectadas ${clashCount} colisões no projeto. ${
        clashCount > 10 ? 'Recomendo revisar as colisões críticas primeiro.' : 'Revise cada uma no painel de colisões.'
      }`;
      suggestions.push(
        'Clique em "Ver Colisões" para detalhes',
        'Priorize resolver colisões críticas primeiro'
      );
    }
    
    return {
      answer,
      confidence: 0.95,
      sources,
      suggestions
    };
  }

  private handleCostQuery(question: string, entities: string[]): QueryResult {
    const { totalCost } = this.context;
    
    let answer = '';
    const sources = ['Sistema de estimativa de custos'];
    const suggestions: string[] = [];
    
    if (!totalCost || totalCost === 0) {
      answer = 'Ainda não foi feita uma estimativa de custos. Use "Análise" > "Estimar Custos" para gerar uma análise detalhada.';
      suggestions.push('Execute a estimativa de custos para ver valores');
    } else {
      const formatted = totalCost.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      });
      
      answer = `O custo estimado do projeto é de ${formatted}. Este valor inclui uma margem de segurança de 10%.`;
      
      suggestions.push(
        'Veja o detalhamento em "Análise" > "Custos"',
        'Ajuste a tabela de preços para maior precisão'
      );
    }
    
    return {
      answer,
      confidence: totalCost ? 0.85 : 0.7,
      sources,
      suggestions
    };
  }

  private handleOptimizationQuery(question: string, entities: string[]): QueryResult {
    const suggestions: string[] = [
      'Execute "Análise" > "Otimização" para ver sugestões',
      'Verifique elementos duplicados',
      'Analise materiais de alto custo',
      'Resolva colisões antes da obra'
    ];
    
    return {
      answer: 'Posso ajudar a otimizar seu projeto! Recomendo:\n\n' +
              '1. Resolver todas as colisões detectadas\n' +
              '2. Revisar elementos potencialmente duplicados\n' +
              '3. Analisar materiais de alto custo\n' +
              '4. Verificar quantitativos para evitar desperdício',
      confidence: 0.8,
      sources: ['Sistema de otimização', 'Boas práticas BIM'],
      suggestions
    };
  }

  private handleLocationQuery(question: string, entities: string[]): QueryResult {
    return {
      answer: 'Para localizar elementos, você pode:\n\n' +
              '1. Clicar no elemento no visualizador 3D\n' +
              '2. Usar a busca por propriedades\n' +
              '3. Filtrar por tipo de elemento\n' +
              '4. Ver coordenadas no painel de propriedades',
      confidence: 0.75,
      sources: ['Sistema de navegação'],
      suggestions: [
        'Use Ctrl+F para buscar elementos',
        'Clique com botão direito para ver propriedades'
      ]
    };
  }

  private handlePropertyQuery(question: string, entities: string[]): QueryResult {
    return {
      answer: 'Para ver propriedades de elementos:\n\n' +
              '1. Selecione o elemento no visualizador\n' +
              '2. O painel de propriedades abrirá automaticamente\n' +
              '3. Use a aba "Propriedades" para ver atributos IFC\n' +
              '4. Exporte propriedades em CSV ou JSON',
      confidence: 0.8,
      sources: ['Sistema de propriedades IFC'],
      suggestions: [
        'Clique direito > "Propriedades" para detalhes',
        'Use "Exportar Propriedades" para relatórios'
      ]
    };
  }

  private handleGeneralQuery(question: string): QueryResult {
    // Respostas para perguntas gerais
    const generalResponses: Record<string, string> = {
      'ajuda': 'Posso ajudar você com:\n\n' +
               '• Quantidades e quantitativos\n' +
               '• Detecção de colisões\n' +
               '• Estimativa de custos\n' +
               '• Sugestões de otimização\n' +
               '• Propriedades de elementos\n' +
               '• Navegação no projeto\n\n' +
               'Basta fazer uma pergunta!',
      
      'o que você faz': 'Sou um assistente especializado em projetos BIM. ' +
                         'Posso analisar seu projeto IFC, detectar problemas, estimar custos ' +
                         'e fornecer recomendações para otimização.',
      
      'como usar': 'É fácil! Você pode:\n\n' +
                    '1. Carregar um arquivo IFC\n' +
                    '2. Navegar pelo visualizador 3D\n' +
                    '3. Usar o menu "Análise" para executar verificações\n' +
                    '4. Perguntar qualquer coisa para mim\n' +
                    '5. Ver relatórios e exportar dados',
      
      'default': 'Desculpe, não entendi sua pergunta. Pode reformular? ' +
                 'Ou pergunte "ajuda" para ver o que posso fazer.'
    };
    
    // Buscar resposta apropriada
    for (const [key, response] of Object.entries(generalResponses)) {
      if (question.includes(key)) {
        return {
          answer: response,
          confidence: 0.7,
          sources: ['Base de conhecimento'],
          suggestions: ['Pergunte "ajuda" para ver mais opções']
        };
      }
    }
    
    return {
      answer: generalResponses['default'],
      confidence: 0.5,
      sources: [],
      suggestions: [
        'Tente perguntas como: "Quantas paredes?"',
        'Ou: "Qual o custo estimado?"',
        'Ou: "Tem alguma colisão?"'
      ]
    };
  }

  /**
   * Gerenciamento de mensagens
   */
  private addUserMessage(content: string): void {
    this.conversationHistory.push({
      id: this.generateId(),
      role: 'user',
      content,
      timestamp: new Date()
    });
  }

  private addAssistantMessage(content: string, metadata?: Record<string, any>): void {
    this.conversationHistory.push({
      id: this.generateId(),
      role: 'assistant',
      content,
      timestamp: new Date(),
      metadata
    });
  }

  private addSystemMessage(content: string): void {
    this.conversationHistory.push({
      id: this.generateId(),
      role: 'system',
      content,
      timestamp: new Date()
    });
  }

  /**
   * Obter histórico de conversação
   */
  getHistory(): Message[] {
    return [...this.conversationHistory];
  }

  /**
   * Limpar histórico
   */
  clearHistory(): void {
    this.conversationHistory = [];
    this.addSystemMessage('Histórico limpo. Como posso ajudar?');
  }

  /**
   * Exportar conversa
   */
  exportConversation(): string {
    return this.conversationHistory
      .map(msg => {
        const time = msg.timestamp.toLocaleTimeString('pt-BR');
        const role = msg.role === 'user' ? 'Você' : 
                     msg.role === 'assistant' ? 'Assistente' : 'Sistema';
        return `[${time}] ${role}: ${msg.content}`;
      })
      .join('\n\n');
  }

  /**
   * Gerar ID único
   */
  private generateId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Análise de sentimento (simples)
   */
  analyzeSentiment(text: string): 'positive' | 'neutral' | 'negative' {
    const positiveWords = ['bom', 'ótimo', 'excelente', 'perfeito', 'maravilhoso', 'obrigado'];
    const negativeWords = ['ruim', 'problema', 'erro', 'falha', 'não funciona', 'bug'];
    
    const normalized = text.toLowerCase();
    
    const positiveCount = positiveWords.filter(word => normalized.includes(word)).length;
    const negativeCount = negativeWords.filter(word => normalized.includes(word)).length;
    
    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }

  /**
   * Sugestões automáticas baseadas no contexto
   */
  getContextualSuggestions(): string[] {
    const suggestions: string[] = [];
    
    const { elementCount, clashCount, totalCost } = this.context;
    
    if (elementCount === 0) {
      suggestions.push('Carregue um arquivo IFC para começar');
    } else {
      if (clashCount === 0) {
        suggestions.push('Execute uma análise de colisões');
      } else if (clashCount > 10) {
        suggestions.push('Há muitas colisões. Revise os itens críticos primeiro');
      }
      
      if (!totalCost) {
        suggestions.push('Gere uma estimativa de custos');
      }
      
      suggestions.push('Pergunte: "Quantos elementos tem o projeto?"');
      suggestions.push('Pergunte: "Como otimizar o projeto?"');
    }
    
    return suggestions;
  }
}

// Singleton export
export const aiAssistant = AIAssistant.getInstance();
