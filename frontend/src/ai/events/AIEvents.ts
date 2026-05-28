/**
 * AI Events - Eventos do sistema de IA
 */

export enum AIEventType {
  // AI Lifecycle
  AI_INITIALIZED = 'AI_INITIALIZED',
  AI_STARTED = 'AI_STARTED',
  AI_STOPPED = 'AI_STOPPED',
  
  // NPC Events
  NPC_CREATED = 'NPC_CREATED',
  NPC_UPDATED = 'NPC_UPDATED',
  NPC_DESTROYED = 'NPC_DESTROYED',
  
  // Behavior Events
  BEHAVIOR_CHANGED = 'BEHAVIOR_CHANGED',
  TARGET_ACQUIRED = 'TARGET_ACQUIRED',
  TARGET_LOST = 'TARGET_LOST',
  
  // Learning Events
  FEATURE_EXTRACTED = 'FEATURE_EXTRACTED',
  PREDICTION_MADE = 'PREDICTION_MADE',
  MODEL_UPDATED = 'MODEL_UPDATED'
}

export interface AIEventData {
  [AIEventType.AI_INITIALIZED]: { timestamp: number };
  [AIEventType.AI_STARTED]: { timestamp: number };
  [AIEventType.AI_STOPPED]: { timestamp: number };
  
  [AIEventType.NPC_CREATED]: { npcId: string; data: any };
  [AIEventType.NPC_UPDATED]: { npcId: string; state: any };
  [AIEventType.NPC_DESTROYED]: { npcId: string };
  
  [AIEventType.BEHAVIOR_CHANGED]: { npcId: string; behavior: string };
  [AIEventType.TARGET_ACQUIRED]: { npcId: string; targetId: string };
  [AIEventType.TARGET_LOST]: { npcId: string; targetId: string };
  
  [AIEventType.FEATURE_EXTRACTED]: { features: number[]; source: string };
  [AIEventType.PREDICTION_MADE]: { prediction: any; confidence: number };
  [AIEventType.MODEL_UPDATED]: { modelId: string; accuracy: number };
}
