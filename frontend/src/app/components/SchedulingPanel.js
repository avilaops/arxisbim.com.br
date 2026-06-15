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
    this.showCreateInput = false;
    this.showCreateTaskInput = false;
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
    this.showCreateInput = true;
    this.render();
  }

  async confirmCreateSchedule(data) {
    if (!data.name || !data.startDate || !data.endDate) {
      this.showCreateInput = false;
      this.render();
      return;
    }

    const userStr = localStorage.getItem('arxisvr_user');
    const user = userStr ? JSON.parse(userStr) : null;
    if (!user) {
      this.error = 'Usuário não autenticado';
      this.showCreateInput = false;
      this.render();
      return;
    }

    this.loading = true;
    this.error = null;
    this.showCreateInput = false;
    this.render();

    try {
      const newSchedule = await tenantService.createSchedule(this.projectId, {
        name: data.name,
        description: data.description,
        startDate: data.startDate,
        endDate: data.endDate,
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
      this.error = 'Selecione um cronograma primeiro';
      this.render();
      return;
    }
    this.showCreateTaskInput = true;
    this.render();
  }

  async confirmCreateTask(data) {
    if (!data.taskName || !data.startDate || !data.endDate) {
      this.showCreateTaskInput = false;
      this.render();
      return;
    }

    const progressNum = data.progress ? parseInt(data.progress) : 0;

    this.loading = true;
    this.error = null;
    this.showCreateTaskInput = false;
    this.render();

    try {
      const newTask = await tenantService.createTask(this.selectedSchedule, {
        taskName: data.taskName,
        startDate: data.startDate,
        endDate: data.endDate,
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
    // TODO: Add custom confirmation UI
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
    // TODO: Add custom confirmation UI
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

    if (this.showCreateInput) {
      html += `
        <div style="padding: 12px; background: var(--bg-secondary); border-radius: 6px; margin-bottom: 16px;">
          <div style="font-size: 13px; color: var(--text-primary); margin-bottom: 8px;">Criar Cronograma</div>
          <div style="display: flex; flex-direction: column; gap: 8px;">
            <input type="text" id="schedule-name" placeholder="Nome" style="
              padding: 8px;
              border: 1px solid var(--border-color);
              border-radius: 4px;
              background: var(--bg-primary);
              color: var(--text-primary);
              font-size: 13px;
            " />
            <input type="date" id="schedule-start" placeholder="Data de início" style="
              padding: 8px;
              border: 1px solid var(--border-color);
              border-radius: 4px;
              background: var(--bg-primary);
              color: var(--text-primary);
              font-size: 13px;
            " />
            <input type="date" id="schedule-end" placeholder="Data de fim" style="
              padding: 8px;
              border: 1px solid var(--border-color);
              border-radius: 4px;
              background: var(--bg-primary);
              color: var(--text-primary);
              font-size: 13px;
            " />
            <input type="text" id="schedule-desc" placeholder="Descrição (opcional)" style="
              padding: 8px;
              border: 1px solid var(--border-color);
              border-radius: 4px;
              background: var(--bg-primary);
              color: var(--text-primary);
              font-size: 13px;
            " />
            <div style="display: flex; gap: 8px;">
              <button id="schedule-create-confirm" style="
                padding: 8px 16px;
                background: var(--accent-blue);
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 13px;
              ">Criar</button>
              <button id="schedule-create-cancel" style="
                padding: 8px 16px;
                background: var(--bg-secondary);
                color: var(--text-primary);
                border: 1px solid var(--border-color);
                border-radius: 4px;
                cursor: pointer;
                font-size: 13px;
              ">Cancelar</button>
            </div>
          </div>
        </div>
      `;
    }

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
              <button class="schedule-simulate-4d" data-id="${selectedSchedule.id}" data-name="${selectedSchedule.name}" style="
                padding: 6px 12px;
                background: var(--accent-green, #16a34a);
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 12px;
              ">🎬 Simular 4D</button>
              <button class="schedule-simulate-split" data-id="${selectedSchedule.id}" data-name="${selectedSchedule.name}" style="
                padding: 6px 12px;
                background: var(--accent-purple, #7c3aed);
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 12px;
              ">⇆ Planejado×Realizado</button>
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

      if (this.showCreateTaskInput) {
        html += `
          <div style="padding: 12px; background: var(--bg-secondary); border-radius: 6px; margin-bottom: 16px;">
            <div style="font-size: 13px; color: var(--text-primary); margin-bottom: 8px;">Criar Tarefa</div>
            <div style="display: flex; flex-direction: column; gap: 8px;">
              <input type="text" id="task-name" placeholder="Nome da tarefa" style="
                padding: 8px;
                border: 1px solid var(--border-color);
                border-radius: 4px;
                background: var(--bg-primary);
                color: var(--text-primary);
                font-size: 13px;
              " />
              <input type="date" id="task-start" placeholder="Data de início" style="
                padding: 8px;
                border: 1px solid var(--border-color);
                border-radius: 4px;
                background: var(--bg-primary);
                color: var(--text-primary);
                font-size: 13px;
              " />
              <input type="date" id="task-end" placeholder="Data de fim" style="
                padding: 8px;
                border: 1px solid var(--border-color);
                border-radius: 4px;
                background: var(--bg-primary);
                color: var(--text-primary);
                font-size: 13px;
              " />
              <input type="number" id="task-progress" placeholder="Progresso (0-100)" min="0" max="100" style="
                padding: 8px;
                border: 1px solid var(--border-color);
                border-radius: 4px;
                background: var(--bg-primary);
                color: var(--text-primary);
                font-size: 13px;
              " />
              <div style="display: flex; gap: 8px;">
                <button id="task-create-confirm" style="
                  padding: 8px 16px;
                  background: var(--accent-blue);
                  color: white;
                  border: none;
                  border-radius: 4px;
                  cursor: pointer;
                  font-size: 13px;
                ">Criar</button>
                <button id="task-create-cancel" style="
                  padding: 8px 16px;
                  background: var(--bg-secondary);
                  color: var(--text-primary);
                  border: 1px solid var(--border-color);
                  border-radius: 4px;
                  cursor: pointer;
                  font-size: 13px;
                ">Cancelar</button>
              </div>
            </div>
          </div>
        `;
      }

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

    // Create schedule input handlers
    document.getElementById('schedule-create-confirm')?.addEventListener('click', () => {
      const name = document.getElementById('schedule-name')?.value;
      const startDate = document.getElementById('schedule-start')?.value;
      const endDate = document.getElementById('schedule-end')?.value;
      const description = document.getElementById('schedule-desc')?.value;
      this.confirmCreateSchedule({ name, startDate, endDate, description });
    });
    document.getElementById('schedule-create-cancel')?.addEventListener('click', () => {
      this.showCreateInput = false;
      this.render();
    });

    // Create task input handlers
    document.getElementById('task-create-confirm')?.addEventListener('click', () => {
      const taskName = document.getElementById('task-name')?.value;
      const startDate = document.getElementById('task-start')?.value;
      const endDate = document.getElementById('task-end')?.value;
      const progress = document.getElementById('task-progress')?.value;
      this.confirmCreateTask({ taskName, startDate, endDate, progress });
    });
    document.getElementById('task-create-cancel')?.addEventListener('click', () => {
      this.showCreateTaskInput = false;
      this.render();
    });

    container.querySelectorAll('.schedule-item').forEach(item => {
      item.addEventListener('click', () => this.selectSchedule(item.dataset.id));
    });

    container.querySelectorAll('.schedule-delete').forEach(btn => {
      btn.addEventListener('click', () => this.deleteSchedule(btn.dataset.id));
    });

    // S35: iniciar simulação 4D no viewer (auto-mapeia elementos e abre overlay)
    container.querySelectorAll('.schedule-simulate-4d').forEach(btn => {
      btn.addEventListener('click', async () => {
        const start = window.__startSchedule4D;
        if (!start) {
          this.error = 'Simulação 4D indisponível — abra um modelo IFC primeiro.';
          this.render();
          return;
        }
        const handle = await start(btn.dataset.id, { autoMatch: true, projectName: btn.dataset.name });
        if (handle) {
          this.close(); // fecha o modal para revelar o viewer + overlay 4D
        } else {
          this.error = 'Não foi possível iniciar a simulação 4D. Verifique se há um modelo carregado.';
          this.render();
        }
      });
    });

    // S35: comparação Planejado×Realizado lado a lado
    container.querySelectorAll('.schedule-simulate-split').forEach(btn => {
      btn.addEventListener('click', async () => {
        const start = window.__startSchedule4DSplit;
        if (!start) {
          this.error = 'Comparação 4D indisponível — abra um modelo IFC primeiro.';
          this.render();
          return;
        }
        const handle = await start(btn.dataset.id, { autoMatch: true, projectName: btn.dataset.name });
        if (handle) {
          this.close();
        } else {
          this.error = 'Não foi possível iniciar a comparação 4D. Verifique se há um modelo carregado.';
          this.render();
        }
      });
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
