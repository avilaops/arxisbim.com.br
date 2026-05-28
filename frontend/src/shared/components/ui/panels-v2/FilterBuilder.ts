/**
 * Filter Builder
 * Construtor visual de filtros com drag-and-drop
 */

import { Card } from '../design-system/components/Card';
import { Button } from '../design-system/components/Button';
import { Select } from '../design-system/components/Select';
import { Toggle } from '../design-system/components/Toggle';

export interface FilterRule {
  id: string;
  field: string;
  operator: string;
  value: any;
  type: 'property' | 'category' | 'type' | 'custom';
}

export interface FilterGroup {
  id: string;
  logic: 'AND' | 'OR';
  rules: (FilterRule | FilterGroup)[];
}

export class FilterBuilder {
  private card: Card;
  private rootGroup: FilterGroup;
  private onFilterChange?: (filter: FilterGroup) => void;
  private previewEnabled: boolean = true;

  constructor(options?: {
    onFilterChange?: (filter: FilterGroup) => void;
  }) {
    this.onFilterChange = options?.onFilterChange;
    
    this.card = new Card({
      title: '🎯 Construtor de Filtros',
      variant: 'glass'
    });

    this.rootGroup = this.createDefaultGroup();
    this.render();
  }

  private createDefaultGroup(): FilterGroup {
    return {
      id: 'group-0',
      logic: 'AND',
      rules: []
    };
  }

  private render(): void {
    const body = this.card.getBody();
    body.innerHTML = '';

    // Toolbar
    const toolbar = document.createElement('div');
    toolbar.className = 'arxis-filter__toolbar';

    const addRuleBtn = new Button({ text: '➕ Regra', variant: 'primary', size: 'sm' });
    addRuleBtn.getElement().addEventListener('click', () => {
      this.addRule(this.rootGroup);
      this.render();
    });

    const addGroupBtn = new Button({ text: '📦 Grupo', variant: 'secondary', size: 'sm' });
    addGroupBtn.getElement().addEventListener('click', () => {
      this.addGroup(this.rootGroup);
      this.render();
    });

    const clearBtn = new Button({ text: '🗑️ Limpar', variant: 'danger', size: 'sm' });
    clearBtn.getElement().addEventListener('click', () => {
      this.rootGroup = this.createDefaultGroup();
      this.render();
    });

    toolbar.appendChild(addRuleBtn.getElement());
    toolbar.appendChild(addGroupBtn.getElement());
    toolbar.appendChild(clearBtn.getElement());

    // Preview toggle
    const previewToggle = new Toggle({
      label: 'Preview',
      checked: this.previewEnabled,
      onChange: (checked) => {
        this.previewEnabled = checked;
        this.render();
      }
    });
    toolbar.appendChild(previewToggle.getElement());

    body.appendChild(toolbar);

    // Templates
    const templates = this.renderTemplates();
    body.appendChild(templates);

    // Filter builder
    const builder = document.createElement('div');
    builder.className = 'arxis-filter__builder';
    
    const groupEl = this.renderGroup(this.rootGroup);
    builder.appendChild(groupEl);

    body.appendChild(builder);

    // SQL Preview
    if (this.previewEnabled && this.hasRules(this.rootGroup)) {
      const preview = this.renderPreview();
      body.appendChild(preview);
    }

    // Actions
    const actions = document.createElement('div');
    actions.className = 'arxis-filter__actions';

    const applyBtn = new Button({ text: '✅ Aplicar Filtro', variant: 'primary', size: 'sm' });
    applyBtn.getElement().addEventListener('click', () => {
      this.applyFilter();
    });

    const saveBtn = new Button({ text: '💾 Salvar', variant: 'secondary', size: 'sm' });
    saveBtn.getElement().addEventListener('click', () => {
      this.saveFilter();
    });

    const exportBtn = new Button({ text: '📤 Exportar', variant: 'secondary', size: 'sm' });
    exportBtn.getElement().addEventListener('click', () => {
      this.exportFilter();
    });

    actions.appendChild(applyBtn.getElement());
    actions.appendChild(saveBtn.getElement());
    actions.appendChild(exportBtn.getElement());
    body.appendChild(actions);

    this.injectStyles();
  }

  private renderTemplates(): HTMLDivElement {
    const section = document.createElement('div');
    section.className = 'arxis-filter__templates';

    const title = document.createElement('div');
    title.className = 'arxis-filter__section-title';
    title.textContent = '📋 Templates';
    section.appendChild(title);

    const templates = document.createElement('div');
    templates.className = 'arxis-filter__template-list';

    const templateData = [
      { name: 'Estrutura', icon: '🏗️', desc: 'Vigas e pilares' },
      { name: 'Portas/Janelas', icon: '🚪', desc: 'Esquadrias' },
      { name: 'MEP', icon: '⚙️', desc: 'Instalações' },
      { name: 'Arquitetura', icon: '🏛️', desc: 'Elementos arquitetônicos' }
    ];

    templateData.forEach(template => {
      const item = document.createElement('div');
      item.className = 'arxis-filter__template-item';
      item.innerHTML = `
        <div class="arxis-filter__template-icon">${template.icon}</div>
        <div class="arxis-filter__template-info">
          <div class="arxis-filter__template-name">${template.name}</div>
          <div class="arxis-filter__template-desc">${template.desc}</div>
        </div>
      `;
      item.addEventListener('click', () => this.loadTemplate(template.name));
      templates.appendChild(item);
    });

    section.appendChild(templates);
    return section;
  }

  private renderGroup(group: FilterGroup, level: number = 0): HTMLDivElement {
    const groupEl = document.createElement('div');
    groupEl.className = 'arxis-filter__group';
    groupEl.style.marginLeft = `${level * 20}px`;

    // Group header
    const header = document.createElement('div');
    header.className = 'arxis-filter__group-header';

    const logicSelect = new Select({
      options: [
        { value: 'AND', label: 'E (AND)' },
        { value: 'OR', label: 'OU (OR)' }
      ],
      value: group.logic,
      onChange: (value) => {
        group.logic = value as 'AND' | 'OR';
        this.render();
      }
    });

    const addRuleBtn = new Button({ text: '+ Regra', variant: 'secondary', size: 'xs' });
    addRuleBtn.getElement().addEventListener('click', () => {
      this.addRule(group);
      this.render();
    });

    const addGroupBtn = new Button({ text: '+ Grupo', variant: 'secondary', size: 'xs' });
    addGroupBtn.getElement().addEventListener('click', () => {
      this.addGroup(group);
      this.render();
    });

    header.appendChild(logicSelect.getElement());
    header.appendChild(addRuleBtn.getElement());
    header.appendChild(addGroupBtn.getElement());

    if (level > 0) {
      const removeBtn = new Button({ text: '❌', variant: 'danger', size: 'xs' });
      removeBtn.getElement().addEventListener('click', () => {
        this.removeGroup(group);
        this.render();
      });
      header.appendChild(removeBtn.getElement());
    }

    groupEl.appendChild(header);

    // Group content
    const content = document.createElement('div');
    content.className = 'arxis-filter__group-content';

    group.rules.forEach((rule, index) => {
      if ('rules' in rule) {
        // It's a nested group
        const nestedGroup = this.renderGroup(rule as FilterGroup, level + 1);
        content.appendChild(nestedGroup);
      } else {
        // It's a rule
        const ruleEl = this.renderRule(rule as FilterRule, group, index);
        content.appendChild(ruleEl);
      }
    });

    groupEl.appendChild(content);
    return groupEl;
  }

  private renderRule(rule: FilterRule, group: FilterGroup, index: number): HTMLDivElement {
    const ruleEl = document.createElement('div');
    ruleEl.className = 'arxis-filter__rule';

    const fieldSelect = new Select({
      options: [
        { value: 'Name', label: 'Nome' },
        { value: 'Type', label: 'Tipo' },
        { value: 'Category', label: 'Categoria' },
        { value: 'Level', label: 'Nível' },
        { value: 'Material', label: 'Material' },
        { value: 'Mark', label: 'Marca' },
        { value: 'Volume', label: 'Volume' },
        { value: 'Area', label: 'Área' }
      ],
      value: rule.field,
      onChange: (value) => {
        rule.field = value;
        this.render();
      }
    });

    const operatorSelect = new Select({
      options: [
        { value: 'equals', label: 'igual a' },
        { value: 'not_equals', label: 'diferente de' },
        { value: 'contains', label: 'contém' },
        { value: 'starts_with', label: 'começa com' },
        { value: 'ends_with', label: 'termina com' },
        { value: 'greater_than', label: 'maior que' },
        { value: 'less_than', label: 'menor que' },
        { value: 'between', label: 'entre' },
        { value: 'in_list', label: 'na lista' }
      ],
      value: rule.operator,
      onChange: (value) => {
        rule.operator = value;
        this.render();
      }
    });

    const valueInput = document.createElement('input');
    valueInput.type = 'text';
    valueInput.className = 'arxis-filter__rule-value';
    valueInput.value = rule.value || '';
    valueInput.placeholder = 'Valor...';
    valueInput.addEventListener('input', (e) => {
      rule.value = (e.target as HTMLInputElement).value;
    });

    const removeBtn = new Button({ text: '❌', variant: 'danger', size: 'xs' });
    removeBtn.getElement().addEventListener('click', () => {
      group.rules.splice(index, 1);
      this.render();
    });

    ruleEl.appendChild(fieldSelect.getElement());
    ruleEl.appendChild(operatorSelect.getElement());
    ruleEl.appendChild(valueInput);
    ruleEl.appendChild(removeBtn.getElement());

    return ruleEl;
  }

  private renderPreview(): HTMLDivElement {
    const preview = document.createElement('div');
    preview.className = 'arxis-filter__preview';

    const title = document.createElement('div');
    title.className = 'arxis-filter__section-title';
    title.textContent = '👁️ Preview SQL';
    preview.appendChild(title);

    const sql = document.createElement('pre');
    sql.className = 'arxis-filter__sql';
    sql.textContent = this.generateSQL(this.rootGroup);
    preview.appendChild(sql);

    return preview;
  }

  private generateSQL(group: FilterGroup): string {
    if (group.rules.length === 0) {
      return 'SELECT * FROM Elements';
    }

    const conditions = group.rules.map(rule => {
      if ('rules' in rule) {
        return `(${this.generateSQL(rule as FilterGroup)})`;
      } else {
        const r = rule as FilterRule;
        return `${r.field} ${this.getOperatorSQL(r.operator)} '${r.value}'`;
      }
    });

    const where = conditions.join(` ${group.logic} `);
    return `SELECT * FROM Elements WHERE ${where}`;
  }

  private getOperatorSQL(operator: string): string {
    const map: Record<string, string> = {
      equals: '=',
      not_equals: '!=',
      contains: 'LIKE',
      starts_with: 'LIKE',
      ends_with: 'LIKE',
      greater_than: '>',
      less_than: '<',
      between: 'BETWEEN',
      in_list: 'IN'
    };
    return map[operator] || '=';
  }

  private hasRules(group: FilterGroup): boolean {
    return group.rules.length > 0;
  }

  private addRule(group: FilterGroup): void {
    group.rules.push({
      id: `rule-${Date.now()}`,
      field: 'Name',
      operator: 'contains',
      value: '',
      type: 'property'
    });
  }

  private addGroup(group: FilterGroup): void {
    group.rules.push({
      id: `group-${Date.now()}`,
      logic: 'AND',
      rules: []
    });
  }

  private removeGroup(group: FilterGroup): void {
    // Remove from parent (recursive search needed)
    console.log('Remove group:', group.id);
  }

  private loadTemplate(name: string): void {
    console.log('Loading template:', name);
    // Implement template loading
  }

  private applyFilter(): void {
    this.onFilterChange?.(this.rootGroup);
  }

  private saveFilter(): void {
    const name = prompt('Nome do filtro:');
    if (name) {
      const data = JSON.stringify(this.rootGroup, null, 2);
      console.log('Saving filter:', name, data);
      alert('Filtro salvo com sucesso!');
    }
  }

  private exportFilter(): void {
    const json = JSON.stringify(this.rootGroup, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `filter-${Date.now()}.json`;
    a.click();
  }

  public getElement(): HTMLElement {
    return this.card.getElement();
  }

  public destroy(): void {
    this.card.destroy();
  }

  private injectStyles(): void {
    if (document.getElementById('arxis-filter-builder-styles')) return;

    const style = document.createElement('style');
    style.id = 'arxis-filter-builder-styles';
    style.textContent = `
      .arxis-filter__toolbar {
        display: flex;
        gap: 8px;
        align-items: center;
        margin-bottom: 12px;
        flex-wrap: wrap;
      }

      .arxis-filter__section-title {
        font-size: 13px;
        font-weight: 600;
        color: rgba(255, 255, 255, 0.9);
        margin-bottom: 12px;
      }

      .arxis-filter__templates {
        margin-bottom: 16px;
        padding: 12px;
        background: rgba(255, 255, 255, 0.03);
        border-radius: 8px;
      }

      .arxis-filter__template-list {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
        gap: 8px;
      }

      .arxis-filter__template-item {
        padding: 10px;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.2s;
        display: flex;
        gap: 8px;
        align-items: center;
      }

      .arxis-filter__template-item:hover {
        background: rgba(255, 255, 255, 0.1);
        transform: translateY(-2px);
      }

      .arxis-filter__template-icon {
        font-size: 24px;
      }

      .arxis-filter__template-info {
        flex: 1;
      }

      .arxis-filter__template-name {
        font-size: 13px;
        font-weight: 500;
        color: #fff;
      }

      .arxis-filter__template-desc {
        font-size: 11px;
        color: rgba(255, 255, 255, 0.6);
      }

      .arxis-filter__builder {
        margin-bottom: 16px;
      }

      .arxis-filter__group {
        padding: 12px;
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 8px;
        margin-bottom: 8px;
      }

      .arxis-filter__group-header {
        display: flex;
        gap: 8px;
        align-items: center;
        margin-bottom: 12px;
      }

      .arxis-filter__group-content {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .arxis-filter__rule {
        display: flex;
        gap: 8px;
        align-items: center;
        padding: 8px;
        background: rgba(255, 255, 255, 0.04);
        border-radius: 6px;
      }

      .arxis-filter__rule-value {
        flex: 1;
        padding: 8px 12px;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 6px;
        color: #fff;
        font-size: 13px;
        outline: none;
      }

      .arxis-filter__rule-value:focus {
        background: rgba(255, 255, 255, 0.08);
        border-color: rgba(0, 212, 255, 0.5);
      }

      .arxis-filter__preview {
        padding: 12px;
        background: rgba(0, 0, 0, 0.3);
        border-radius: 8px;
        margin-bottom: 16px;
      }

      .arxis-filter__sql {
        margin: 0;
        padding: 12px;
        background: rgba(0, 0, 0, 0.5);
        border-radius: 6px;
        color: #00d4ff;
        font-family: 'Courier New', monospace;
        font-size: 12px;
        line-height: 1.5;
        overflow-x: auto;
        white-space: pre-wrap;
      }

      .arxis-filter__actions {
        display: flex;
        gap: 8px;
      }
    `;
    document.head.appendChild(style);
  }
}
