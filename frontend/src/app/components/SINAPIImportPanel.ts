import { getAPIClient } from '../../api/v1/client.js';

export class SINAPIImportPanel {
  constructor() {
    this.isOpen = false;
    this.selectedFile = null;
    this.loading = false;
    this.result = null;
    this.error = null;
    this.modalElement = null;
  }

  open() {
    this.isOpen = true;
    this.selectedFile = null;
    this.result = null;
    this.error = null;
    this.render();
  }

  close() {
    this.isOpen = false;
    this.render();
  }

  setFile(file) {
    this.selectedFile = file;
    this.error = null;
    this.render();
  }

  async executeImport() {
    if (!this.selectedFile) {
      this.error = 'Selecione um arquivo XLSX';
      return;
    }

    this.loading = true;
    this.error = null;
    this.result = null;
    this.render();

    try {
      const formData = new FormData();
      formData.append('file', this.selectedFile);

      const client = getAPIClient();
      const res = await client.post('/admin/sinapi/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      this.result = {
        imported: res.data.imported_count || 0,
        skipped: res.data.skipped_count || 0,
      };
      this.selectedFile = null;
    } catch (err) {
      this.error = err.response?.data?.error ||
        'Erro ao importar. Verifique o formato do arquivo.';
      console.error(err);
    } finally {
      this.loading = false;
      this.render();
    }
  }

  render() {
    if (!this.isOpen) return;

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-content" style="max-width: 500px;">
        <div class="modal-header">
          <h2>Importar SINAPI</h2>
          <button class="modal-close">✕</button>
        </div>
        <div class="modal-body">
          ${this.error ? `<p class="error">${this.error}</p>` : ''}
          ${this.result ? `<p class="success">✓ Importados: ${this.result.imported}</p>` : ''}

          <div class="file-input-wrapper">
            <label class="file-input-label">
              <span>📁 Selecionar arquivo XLSX</span>
              <input type="file" accept=".xlsx,.xls" id="sinapi-file-input" />
            </label>
            ${this.selectedFile ? `<p>Arquivo: ${this.selectedFile.name}</p>` : ''}
          </div>

          <button
            class="btn-primary"
            ${this.loading || !this.selectedFile ? 'disabled' : ''}
            onclick="window.__sinapiImport.executeImport()"
          >
            ${this.loading ? 'Importando...' : '⬆ Importar'}
          </button>
        </div>
      </div>
    `;

    modal.querySelector('.modal-close').addEventListener('click', () => this.close());
    const fileInput = modal.querySelector('#sinapi-file-input');
    if (fileInput) {
      fileInput.addEventListener('change', (e) => {
        this.setFile((e.target as HTMLInputElement).files?.[0] || null);
      });
    }

    const oldModal = document.querySelector('.sinapi-import-modal');
    if (oldModal) oldModal.remove();

    modal.className += ' sinapi-import-modal';
    document.body.appendChild(modal);
    this.modalElement = modal;
  }
}

if (typeof window !== 'undefined') {
  (window as any).__sinapiImport = new SINAPIImportPanel();
}
