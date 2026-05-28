/**
 * IFC Schedules Service
 * Análise de cronogramas e dados 4D (tempo)
 */
export class IfcSchedulesService {
    /**
     * Extrai tarefas do cronograma
     */
    extractTasks(ifcContent) {
        const tasks = [];
        const taskPattern = /#(\d+)=IFCTASK\('([^']*)'[^)]*\)/g;
        let match;
        while ((match = taskPattern.exec(ifcContent)) !== null) {
            const taskId = `#${match[1]}`;
            tasks.push({
                taskId,
                name: match[2] || 'Unnamed Task',
                isMilestone: this.checkIsMilestone(ifcContent, taskId),
                status: this.extractTaskStatus(ifcContent, taskId),
                duration: this.extractDuration(ifcContent, taskId),
                relatedElements: this.extractRelatedElements(ifcContent, taskId),
            });
        }
        return tasks;
    }
    /**
     * Extrai cronogramas (work schedules)
     */
    extractSchedules(ifcContent) {
        const schedules = [];
        const schedulePattern = /#(\d+)=IFCWORKSCHEDULE\('([^']*)'[^)]*\)/g;
        let match;
        while ((match = schedulePattern.exec(ifcContent)) !== null) {
            const scheduleId = `#${match[1]}`;
            schedules.push({
                scheduleId,
                name: match[2] || 'Unnamed Schedule',
                tasks: [],
            });
        }
        return schedules;
    }
    /**
     * Analisa cronograma do projeto
     */
    analyzeSchedule(tasks) {
        const totalMilestones = tasks.filter((t) => t.isMilestone).length;
        const completedTasks = tasks.filter((t) => t.status === 'COMPLETED').length;
        const inProgressTasks = tasks.filter((t) => t.status === 'IN_PROGRESS').length;
        const notStartedTasks = tasks.filter((t) => t.status === 'NOT_STARTED').length;
        const phases = this.groupTasksByPhase(tasks);
        const projectDuration = this.calculateProjectDuration(tasks);
        return {
            totalTasks: tasks.length,
            totalMilestones,
            completedTasks,
            inProgressTasks,
            notStartedTasks,
            projectDuration,
            phases,
        };
    }
    /**
     * Calcula progresso do cronograma
     */
    calculateProgress(tasks) {
        const total = tasks.length;
        const completed = tasks.filter((t) => t.status === 'COMPLETED').length;
        const percentComplete = total > 0 ? (completed / total) * 100 : 0;
        const upcomingMilestones = tasks
            .filter((t) => t.isMilestone && t.status !== 'COMPLETED')
            .slice(0, 5);
        return {
            percentComplete,
            onSchedule: percentComplete >= 50, // Simplified
            delayedTasks: [],
            upcomingMilestones,
        };
    }
    /**
     * Extrai mapeamento 4D (elemento -> fase de construção)
     */
    extract4DMapping(ifcContent) {
        const mappings = [];
        // IFCRELASSIGNSTOTASK relaciona elementos com tarefas
        const pattern = /IFCRELASSIGNSTOTASK\([^,]*,[^,]*,\(([^)]+)\),[^,]*,([^,\)]+)/g;
        let match;
        while ((match = pattern.exec(ifcContent)) !== null) {
            const elementIds = match[1].split(',').map((id) => id.trim());
            const taskId = match[2].trim();
            for (const elementId of elementIds) {
                mappings.push({
                    elementId,
                    taskId,
                });
            }
        }
        return mappings;
    }
    /**
     * Analisa fases de construção
     */
    analyzeConstructionPhases(ifcContent) {
        const phases = [];
        // Simplified - extract from IFCRELASSIGNSTOTASK
        const mapping = this.extract4DMapping(ifcContent);
        // Group by task (phase)
        const byTask = {};
        for (const map of mapping) {
            if (!byTask[map.taskId]) {
                byTask[map.taskId] = [];
            }
            byTask[map.taskId].push(map.elementId);
        }
        for (const [taskId, elements] of Object.entries(byTask)) {
            phases.push({
                phaseName: `Phase ${taskId}`,
                elements,
            });
        }
        return phases;
    }
    /**
     * Valida cronograma
     */
    validateSchedule(tasks) {
        const issues = [];
        const recommendations = [];
        if (tasks.length === 0) {
            issues.push('No tasks found in schedule');
            recommendations.push('Add tasks to the project schedule');
        }
        const tasksNoDuration = tasks.filter((t) => !t.duration && !t.isMilestone);
        if (tasksNoDuration.length > 0) {
            issues.push(`${tasksNoDuration.length} tasks without duration`);
            recommendations.push('Assign durations to all non-milestone tasks');
        }
        const tasksNoDates = tasks.filter((t) => !t.startDate || !t.finishDate);
        if (tasksNoDates.length > 0) {
            issues.push(`${tasksNoDates.length} tasks without start/finish dates`);
            recommendations.push('Define start and finish dates for all tasks');
        }
        return {
            isValid: issues.length === 0,
            issues,
            recommendations,
        };
    }
    /**
     * Verifica se tarefa é milestone
     */
    checkIsMilestone(ifcContent, taskId) {
        const pattern = new RegExp(`${taskId}[^#]*IFCPROPERTYSINGLEVALUE\\('IsMilestone'[^,]*,\\.T\\.`, 'i');
        return pattern.test(ifcContent);
    }
    /**
     * Extrai status da tarefa
     */
    extractTaskStatus(ifcContent, taskId) {
        const pattern = new RegExp(`${taskId}[^#]*IFCPROPERTYSINGLEVALUE\\('Status'[^,]*,'([^']+)'`, 'i');
        const match = ifcContent.match(pattern);
        if (!match)
            return 'NOT_STARTED';
        const status = match[1].toUpperCase();
        if (status.includes('COMPLETE'))
            return 'COMPLETED';
        if (status.includes('PROGRESS'))
            return 'IN_PROGRESS';
        return 'NOT_STARTED';
    }
    /**
     * Extrai duração da tarefa (em dias)
     */
    extractDuration(ifcContent, taskId) {
        const pattern = new RegExp(`${taskId}[^#]*IFCDURATION\\([^,]*,([0-9.]+)`, 'i');
        const match = ifcContent.match(pattern);
        return match ? parseFloat(match[1]) : undefined;
    }
    /**
     * Extrai elementos relacionados à tarefa
     */
    extractRelatedElements(ifcContent, taskId) {
        const elements = [];
        const pattern = new RegExp(`IFCRELASSIGNSTOTASK\\([^,]*,[^,]*,\\(([^)]+)\\),[^,]*,${taskId}`, 'g');
        let match;
        while ((match = pattern.exec(ifcContent)) !== null) {
            const elementIds = match[1].split(',').map((id) => id.trim());
            elements.push(...elementIds);
        }
        return elements;
    }
    /**
     * Agrupa tarefas por fase
     */
    groupTasksByPhase(tasks) {
        // Simplified - group by task name prefix
        const phases = {};
        for (const task of tasks) {
            const phase = task.name.split('-')[0].trim() || 'General';
            if (!phases[phase]) {
                phases[phase] = { count: 0, duration: 0 };
            }
            phases[phase].count++;
            phases[phase].duration += task.duration || 0;
        }
        return Object.entries(phases).map(([phaseName, data]) => ({
            phaseName,
            taskCount: data.count,
            duration: data.duration,
        }));
    }
    /**
     * Calcula duração total do projeto
     */
    calculateProjectDuration(tasks) {
        let totalDuration = 0;
        for (const task of tasks) {
            if (task.duration) {
                totalDuration += task.duration;
            }
        }
        return totalDuration;
    }
}
//# sourceMappingURL=ifc-schedules.service.js.map