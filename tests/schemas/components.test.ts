import { describe, test, expect } from 'vitest';
import { 
  TextComponentShape, 
  ImageComponentShape, 
  VideoComponentShape,
  ComponentShape,
  ComponentTimelineShape
} from '$lib';

describe('Component schemas', () => {
  const validTimeline = {
    startAt: 0,
    endAt: 5
  };

  const validAppearance = {
      x: 100, 
      y: 200,
      width: 300,
      height: 200
  };

  describe('ComponentTimelineShape', () => {
    test('should validate valid timeline', () => {
      const result = ComponentTimelineShape.safeParse(validTimeline);
      expect(result.success).toBe(true);
    });

    test('should reject negative time values', () => {
      const invalidTimeline = {
        startAt: -1, // Negative time is invalid
        endAt: 5
      };

      const result = ComponentTimelineShape.safeParse(invalidTimeline);
      expect(result.success).toBe(false);
    });
  });

  describe('TextComponentShape', () => {
    test('should validate valid text component', () => {
      const validTextComponent = {
        id: 'text-1',
        type: 'TEXT',
        text: 'Hello world',
        timeline: validTimeline,
        appearance: {
          ...validAppearance,
          text: {
            fontFamily: 'Arial',
            fontSize: 18,
            fontWeight: 'normal',
            lineHeight: 1.2,
            color: '#000000',
            textAlign: 'left'
          },
          verticalAlign: 'center',
          horizontalAlign: 'center'
        }
      };

      const result = TextComponentShape.safeParse(validTextComponent);
      expect(result.success).toBe(true);
    });
  });

  describe('ImageComponentShape', () => {
    test('should validate valid image component', () => {
      const validImageComponent = {
        id: 'image-1',
        type: 'IMAGE',
        timeline: validTimeline,
        appearance: validAppearance,
        source: {
          url: 'https://example.com/image.jpg',
          type: 'url',
          metadata: {
            width: 1200,
            height: 800,
            format: 'jpg'
          }
        }
      };

      const result = ImageComponentShape.safeParse(validImageComponent);
      expect(result.success).toBe(true);
    });
  });

  describe('VideoComponentShape', () => {
    test('should validate valid video component', () => {
      const validVideoComponent = {
        id: 'video-1',
        type: 'VIDEO',
        timeline: validTimeline,
        appearance: validAppearance,
        source: {
          url: 'https://example.com/video.mp4',
          type: 'url',
          metadata: {
            width: 1920,
            height: 1080,
            duration: 30,
            format: 'mp4',
            codec: 'h264',
            framerate: 30
          }
        },
        playback: {
          autoplay: true,
          loop: false,
          muted: true,
          volume: 1,
          playbackRate: 1,
          startAt: 0
        }
      };

      const result = VideoComponentShape.safeParse(validVideoComponent);
      expect(result.success).toBe(true);
    });
  });

  describe('ComponentShape', () => {
    test('should validate different component types via discriminated union', () => {
      const validTextComponent = {
        id: 'text-1',
        type: 'TEXT',
        text: 'Hello world',
        timeline: validTimeline,

        appearance: {
          ...validAppearance,
          text: {
            fontFamily: 'Arial',
            fontSize: {
              value: 18,
              unit: 'px'
            },
            fontWeight: 'normal',
            lineHeight: 1.2,
            color: '#000000',
            textAlign: 'left'
          },
          verticalAlign: 'center',
          horizontalAlign: 'center'
        }
      };

      const validImageComponent = {
        id: 'image-1',
        type: 'IMAGE',
        timeline: validTimeline,
        appearance: validAppearance,
        source: {
          url: 'https://example.com/image.jpg'
        }
      };

      const textResult = ComponentShape.safeParse(validTextComponent);
      expect(textResult.success).toBe(true);

      const imageResult = ComponentShape.safeParse(validImageComponent);
      expect(imageResult.success).toBe(true);

      if (textResult.success && imageResult.success) {
        // Should correctly identify component types
        expect(textResult.data.type).toBe('TEXT');
        expect(imageResult.data.type).toBe('IMAGE');
      }
    });

    test('should reject component with invalid type', () => {
      const invalidComponent = {
        id: 'invalid-1',
        type: 'INVALID_TYPE', // Invalid component type
        timeline: validTimeline,
        appearance: validAppearance
      };

      const result = ComponentShape.safeParse(invalidComponent);
      expect(result.success).toBe(false);
    });
  });
}); 