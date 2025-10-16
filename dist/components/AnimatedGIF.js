import { Sprite } from "pixi.js-legacy";
import { Texture, Renderer, settings, SCALE_MODES, Ticker, UPDATE_PRIORITY, } from "pixi.js-legacy";
import { parseGIF, decompressFrames } from "gifuct-js";
/**
 * Runtime object to play animated GIFs. This object is similar to an AnimatedSprite.
 * It support playback (seek, play, stop) as well as animation speed and looping.
 * @see Thanks to {@link https://github.com/matt-way/gifuct-js/ gifuct-js}
 */
class AnimatedGIF extends Sprite {
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
    static defaultOptions = {
        scaleMode: SCALE_MODES.LINEAR,
        fps: 30,
        loop: true,
        animationSpeed: 1,
        autoPlay: true,
        autoUpdate: true,
        onComplete: null,
        onFrameChange: null,
        onLoop: null,
    };
    /**
     * The speed that the animation will play at. Higher is faster, lower is slower.
     * @default 1
     */
    animationSpeed = 1;
    /**
     * Whether or not the animate sprite repeats after playing.
     * @default true
     */
    loop = true;
    /**
     * User-assigned function to call when animation finishes playing. This only happens
     * if loop is set to `false`.
     *
     * @example
     * animation.onComplete = () => {
     *   // finished!
     * };
     */
    onComplete;
    /**
     * User-assigned function to call when animation changes which texture is being rendered.
     *
     * @example
     * animation.onFrameChange = () => {
     *   // updated!
     * };
     */
    onFrameChange;
    /**
     * User-assigned function to call when `loop` is true, and animation is played and
     * loops around to start again. This only happens if loop is set to `true`.
     *
     * @example
     * animation.onLoop = () => {
     *   // looped!
     * };
     */
    onLoop;
    /** The total duration of animation in milliseconds. */
    duration = 0;
    /** Whether to play the animation after constructing. */
    autoPlay = true;
    /** Collection of frame to render. */
    _frames;
    /** Drawing context reference. */
    _context;
    /** Dirty means the image needs to be redrawn. Set to `true` to force redraw. */
    dirty = false;
    /** The current frame number (zero-based index). */
    _currentFrame = 0;
    /** `true` uses PIXI.Ticker.shared to auto update animation time.*/
    _autoUpdate = false;
    /** `true` if the instance is currently connected to PIXI.Ticker.shared to auto update animation time. */
    _isConnectedToTicker = false;
    /** If animation is currently playing. */
    _playing = false;
    /** Current playback position in milliseconds. */
    _currentTime = 0;
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
    static fromBuffer(buffer, options) {
        if (!buffer || buffer.byteLength === 0) {
            throw new Error("Invalid buffer");
        }
        // fix https://github.com/matt-way/gifuct-js/issues/30
        const validateAndFix = (gif) => {
            let currentGce = null;
            for (const frame of gif.frames) {
                currentGce = frame.gce ?? currentGce;
                // fix loosing graphic control extension for same frames
                if ("image" in frame && !("gce" in frame)) {
                    frame.gce = currentGce;
                }
            }
        };
        const gif = parseGIF(buffer);
        validateAndFix(gif);
        const gifFrames = decompressFrames(gif, true);
        const frames = [];
        // Temporary canvases required for compositing frames
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d", {
            willReadFrequently: true,
        });
        const patchCanvas = document.createElement("canvas");
        const patchContext = patchCanvas.getContext("2d");
        canvas.width = gif.lsd.width;
        canvas.height = gif.lsd.height;
        let time = 0;
        let previousFrame = null;
        // Some GIFs have a non-zero frame delay, so we need to calculate the fallback
        const { fps } = Object.assign({}, AnimatedGIF.defaultOptions, options);
        const defaultDelay = 1000 / fps;
        // Precompute each frame and store as ImageData
        for (let i = 0; i < gifFrames.length; i++) {
            // Some GIF's omit the disposalType, so let's assume clear if missing
            const { disposalType = 2, delay = defaultDelay, patch, dims: { width, height, left, top }, } = gifFrames[i];
            patchCanvas.width = width;
            patchCanvas.height = height;
            patchContext.clearRect(0, 0, width, height);
            const patchData = patchContext.createImageData(width, height);
            patchData.data.set(patch);
            patchContext.putImageData(patchData, 0, 0);
            if (disposalType === 3) {
                previousFrame = context.getImageData(0, 0, canvas.width, canvas.height);
            }
            context.drawImage(patchCanvas, left, top);
            const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
            if (disposalType === 2) {
                context.clearRect(0, 0, canvas.width, canvas.height);
            }
            else if (disposalType === 3) {
                context.putImageData(previousFrame, 0, 0);
            }
            frames.push({
                start: time,
                end: time + delay,
                imageData,
            });
            time += delay;
        }
        // clear the canvases
        canvas.width = canvas.height = 0;
        patchCanvas.width = patchCanvas.height = 0;
        const { width, height } = gif.lsd;
        return new AnimatedGIF(frames, { width, height, ...options });
    }
    /**
     * @param frames - Data of the GIF image.
     * @param options - Options for the AnimatedGIF
     */
    constructor(frames, options) {
        super(Texture.EMPTY);
        // Get the options, apply defaults
        const { scaleMode, width, height, ...rest } = Object.assign({}, AnimatedGIF.defaultOptions, options);
        // Create the texture
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        canvas.width = width;
        canvas.height = height;
        this.texture = Texture.from(canvas, { scaleMode });
        this.duration = frames[frames.length - 1].end;
        this._frames = frames;
        this._context = context;
        this._playing = false;
        this._currentTime = 0;
        this._isConnectedToTicker = false;
        Object.assign(this, rest);
        // Draw the first frame
        this.currentFrame = 0;
        if (rest.autoPlay) {
            this.play();
        }
    }
    /** Stops the animation. */
    stop() {
        if (!this._playing) {
            return;
        }
        this._playing = false;
        if (this._autoUpdate && this._isConnectedToTicker) {
            Ticker.shared.remove(this.update, this);
            this._isConnectedToTicker = false;
        }
    }
    /** Plays the animation. */
    play() {
        if (this._playing) {
            return;
        }
        this._playing = true;
        if (this._autoUpdate && !this._isConnectedToTicker) {
            Ticker.shared.add(this.update, this, UPDATE_PRIORITY.HIGH);
            this._isConnectedToTicker = true;
        }
        // If were on the last frame and stopped, play should resume from beginning
        if (!this.loop && this.currentFrame === this._frames.length - 1) {
            this._currentTime = 0;
        }
    }
    /**
     * Get the current progress of the animation from 0 to 1.
     * @readonly
     */
    get progress() {
        return this._currentTime / this.duration;
    }
    /** `true` if the current animation is playing */
    get playing() {
        return this._playing;
    }
    /**
     * Updates the object transform for rendering. You only need to call this
     * if the `autoUpdate` property is set to `false`.
     *
     * @param deltaTime - Time since last tick.
     */
    update(deltaTime) {
        if (!this._playing) {
            return;
        }
        const elapsed = (this.animationSpeed * deltaTime) /
            settings.TARGET_FPMS;
        const currentTime = this._currentTime + elapsed;
        const localTime = currentTime % this.duration;
        const localFrame = this._frames.findIndex((frame) => frame.start <= localTime && frame.end > localTime);
        if (currentTime >= this.duration) {
            if (this.loop) {
                this._currentTime = localTime;
                this.updateFrameIndex(localFrame);
                this.onLoop?.();
            }
            else {
                this._currentTime = this.duration;
                this.updateFrameIndex(this._frames.length - 1);
                this.onComplete?.();
                this.stop();
            }
        }
        else {
            this._currentTime = localTime;
            this.updateFrameIndex(localFrame);
        }
    }
    /**
     * Redraw the current frame, is necessary for the animation to work when
     */
    updateFrame() {
        if (!this.dirty) {
            return;
        }
        // Update the current frame
        const { imageData } = this._frames[this._currentFrame];
        this._context.putImageData(imageData, 0, 0);
        // Workaround hack for Safari & iOS
        // which fails to upload canvas after putImageData
        // See: https://bugs.webkit.org/show_bug.cgi?id=229986
        this._context.fillStyle = "transparent";
        this._context.fillRect(0, 0, 0, 1);
        this.texture.update();
        // Mark as clean
        this.dirty = false;
    }
    /**
     * Renders the object using the WebGL renderer
     *
     * @param {PIXI.Renderer} renderer - The renderer
     * @private
     */
    _render(renderer) {
        this.updateFrame();
        super._render(renderer);
    }
    /**
     * Renders the object using the WebGL renderer
     *
     * @param {PIXI.CanvasRenderer} renderer - The renderer
     * @private
     */
    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    _renderCanvas(renderer) {
        this.updateFrame();
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        super._renderCanvas(renderer);
    }
    /**
     * Whether to use PIXI.Ticker.shared to auto update animation time.
     * @default true
     */
    get autoUpdate() {
        return this._autoUpdate;
    }
    set autoUpdate(value) {
        if (value !== this._autoUpdate) {
            this._autoUpdate = value;
            if (!this._autoUpdate && this._isConnectedToTicker) {
                Ticker.shared.remove(this.update, this);
                this._isConnectedToTicker = false;
            }
            else if (this._autoUpdate &&
                !this._isConnectedToTicker &&
                this._playing) {
                Ticker.shared.add(this.update, this);
                this._isConnectedToTicker = true;
            }
        }
    }
    /** Set the current frame number */
    get currentFrame() {
        return this._currentFrame;
    }
    set currentFrame(value) {
        this.updateFrameIndex(value);
        this._currentTime = this._frames[value].start;
    }
    /** Internally handle updating the frame index */
    updateFrameIndex(value) {
        if (value < 0 || value >= this._frames.length) {
            throw new Error(`Frame index out of range, expecting 0 to ${this.totalFrames}, got ${value}`);
        }
        if (this._currentFrame !== value) {
            this._currentFrame = value;
            this.dirty = true;
            this.onFrameChange?.(value);
        }
    }
    /**
     * Get the total number of frame in the GIF.
     */
    get totalFrames() {
        return this._frames.length;
    }
    /** Destroy and don't use after this. */
    destroy() {
        this.stop();
        super.destroy(true);
        const forceClear = null;
        this._context = forceClear;
        this._frames = forceClear;
        this.onComplete = forceClear;
        this.onFrameChange = forceClear;
        this.onLoop = forceClear;
    }
    /**
     * Cloning the animation is a useful way to create a duplicate animation.
     * This maintains all the properties of the original animation but allows
     * you to control playback independent of the original animation.
     * If you want to create a simple copy, and not control independently,
     * then you can simply create a new Sprite, e.g. `const sprite = new Sprite(animation.texture)`.
     */
    clone() {
        return new AnimatedGIF([...this._frames], {
            autoUpdate: this._autoUpdate,
            loop: this.loop,
            autoPlay: this.autoPlay,
            scaleMode: this.texture.baseTexture.scaleMode,
            animationSpeed: this.animationSpeed,
            width: this._context.canvas.width,
            height: this._context.canvas.height,
            onComplete: this.onComplete,
            onFrameChange: this.onFrameChange,
            onLoop: this.onLoop,
        });
    }
}
export { AnimatedGIF };
;
