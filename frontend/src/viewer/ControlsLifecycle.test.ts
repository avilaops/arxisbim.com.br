import * as THREE from 'three';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FPSControls } from './FPSControls';
import { ThirdPersonControls } from './ThirdPersonControls';
import { DroneControls } from './DroneControls';

describe('viewer controls lifecycle', () => {
  const controls: Array<{ dispose: () => void }> = [];
  const elements: HTMLElement[] = [];

  afterEach(() => {
    controls.splice(0).forEach(control => control.dispose());
    elements.splice(0).forEach(element => element.remove());
    vi.restoreAllMocks();
  });

  function createElementWithPointerLock(): { element: HTMLElement; requestPointerLock: ReturnType<typeof vi.fn> } {
    const element = document.createElement('div');
    const requestPointerLock = vi.fn();
    Object.defineProperty(element, 'requestPointerLock', {
      configurable: true,
      value: requestPointerLock
    });
    document.body.appendChild(element);
    elements.push(element);
    return { element, requestPointerLock };
  }

  it('removes FPS click handler on dispose', () => {
    const camera = new THREE.PerspectiveCamera();
    const { element, requestPointerLock } = createElementWithPointerLock();
    const control = new FPSControls(camera, element);

    element.click();
    expect(requestPointerLock).toHaveBeenCalledTimes(1);

    control.dispose();
    element.click();

    expect(requestPointerLock).toHaveBeenCalledTimes(1);
  });

  it('removes ThirdPerson click handler on dispose', () => {
    const camera = new THREE.PerspectiveCamera();
    const scene = new THREE.Scene();
    const { element, requestPointerLock } = createElementWithPointerLock();
    const control = new ThirdPersonControls(camera, element, scene);
    control.setEnabled(true);

    element.click();
    expect(requestPointerLock).toHaveBeenCalledTimes(1);

    control.dispose();
    element.click();

    expect(requestPointerLock).toHaveBeenCalledTimes(1);
    expect(scene.getObjectByName('third-person-avatar')).toBeUndefined();
  });

  it('removes Drone click handler on dispose', () => {
    const camera = new THREE.PerspectiveCamera();
    const { element, requestPointerLock } = createElementWithPointerLock();
    const control = new DroneControls(camera, element);
    control.setEnabled(true);

    element.click();
    expect(requestPointerLock).toHaveBeenCalledTimes(1);

    control.dispose();
    element.click();

    expect(requestPointerLock).toHaveBeenCalledTimes(1);
  });

  it('keeps Drone WASD movement horizontal when camera looks vertically', () => {
    const camera = new THREE.PerspectiveCamera();
    camera.position.set(0, 10, 0);
    camera.lookAt(0, 0, 0);

    const { element } = createElementWithPointerLock();
    const control = new DroneControls(camera, element);
    controls.push(control);
    control.setEnabled(true);

    document.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }));
    control.update(1 / 60);

    expect(camera.position.y).toBeCloseTo(10, 5);
    expect(camera.position.z).toBeLessThan(0);
  });
});
