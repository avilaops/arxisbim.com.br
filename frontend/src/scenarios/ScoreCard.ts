export class ScoreCard {
  private container: HTMLElement;
  private scoreA: number;
  private scoreB: number;
  private explanation: string;
  private costWeight: number;
  private timeWeight: number;
  private onWeightChangeCb: (costWeight: number, timeWeight: number) => void;
  private el: HTMLElement | null = null;

  constructor(
    container: HTMLElement,
    scoreA: number,
    scoreB: number,
    explanation: string,
    costWeight: number,
    timeWeight: number,
    onWeightChange: (costWeight: number, timeWeight: number) => void
  ) {
    this.container = container;
    this.scoreA = scoreA;
    this.scoreB = scoreB;
    this.explanation = explanation;
    this.costWeight = costWeight;
    this.timeWeight = timeWeight;
    this.onWeightChangeCb = onWeightChange;

    this.init();
  }

  private init(): void {
    this.injectStyles();
    this.el = document.createElement('div');
    this.el.className = 'score-card-recommendation';
    this.container.appendChild(this.el);
    this.render();
  }

  private injectStyles(): void {
    if (document.getElementById('score-card-styles')) return;

    const style = document.createElement('style');
    style.id = 'score-card-styles';
    style.textContent = `
      .score-card-recommendation {
        background: rgba(30, 27, 75, 0.4);
        border: 1px solid rgba(139, 92, 246, 0.2);
        border-radius: 12px;
        padding: 16px;
        display: flex;
        flex-direction: column;
        gap: 12px;
        color: #f1f5f9;
        font-family: 'Inter', -apple-system, sans-serif;
      }

      .score-recommendation-title {
        font-size: 12px;
        font-weight: 700;
        text-transform: uppercase;
        color: #c084fc;
        letter-spacing: 0.05em;
        display: flex;
        align-items: center;
        gap: 6px;
      }

      .score-explanation {
        font-size: 12px;
        line-height: 1.4;
        color: #cbd5e1;
      }

      .score-comparison-row {
        display: flex;
        gap: 12px;
        margin-top: 4px;
      }

      .score-badge-card {
        flex: 1;
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid rgba(255, 255, 255, 0.06);
        border-radius: 8px;
        padding: 10px;
        text-align: center;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 2px;
      }

      .score-badge-card.winner {
        background: rgba(139, 92, 246, 0.15);
        border-color: rgba(139, 92, 246, 0.4);
        box-shadow: 0 0 12px rgba(139, 92, 246, 0.15);
      }

      .score-badge-label {
        font-size: 10px;
        font-weight: 700;
        color: #94a3b8;
        text-transform: uppercase;
      }

      .score-badge-points {
        font-size: 20px;
        font-weight: 800;
        color: #f8fafc;
      }

      .score-badge-winner-tag {
        font-size: 8px;
        font-weight: 700;
        color: #34d399;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }

      .score-sliders {
        display: flex;
        flex-direction: column;
        gap: 8px;
        border-top: 1px solid rgba(255, 255, 255, 0.08);
        padding-top: 12px;
        margin-top: 4px;
      }

      .score-slider-group {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .score-slider-header {
        display: flex;
        justify-content: space-between;
        font-size: 11px;
        font-weight: 600;
        color: #94a3b8;
      }

      .score-slider-input {
        -webkit-appearance: none;
        width: 100%;
        height: 6px;
        border-radius: 3px;
        background: rgba(255, 255, 255, 0.1);
        outline: none;
        cursor: pointer;
      }

      .score-slider-input::-webkit-slider-thumb {
        -webkit-appearance: none;
        width: 14px;
        height: 14px;
        border-radius: 50%;
        background: #a78bfa;
        cursor: pointer;
        transition: transform 0.1s ease;
      }

      .score-slider-input::-webkit-slider-thumb:hover {
        transform: scale(1.2);
        background: #c084fc;
      }
    `;
    document.head.appendChild(style);
  }

  private render(): void {
    if (!this.el) return;

    const isWinnerA = this.scoreA >= this.scoreB;

    this.el.innerHTML = `
      <div class="score-recommendation-title">
        <span>🤖 Recomendação Decisória</span>
      </div>
      <div class="score-explanation">
        ${this.explanation}
      </div>
      <div class="score-comparison-row">
        <div class="score-badge-card ${isWinnerA ? 'winner' : ''}">
          <span class="score-badge-label">Cenário A</span>
          <span class="score-badge-points">${this.scoreA.toFixed(1)}</span>
          ${isWinnerA ? '<span class="score-badge-winner-tag">Recomendado</span>' : '<span style="height: 10px;"></span>'}
        </div>
        <div class="score-badge-card ${!isWinnerA ? 'winner' : ''}">
          <span class="score-badge-label">Cenário B</span>
          <span class="score-badge-points">${this.scoreB.toFixed(1)}</span>
          ${!isWinnerA ? '<span class="score-badge-winner-tag">Recomendado</span>' : '<span style="height: 10px;"></span>'}
        </div>
      </div>
      <div class="score-sliders">
        <div class="score-slider-group">
          <div class="score-slider-header">
            <span>Peso Custo</span>
            <span id="cost-weight-lbl">${Math.round(this.costWeight * 100)}%</span>
          </div>
          <input type="range" id="cost-weight-slider" class="score-slider-input" min="0" max="100" value="${Math.round(this.costWeight * 100)}" />
        </div>
        <div class="score-slider-group">
          <div class="score-slider-header">
            <span>Peso Prazo</span>
            <span id="time-weight-lbl">${Math.round(this.timeWeight * 100)}%</span>
          </div>
          <input type="range" id="time-weight-slider" class="score-slider-input" min="0" max="100" value="${Math.round(this.timeWeight * 100)}" />
        </div>
      </div>
    `;

    // Bind slider events
    const costSlider = this.el.querySelector('#cost-weight-slider') as HTMLInputElement | null;
    const timeSlider = this.el.querySelector('#time-weight-slider') as HTMLInputElement | null;

    costSlider?.addEventListener('input', () => {
      const val = parseInt(costSlider.value);
      this.costWeight = val / 100;
      this.timeWeight = (100 - val) / 100;

      if (timeSlider) {
        timeSlider.value = (100 - val).toString();
      }

      this.updateLabels();
      this.onWeightChangeCb(this.costWeight, this.timeWeight);
    });

    timeSlider?.addEventListener('input', () => {
      const val = parseInt(timeSlider.value);
      this.timeWeight = val / 100;
      this.costWeight = (100 - val) / 100;

      if (costSlider) {
        costSlider.value = (100 - val).toString();
      }

      this.updateLabels();
      this.onWeightChangeCb(this.costWeight, this.timeWeight);
    });
  }

  private updateLabels(): void {
    if (!this.el) return;
    const costLbl = this.el.querySelector('#cost-weight-lbl');
    const timeLbl = this.el.querySelector('#time-weight-lbl');

    if (costLbl) costLbl.textContent = `${Math.round(this.costWeight * 100)}%`;
    if (timeLbl) timeLbl.textContent = `${Math.round(this.timeWeight * 100)}%`;
  }

  public updateData(scoreA: number, scoreB: number, explanation: string): void {
    this.scoreA = scoreA;
    this.scoreB = scoreB;
    this.explanation = explanation;
    
    // Update display without losing slider states
    const explanationEl = this.el?.querySelector('.score-explanation');
    if (explanationEl) {
      explanationEl.innerHTML = explanation;
    }

    const cards = this.el?.querySelectorAll('.score-badge-card');
    if (cards && cards.length >= 2) {
      const isWinnerA = scoreA >= scoreB;

      cards[0].className = `score-badge-card ${isWinnerA ? 'winner' : ''}`;
      cards[0].querySelector('.score-badge-points')!.textContent = scoreA.toFixed(1);
      cards[0].querySelector('.score-badge-winner-tag')?.remove();
      if (isWinnerA) {
        const span = document.createElement('span');
        span.className = 'score-badge-winner-tag';
        span.textContent = 'Recomendado';
        cards[0].appendChild(span);
      } else {
        const span = document.createElement('span');
        span.style.height = '10px';
        cards[0].appendChild(span);
      }

      cards[1].className = `score-badge-card ${!isWinnerA ? 'winner' : ''}`;
      cards[1].querySelector('.score-badge-points')!.textContent = scoreB.toFixed(1);
      cards[1].querySelector('.score-badge-winner-tag')?.remove();
      if (!isWinnerA) {
        const span = document.createElement('span');
        span.className = 'score-badge-winner-tag';
        span.textContent = 'Recomendado';
        cards[1].appendChild(span);
      } else {
        const span = document.createElement('span');
        span.style.height = '10px';
        cards[1].appendChild(span);
      }
    }
  }

  public destroy(): void {
    this.el?.remove();
  }
}
