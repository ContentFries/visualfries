import { Sprite } from "pixi.js-legacy";
import { Renderer, SCALE_MODES } from "pixi.js-legacy";
/** Represents a single frame of a GIF. Includes image and timing data. */
interface FrameObject {
    /** Image data for the current frame */
    imageData: ImageData;
    /** The start of the current frame, in milliseconds */
    start: number;
    /** The end of the current frame, in milliseconds */
    end: number;
}
/** Default options for all AnimatedGIF objects. */
interface AnimatedGIFOptions {
    /** Whether to start playing right away */
    autoPlay: boolean;
    /**
     * Scale Mode to use for the texture
     * @type {PIXI.SCALE_MODES}
     */
    scaleMode: SCALE_MODES;
    /** To enable looping */
    loop: boolean;
    /** Speed of the animation */
    animationSpeed: number;
    /** Set to `false` to manage updates yourself */
    autoUpdate: boolean;
    /** The completed callback, optional */
    onComplete: null | (() => void);
    /** The loop callback, optional */
    onLoop: null | (() => void);
    /** The frame callback, optional */
    onFrameChange: null | ((currentFrame: number) => void);
    /** Fallback FPS if GIF contains no time information */
    fps?: number;
}
/** Options for the AnimatedGIF constructor. */
interface AnimatedGIFSize {
    /** Width of the GIF image */
    width: number;
    /** Height of the GIF image */
    height: number;
}
/**
 * Runtime object to play animated GIFs. This object is similar to an AnimatedSprite.
 * It support playback (seek, play, stop) as well as animation speed and looping.
 * @see Thanks to {@link https://github.com/matt-way/gifuct-js/ gifuct-js}
 */
declare class AnimatedGIF extends Sprite {
    /**
     * Default options for all AnimatedGIF objects.
     * @property {PIXI.SCALE_MODES} [scaleMode=PIXI.SCALE_MODES.LINEAR] - Scale mode to use for the texture.
     * @property {boolean} [loop=true] - To enable looping.
     * @property {number} [animationSpeed=1] - Speed of the animation.
     * @property {boolean} [autoUpdate=true] - Set to `false` to manage updates yourself.
     * @property {boolean} [autoPlay=true] - To start playing right away.
     * @property {Function} [onComplete=null] - The completed callback, optional.
     * @property {Function} [onLoop=null] - The loop callback, optional.
     * @property {Function} [onFrameChange=null] - The frame callback, optional.
     * @property {number} [fps=30] - Fallback FPS if GIF contains no time information.
     */
    static defaultOptions: AnimatedGIFOptions;
    /**
     * The speed that the animation will play at. Higher is faster, lower is slower.
     * @default 1
     */
    animationSpeed: number;
    /**
     * Whether or not the animate sprite repeats after playing.
     * @default true
     */
    loop: boolean;
    /**
     * User-assigned function to call when animation finishes playing. This only happens
     * if loop is set to `false`.
     *
     * @example
     * animation.onComplete = () => {
     *   // finished!
     * };
     */
    onComplete?: () => void;
    /**
     * User-assigned function to call when animation changes which texture is being rendered.
     *
     * @example
     * animation.onFrameChange = () => {
     *   // updated!
     * };
     */
    onFrameChange?: (currentFrame: number) => void;
    /**
     * User-assigned function to call when `loop` is true, and animation is played and
     * loops around to start again. This only happens if loop is set to `true`.
     *
     * @example
     * animation.onLoop = () => {
     *   // looped!
     * };
     */
    onLoop?: () => void;
    /** The total duration of animation in milliseconds. */
    readonly duration: number;
    /** Whether to play the animation after constructing. */
    readonly autoPlay: boolean;
    /** Collection of frame to render. */
    private _frames;
    /** Drawing context reference. */
    private _context;
    /** Dirty means the image needs to be redrawn. Set to `true` to force redraw. */
    dirty: boolean;
    /** The current frame number (zero-based index). */
    private _currentFrame;
    /** `true` uses PIXI.Ticker.shared to auto update animation time.*/
    private _autoUpdate;
    /** `true` if the instance is currently connected to PIXI.Ticker.shared to auto update animation time. */
    private _isConnectedToTicker;
    /** If animation is currently playing. */
    private _playing;
    /** Current playback position in milliseconds. */
    private _currentTime;
    /**
     * Create an animated GIF animation from a GIF image's ArrayBuffer. The easiest way to get
     * the buffer is to use Assets.
     * @example
     * import { Assets } from 'pixi.js';
     * import '@pixi/gif';
     *
     * const gif = await Assets.load('file.gif');
     * @param buffer - GIF image arraybuffer from Assets.
     * @param options - Options to use.
     * @returns
     */
    static fromBuffer(buffer: ArrayBuffer, options?: Partial<AnimatedGIFOptions>): AnimatedGIF;
    /**
     * @param frames - Data of the GIF image.
     * @param options - Options for the AnimatedGIF
     */
    constructor(frames: FrameObject[], options: Partial<AnimatedGIFOptions> & AnimatedGIFSize);
    /** Stops the animation. */
    stop(): void;
    /** Plays the animation. */
    play(): void;
    /**
     * Get the current progress of the animation from 0 to 1.
     * @readonly
     */
    get progress(): number;
    /** `true` if the current animation is playing */
    get playing(): boolean;
    /**
     * Updates the object transform for rendering. You only need to call this
     * if the `autoUpdate` property is set to `false`.
     *
     * @param deltaTime - Time since last tick.
     */
    update(deltaTime: number): void;
    /**
     * Redraw the current frame, is necessary for the animation to work when
     */
    private updateFrame;
    /**
     * Renders the object using the WebGL renderer
     *
     * @param {PIXI.Renderer} renderer - The renderer
     * @private
     */
    _render(renderer: Renderer): void;
    /**
     * Renders the object using the WebGL renderer
     *
     * @param {PIXI.CanvasRenderer} renderer - The renderer
     * @private
     */
    _renderCanvas(renderer: any): void;
    /**
     * Whether to use PIXI.Ticker.shared to auto update animation time.
     * @default true
     */
    get autoUpdate(): boolean;
    set autoUpdate(value: boolean);
    /** Set the current frame number */
    get currentFrame(): number;
    set currentFrame(value: number);
    /** Internally handle updating the frame index */
    private updateFrameIndex;
    /**
     * Get the total number of frame in the GIF.
     */
    get totalFrames(): number;
    /** Destroy and don't use after this. */
    destroy(): void;
    /**
     * Cloning the animation is a useful way to create a duplicate animation.
     * This maintains all the properties of the original animation but allows
     * you to control playback independent of the original animation.
     * If you want to create a simple copy, and not control independently,
     * then you can simply create a new Sprite, e.g. `const sprite = new Sprite(animation.texture)`.
     */
    clone(): AnimatedGIF;
}
export { AnimatedGIF };
