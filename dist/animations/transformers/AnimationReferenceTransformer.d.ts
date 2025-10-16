import type { AnimationPreset } from '../..';
import type { AnimationPresetsRegister } from '../AnimationPresetsRegister.js';
export declare class ComponentAnimationTransformer {
    private animationPresetsRegister;
    constructor(cradle: {
        animationPresetsRegister: AnimationPresetsRegister;
    });
    handle(input: unknown): AnimationPreset | null;
}
