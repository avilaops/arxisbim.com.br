/**
 * IFC Schedules Service
 * Análise de cronogramas e dados 4D (tempo)
 */
export interface IfcTask {
    taskId: string;
    name: string;
    description?: string;
    taskType?: string;
    status?: string;
    startDate?: Date;
    finishDate?: Date;
    duration?: number;
    isMilestone: boolean;
    relatedElements?: string[];
}
export interface IfcSchedule {
    scheduleId: string;
    name: string;
    description?: string;
    tasks: IfcTask[];
    totalDuration?: number;
}
export interface ScheduleAnalysis {
    totalTasks: number;
    totalMilestones: number;
    completedTasks: number;
    inProgressTasks: number;
    notStartedTasks: number;
    criticalPath?: string[];
    projectDuration?: number;
    phases: Array<{
        phaseName: string;
        taskCount: number;
        duration: number;
    }>;
}
export declare class IfcSchedulesService {
    /**
     * Extrai tarefas do cronograma
     */
    extractTasks(ifcContent: string): IfcTask[];
    /**
     * Extrai cronogramas (work schedules)
     */
    extractSchedules(ifcContent: string): IfcSchedule[];
    /**
     * Analisa cronograma do projeto
     */
    analyzeSchedule(tasks: IfcTask[]): ScheduleAnalysis;
    /**
     * Calcula progresso do cronograma
     */
    calculateProgress(tasks: IfcTask[]): {
        percentComplete: number;
        onSchedule: boolean;
        delayedTasks: string[];
        upcomingMilestones: IfcTask[];
    };
    /**
     * Extrai mapeamento 4D (elemento -> fase de construção)
     */
    extract4DMapping(ifcContent: string): Array<{
        elementId: string;
        taskId: string;
        phaseName?: string;
        plannedStart?: Date;
        plannedEnd?: Date;
    }>;
    /**
     * Analisa fases de construção
     */
    analyzeConstructionPhases(ifcContent: string): Array<{
        phaseName: string;
        elements: string[];
        startDate?: Date;
        endDate?: Date;
        duration?: number;
    }>;
    /**
     * Valida cronograma
     */
    validateSchedule(tasks: IfcTask[]): {
        isValid: boolean;
        issues: string[];
        recommendations: string[];
    };
    /**
     * Verifica se tarefa é milestone
     */
    private checkIsMilestone;
    /**
     * Extrai status da tarefa
     */
    private extractTaskStatus;
    /**
     * Extrai duração da tarefa (em dias)
     */
    private extractDuration;
    /**
     * Extrai elementos relacionados à tarefa
     */
    private extractRelatedElements;
    /**
     * Agrupa tarefas por fase
     */
    private groupTasksByPhase;
    /**
     * Calcula duração total do projeto
     */
    private calculateProjectDuration;
}
//# sourceMappingURL=ifc-schedules.service.d.ts.map