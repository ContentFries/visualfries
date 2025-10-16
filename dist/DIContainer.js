import { createContainer, asClass, asValue, Lifetime } from 'awilix/browser';
import { SceneBuilder } from './SceneBuilder.svelte.js';
import { RenderManager } from './managers/RenderManager.js';
import { StateManager } from './managers/StateManager.svelte.js';
import { TimelineManager } from './managers/TimelineManager.svelte.js';
import { EventManager } from './managers/EventManager.js';
import { DomManager } from './managers/DomManager.js';
import { AppManager } from './managers/AppManager.svelte.js';
import { ComponentsManager } from './managers/ComponentsManager.svelte.js';
import { MediaManager } from './managers/MediaManager.js';
import { SubtitlesManager } from './managers/SubtitlesManager.svelte.js';
import { ComponentDirector } from './directors/ComponentDirector.js';
import { PixiComponentBuilder } from './builders/PixiComponentBuilder.js';
import { MediaHook } from './components/hooks/MediaHook.js';
import { VerifyMediaHook } from './components/hooks/VerifyMediaHook.js';
import { ImageHook } from './components/hooks/ImageHook.js';
import { VerifyImageHook } from './components/hooks/VerifyImageHook.js';
import { PixiVideoTextureHook } from './components/hooks/PixiVideoTextureHook.js';
import { PixiSplitScreenDisplayObjectHook } from './components/hooks/PixiSplitScreenDisplayObjectHook.js';
import { HtmlTextHook } from './components/hooks/HtmlTextHook.js';
import { HtmlAnimationHook } from './components/hooks/HtmlAnimationHook.js';
import { AnimationHook } from './components/hooks/AnimationHook.js';
import { SubtitlesHook } from './components/hooks/SubtitlesHook.js';
import { PixiTextureHook } from './components/hooks/PixiTextureHook.js';
import { PixiDisplayObjectHook } from './components/hooks/PixiDisplayObjectHook.js';
import { PixiGifHook } from './components/hooks/PixiGifHook.js';
import { CanvasShapeHook } from './components/hooks/CanvasShapeHook.js';
import { PixiProgressShapeHook } from './components/hooks/PixiProgressShapeHook.js';
import { HtmlToCanvasHook } from './components/hooks/HtmlToCanvasHook.js';
import { PlayCommand } from './commands/PlayCommand.js';
import { PauseCommand } from './commands/PauseCommand.js';
import { SeekCommand } from './commands/SeekCommand.js';
import { ReplaceSourceOnTimeCommand } from './commands/ReplaceSourceOnTimeCommand.js';
import { RenderFrameCommand } from './commands/RenderFrameCommand.js';
import { UpdateComponentCommand } from './commands/UpdateComponentCommand.js';
import { RenderCommand } from './commands/RenderCommand.js';
import { CommandRunner } from './commands/CommandRunner.js';
import { Component } from './components/Component.svelte.js';
import { ComponentContext } from './components/ComponentContext.svelte.js';
import { Layer } from './layers/Layer.svelte.js';
import { LayersManager } from './managers/LayersManager.svelte.js';
import { MediaSeekingHook } from './components/hooks/MediaSeekingHook.js';
import { VerifyGifHook } from './components/hooks/VerifyGifHook.js';
import { ComponentAnimationTransformer } from './animations/transformers/AnimationReferenceTransformer.js';
import { AnimationPresetsRegister } from './animations/AnimationPresetsRegister.js';
import { SplitTextCache } from './animations/SplitTextCache.js';
import { TimeManager } from './managers/TimeManager.svelte.js';
const containers = new Map();
export const registerNewContainer = function (data, instances) {
    if (containers.has(data.id)) {
        return containers.get(data.id);
    }
    const childContainer = createContainer();
    const paramMap = new Map(instances);
    const subtitlesCollection = paramMap.get('subtitlesCollection') || {};
    // Register constant values
    childContainer.register({
        containerId: asValue(data.id),
        sceneData: asValue(data),
        container: asValue(childContainer),
        ...Object.fromEntries(instances.map(([name, value]) => [
            name, // Awilix uses lowercase by convention
            asValue(value)
        ]))
    });
    // Register all managers as singletons
    childContainer.register({
        timeManager: asClass(TimeManager, { lifetime: Lifetime.SINGLETON }),
        subtitlesManager: asClass(SubtitlesManager, { lifetime: Lifetime.SINGLETON }),
        stateManager: asClass(StateManager, { lifetime: Lifetime.SINGLETON }),
        appManager: asClass(AppManager, { lifetime: Lifetime.SINGLETON }),
        eventManager: asClass(EventManager, { lifetime: Lifetime.SINGLETON }),
        timelineManager: asClass(TimelineManager, { lifetime: Lifetime.SINGLETON }),
        componentsManager: asClass(ComponentsManager, { lifetime: Lifetime.SINGLETON }),
        renderManager: asClass(RenderManager, { lifetime: Lifetime.SINGLETON }),
        domManager: asClass(DomManager, { lifetime: Lifetime.SINGLETON }),
        mediaManager: asClass(MediaManager, { lifetime: Lifetime.SINGLETON }),
        sceneBuilder: asClass(SceneBuilder, { lifetime: Lifetime.SINGLETON }),
        layersManager: asClass(LayersManager, { lifetime: Lifetime.SINGLETON }),
        // transients
        // SceneBuilder ?
        componentDirector: asClass(ComponentDirector),
        pixiComponentBuilder: asClass(PixiComponentBuilder),
        mediaHook: asClass(MediaHook, { lifetime: Lifetime.TRANSIENT }),
        mediaSeekingHook: asClass(MediaSeekingHook, { lifetime: Lifetime.TRANSIENT }),
        verifyMediaHook: asClass(VerifyMediaHook, { lifetime: Lifetime.TRANSIENT }),
        imageHook: asClass(ImageHook, { lifetime: Lifetime.TRANSIENT }),
        verifyImageHook: asClass(VerifyImageHook, { lifetime: Lifetime.TRANSIENT }),
        verifyGifHook: asClass(VerifyGifHook, { lifetime: Lifetime.TRANSIENT }),
        videoTextureHook: asClass(PixiVideoTextureHook, { lifetime: Lifetime.TRANSIENT }),
        splitScreenHook: asClass(PixiSplitScreenDisplayObjectHook, { lifetime: Lifetime.TRANSIENT }),
        htmlTextHook: asClass(HtmlTextHook, { lifetime: Lifetime.TRANSIENT }),
        htmlAnimationHook: asClass(HtmlAnimationHook, { lifetime: Lifetime.TRANSIENT }),
        animationHook: asClass(AnimationHook, { lifetime: Lifetime.TRANSIENT }),
        subtitlesHook: asClass(SubtitlesHook, { lifetime: Lifetime.TRANSIENT }),
        textureHook: asClass(PixiTextureHook, { lifetime: Lifetime.TRANSIENT }),
        objectHook: asClass(PixiDisplayObjectHook, { lifetime: Lifetime.TRANSIENT }),
        gifHook: asClass(PixiGifHook, { lifetime: Lifetime.TRANSIENT }),
        canvasShapeHook: asClass(CanvasShapeHook, { lifetime: Lifetime.TRANSIENT }),
        pixiProgressShapeHook: asClass(PixiProgressShapeHook, { lifetime: Lifetime.TRANSIENT }),
        htmlToCanvasHook: asClass(HtmlToCanvasHook, { lifetime: Lifetime.TRANSIENT }),
        componentAnimationTransformer: asClass(ComponentAnimationTransformer, {
            lifetime: Lifetime.TRANSIENT
        }),
        animationPresetsRegister: asClass(AnimationPresetsRegister, { lifetime: Lifetime.SINGLETON }),
        splitTextCache: asClass(SplitTextCache, { lifetime: Lifetime.SINGLETON }),
        // Register commands
        playCommand: asClass(PlayCommand, { lifetime: Lifetime.SINGLETON }),
        pauseCommand: asClass(PauseCommand, { lifetime: Lifetime.SINGLETON }),
        seekCommand: asClass(SeekCommand, { lifetime: Lifetime.SINGLETON }),
        replaceSourceOnTimeCommand: asClass(ReplaceSourceOnTimeCommand, {
            lifetime: Lifetime.SINGLETON
        }),
        renderFrameCommand: asClass(RenderFrameCommand, { lifetime: Lifetime.SINGLETON }),
        updateComponentCommand: asClass(UpdateComponentCommand, { lifetime: Lifetime.SINGLETON }),
        renderCommand: asClass(RenderCommand, { lifetime: Lifetime.SINGLETON }),
        // Register the command runner
        commandRunner: asClass(CommandRunner, { lifetime: Lifetime.SINGLETON }),
        component: asClass(Component, {
            lifetime: Lifetime.TRANSIENT // New instance per component
        }),
        layer: asClass(Layer),
        componentContext: asClass(ComponentContext, {
            lifetime: Lifetime.TRANSIENT // New instance per component
        })
    });
    // Resolve core dependencies to ensure initialization
    childContainer.resolve('stateManager');
    childContainer.resolve('eventManager');
    childContainer.resolve('timelineManager');
    childContainer.resolve('domManager');
    childContainer.resolve('appManager');
    childContainer.resolve('componentsManager');
    childContainer.resolve('renderManager');
    childContainer.resolve('subtitlesManager');
    containers.set(data.id, childContainer);
    return childContainer;
};
export const removeContainer = function (sceneId) {
    if (containers.has(sceneId)) {
        const container = containers.get(sceneId);
        container.dispose();
        containers.delete(sceneId);
    }
};
