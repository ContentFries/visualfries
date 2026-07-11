import { ComponentShape, SceneShape } from '../schemas/scene/index.js';
export function resolveAgentOverlayStyle(style, scene) {
    const width = scene.settings.width;
    const height = scene.settings.height;
    if (style === 'verdict-slam') {
        return {
            x: Math.round(width * 0.07),
            y: Math.round(height * 0.34),
            width: Math.round(width * 0.86),
            height: Math.round(height * 0.13),
            color: '#FFFFFF',
            backgroundColor: '#ED1939',
            fontSize: Math.round(width * 0.105),
            fontFamily: 'Montserrat',
            fontWeight: '900',
            textTransform: 'uppercase',
            radius: 0,
            shadowBlur: 24,
            rotation: -2,
            outlineColor: '#FFFFFF',
            outlineSize: 1
        };
    }
    if (style === 'receipt-metric') {
        return {
            x: Math.round(width * 0.1),
            y: Math.round(height * 0.58),
            width: Math.round(width * 0.8),
            height: Math.round(height * 0.14),
            color: '#FFFFFF',
            backgroundColor: '#2854D6',
            fontSize: Math.round(width * 0.1),
            fontFamily: 'Montserrat',
            fontWeight: '900',
            textTransform: 'uppercase',
            radius: 0,
            shadowBlur: 22,
            rotation: 0,
            outlineColor: '#FFFFFF',
            outlineSize: 1
        };
    }
    if (style === 'micro-proof') {
        return {
            x: Math.round(width * 0.18),
            y: Math.round(height * 0.76),
            width: Math.round(width * 0.64),
            height: Math.round(height * 0.065),
            color: '#FFFFFF',
            backgroundColor: 'rgba(0, 0, 0, 0.82)',
            fontSize: Math.round(width * 0.045),
            fontFamily: 'Inter',
            fontWeight: '800',
            textTransform: 'none',
            radius: 999,
            shadowBlur: 12,
            rotation: 0
        };
    }
    if (style === 'shock-word') {
        return {
            x: Math.round(width * 0.08),
            y: Math.round(height * 0.3),
            width: Math.round(width * 0.84),
            height: Math.round(height * 0.12),
            color: '#FFDF5A',
            backgroundColor: 'rgba(4, 72, 61, 0.92)',
            fontSize: Math.round(width * 0.11),
            fontFamily: 'Montserrat',
            fontWeight: '900',
            textTransform: 'uppercase',
            radius: 22,
            shadowBlur: 16,
            rotation: 0,
            outlineColor: '#052B26',
            outlineSize: 2
        };
    }
    if (style === 'hook-punch') {
        return {
            x: Math.round(width * 0.07),
            y: Math.round(height * 0.12),
            width: Math.round(width * 0.86),
            height: Math.round(height * 0.105),
            color: '#172337',
            backgroundColor: '#FFC727',
            fontSize: Math.round(width * 0.082),
            fontFamily: 'Montserrat',
            fontWeight: '900',
            textTransform: 'uppercase',
            radius: 0,
            shadowBlur: 18,
            rotation: -1.5,
            outlineColor: '#FFFFFF',
            outlineSize: 1
        };
    }
    if (style === 'proof-pill') {
        return {
            x: Math.round(width * 0.11),
            y: Math.round(height * 0.16),
            width: Math.round(width * 0.78),
            height: Math.round(height * 0.082),
            color: '#EFFFF8',
            backgroundColor: 'rgba(4, 72, 61, 0.92)',
            fontSize: Math.round(width * 0.054),
            fontFamily: 'Inter',
            fontWeight: '900',
            textTransform: 'uppercase',
            radius: 999,
            shadowBlur: 14,
            rotation: 0
        };
    }
    if (style === 'danger-crossout') {
        return {
            x: Math.round(width * 0.09),
            y: Math.round(height * 0.17),
            width: Math.round(width * 0.82),
            height: Math.round(height * 0.1),
            color: '#FFFFFF',
            backgroundColor: 'rgba(165, 30, 45, 0.9)',
            fontSize: Math.round(width * 0.068),
            fontFamily: 'Montserrat',
            fontWeight: '900',
            textTransform: 'uppercase',
            radius: 16,
            shadowBlur: 18,
            rotation: -1
        };
    }
    if (style === 'metric-badge') {
        return {
            x: Math.round(width * 0.1),
            y: Math.round(height * 0.115),
            width: Math.round(width * 0.8),
            height: Math.round(height * 0.13),
            color: '#172337',
            backgroundColor: '#FFC727',
            fontSize: Math.round(width * 0.092),
            fontFamily: 'Montserrat',
            fontWeight: '900',
            textTransform: 'uppercase',
            radius: 0,
            shadowBlur: 18,
            rotation: -2,
            outlineColor: '#FFFFFF',
            outlineSize: 1
        };
    }
    if (style === 'cta-card') {
        return {
            x: Math.round(width * 0.08),
            y: Math.round(height * 0.68),
            width: Math.round(width * 0.84),
            height: Math.round(height * 0.12),
            color: '#F7F7F2',
            backgroundColor: 'rgba(17, 24, 39, 0.82)',
            fontSize: Math.round(width * 0.056),
            fontFamily: 'Inter',
            fontWeight: '900',
            textTransform: 'none',
            radius: 18,
            shadowBlur: 16,
            rotation: 0
        };
    }
    if (style === 'soft-card') {
        return {
            x: Math.round(width * 0.1),
            y: Math.round(height * 0.18),
            width: Math.round(width * 0.8),
            height: Math.round(height * 0.12),
            color: '#F7F7F2',
            backgroundColor: 'rgba(0, 0, 0, 0.58)',
            fontSize: Math.round(width * 0.062),
            fontFamily: 'Inter',
            fontWeight: '800',
            textTransform: 'none',
            radius: 18,
            shadowBlur: 12,
            rotation: 0
        };
    }
    return {
        x: Math.round(width * 0.1),
        y: Math.round(height * 0.2),
        width: Math.round(width * 0.8),
        height: Math.round(height * 0.1),
        color: '#FFFFFF',
        backgroundColor: 'rgba(0, 0, 0, 0.64)',
        fontSize: Math.round(width * 0.074),
        fontFamily: 'Montserrat',
        fontWeight: '900',
        textTransform: 'uppercase',
        radius: 18,
        shadowBlur: 14,
        rotation: 0
    };
}
function popAnimation(id, style) {
    const isHardHit = style === 'shock-word' ||
        style === 'hook-punch' ||
        style === 'metric-badge' ||
        style === 'verdict-slam' ||
        style === 'receipt-metric';
    const inDuration = isHardHit ? 0.14 : 0.18;
    const inScale = isHardHit ? 0.72 : 0.84;
    const ease = isHardHit ? 'back.out(2.6)' : 'back.out(1.9)';
    return {
        id: `${id}-pop`,
        name: 'Agent pop in/out',
        animation: {
            id: `${id}-pop-preset`,
            timeline: [
                {
                    tweens: [
                        {
                            method: 'from',
                            vars: {
                                duration: inDuration,
                                scale: inScale,
                                opacity: 0,
                                ease
                            }
                        }
                    ]
                },
                {
                    position: {
                        anchor: 'componentEnd',
                        alignTween: 'end',
                        offset: '0s'
                    },
                    tweens: [
                        {
                            method: 'to',
                            vars: {
                                duration: 0.16,
                                scale: 0.94,
                                opacity: 0,
                                ease: 'power2.in'
                            }
                        }
                    ]
                }
            ]
        }
    };
}
export function createAgentTextOverlayComponent(cue, scene, index = 0) {
    const parsedScene = SceneShape.parse(scene);
    const id = cue.id ?? `agent-text-overlay-${index + 1}`;
    const style = cue.style ?? 'pop-label';
    const defaults = resolveAgentOverlayStyle(style, parsedScene);
    const component = {
        id,
        name: `Agent Overlay: ${cue.text}`,
        type: 'TEXT',
        text: cue.text,
        timeline: {
            startAt: cue.start,
            endAt: cue.end
        },
        order: index,
        appearance: {
            x: cue.x ?? defaults.x,
            y: cue.y ?? defaults.y,
            width: cue.width ?? defaults.width,
            height: cue.height ?? defaults.height,
            rotation: cue.rotation ?? defaults.rotation,
            horizontalAlign: 'center',
            verticalAlign: 'center',
            background: {
                enabled: true,
                color: cue.backgroundColor ?? defaults.backgroundColor,
                target: 'wrapper',
                radius: defaults.radius
            },
            text: {
                fontFamily: cue.fontFamily ?? defaults.fontFamily,
                fontSize: { value: cue.fontSize ?? defaults.fontSize, unit: 'px' },
                fontWeight: cue.fontWeight ?? defaults.fontWeight,
                color: cue.color ?? defaults.color,
                textAlign: 'center',
                textTransform: cue.textTransform ?? defaults.textTransform,
                lineHeight: { value: 1.02, unit: 'em' },
                outline: cue.outlineColor || defaults.outlineColor
                    ? {
                        enabled: true,
                        color: cue.outlineColor ?? defaults.outlineColor ?? '#000000',
                        size: cue.outlineSize ?? defaults.outlineSize ?? 1,
                        opacity: 1,
                        style: 'solid'
                    }
                    : undefined,
                shadow: {
                    enabled: true,
                    color: '#000000',
                    blur: defaults.shadowBlur,
                    offsetX: 0,
                    offsetY: 4
                }
            }
        },
        animations: {
            enabled: cue.animated !== false,
            list: cue.animated === false ? [] : [popAnimation(id, style)]
        }
    };
    return ComponentShape.parse(component);
}
export function addAgentTextOverlays(input) {
    const scene = SceneShape.parse(input.scene);
    const overlayLayer = {
        id: input.layerId ?? 'layer-agent-overlays',
        name: input.layerName ?? 'Agent Overlays',
        order: input.layerOrder ?? 90,
        components: input.overlays.map((cue, index) => createAgentTextOverlayComponent(cue, scene, index))
    };
    return SceneShape.parse({
        ...scene,
        layers: [...scene.layers, overlayLayer]
    });
}
