// RightPanel: Painel lateral direito
export default function RightPanel() {
  return (
    <aside className="right-panel">
      <h2 className="panel__title">Propriedades</h2>
      <div className="panel__section">
        <div className="panel__section-title">Informações do Modelo</div>
        <div id="model-info">
          <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
            Selecione um modelo para consultar detalhes técnicos.
          </p>
        </div>
      </div>
      <div className="panel__section">
        <div className="panel__section-title">Ações Rápidas</div>
        <button className="btn btn-primary" data-action="upload-ifc" style={{ width: '100%', marginBottom: 8 }}>
          Abrir IFC
        </button>
        <button className="btn btn-secondary" data-action="export-glb" style={{ width: '100%', marginBottom: 8 }}>
          Exportar modelo
        </button>
        <button className="btn btn-secondary" data-action="snapshot-png" style={{ width: '100%' }}>
          Capturar imagem
        </button>
      </div>
      <div className="panel__section">
        <div className="panel__section-title">Modos de Câmera</div>
        <div className="camera-mode-grid">
          <button className="btn btn-secondary camera-mode-button active" data-camera-mode="fps">
            1 Pessoa
          </button>
          <button className="btn btn-secondary camera-mode-button" data-camera-mode="third-person">
            2 Avatar
          </button>
          <button className="btn btn-secondary camera-mode-button" data-camera-mode="drone">
            3 Drone
          </button>
          <button className="btn btn-secondary camera-mode-button" data-camera-mode="orbit">
            V Órbita
          </button>
        </div>
        <div className="camera-mode-status" id="camera-mode-status">
          <strong>Primeira Pessoa:</strong> WASD anda, mouse olha, Space pula.
        </div>
        <p className="control-hint">
          Atalhos: 1 Primeira Pessoa, 2 Terceira Pessoa 360°, 3 Drone, V Órbita. Clique no canvas para travar a navegação.
        </p>
      </div>
      <div className="panel__section">
        <div className="panel__section-title">Navegação imersiva</div>
        <button className="btn btn-secondary" data-action="fps-mode" style={{ width: '100%', marginBottom: 12 }}>
          Navegação WASD
        </button>
        <label className="control-label" style={{ marginBottom: 12 }}>
          <input type="checkbox" id="gravity-enabled" defaultChecked />
          Gravidade ativa
        </label>
        <div className="control-row">
          <span>Gravidade</span>
          <span className="control-value" id="gravity-value">9.8</span>
        </div>
        <input className="control-range" id="gravity-slider" type="range" min="0" max="30" step="0.1" defaultValue="9.8" />
        <p className="control-hint">
          Clique no canvas para navegar. WASD desloca, Shift acelera, Ctrl reduz velocidade, Space eleva. V alterna Órbita/Pessoa.
        </p>
      </div>
    </aside>
  );
}
