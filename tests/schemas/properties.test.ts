import { describe, test, expect } from 'vitest';
import { 
  PositionShape,
  SizeShape,
  EnhancedAnimationShape,
  TransitionShape,
  KeyframeShape,
  EffectShape,
  BlurEffectShape
} from '$lib';

describe('Property schemas', () => {
  describe('PositionShape', () => {
    test('should validate valid position', () => {
      const validPosition = {
        x: 100,
        y: 200,
        rotation: 45
      };

      const result = PositionShape.safeParse(validPosition);
      expect(result.success).toBe(true);
    });

    test('should provide default rotation value', () => {
      const minimalPosition = {
        x: 100,
        y: 200
      };

      const result = PositionShape.safeParse(minimalPosition);
      expect(result.success).toBe(true);
      
      if (result.success) {
        expect(result.data.rotation).toBe(0);
      }
    });
  });

  describe('SizeShape', () => {
    test('should validate valid size', () => {
      const validSize = {
        width: 300,
        height: 200,
        scale: 1.5,
        maintainAspectRatio: true
      };

      const result = SizeShape.safeParse(validSize);
      expect(result.success).toBe(true);
    });

    test('should reject negative dimensions', () => {
      const invalidSize = {
        width: -300, // Negative width is invalid
        height: 200
      };

      const result = SizeShape.safeParse(invalidSize);
      expect(result.success).toBe(false);
    });

    test('should provide default values', () => {
      const minimalSize = {
        width: 300,
        height: 200
      };

      const result = SizeShape.safeParse(minimalSize);
      expect(result.success).toBe(true);
      
      if (result.success) {
        expect(result.data.scale).toBe(1);
        expect(result.data.maintainAspectRatio).toBe(true);
      }
    });
  });

  describe('KeyframeShape', () => {
    test('should validate valid keyframe', () => {
      const validKeyframe = {
        time: 2.5,
        value: {
          x: 100,
          y: 200,
          opacity: 0.5
        },
        easing: 'power2.out'
      };

      const result = KeyframeShape.safeParse(validKeyframe);
      expect(result.success).toBe(true);
    });

    test('should fix precision of time values', () => {
      const keyframeWithLongNumber = {
        time: 2.5555555555,
        value: {
          opacity: 0.5
        }
      };

      const result = KeyframeShape.safeParse(keyframeWithLongNumber);
      expect(result.success).toBe(true);
      
      if (result.success) {
        expect(result.data.time).toBe(2.556); // Should round to 3 decimal places
      }
    });
  });

  describe('EnhancedAnimationShape', () => {
    test('should validate valid animation', () => {
      const validAnimation = {
        id: 'animation-1',
        name: 'Fade In',
        type: 'preset',
        presetId: 'fade-in',
        target: 'element',
        timing: {
          delay: 0.5,
          duration: 1.2,
          stagger: 0.1
        },
        easing: 'power2.out'
      };

      const result = EnhancedAnimationShape.safeParse(validAnimation);
      expect(result.success).toBe(true);
    });

    test('should validate keyframe animation', () => {
      const keyframeAnimation = {
        id: 'animation-2',
        name: 'Custom Animation',
        type: 'keyframe',
        target: 'element',
        keyframes: [
          {
            time: 0,
            value: { opacity: 0, x: 0 }
          },
          {
            time: 1,
            value: { opacity: 1, x: 100 },
            easing: 'power2.out'
          }
        ]
      };

      const result = EnhancedAnimationShape.safeParse(keyframeAnimation);
      expect(result.success).toBe(true);
    });

    test('should provide default values', () => {
      const minimalAnimation = {
        id: 'animation-3',
        name: 'Minimal Animation',
        type: 'custom'
      };

      const result = EnhancedAnimationShape.safeParse(minimalAnimation);
      expect(result.success).toBe(true);
      
      if (result.success) {
        expect(result.data.target).toBe('element');
        expect(result.data.autoplay).toBe(true);
        expect(result.data.preserveTransform).toBe(true);
        expect(result.data.easing).toBe('power2.out');
      }
    });
  });

  describe('TransitionShape', () => {
    test('should validate valid transition', () => {
      const validTransition = {
        id: 'transition-1',
        name: 'Fade',
        fromComponentId: 'component-1',
        toComponentId: 'component-2',
        type: 'fade',
        duration: 1.5,
        easing: 'power2.inOut'
      };

      const result = TransitionShape.safeParse(validTransition);
      expect(result.success).toBe(true);
    });

    test('should fix precision of duration values', () => {
      const transitionWithLongNumber = {
        id: 'transition-2',
        fromComponentId: 'component-1',
        toComponentId: 'component-2',
        type: 'slide',
        duration: 1.5555555,
        direction: 'left'
      };

      const result = TransitionShape.safeParse(transitionWithLongNumber);
      expect(result.success).toBe(true);
      
      if (result.success) {
        expect(result.data.duration).toBe(1.556); // Should round to 3 decimal places
      }
    });
  });

  describe('EffectShape', () => {
    test('should validate blur effect', () => {
      const blurEffect = {
        type: 'blur',
        radius: 10,
        intensity: 0.8
      };

      const result = BlurEffectShape.safeParse(blurEffect);
      expect(result.success).toBe(true);
    });

    test('should validate effect with discriminated union', () => {
      const colorAdjustEffect = {
        type: 'colorAdjustment',
        brightness: 0.1,
        contrast: 0.2,
        saturation: -0.1,
        hue: 15
      };

      const result = EffectShape.safeParse(colorAdjustEffect);
      expect(result.success).toBe(true);
      
      if (result.success) {
        expect(result.data.type).toBe('colorAdjustment');
      }
    });

    test('should reject invalid effect type', () => {
      const invalidEffect = {
        type: 'invalidEffectType'
      };

      const result = EffectShape.safeParse(invalidEffect);
      expect(result.success).toBe(false);
    });

    test('should provide default values', () => {
      const minimalBlurEffect = {
        type: 'blur'
      };

      const result = BlurEffectShape.safeParse(minimalBlurEffect);
      expect(result.success).toBe(true);
      
      if (result.success) {
        expect(result.data.radius).toBe(5);
      }
    });
  });
}); 