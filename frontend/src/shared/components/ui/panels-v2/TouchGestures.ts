/**
 * Touch Gestures
 * Sistema de reconhecimento de gestos touch para mobile/tablet
 */

export interface TouchGestureEvent {
  type: 'tap' | 'doubletap' | 'longtap' | 'swipe' | 'pinch' | 'rotate' | 'pan';
  detail: {
    x?: number;
    y?: number;
    deltaX?: number;
    deltaY?: number;
    distance?: number;
    scale?: number;
    rotation?: number;
    direction?: 'up' | 'down' | 'left' | 'right';
    velocity?: number;
  };
}

export class TouchGestures {
  private element: HTMLElement;
  private listeners: Map<string, ((event: TouchGestureEvent) => void)[]> = new Map();
  
  // Touch state
  private touches: Touch[] = [];
  private startTouches: Touch[] = [];
  private startTime: number = 0;
  private lastTapTime: number = 0;
  private longTapTimer?: number;
  private initialDistance: number = 0;
  private initialRotation: number = 0;
  private isPanning: boolean = false;
  private lastPanPosition = { x: 0, y: 0 };

  // Configuration
  private config = {
    tapThreshold: 10,
    doubleTapDelay: 300,
    longTapDelay: 500,
    swipeThreshold: 50,
    pinchThreshold: 10
  };

  constructor(element: HTMLElement) {
    this.element = element;
    this.attachListeners();
  }

  private attachListeners(): void {
    this.element.addEventListener('touchstart', this.handleTouchStart.bind(this));
    this.element.addEventListener('touchmove', this.handleTouchMove.bind(this));
    this.element.addEventListener('touchend', this.handleTouchEnd.bind(this));
    this.element.addEventListener('touchcancel', this.handleTouchCancel.bind(this));
  }

  private handleTouchStart(event: TouchEvent): void {
    this.touches = Array.from(event.touches);
    this.startTouches = Array.from(event.touches);
    this.startTime = Date.now();

    if (this.touches.length === 1) {
      // Single touch - check for tap/long tap
      const touch = this.touches[0];
      this.lastPanPosition = { x: touch.clientX, y: touch.clientY };
      
      this.longTapTimer = window.setTimeout(() => {
        this.emit('longtap', {
          x: touch.clientX,
          y: touch.clientY
        });
      }, this.config.longTapDelay);
    } else if (this.touches.length === 2) {
      // Two touches - pinch/rotate
      this.clearLongTapTimer();
      this.initialDistance = this.getDistance(this.touches[0], this.touches[1]);
      this.initialRotation = this.getRotation(this.touches[0], this.touches[1]);
    }
  }

  private handleTouchMove(event: TouchEvent): void {
    this.touches = Array.from(event.touches);
    
    if (this.touches.length === 1) {
      // Pan gesture
      const touch = this.touches[0];
      const deltaX = touch.clientX - this.lastPanPosition.x;
      const deltaY = touch.clientY - this.lastPanPosition.y;

      if (!this.isPanning && (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5)) {
        this.isPanning = true;
        this.clearLongTapTimer();
      }

      if (this.isPanning) {
        this.emit('pan', {
          x: touch.clientX,
          y: touch.clientY,
          deltaX,
          deltaY
        });
        
        this.lastPanPosition = { x: touch.clientX, y: touch.clientY };
      }
    } else if (this.touches.length === 2) {
      // Pinch and rotate gestures
      const currentDistance = this.getDistance(this.touches[0], this.touches[1]);
      const currentRotation = this.getRotation(this.touches[0], this.touches[1]);

      const scale = currentDistance / this.initialDistance;
      const rotation = currentRotation - this.initialRotation;

      // Emit pinch if scale changed significantly
      if (Math.abs(scale - 1) > 0.01) {
        this.emit('pinch', {
          scale,
          distance: currentDistance
        });
      }

      // Emit rotate if rotation changed significantly
      if (Math.abs(rotation) > 2) {
        this.emit('rotate', {
          rotation
        });
      }
    }
  }

  private handleTouchEnd(event: TouchEvent): void {
    const endTime = Date.now();
    const duration = endTime - this.startTime;

    this.clearLongTapTimer();

    if (this.startTouches.length === 1 && event.changedTouches.length === 1) {
      const startTouch = this.startTouches[0];
      const endTouch = event.changedTouches[0];

      const deltaX = endTouch.clientX - startTouch.clientX;
      const deltaY = endTouch.clientY - startTouch.clientY;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

      if (!this.isPanning && distance < this.config.tapThreshold) {
        // Tap or double tap
        const timeSinceLastTap = endTime - this.lastTapTime;
        
        if (timeSinceLastTap < this.config.doubleTapDelay) {
          this.emit('doubletap', {
            x: endTouch.clientX,
            y: endTouch.clientY
          });
          this.lastTapTime = 0; // Reset
        } else {
          this.emit('tap', {
            x: endTouch.clientX,
            y: endTouch.clientY
          });
          this.lastTapTime = endTime;
        }
      } else if (distance > this.config.swipeThreshold) {
        // Swipe gesture
        const velocity = distance / duration;
        const direction = this.getSwipeDirection(deltaX, deltaY);
        
        this.emit('swipe', {
          deltaX,
          deltaY,
          distance,
          direction,
          velocity
        });
      }
    }

    this.isPanning = false;
    this.touches = Array.from(event.touches);
    this.startTouches = [];
  }

  private handleTouchCancel(): void {
    this.clearLongTapTimer();
    this.touches = [];
    this.startTouches = [];
    this.isPanning = false;
  }

  private getDistance(touch1: Touch, touch2: Touch): number {
    const dx = touch2.clientX - touch1.clientX;
    const dy = touch2.clientY - touch1.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  private getRotation(touch1: Touch, touch2: Touch): number {
    const dx = touch2.clientX - touch1.clientX;
    const dy = touch2.clientY - touch1.clientY;
    return Math.atan2(dy, dx) * 180 / Math.PI;
  }

  private getSwipeDirection(deltaX: number, deltaY: number): 'up' | 'down' | 'left' | 'right' {
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      return deltaX > 0 ? 'right' : 'left';
    } else {
      return deltaY > 0 ? 'down' : 'up';
    }
  }

  private clearLongTapTimer(): void {
    if (this.longTapTimer) {
      clearTimeout(this.longTapTimer);
      this.longTapTimer = undefined;
    }
  }

  private emit(type: TouchGestureEvent['type'], detail: TouchGestureEvent['detail']): void {
    const event: TouchGestureEvent = { type, detail };
    const callbacks = this.listeners.get(type) || [];
    callbacks.forEach(callback => callback(event));
  }

  public on(type: TouchGestureEvent['type'], callback: (event: TouchGestureEvent) => void): void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, []);
    }
    this.listeners.get(type)!.push(callback);
  }

  public off(type: TouchGestureEvent['type'], callback: (event: TouchGestureEvent) => void): void {
    const callbacks = this.listeners.get(type);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  public destroy(): void {
    this.clearLongTapTimer();
    this.listeners.clear();
  }
}

/**
 * Helper function to attach gesture recognition to an element
 */
export function enableTouchGestures(element: HTMLElement): TouchGestures {
  return new TouchGestures(element);
}

/**
 * Exemplo de uso:
 * 
 * const gestures = new TouchGestures(viewerElement);
 * 
 * gestures.on('tap', (event) => {
 *   console.log('Tap at:', event.detail.x, event.detail.y);
 * });
 * 
 * gestures.on('doubletap', (event) => {
 *   // Zoom in
 * });
 * 
 * gestures.on('pinch', (event) => {
 *   camera.zoom *= event.detail.scale;
 * });
 * 
 * gestures.on('pan', (event) => {
 *   camera.position.x += event.detail.deltaX;
 *   camera.position.y += event.detail.deltaY;
 * });
 * 
 * gestures.on('swipe', (event) => {
 *   if (event.detail.direction === 'left') {
 *     // Next view
 *   }
 * });
 */
