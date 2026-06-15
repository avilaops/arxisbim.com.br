import { getAPIClient } from '../api/v1/client.js';
import { SplitView } from '../viewer/SplitView';
import { ElementStateResolver } from './ElementStateResolver';
import { TimelineSlider } from './TimelineSlider';
import { AnimationController } from './AnimationController';
import { createTimelineWorker } from './TimelineWorker';

export class TimelineComparison {
  private splitView: SplitView;
  private container: HTMLElement;
  private slider: TimelineSlider | null = null;
  private animationController: AnimationController | null = null;
  
  private resolverA = new ElementStateResolver();
  private resolverB = new ElementStateResolver();
  private framesA: any[] = [];
  private framesB: any[] = [];

  private overlayEl: HTMLDivElement | null = null;

  constructor(container: HTMLElement, splitView: SplitView) {
    this.container = container;
    this.splitView = splitView;
  }

  public async initialize(scenarioIdA: string, scenarioIdB: string): Promise<void> {
    try {
      const client = getAPIClient();
      const res = await client.get(`/scenarios/${scenarioIdA}/${scenarioIdB}/timeline-comparison`);
      const data = res.data;

      const schedA = data.scenarioA?.schedule;
      const schedB = data.scenarioB?.schedule;

      if (!schedA && !schedB) {
        console.warn('TimelineComparison: Neither scenario has a schedule.');
        return;
      }

      // 1. Index activities on state resolvers
      this.resolverA.setActivities(schedA?.activities || []);
      this.resolverB.setActivities(schedB?.activities || []);

      // 2. Determine project date boundaries
      const dates: Date[] = [];
      if (schedA) {
        dates.push(this.parseUTCDate(schedA.startDate));
        dates.push(this.parseUTCDate(schedA.completionDate));
      }
      if (schedB) {
        dates.push(this.parseUTCDate(schedB.startDate));
        dates.push(this.parseUTCDate(schedB.completionDate));
      }

      const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
      const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));

      // 3. Pre-compute simulation frames using Web Workers
      const fps = 1; // 1 frame per simulated day
      
      const precompute = (sched: any, resolver: ElementStateResolver): Promise<any[]> => {
        return new Promise((resolve) => {
          if (!sched) {
            resolve([]);
            return;
          }

          const worker = createTimelineWorker();
          worker.onmessage = (e) => {
            resolve(e.data.frames);
            worker.terminate();
          };

          worker.postMessage({
            activities: sched.activities || [],
            startDateStr: minDate.toISOString().slice(0, 10),
            endDateStr: maxDate.toISOString().slice(0, 10),
            fps
          });
        });
      };

      // Run precomputation concurrently
      const startTime = performance.now();
      const [framesA, framesB] = await Promise.all([
        precompute(schedA, this.resolverA),
        precompute(schedB, this.resolverB)
      ]);
      console.log(`TimelineComparison: Web Worker pre-computation of ${framesA.length + framesB.length} frames took ${Math.round(performance.now() - startTime)}ms`);

      this.framesA = framesA;
      this.framesB = framesB;

      // 4. Configure SplitView for temporal simulation
      this.splitView.activateTemporalComparison(this.resolverA, this.resolverB, this.framesA, this.framesB);

      // 5. Instantiate AnimationController
      const totalFrames = Math.max(this.framesA.length, this.framesB.length) - 1;
      this.animationController = new AnimationController({
        totalFrames: Math.max(1, totalFrames),
        fps,
        speed: 1.0,
        onFrame: (frameIndex) => {
          if (this.splitView.temporalComparison) {
            this.splitView.temporalComparison.currentFrameIndex = frameIndex;
          }
          
          // Map frameIndex to Date and update Slider HUD
          const frameData = this.framesA[frameIndex] || this.framesB[frameIndex];
          if (frameData && this.slider) {
            const date = this.parseUTCDate(frameData.dateStr);
            this.slider.setDate(date);
          }
        },
        onPlay: () => {
          if (this.slider) this.slider.play();
        },
        onPause: () => {
          if (this.slider) this.slider.pause();
        }
      });

      // 6. Instantiate TimelineSlider UI
      this.slider = new TimelineSlider(this.container, {
        onDateChange: (date) => {
          // Find frame index nearest to this date
          const dateStr = date.toISOString().slice(0, 10);
          const index = this.framesA.findIndex(f => f.dateStr === dateStr);
          if (index !== -1 && this.animationController) {
            this.animationController.seek(index);
          }
        },
        onCameraFollowToggle: (enabled) => {
          if (this.splitView.cameraFollowerA) this.splitView.cameraFollowerA.enabled = enabled;
          if (this.splitView.cameraFollowerB) this.splitView.cameraFollowerB.enabled = enabled;
        },
        onSpeedChange: (speed) => {
          if (this.animationController) this.animationController.setSpeed(speed);
        }
      });
      
      this.slider.setRange(minDate, maxDate);
      this.slider.setDate(minDate);

      // 7. Render duration delta overlay
      this.renderDeltaOverlay(data.deltaDays, schedA?.completionDate, schedB?.completionDate);
    } catch (err) {
      console.error('TimelineComparison failed to initialize:', err);
    }
  }

  private renderDeltaOverlay(deltaDays: number | null, compA: string, compB: string): void {
    if (this.overlayEl) this.overlayEl.remove();

    this.overlayEl = document.createElement('div');
    this.overlayEl.className = 'timeline-comparison-overlay';
    
    this.overlayEl.style.cssText = `
      position: absolute;
      top: 24px;
      right: 24px;
      background: rgba(15, 23, 42, 0.85);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 12px;
      padding: 16px;
      color: #f8fafc;
      font-family: 'Inter', -apple-system, sans-serif;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
      z-index: 100;
      display: flex;
      flex-direction: column;
      gap: 6px;
      font-size: 13px;
    `;

    const title = document.createElement('div');
    title.style.fontWeight = '700';
    title.style.color = '#7c3aed';
    title.textContent = 'Prazo dos Cenários';
    this.overlayEl.appendChild(title);

    const detailA = document.createElement('div');
    detailA.innerHTML = `Cenário A: <span style="font-weight: 600; color: #e2e8f0;">${compA ? this.formatDateStr(compA) : 'N/A'}</span>`;
    this.overlayEl.appendChild(detailA);

    const detailB = document.createElement('div');
    detailB.innerHTML = `Cenário B: <span style="font-weight: 600; color: #e2e8f0;">${compB ? this.formatDateStr(compB) : 'N/A'}</span>`;
    this.overlayEl.appendChild(detailB);

    if (deltaDays !== null) {
      const deltaEl = document.createElement('div');
      deltaEl.style.marginTop = '4px';
      deltaEl.style.borderTop = '1px solid rgba(255, 255, 255, 0.08)';
      deltaEl.style.paddingTop = '6px';
      deltaEl.style.fontWeight = '600';

      if (deltaDays > 0) {
        deltaEl.style.color = '#f87171'; // Red for delay
        deltaEl.textContent = `Atraso no Cenário B: +${deltaDays} dias`;
      } else if (deltaDays < 0) {
        deltaEl.style.color = '#34d399'; // Green for gain
        deltaEl.textContent = `Ganho no Cenário B: ${Math.abs(deltaDays)} dias`;
      } else {
        deltaEl.style.color = '#e2e8f0';
        deltaEl.textContent = `Prazos idênticos`;
      }
      this.overlayEl.appendChild(deltaEl);
    }

    this.container.appendChild(this.overlayEl);
  }

  private parseUTCDate(dateStr: string): Date {
    const [year, month, day] = dateStr.split('T')[0].split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day));
  }

  private formatDateStr(dateStr: string): string {
    const d = this.parseUTCDate(dateStr);
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC'
    }).format(d);
  }

  public destroy(): void {
    if (this.animationController) {
      this.animationController.destroy();
      this.animationController = null;
    }
    if (this.slider) {
      this.slider.destroy();
      this.slider = null;
    }
    if (this.overlayEl) {
      this.overlayEl.remove();
      this.overlayEl = null;
    }
    this.splitView.deactivate();
  }
}
