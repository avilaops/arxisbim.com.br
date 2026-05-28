// Sidebar: Menu lateral
export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar__section">
        <h3 className="sidebar__title">Projetos</h3>
        <ul className="sidebar__list">
          <li className="sidebar__item active">
            <span className="sidebar__icon">PRJ</span>
            <span>Projeto atual</span>
          </li>
        </ul>
      </div>
      <div className="sidebar__section">
        <h3 className="sidebar__title">Modelos IFC</h3>
        <ul className="sidebar__list" id="ifc-list">
          <li className="sidebar__item">
            <span className="sidebar__icon">IFC</span>
            <span>Carregando modelos...</span>
          </li>
        </ul>
      </div>
      <div className="sidebar__section">
        <h3 className="sidebar__title">Ferramentas</h3>
        <ul className="sidebar__list">
          <li className="sidebar__item" data-action="upload-ifc">
            <span className="sidebar__icon">ADD</span>
            <span>Abrir IFC</span>
          </li>
          <li className="sidebar__item">
            <span className="sidebar__icon">CUT</span>
            <span>Cortes</span>
          </li>
          <li className="sidebar__item">
            <span className="sidebar__icon">MED</span>
            <span>Medições</span>
          </li>
        </ul>
      </div>
      {/* Demais painéis montados dinamicamente */}
      <div className="sidebar__section">
        <h3 className="sidebar__title">Cenas</h3>
        <div id="scenarios-panel-mount"></div>
      </div>
      <div className="sidebar__section">
        <h3 className="sidebar__title">Cortes</h3>
        <div id="sections-panel-mount"></div>
      </div>
      <div className="sidebar__section">
        <h3 className="sidebar__title">Medições</h3>
        <div id="measurements-panel-mount"></div>
      </div>
      <div className="sidebar__section">
        <h3 className="sidebar__title">Consulta BIM</h3>
        <div id="query-panel-mount"></div>
      </div>
      <div className="sidebar__section">
        <h3 className="sidebar__title">Quantitativos (5D)</h3>
        <div id="takeoff-panel-mount"></div>
      </div>
      <div className="sidebar__section">
        <h3 className="sidebar__title">Orçamento (5D)</h3>
        <div id="budget-panel-mount"></div>
      </div>
    </aside>
  );
}
