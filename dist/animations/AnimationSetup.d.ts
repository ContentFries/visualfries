import type { AnimationContext } from './AnimationContext.ts';
import type { AnimationEngineAdaptor } from './engines/AnimationEngineAdaptor.ts';
export declare class AnimationSetup {
    private animationContext;
    private engineAdaptor;
    constructor(animationContext: AnimationContext, engineAdaptor: AnimationEngineAdaptor);
    process(): void;
}
