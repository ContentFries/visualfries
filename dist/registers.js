import { gsap } from 'gsap';
let registered;
export const registerGsapPlugins = async function () {
    if (registered) {
        return registered;
    }
    const { PixiPlugin } = await import('gsap/PixiPlugin');
    const { ExpoScaleEase, RoughEase, SlowMo } = await import('gsap/EasePack');
    const { MotionPathPlugin } = await import('gsap/MotionPathPlugin');
    const { Physics2DPlugin } = await import('gsap/Physics2DPlugin');
    const SplitText = (await import('gsap/SplitText')).default;
    gsap.registerPlugin(ExpoScaleEase, RoughEase, SlowMo, MotionPathPlugin, Physics2DPlugin, SplitText, PixiPlugin);
    registered = {
        ExpoScaleEase,
        RoughEase,
        SlowMo,
        MotionPathPlugin,
        Physics2DPlugin,
        SplitText,
        PixiPlugin
    };
    return registered;
};
const getGsapPlugins = function () {
    if (!registered) {
        throw new Error('Plugins were not registered yet.');
    }
    return registered;
};
