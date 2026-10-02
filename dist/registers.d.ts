import type _SplitText from 'gsap/SplitText';
type GsapRegistry = {
    ExpoScaleEase: gsap.ExpoScaleEase;
    RoughEase: gsap.RoughEase;
    SlowMo: gsap.SlowMo;
    MotionPathPlugin: gsap.plugins.MotionPathPlugin;
    Physics2DPlugin: gsap.plugins.Physics2DPlugin;
    SplitText: typeof _SplitText;
    PixiPlugin: gsap.plugins.PixiPlugin;
};
export declare const registerGsapPlugins: () => Promise<GsapRegistry>;
export {};
