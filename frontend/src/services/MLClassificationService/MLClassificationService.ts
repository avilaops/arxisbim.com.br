/**
 * MLClassificationService
 * Classificação automática de elementos BIM usando Machine Learning
 * Detecta anomalias, sugere otimizações e reconhece padrões
 */

export interface ElementFeature {
  id: string;
  type: string;
  properties: Record<string, any>;
  geometry: {
    volume: number;
    area: number;
    boundingBox: { min: number[]; max: number[] };
  };
  location: { x: number; y: number; z: number };
}

export interface ClassificationResult {
  elementId: string;
  category: string;
  confidence: number;
  suggestedProperties?: Record<string, any>;
}

export interface AnomalyDetection {
  elementId: string;
  type: 'geometry' | 'property' | 'relationship';
  severity: 'low' | 'medium' | 'high';
  description: string;
  suggestion?: string;
}

export interface OptimizationSuggestion {
  elementId: string;
  type: 'geometry' | 'material' | 'performance';
  description: string;
  estimatedImpact: number;
  action: string;
}

class MLClassificationService {
  private classificationModel: Map<string, string[]> = new Map();
  private anomalies: Map<string, AnomalyDetection> = new Map();
  private suggestions: Map<string, OptimizationSuggestion> = new Map();
  private trained: boolean = false;

  constructor() {
    this.initializeModel();
  }

  /**
   * Inicializa modelo de classificação
   */
  private initializeModel(): void {
    // Categorias de elementos BIM comuns
    this.classificationModel.set('wall', ['IfcWall', 'IfcWallStandardCase']);
    this.classificationModel.set('slab', ['IfcSlab', 'IfcFloor', 'IfcRoof']);
    this.classificationModel.set('column', ['IfcColumn', 'IfcColumnStandardCase']);
    this.classificationModel.set('beam', ['IfcBeam', 'IfcBeamStandardCase']);
    this.classificationModel.set('door', ['IfcDoor', 'IfcDoorStandardCase']);
    this.classificationModel.set('window', ['IfcWindow', 'IfcWindowStandardCase']);
    this.classificationModel.set('stair', ['IfcStair', 'IfcStairFlight']);
    this.classificationModel.set('railing', ['IfcRailing', 'IfcGuardRail']);
    this.classificationModel.set('furniture', ['IfcFurnishingElement']);
    this.classificationModel.set('equipment', ['IfcFlowTerminal', 'IfcDistributionElement']);

    this.trained = true;
    console.log('[MLClassificationService] Model initialized');
  }

  /**
   * Classifica elemento
   */
  classifyElement(element: ElementFeature): ClassificationResult {
    if (!this.trained) {
      throw new Error('Model not trained');
    }

    const category = this.predictCategory(element);
    const confidence = this.calculateConfidence(element, category);

    const result: ClassificationResult = {
      elementId: element.id,
      category,
      confidence,
      suggestedProperties: this.suggestProperties(element, category),
    };

    console.log('[MLClassificationService] Element classified:', element.id, 'as', category);
    return result;
  }

  /**
   * Classifica múltiplos elementos
   */
  classifyElements(elements: ElementFeature[]): ClassificationResult[] {
    return elements.map(element => this.classifyElement(element));
  }

  /**
   * Prediz categoria baseado em features
   */
  private predictCategory(element: ElementFeature): string {
    // Verificar tipo IFC direto
    for (const [category, types] of this.classificationModel) {
      if (types.includes(element.type)) {
        return category;
      }
    }

    // Classificação baseada em geometria
    const volume = element.geometry.volume;
    const area = element.geometry.area;

    if (volume > 100 && area > 50) {
      return 'slab';
    } else if (volume > 10 && volume < 50) {
      return 'column';
    } else if (volume > 5 && volume < 20) {
      return 'beam';
    } else if (volume < 5) {
      return 'furniture';
    }

    return 'unknown';
  }

  /**
   * Calcula confiança da classificação
   */
  private calculateConfidence(element: ElementFeature, category: string): number {
    // Se o tipo IFC corresponde diretamente, alta confiança
    const types = this.classificationModel.get(category);
    if (types && types.includes(element.type)) {
      return 0.95;
    }

    // Caso contrário, confiança baseada em geometria
    return 0.7;
  }

  /**
   * Sugere propriedades baseadas na categoria
   */
  private suggestProperties(element: ElementFeature, category: string): Record<string, any> | undefined {
    const suggestions: Record<string, any> = {};

    switch (category) {
      case 'wall':
        suggestions.fireRating = '2h';
        suggestions.loadBearing = true;
        break;
      case 'slab':
        suggestions.loadCapacity = element.geometry.volume * 2.5;
        break;
      case 'column':
        suggestions.loadCapacity = element.geometry.volume * 5;
        break;
      case 'door':
        suggestions.fireRating = '1h';
        suggestions.width = 0.9;
        break;
      case 'window':
        suggestions.uValue = 2.8;
        break;
    }

    return Object.keys(suggestions).length > 0 ? suggestions : undefined;
  }

  /**
   * Detecta anomalias em elementos
   */
  detectAnomalies(elements: ElementFeature[]): AnomalyDetection[] {
    const anomalies: AnomalyDetection[] = [];

    elements.forEach(element => {
      // Detectar geometria inválida
      if (element.geometry.volume <= 0) {
        anomalies.push({
          elementId: element.id,
          type: 'geometry',
          severity: 'high',
          description: 'Volume inválido ou zero',
          suggestion: 'Verificar geometria do elemento',
        });
      }

      // Detectar elementos fora de posição
      if (element.location.y < 0) {
        anomalies.push({
          elementId: element.id,
          type: 'geometry',
          severity: 'medium',
          description: 'Elemento abaixo do nível zero',
          suggestion: 'Verificar posicionamento vertical',
        });
      }

      // Detectar propriedades inconsistentes
      if (element.properties.fireRating && !this.isValidFireRating(element.properties.fireRating)) {
        anomalies.push({
          elementId: element.id,
          type: 'property',
          severity: 'low',
          description: 'Classificação de incêndio inválida',
          suggestion: 'Usar valores padrão (30min, 60min, 90min, 120min)',
        });
      }
    });

    // Armazenar anomalias
    anomalies.forEach(anomaly => {
      this.anomalies.set(anomaly.elementId, anomaly);
    });

    return anomalies;
  }

  /**
   * Valida classificação de incêndio
   */
  private isValidFireRating(rating: string): boolean {
    const validRatings = ['30min', '60min', '90min', '120min', '1h', '2h', '3h', '4h'];
    return validRatings.includes(rating);
  }

  /**
   * Gera sugestões de otimização
   */
  generateOptimizations(elements: ElementFeature[]): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];

    elements.forEach(element => {
      // Otimização de geometria
      if (element.geometry.volume > 1000) {
        suggestions.push({
          elementId: element.id,
          type: 'geometry',
          description: 'Elemento com volume excessivo',
          estimatedImpact: 30,
          action: 'Considerar subdividir elemento ou usar LOD',
        });
      }

      // Otimização de material
      if (!element.properties.material) {
        suggestions.push({
          elementId: element.id,
          type: 'material',
          description: 'Material não definido',
          estimatedImpact: 20,
          action: 'Definir material apropriado para cálculos',
        });
      }

      // Otimização de performance
      if (element.geometry.area > 500) {
        suggestions.push({
          elementId: element.id,
          type: 'performance',
          description: 'Elemento com área grande pode impactar performance',
          estimatedImpact: 15,
          action: 'Considerar simplificação ou instancing',
        });
      }
    });

    // Armazenar sugestões
    suggestions.forEach(suggestion => {
      this.suggestions.set(suggestion.elementId, suggestion);
    });

    return suggestions;
  }

  /**
   * Reconhece padrões em elementos
   */
  recognizePatterns(elements: ElementFeature[]): Record<string, number> {
    const patterns: Record<string, number> = {};

    // Padrão de grade regular
    const positions = elements.map(e => `${Math.round(e.location.x / 10)},${Math.round(e.location.z / 10)}`);
    const positionCounts = new Map<string, number>();
    positions.forEach(pos => {
      positionCounts.set(pos, (positionCounts.get(pos) || 0) + 1);
    });

    const regularGrid = Array.from(positionCounts.values()).filter(count => count > 3).length;
    patterns['regular_grid'] = regularGrid;

    // Padrão de repetição
    const types = elements.map(e => e.type);
    const typeCounts = new Map<string, number>();
    types.forEach(type => {
      typeCounts.set(type, (typeCounts.get(type) || 0) + 1);
    });

    const repetition = Array.from(typeCounts.values()).filter(count => count > 5).length;
    patterns['repetition'] = repetition;

    // Padrão de simetria
    const centerX = elements.reduce((sum, e) => sum + e.location.x, 0) / elements.length;
    const mirrored = elements.filter(e => Math.abs(e.location.x - centerX) < 1).length;
    patterns['symmetry'] = mirrored / elements.length;

    return patterns;
  }

  /**
   * Treina modelo com dados personalizados
   */
  trainModel(trainingData: { element: ElementFeature; category: string }[]): void {
    trainingData.forEach(({ element, category }) => {
      const types = this.classificationModel.get(category) || [];
      if (!types.includes(element.type)) {
        types.push(element.type);
        this.classificationModel.set(category, types);
      }
    });

    this.trained = true;
    console.log('[MLClassificationService] Model trained with', trainingData.length, 'samples');
  }

  /**
   * Retorna anomalias detectadas
   */
  getAnomalies(): AnomalyDetection[] {
    return Array.from(this.anomalies.values());
  }

  /**
   * Retorna sugestões de otimização
   */
  getOptimizations(): OptimizationSuggestion[] {
    return Array.from(this.suggestions.values());
  }

  /**
   * Limpa anomalias e sugestões
   */
  clearResults(): void {
    this.anomalies.clear();
    this.suggestions.clear();
    console.log('[MLClassificationService] Results cleared');
  }

  /**
   * Verifica se modelo está treinado
   */
  isTrained(): boolean {
    return this.trained;
  }

  /**
   * Limpa recursos
   */
  dispose(): void {
    this.classificationModel.clear();
    this.anomalies.clear();
    this.suggestions.clear();
    this.trained = false;
    console.log('[MLClassificationService] Disposed');
  }
}

// Singleton instance
let mlClassificationServiceInstance: MLClassificationService | null = null;

export function getMLClassificationService(): MLClassificationService {
  if (!mlClassificationServiceInstance) {
    mlClassificationServiceInstance = new MLClassificationService();
  }
  return mlClassificationServiceInstance;
}

export default MLClassificationService;
