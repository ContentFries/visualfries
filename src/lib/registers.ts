import { gsap } from 'gsap';
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
let registered: GsapRegistry | undefined;

export const registerGsapPlugins: () => Promise<GsapRegistry> = async function () {
	if (registered) {
		return registered as GsapRegistry;
	}

	const { PixiPlugin } = await import('gsap/PixiPlugin');
	const { ExpoScaleEase, RoughEase, SlowMo } = await import('gsap/EasePack');
	const { MotionPathPlugin } = await import('gsap/MotionPathPlugin');
	const { Physics2DPlugin } = await import('gsap/Physics2DPlugin');
	const SplitText = (await import('gsap/SplitText')).default;

	gsap.registerPlugin(
		ExpoScaleEase,
		RoughEase,
		SlowMo,
		MotionPathPlugin,
		Physics2DPlugin,
		SplitText,
		PixiPlugin
	);

	registered = {
		ExpoScaleEase,
		RoughEase,
		SlowMo,
		MotionPathPlugin,
		Physics2DPlugin,
		SplitText,
		PixiPlugin
	};

	return registered as GsapRegistry;
};

const getGsapPlugins: () => GsapRegistry = function () {
	if (!registered) {
		throw new Error('Plugins were not registered yet.');
	}
	return registered;
};
