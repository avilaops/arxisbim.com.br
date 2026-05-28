import { tenantService } from '../../api/v1/services/tenant.service';

class MeetingsPanel {
  constructor() {
    this.isOpen = false;
    this.projectId = null;
    this.meetings = [];
    this.selectedMeeting = null;
    this.participants = [];
    this.messages = [];
    this.loading = false;
    this.error = null;
  }

  open(projectId) {
    this.projectId = projectId;
    this.isOpen = true;
    this.loadMeetings();
    this.render();
  }

  close() {
    this.isOpen = false;
    this.render();
  }

  async loadMeetings() {
    this.loading = true;
    this.error = null;
    this.render();

    try {
      this.meetings = await tenantService.getProjectMeetingRooms(this.projectId);
    } catch (err) {
      this.error = 'Failed to load meetings';
      console.error('Failed to load meetings:', err);
    } finally {
      this.loading = false;
      this.render();
    }
  }

  async createMeeting() {
    const name = prompt('Nome da reunião:');
    if (!name) return;

    this.loading = true;
    this.error = null;
    this.render();

    try {
      const newMeeting = await tenantService.createMeetingRoom(this.projectId, {
        settings: {
          maxParticipants: 10,
          allowRecording: true,
          allowChat: true,
        },
        avatarSettings: {
          allowCustomAvatars: true,
        },
      });
      this.meetings.push(newMeeting);
      this.selectedMeeting = newMeeting.id;
      await this.loadMeetingDetails(newMeeting.id);
    } catch (err) {
      this.error = 'Failed to create meeting';
      console.error('Failed to create meeting:', err);
      this.loading = false;
      this.render();
    }
  }

  async loadMeetingDetails(meetingId) {
    this.loading = true;
    this.error = null;
    this.render();

    try {
      const [participants, messages] = await Promise.all([
        tenantService.getMeetingParticipants(meetingId),
        tenantService.getMeetingMessages(meetingId),
      ]);
      this.participants = participants;
      this.messages = messages;
    } catch (err) {
      this.error = 'Failed to load meeting details';
      console.error('Failed to load meeting details:', err);
    } finally {
      this.loading = false;
      this.render();
    }
  }

  async joinMeeting(meetingId) {
    this.selectedMeeting = meetingId;
    await this.loadMeetingDetails(meetingId);
  }

  async endMeeting(meetingId) {
    if (!confirm('Encerrar esta reunião?')) return;

    this.loading = true;
    this.error = null;
    this.render();

    try {
      await tenantService.endMeetingRoom(meetingId);
      await this.loadMeetings();
      this.selectedMeeting = null;
      this.participants = [];
      this.messages = [];
    } catch (err) {
      this.error = 'Failed to end meeting';
      console.error('Failed to end meeting:', err);
      this.loading = false;
      this.render();
    }
  }

  selectMeeting(meetingId) {
    this.selectedMeeting = meetingId;
    this.loadMeetingDetails(meetingId);
  }

  render() {
    let container = document.getElementById('meetings-panel-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'meetings-panel-container';
      document.body.appendChild(container);
    }

    if (!this.isOpen) {
      container.innerHTML = '';
      return;
    }

    const selectedMeeting = this.meetings.find(m => m.id === this.selectedMeeting);

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
              Reuniões XR - Avatares
            </h2>
            <button id="meetings-close" style="
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

    // Meetings list
    html += `
      <div style="display: flex; gap: 16px; margin-bottom: 24px;">
        <div style="flex: 1; border: 1px solid var(--border-color); border-radius: 8px; padding: 16px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
            <h3 style="margin: 0; font-size: 16px; color: var(--text-primary);">Salas de Reunião</h3>
            <button id="meetings-create" style="
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
    } else if (this.meetings.length === 0) {
      html += `<p style="color: var(--text-secondary);">Nenhuma sala de reunião</p>`;
    } else {
      this.meetings.forEach(meeting => {
        html += `
          <div style="
            padding: 12px;
            border: 1px solid ${this.selectedMeeting === meeting.id ? 'var(--accent-blue)' : 'var(--border-color)'};
            border-radius: 6px;
            margin-bottom: 8px;
            cursor: pointer;
            background: ${this.selectedMeeting === meeting.id ? 'var(--bg-secondary)' : 'transparent'};
          " class="meeting-item" data-id="${meeting.id}">
            <div style="font-weight: 600; color: var(--text-primary);">Sala ${meeting.id.substring(0, 8)}...</div>
            <div style="font-size: 12px; color: var(--text-secondary);">
              Código: ${meeting.meetingCode} | ${meeting.isActive ? 'Ativa' : 'Inativa'}
            </div>
          </div>
        `;
      });
    }

    html += `
        </div>
    `;

    // Selected meeting details
    if (selectedMeeting) {
      html += `
        <div style="flex: 2; border: 1px solid var(--border-color); border-radius: 8px; padding: 16px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
            <h3 style="margin: 0; font-size: 16px; color: var(--text-primary);">Detalhes da Sala</h3>
            <button class="meeting-end" data-id="${selectedMeeting.id}" style="
              padding: 6px 12px;
              background: var(--accent-red);
              color: white;
              border: none;
              border-radius: 4px;
              cursor: pointer;
              font-size: 12px;
            ">Encerrar</button>
          </div>
          
          <div style="margin-bottom: 16px;">
            <div style="font-size: 14px; font-weight: 600; color: var(--text-primary); margin-bottom: 8px;">
              Código de Acesso: <span style="background: var(--bg-secondary); padding: 4px 8px; border-radius: 4px;">${selectedMeeting.meetingCode}</span>
            </div>
            <div style="font-size: 12px; color: var(--text-secondary);">
              Compartilhe este código para convidar outros participantes
            </div>
          </div>

          <div style="margin-bottom: 16px;">
            <h4 style="margin: 0 0 8px 0; font-size: 14px; color: var(--text-primary);">Participantes (${this.participants.length})</h4>
      `;

      if (this.participants.length === 0) {
        html += `<p style="color: var(--text-secondary); font-size: 13px;">Nenhum participante</p>`;
      } else {
        html += `<div style="max-height: 150px; overflow-y: auto;">`;
        this.participants.forEach(participant => {
          html += `
            <div style="
              padding: 8px;
              border: 1px solid var(--border-color);
              border-radius: 4px;
              margin-bottom: 4px;
              display: flex;
              align-items: center;
              gap: 8px;
            ">
              <div style="width: 32px; height: 32px; background: var(--accent-blue); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 12px;">
                ${participant.userName.charAt(0).toUpperCase()}
              </div>
              <div>
                <div style="font-size: 13px; color: var(--text-primary);">${participant.userName}</div>
                <div style="font-size: 11px; color: var(--text-secondary);">${participant.isHost ? 'Host' : 'Participante'}</div>
              </div>
            </div>
          `;
        });
        html += `</div>`;
      }

      html += `
          </div>

          <div>
            <h4 style="margin: 0 0 8px 0; font-size: 14px; color: var(--text-primary);">Mensagens Recentes</h4>
      `;

      if (this.messages.length === 0) {
        html += `<p style="color: var(--text-secondary); font-size: 13px;">Nenhuma mensagem</p>`;
      } else {
        html += `<div style="max-height: 150px; overflow-y: auto;">`;
        this.messages.slice(-10).forEach(message => {
          html += `
            <div style="
              padding: 8px;
              background: var(--bg-secondary);
              border-radius: 4px;
              margin-bottom: 4px;
            ">
              <div style="font-size: 12px; font-weight: 600; color: var(--text-primary);">${message.userName}</div>
              <div style="font-size: 13px; color: var(--text-secondary);">${message.content}</div>
            </div>
          `;
        });
        html += `</div>`;
      }

      html += `
          </div>
        </div>
      `;
    } else {
      html += `
        <div style="flex: 2; border: 1px solid var(--border-color); border-radius: 8px; padding: 16px; display: flex; align-items: center; justify-content: center;">
          <p style="color: var(--text-secondary);">Selecione uma sala de reunião</p>
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
    document.getElementById('meetings-close')?.addEventListener('click', () => this.close());
    document.getElementById('meetings-create')?.addEventListener('click', () => this.createMeeting());

    container.querySelectorAll('.meeting-item').forEach(item => {
      item.addEventListener('click', () => this.selectMeeting(item.dataset.id));
    });

    container.querySelectorAll('.meeting-end').forEach(btn => {
      btn.addEventListener('click', () => this.endMeeting(btn.dataset.id));
    });

    // Close on backdrop click
    container.querySelector('div').addEventListener('click', (e) => {
      if (e.target === container.querySelector('div')) {
        this.close();
      }
    });
  }
}

export { MeetingsPanel };
