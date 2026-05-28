import { tenantService } from '../../api/v1/services/tenant.service';

class SchedulingPanel {
  constructor() {
    this.isOpen = false;
    this.projectId = null;
    this.schedules = [];
    this.selectedSchedule = null;
    this.tasks = [];
    this.loading = false;
    this.error = null;
  }

  open(projectId) {
    this.projectId = projectId;
    this.isOpen = true;
    this.loadSchedules();
    this.render();
  }

  close() {
    this.isOpen = false;
    this.render();
  }

  async loadSchedules() {
    this.loading = true;
    this.error = null;
    this.render();

    try {
      this.schedules = await tenantService.getSchedules(this.projectId);
    } catch (err) {
      this.error = 'Failed to load schedules';
      console.error('Failed to load schedules:', err);
    } finally {
      this.loading = false;
      this.render();
    }
  }

  async loadTasks(scheduleId) {
    this.loading = true;
    this.error = null;
    this.render();

    try {
      this.tasks = await tenantService.getScheduleTasks(scheduleId);
    } catch (err) {
      this.error = 'Failed to load tasks';
      console.error('Failed to load tasks:', err);
    } finally {
      this.loading = false;
      this.render();
    }
  }

  async createSchedule() {
    const name = prompt('Nome do cronograma:');
    if (!name) return;

    const startDate = prompt('Data de início (YYYY-MM-DD):');
    if (!startDate) return;

    const endDate = prompt('Data de fim (YYYY-MM-DD):');
    if (!endDate) return;

    const description = prompt('Descrição (opcional):') || undefined;

    const userStr = localStorage.getItem('arxisvr_user');
    const user = userStr ? JSON.parse(userStr) : null;
    if (!user) {
      alert('Usuário não autenticado');
      return;
    }

    this.loading = true;
    this.error = null;
    this.render();

    try {
      const newSchedule = await tenantService.createSchedule(this.projectId, {
        name,
        description,
        startDate,
        endDate,
        createdBy: user.id,
      });
      this.schedules.push(newSchedule);
      this.selectedSchedule = newSchedule.id;
      await this.loadTasks(newSchedule.id);
    } catch (err) {
      this.error = 'Failed to create schedule';
      console.error('Failed to create schedule:', err);
      this.loading = false;
      this.render();
    }
  }

  async createTask() {
    if (!this.selectedSchedule) {
      alert('Selecione um cronograma primeiro');
      return;
    }

    const taskName = prompt('Nome da tarefa:');
    if (!taskName) return;

    const startDate = prompt('Data de início (YYYY-MM-DD):');
    if (!startDate) return;

    const endDate = prompt('Data de fim (YYYY-MM-DD):');
    if (!endDate) return;

    const progress = prompt('Progresso (0-100):');
    const progressNum = progress ? parseInt(progress) : 0;

    this.loading = true;
    this.error = null;
    this.render();

    try {
      const newTask = await tenantService.createTask(this.selectedSchedule, {
        taskName,
        startDate,
        endDate,
        progress: progressNum,
      });
      this.tasks.push(newTask);
      this.loading = false;
      this.render();
    } catch (err) {
      this.error = 'Failed to create task';
      console.error('Failed to create task:', err);
      this.loading = false;
      this.render();
    }
  }

  async updateTaskProgress(taskId, newProgress) {
    this.loading = true;
    this.error = null;
    this.render();

    try {
      await tenantService.updateTask(taskId, { progress: newProgress });
      await this.loadTasks(this.selectedSchedule);
    } catch (err) {
      this.error = 'Failed to update task';
      console.error('Failed to update task:', err);
      this.loading = false;
      this.render();
    }
  }

  async deleteSchedule(scheduleId) {
    if (!confirm('Deletar este cronograma?')) return;

    this.loading = true;
    this.error = null;
    this.render();

    try {
      await tenantService.deleteSchedule(scheduleId);
      await this.loadSchedules();
      if (this.selectedSchedule === scheduleId) {
        this.selectedSchedule = null;
        this.tasks = [];
      }
    } catch (err) {
      this.error = 'Failed to delete schedule';
      console.error('Failed to delete schedule:', err);
      this.loading = false;
      this.render();
    }
  }

  async deleteTask(taskId) {
    if (!confirm('Deletar esta tarefa?')) return;

    this.loading = true;
    this.error = null;
    this.render();

    try {
      await tenantService.deleteTask(taskId);
      await this.loadTasks(this.selectedSchedule);
    } catch (err) {
      this.error = 'Failed to delete task';
      console.error('Failed to delete task:', err);
      this.loading = false;
      this.render();
    }
  }

  selectSchedule(scheduleId) {
    this.selectedSchedule = scheduleId;
    this.loadTasks(scheduleId);
  }

  render() {
    let container = document.getElementById('scheduling-panel-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'scheduling-panel-container';
      document.body.appendChild(container);
    }

    if (!this.isOpen) {
      container.innerHTML = '';
      return;
    }

    const selectedSchedule = this.schedules.find(s => s.id === this.selectedSchedule);

    let html = `
      <div style="
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
      ">
        <div style="
          background: var(--bg-primary);
          border-radius: 12px;
          padding: 32px;
          width: 1000px;
          max-width: 95%;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
        ">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
            <h2 style="margin: 0; font-size: 24px; color: var(--text-primary);">
              BIM 4D - Cronograma
            </h2>
            <button id="scheduling-close" style="
              background: none;
              border: none;
              color: var(--text-secondary);
              font-size: 24px;
              cursor: pointer;
              padding: 0;
              width: 32px;
              height: 32px;
            ">×</button>
          </div>
    `;

    if (this.error) {
      html += `
        <div style="
          padding: 12px;
          background: var(--accent-red);
          color: white;
          border-radius: 8px;
          margin-bottom: 16px;
          font-size: 14px;
        ">
          ${this.error}
        </div>
      `;
    }

    // Schedules list
    html += `
      <div style="display: flex; gap: 16px; margin-bottom: 24px;">
        <div style="flex: 1; border: 1px solid var(--border-color); border-radius: 8px; padding: 16px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
            <h3 style="margin: 0; font-size: 16px; color: var(--text-primary);">Cronogramas</h3>
            <button id="scheduling-create" style="
              padding: 6px 12px;
              background: var(--accent-blue);
              color: white;
              border: none;
              border-radius: 4px;
              cursor: pointer;
              font-size: 12px;
            ">+ Criar</button>
          </div>
    `;

    if (this.loading) {
      html += `<p style="color: var(--text-secondary);">Carregando...</p>`;
    } else if (this.schedules.length === 0) {
      html += `<p style="color: var(--text-secondary);">Nenhum cronograma</p>`;
    } else {
      this.schedules.forEach(schedule => {
        html += `
          <div style="
            padding: 12px;
            border: 1px solid ${this.selectedSchedule === schedule.id ? 'var(--accent-blue)' : 'var(--border-color)'};
            border-radius: 6px;
            margin-bottom: 8px;
            cursor: pointer;
            background: ${this.selectedSchedule === schedule.id ? 'var(--bg-secondary)' : 'transparent'};
          " class="schedule-item" data-id="${schedule.id}">
            <div style="font-weight: 600; color: var(--text-primary);">${schedule.name}</div>
            <div style="font-size: 12px; color: var(--text-secondary);">${schedule.startDate} → ${schedule.endDate}</div>
          </div>
        `;
      });
    }

    html += `
        </div>
    `;

    // Tasks for selected schedule
    if (selectedSchedule) {
      html += `
        <div style="flex: 2; border: 1px solid var(--border-color); border-radius: 8px; padding: 16px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
            <h3 style="margin: 0; font-size: 16px; color: var(--text-primary);">${selectedSchedule.name} - Tarefas</h3>
            <div style="display: flex; gap: 8px;">
              <button id="task-create" style="
                padding: 6px 12px;
                background: var(--accent-blue);
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 12px;
              ">+ Tarefa</button>
              <button class="schedule-delete" data-id="${selectedSchedule.id}" style="
                padding: 6px 12px;
                background: var(--accent-red);
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 12px;
              ">Deletar</button>
            </div>
          </div>
      `;

      if (this.tasks.length === 0) {
        html += `<p style="color: var(--text-secondary);">Nenhuma tarefa</p>`;
      } else {
        html += `<div style="max-height: 400px; overflow-y: auto;">`;
        this.tasks.forEach(task => {
          html += `
            <div style="
              padding: 12px;
              border: 1px solid var(--border-color);
              border-radius: 6px;
              margin-bottom: 8px;
            ">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <div style="font-weight: 600; color: var(--text-primary);">${task.taskName}</div>
                <button class="task-delete" data-id="${task.id}" style="
                  padding: 4px 8px;
                  background: var(--accent-red);
                  color: white;
                  border: none;
                  border-radius: 4px;
                  cursor: pointer;
                  font-size: 12px;
                ">×</button>
              </div>
              <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 8px;">
                ${task.startDate} → ${task.endDate}
              </div>
              <div style="display: flex; align-items: center; gap: 8px;">
                <div style="flex: 1; height: 8px; background: var(--bg-secondary); border-radius: 4px; overflow: hidden;">
                  <div style="width: ${task.progress}%; height: 100%; background: var(--accent-blue);"></div>
                </div>
                <span style="font-size: 12px; color: var(--text-secondary); width: 40px;">${task.progress}%</span>
                <input type="number" class="task-progress" data-id="${task.id}" value="${task.progress}" min="0" max="100" style="
                  width: 60px;
                  padding: 4px;
                  border: 1px solid var(--border-color);
                  border-radius: 4px;
                  font-size: 12px;
                ">
              </div>
            </div>
          `;
        });
        html += `</div>`;
      }

      html += `
        </div>
      `;
    } else {
      html += `
        <div style="flex: 2; border: 1px solid var(--border-color); border-radius: 8px; padding: 16px; display: flex; align-items: center; justify-content: center;">
          <p style="color: var(--text-secondary);">Selecione um cronograma</p>
        </div>
      `;
    }

    html += `
      </div>
        </div>
      </div>
    `;

    container.innerHTML = html;

    // Attach event listeners
    document.getElementById('scheduling-close')?.addEventListener('click', () => this.close());
    document.getElementById('scheduling-create')?.addEventListener('click', () => this.createSchedule());
    document.getElementById('task-create')?.addEventListener('click', () => this.createTask());

    container.querySelectorAll('.schedule-item').forEach(item => {
      item.addEventListener('click', () => this.selectSchedule(item.dataset.id));
    });

    container.querySelectorAll('.schedule-delete').forEach(btn => {
      btn.addEventListener('click', () => this.deleteSchedule(btn.dataset.id));
    });

    container.querySelectorAll('.task-delete').forEach(btn => {
      btn.addEventListener('click', () => this.deleteTask(btn.dataset.id));
    });

    container.querySelectorAll('.task-progress').forEach(input => {
      input.addEventListener('change', (e) => {
        const newProgress = parseInt(e.target.value);
        if (newProgress >= 0 && newProgress <= 100) {
          this.updateTaskProgress(input.dataset.id, newProgress);
        }
      });
    });

    // Close on backdrop click
    container.querySelector('div').addEventListener('click', (e) => {
      if (e.target === container.querySelector('div')) {
        this.close();
      }
    });
  }
}

export { SchedulingPanel };
