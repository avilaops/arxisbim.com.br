/**
 * Geometry Tests
 * Testes para o sistema de geometria 3D (clipping, sections)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ClippingGeometry, SectionPlane } from '../engine/geometry';

describe('Geometry Module', () => {
  describe('SectionPlane', () => {
    let plane: SectionPlane;

    beforeEach(() => {
      plane = new SectionPlane('x', 5);
    });

    it('should create section plane with correct axis and position', () => {
      expect(plane.axis).toBe('x');
      expect(plane.position).toBe(5);
      expect(plane.enabled).toBe(true);
    });

    it('should get position vector', () => {
      const pos = plane.getPositionVector();
      expect(pos).toBeDefined();
      expect(pos.x).toBe(5);
      expect(pos.y).toBe(0);
      expect(pos.z).toBe(0);
    });

    it('should clone correctly', () => {
      const cloned = plane.clone();
      expect(cloned.axis).toBe(plane.axis);
      expect(cloned.position).toBe(plane.position);
      expect(cloned.enabled).toBe(plane.enabled);
      expect(cloned).not.toBe(plane); // Different instance
    });

    it('should serialize/deserialize correctly', () => {
      const json = plane.toJSON();
      const deserialized = SectionPlane.fromJSON(json);

      expect(deserialized.axis).toBe(plane.axis);
      expect(deserialized.position).toBe(plane.position);
      expect(deserialized.enabled).toBe(plane.enabled);
    });

    it('should return correct string representation', () => {
      expect(plane.toString()).toBe('X=5.00');
    });
  });

  describe('ClippingGeometry', () => {
    // Mock scene for testing
    const mockScene = {
      add: () => {},
      remove: () => {},
      traverse: () => {},
      children: []
    };

    let clippingGeometry: ClippingGeometry;

    beforeEach(() => {
      // @ts-ignore - Mock scene
      clippingGeometry = new ClippingGeometry(mockScene);
    });

    it('should initialize with scene', () => {
      expect(clippingGeometry).toBeDefined();
    });

    it('should add section plane', () => {
      const plane = clippingGeometry.addSectionPlane('x', 10, false); // No lines to avoid THREE.js dependency
      expect(plane).toBeDefined();
      expect(plane.axis).toBe('x');
      expect(plane.position).toBe(10);
      expect(clippingGeometry.hasPlane('x')).toBe(true);
    });

    it('should remove section plane', () => {
      clippingGeometry.addSectionPlane('y', 5, false);
      expect(clippingGeometry.hasPlane('y')).toBe(true);

      const removed = clippingGeometry.removeSectionPlane('y');
      expect(removed).toBe(true);
      expect(clippingGeometry.hasPlane('y')).toBe(false);
    });

    it('should update section plane position', () => {
      clippingGeometry.addSectionPlane('z', 0, false);
      clippingGeometry.updateSectionPlane('z', 15);

      const position = clippingGeometry.getPlanePosition('z');
      expect(position).toBe(15);
    });

    it('should return all planes', () => {
      clippingGeometry.addSectionPlane('x', 1, false);
      clippingGeometry.addSectionPlane('y', 2, false);
      clippingGeometry.addSectionPlane('z', 3, false);

      const planes = clippingGeometry.getPlanes();
      expect(planes.length).toBe(3);
      expect(planes.map(p => p.axis)).toEqual(['x', 'y', 'z']);
    });

    it('should clear all planes', () => {
      clippingGeometry.addSectionPlane('x', 1, false);
      clippingGeometry.addSectionPlane('y', 2, false);
      expect(clippingGeometry.getPlanes().length).toBe(2);

      clippingGeometry.clearAll();
      expect(clippingGeometry.getPlanes().length).toBe(0);
    });

    it('should handle multiple planes on same axis', () => {
      clippingGeometry.addSectionPlane('x', 5, false);
      clippingGeometry.addSectionPlane('x', 10, false); // Should replace

      const planes = clippingGeometry.getPlanes();
      expect(planes.length).toBe(1);
      expect(planes[0].position).toBe(10);
    });
  });
});