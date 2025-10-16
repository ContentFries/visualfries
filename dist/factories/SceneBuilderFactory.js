import { asClass, Lifetime } from 'awilix/browser';
import { registerNewContainer } from '../DIContainer.js';
import { SceneBuilder } from '../SceneBuilder.svelte.js';
import { get } from 'lodash-es';
import { setFontProviders } from '../fonts/fontLoader.js';
class SceneBuilderFactory {
    scene;
    constructor(cradle) {
        this.scene = cradle.sceneBuilder;
    }
    getInstance() {
        return this.scene;
    }
}
const defaultConfig = {
    environment: 'client',
    subtitles: {},
    fonts: [],
    forceCanvas: false,
    scale: 1,
    autoPlay: false,
    loop: false
};
export const createSceneBuilder = async function (sceneData, container, config) {
    setFontProviders(config?.fontProviders);
    const sceneConfig = config ? { ...defaultConfig, ...config } : defaultConfig;
    const sceneSubs = get(sceneData, 'settings.subtitles.data', null);
    const subs = sceneSubs ? sceneSubs : sceneConfig.subtitles;
    const childContainer = registerNewContainer(sceneData, [
        ['environment', sceneConfig.environment],
        ['containerElement', container],
        ['subtitles', subs],
        ['fonts', sceneConfig.fonts],
        ['forceCanvas', sceneConfig.forceCanvas],
        ['scale', sceneConfig.scale],
        ['autoPlay', sceneConfig.autoPlay],
        ['loop', sceneConfig.loop]
    ]);
    // Register the factory
    childContainer.register({
        sceneBuilderFactory: asClass(SceneBuilderFactory, { lifetime: Lifetime.SINGLETON })
    });
    const factory = childContainer.resolve('sceneBuilderFactory');
    const instance = factory.getInstance();
    instance.buildCharactersList();
    await instance.initialize();
    if (sceneConfig.autoPlay) {
        instance.play();
    }
    return instance;
};
