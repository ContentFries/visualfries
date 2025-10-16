import { describe, test, expect } from 'vitest';
import { SceneSettingsShape, SceneLayerShape, SceneShape } from '$lib';

describe('Core schemas', () => {
  describe('SceneSettingsShape', () => {
    test('should validate valid scene settings', () => {
      const validSettings = {
        width: 1920,
        height: 1080,
        duration: 30.0,
        frameRate: 30,
        background: {
          type: 'solid',
          color: '#000000'
        }
      };

      const result = SceneSettingsShape.safeParse(validSettings);
      expect(result.success).toBe(true);
    });

    test('should reject invalid scene settings', () => {
      const invalidSettings = {
        width: -1920, // Negative width is invalid
        height: 1080,
        duration: 30.0,
        frameRate: 30
      };

      const result = SceneSettingsShape.safeParse(invalidSettings);
      expect(result.success).toBe(false);
    });
  });

  describe('SceneLayerShape', () => {
    test('should validate valid scene layer', () => {
      const validLayer = {
        id: 'layer-1',
        name: 'Background Layer',
        order: 0,
        visible: true,
        components: []
      };

      const result = SceneLayerShape.safeParse(validLayer);
      expect(result.success).toBe(true);
    });

    test('should provide default values', () => {
      const minimalLayer = {
        id: 'layer-1'
      };

      const result = SceneLayerShape.safeParse(minimalLayer);
      expect(result.success).toBe(true);
      
      if (result.success) {
        expect(result.data.order).toBe(0);
        expect(result.data.visible).toBe(true);
        expect(result.data.components).toEqual([]);
      }
    });
  });

  describe('SceneShape', () => {
    test('should validate minimal scene', () => {
      const minimalScene = {
        id: 'scene-1',
        version: '2.0',
        name: 'Test Scene',
        settings: {
          width: 1920,
          height: 1080,
          duration: 30.0,
          fps: 30,
        },
        layers: [
          {
            id: 'layer-1',
            name: 'Background Layer',
            components: []
          }
        ]
      };

      const result = SceneShape.safeParse(minimalScene);
      expect(result.success).toBe(true);
    });

    test('should validate valid scene', () => {
      const validScene = {
        id: 'scene-1',
        version: '2.0',
        name: 'Test Scene',
        settings: {
          width: 1920,
          height: 1080,
          duration: 30.0,
          fps: 30
        },
        layers: [
          {
            id: 'layer-1',
            name: 'Background Layer',
            order: 0,
            visible: true,
            components: [],
          }
        ]
      };

      const result = SceneShape.safeParse(validScene);
      expect(result.success).toBe(true);
    });

    test('should provide default values', () => {
      const minimalScene = {
        id: 'scene-1',
        version: '2.0',
        settings: {
            width: 1920,
            height: 1080,
          duration: 30.0
        }
      };

      const result = SceneShape.safeParse(minimalScene);
      expect(result.success).toBe(true);
      
      if (result.success) {
        expect(result.data.layers).toEqual([]);
        expect(result.data.transitions).toEqual([]);
        expect(result.data.audioTracks).toEqual([]);
      }
    });
  });
}); 