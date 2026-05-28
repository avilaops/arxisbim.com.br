/**
 * ArxisVR - BIM 4D Schedule Visualization
 * Copyright © 2024-2026 AvilaOps. All Rights Reserved.
 * 
 * PROPRIETARY SOFTWARE - Unauthorized copying, modification, distribution,
 * or use of this software is strictly prohibited.
 * 
 * For licensing information, contact: licensing@avilaops.com
 */

/**
 * BIM 4D Schedule Visualization - Type Definitions
 * 
 * Tipos e interfaces para o sistema de cronograma 4D integrado ao BIM
 * 
 * @module bim/4d/types
 */

/**
 * Status de uma tarefa no cronograma
 */
export type TaskStatus = 'not-started' | 'in-progress' | 'completed' | 'delayed';

/**
 * Estado de visibilidade temporal de um elemento
 */
export type VisibilityState = 'hidden' | 'constructing' | 'visible';

/**
 * Representa uma tarefa individual no cronograma de construção
 */
export interface Task {
  /** ID único da tarefa */
  id: string;
  
  /** Nome descritivo da tarefa */
  name: string;
  
  /** Data de início planejada */
  startDate: Date;
  
  /** Data de término planejada */
  endDate: Date;
  
  /** Duração em dias */
  duration: number;
  
  /** IDs das tarefas predecessoras */
  predecessors: string[];
  
  /** GUIDs dos elementos IFC associados a esta tarefa */
  ifcGuids: string[];
  
  /** Status atual da tarefa */
  status: TaskStatus;
  
  /** Metadados adicionais (opcionais) */
  metadata?: Record<string, unknown>;
}

/**
 * Dados completos de um cronograma de projeto
 */
export interface ScheduleData {
  /** Nome do projeto */
  projectName: string;
  
  /** Data de início do projeto */
  startDate: Date;
  
  /** Data de término do projeto */
  endDate: Date;
  
  /** Lista de todas as tarefas do cronograma */
  tasks: Task[];
  
  /** Metadados adicionais do cronograma */
  metadata?: {
    source?: string; // 'MS Project', 'Primavera P6', 'CSV', etc.
    version?: string;
    author?: string;
    [key: string]: unknown;
  };
}

/**
 * Configuração para o sistema de timeline 4D
 */
export interface Timeline4DConfig {
  /** Iniciar reprodução automaticamente ao carregar */
  autoPlay?: boolean;
  
  /** Velocidade de reprodução (1.0 = tempo real, 10.0 = 10x mais rápido) */
  speed?: number;
  
  /** Duração da transição de visibilidade em milissegundos */
  transitionDuration?: number;
  
  /** Habilitar loop da timeline */
  loopEnabled?: boolean;
  
  /** Data inicial da simulação (se não especificado, usa startDate do cronograma) */
  initialDate?: Date;
}

/**
 * Evento emitido quando a data da timeline muda
 */
export interface TimelineChangeEvent {
  /** Data atual da timeline */
  currentDate: Date;
  
  /** Progresso percentual (0-100) */
  progress: number;
  
  /** Tarefas ativas nesta data */
  activeTasks: Task[];
}

/**
 * Evento emitido quando o cronograma é carregado
 */
export interface ScheduleLoadedEvent {
  /** Cronograma carregado */
  schedule: ScheduleData;
  
  /** Número de tarefas carregadas */
  taskCount: number;
  
  /** Número de elementos IFC associados */
  linkedElementsCount: number;
}

/**
 * Formato CSV simplificado para importação de cronogramas
 */
export interface ScheduleCSVRow {
  taskId: string;
  name: string;
  start: string; // ISO date string
  end: string;   // ISO date string
  ifcGuids: string; // Comma-separated GUIDs
  predecessors?: string; // Comma-separated task IDs
}

/**
 * Opções para vinculação manual de elementos a tarefas
 */
export interface LinkElementOptions {
  /** Substituir links existentes */
  replace?: boolean;
  
  /** Validar se GUIDs existem no modelo carregado */
  validate?: boolean;
}

/**
 * Resultado da validação de um cronograma
 */
export interface ScheduleValidationResult {
  /** Indica se o cronograma é válido */
  isValid: boolean;
  
  /** Lista de erros encontrados */
  errors: string[];
  
  /** Lista de warnings */
  warnings: string[];
  
  /** Estatísticas do cronograma */
  stats: {
    totalTasks: number;
    tasksWithElements: number;
    tasksWithoutElements: number;
    totalLinkedElements: number;
    invalidGuids: string[];
  };
}
