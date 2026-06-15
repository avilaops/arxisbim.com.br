export class TimelineSlider {
  private parent: HTMLElement;
  private containerEl!: HTMLDivElement;
  private sliderEl!: HTMLInputElement;
  private playBtn!: HTMLButtonElement;
  private dateDisplayEl!: HTMLSpanElement;
  private cameraFollowBtn!: HTMLButtonElement;
  private speedSelectEl!: HTMLSelectElement;

  private minDate!: Date;
  private maxDate!: Date;
  private currentDate!: Date;
  
  private isPlaying = false;
  private isCameraFollowEnabled = true;
  private playbackInterval: any = null;
  private playbackSpeedDays = 1; // base days per tick
  private tickIntervalMs = 150;

  private onDateChange: (date: Date) => void;
  private onCameraFollowToggle?: (enabled: boolean) => void;
  private onSpeedChange?: (speed: number) => void;
  private debounceTimer: any = null;

  constructor(
    parent: HTMLElement, 
    options: { 
      onDateChange: (date: Date) => void;
      onCameraFollowToggle?: (enabled: boolean) => void;
      onSpeedChange?: (speed: number) => void;
    }
  ) {
    this.parent = parent;
    this.onDateChange = options.onDateChange;
    this.onCameraFollowToggle = options.onCameraFollowToggle;
    this.onSpeedChange = options.onSpeedChange;
    this.minDate = new Date();
    this.maxDate = new Date();
    this.currentDate = new Date();

    this.initUI();
  }

  private initUI(): void {
    this.containerEl = document.createElement('div');
    this.containerEl.className = 'timeline-slider-bar';
    this.containerEl.style.cssText = `
      position: absolute;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%);
      width: 65%;
      min-width: 500px;
      max-width: 900px;
      background: rgba(15, 23, 42, 0.85);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 16px;
      padding: 14px 20px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      color: #f8fafc;
      font-family: 'Inter', -apple-system, sans-serif;
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.4);
      z-index: 1000;
      user-select: none;
      box-sizing: border-box;
      transition: all 0.3s ease;
    `;

    // Inner top row: play/pause, date display, speed, camera follow, range info
    const topRow = document.createElement('div');
    topRow.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
    `;

    const leftControls = document.createElement('div');
    leftControls.style.cssText = `
      display: flex;
      align-items: center;
      gap: 12px;
    `;

    this.playBtn = document.createElement('button');
    this.playBtn.type = 'button';
    this.playBtn.innerHTML = '▶';
    this.playBtn.style.cssText = `
      background: #7c3aed;
      border: none;
      color: white;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      font-size: 14px;
      transition: background 0.2s, transform 0.1s;
      outline: none;
    `;
    this.playBtn.addEventListener('mouseenter', () => {
      this.playBtn.style.background = '#6d28d9';
    });
    this.playBtn.addEventListener('mouseleave', () => {
      this.playBtn.style.background = '#7c3aed';
    });
    this.playBtn.addEventListener('click', () => this.togglePlay());

    this.dateDisplayEl = document.createElement('span');
    this.dateDisplayEl.style.cssText = `
      font-size: 14px;
      font-weight: 600;
      color: #e2e8f0;
    `;

    leftControls.appendChild(this.playBtn);
    leftControls.appendChild(this.dateDisplayEl);
    topRow.appendChild(leftControls);

    // Right Controls: Speed Selector, Camera Follow Toggle
    const rightControls = document.createElement('div');
    rightControls.style.cssText = `
      display: flex;
      align-items: center;
      gap: 14px;
    `;

    // Speed selector
    const speedContainer = document.createElement('div');
    speedContainer.style.cssText = `
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      color: #cbd5e1;
    `;
    const speedLabel = document.createElement('span');
    speedLabel.textContent = 'Velocidade:';
    
    this.speedSelectEl = document.createElement('select');
    this.speedSelectEl.style.cssText = `
      background: rgba(30, 41, 59, 0.8);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 6px;
      color: white;
      padding: 3px 6px;
      font-size: 11px;
      cursor: pointer;
      outline: none;
    `;
    const speeds = [
      { val: 0.1, label: '0.1x (Lento)' },
      { val: 1.0, label: '1.0x (Normal)' },
      { val: 5.0, label: '5.0x (Rápido)' },
      { val: 10.0, label: '10.0x (Máximo)' }
    ];
    speeds.forEach(sp => {
      const opt = document.createElement('option');
      opt.value = String(sp.val);
      opt.textContent = sp.label;
      if (sp.val === 1.0) opt.selected = true;
      this.speedSelectEl.appendChild(opt);
    });
    this.speedSelectEl.addEventListener('change', () => {
      const val = parseFloat(this.speedSelectEl.value);
      this.playbackSpeedDays = val;
      if (this.onSpeedChange) this.onSpeedChange(val);
      
      // Update running interval if playing
      if (this.isPlaying) {
        this.pause();
        this.play();
      }
    });

    speedContainer.appendChild(speedLabel);
    speedContainer.appendChild(this.speedSelectEl);
    rightControls.appendChild(speedContainer);

    // Camera follow button
    this.cameraFollowBtn = document.createElement('button');
    this.cameraFollowBtn.type = 'button';
    this.cameraFollowBtn.textContent = '📷 Foco Auto';
    this.cameraFollowBtn.style.cssText = `
      background: rgba(124, 58, 237, 0.25);
      border: 1px solid rgba(124, 58, 237, 0.5);
      color: #c084fc;
      border-radius: 6px;
      padding: 4px 8px;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      outline: none;
    `;
    this.cameraFollowBtn.addEventListener('click', () => {
      this.isCameraFollowEnabled = !this.isCameraFollowEnabled;
      if (this.isCameraFollowEnabled) {
        this.cameraFollowBtn.style.background = 'rgba(124, 58, 237, 0.25)';
        this.cameraFollowBtn.style.borderColor = 'rgba(124, 58, 237, 0.5)';
        this.cameraFollowBtn.style.color = '#c084fc';
      } else {
        this.cameraFollowBtn.style.background = 'rgba(255, 255, 255, 0.05)';
        this.cameraFollowBtn.style.borderColor = 'rgba(255, 255, 255, 0.1)';
        this.cameraFollowBtn.style.color = '#94a3b8';
      }
      if (this.onCameraFollowToggle) this.onCameraFollowToggle(this.isCameraFollowEnabled);
    });
    rightControls.appendChild(this.cameraFollowBtn);

    // Timeline range text
    const rangeText = document.createElement('span');
    rangeText.className = 'timeline-slider-range-text';
    rangeText.style.cssText = `
      font-size: 11px;
      color: #94a3b8;
    `;
    rightControls.appendChild(rangeText);
    topRow.appendChild(rightControls);

    // Slider Row
    const sliderRow = document.createElement('div');
    sliderRow.style.cssText = `
      display: flex;
      align-items: center;
      width: 100%;
    `;

    this.sliderEl = document.createElement('input');
    this.sliderEl.type = 'range';
    this.sliderEl.min = '0';
    this.sliderEl.max = '100';
    this.sliderEl.value = '0';
    this.sliderEl.style.cssText = `
      width: 100%;
      height: 6px;
      background: rgba(255, 255, 255, 0.15);
      border-radius: 3px;
      outline: none;
      cursor: pointer;
      appearance: none;
      -webkit-appearance: none;
    `;
    
    // Custom slider styling
    const styleId = 'timeline-slider-custom-styles';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        input[type=range]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: #7c3aed;
          cursor: pointer;
          box-shadow: 0 0 8px rgba(124, 58, 237, 0.6);
          transition: transform 0.1s;
        }
        input[type=range]::-webkit-slider-thumb:hover {
          transform: scale(1.2);
        }
        input[type=range]::-moz-range-thumb {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: #7c3aed;
          cursor: pointer;
          box-shadow: 0 0 8px rgba(124, 58, 237, 0.6);
          border: none;
          transition: transform 0.1s;
        }
        input[type=range]::-moz-range-thumb:hover {
          transform: scale(1.2);
        }
      `;
      document.head.appendChild(style);
    }

    this.sliderEl.addEventListener('input', () => {
      this.pause();
      this.onSliderInput();
    });

    sliderRow.appendChild(this.sliderEl);

    this.containerEl.appendChild(topRow);
    this.containerEl.appendChild(sliderRow);
    this.parent.appendChild(this.containerEl);

    this.updateUI();
  }

  public setRange(min: Date, max: Date): void {
    this.minDate = min;
    this.maxDate = max;
    if (this.currentDate < min || this.currentDate > max) {
      this.currentDate = new Date(min.getTime());
    }

    const totalDays = this.getTotalDays();
    this.sliderEl.min = '0';
    this.sliderEl.max = String(totalDays);

    const rangeText = this.containerEl.querySelector('.timeline-slider-range-text');
    if (rangeText) {
      rangeText.textContent = `${this.formatDate(min)} - ${this.formatDate(max)}`;
    }

    this.syncSliderPosition();
    this.updateUI();
  }

  public setDate(date: Date): void {
    if (date < this.minDate) date = new Date(this.minDate.getTime());
    if (date > this.maxDate) date = new Date(this.maxDate.getTime());
    this.currentDate = date;
    this.syncSliderPosition();
    this.updateUI();
  }

  private getTotalDays(): number {
    const diff = this.maxDate.getTime() - this.minDate.getTime();
    return Math.max(1, Math.round(diff / (1000 * 60 * 60 * 24)));
  }

  private syncSliderPosition(): void {
    const diff = this.currentDate.getTime() - this.minDate.getTime();
    const currentDayOffset = Math.max(0, Math.round(diff / (1000 * 60 * 60 * 24)));
    this.sliderEl.value = String(currentDayOffset);
  }

  private onSliderInput(): void {
    const dayOffset = Number(this.sliderEl.value);
    const targetTime = this.minDate.getTime() + dayOffset * (1000 * 60 * 60 * 24);
    this.currentDate = new Date(targetTime);
    this.updateUI();

    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      this.onDateChange(this.currentDate);
    }, 50);
  }

  private togglePlay(): void {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  public play(): void {
    if (this.isPlaying) return;
    this.isPlaying = true;
    this.playBtn.innerHTML = '⏸';
    
    if (this.currentDate.getTime() >= this.maxDate.getTime()) {
      this.currentDate = new Date(this.minDate.getTime());
      this.syncSliderPosition();
      this.updateUI();
      this.onDateChange(this.currentDate);
    }

    // Multiply days per tick based on selected speed
    this.playbackInterval = setInterval(() => {
      const nextTime = this.currentDate.getTime() + this.playbackSpeedDays * (1000 * 60 * 60 * 24);
      if (nextTime >= this.maxDate.getTime()) {
        this.currentDate = new Date(this.maxDate.getTime());
        this.pause();
        this.syncSliderPosition();
        this.updateUI();
        this.onDateChange(this.currentDate);
      } else {
        this.currentDate = new Date(nextTime);
        this.syncSliderPosition();
        this.updateUI();
        this.onDateChange(this.currentDate);
      }
    }, this.tickIntervalMs);
  }

  public pause(): void {
    if (!this.isPlaying) return;
    this.isPlaying = false;
    this.playBtn.innerHTML = '▶';
    if (this.playbackInterval) {
      clearInterval(this.playbackInterval);
      this.playbackInterval = null;
    }
  }

  private updateUI(): void {
    this.dateDisplayEl.textContent = this.formatDate(this.currentDate);
  }

  private formatDate(date: Date): string {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC'
    }).format(date);
  }

  public destroy(): void {
    this.pause();
    this.containerEl.remove();
  }
}
