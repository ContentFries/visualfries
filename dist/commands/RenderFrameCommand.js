import { z } from 'zod';
import { StateManager } from '../managers/StateManager.svelte.js';
import { DomManager } from '../managers/DomManager.js';
import { AppManager } from '../managers/AppManager.svelte.js';
import { DeterministicMediaManager } from '../managers/DeterministicMediaManager.js';
import { RenderFrameEncodingError } from '../schemas/runtime/deterministic.js';
const renderFrameSchema = z.object({
    format: z.enum(['arraybuffer', 'blob', 'png', 'jpg', 'jpeg']).prefault('png'),
    quality: z.number().min(0).max(1).prefault(1),
    target: z.any().optional(),
    imageFormat: z.enum(['png', 'jpg', 'jpeg']).optional(),
    imageQuality: z.number().min(0).max(1).optional()
});
export class RenderFrameCommand {
    sceneState;
    domManager;
    appManager;
    lastRenderedFrame = null;
    lastRenderArgs = null;
    deterministicMediaManager;
    lastDeterministicFingerprint = '';
    constructor(cradle) {
        this.sceneState = cradle.stateManager;
        this.domManager = cradle.domManager;
        this.appManager = cradle.appManager;
        this.deterministicMediaManager = cradle.deterministicMediaManager;
    }
    resolveBlobMimeType(imageFormat) {
        if (!imageFormat) {
            return undefined;
        }
        if (imageFormat === 'jpg' || imageFormat === 'jpeg') {
            return 'image/jpeg';
        }
        return 'image/png';
    }
    async execute(args) {
        const check = renderFrameSchema.safeParse(args);
        if (!check.success) {
            return null;
        }
        const { format, quality, target, imageFormat, imageQuality } = check.data;
        const currentDeterministicFingerprint = this.deterministicMediaManager?.isEnabled() ? this.deterministicMediaManager.getFingerprint() : '';
        // Server optimization: Return cached frame if nothing changed visually and render args match
        if (this.sceneState.environment === 'server' && !this.sceneState.isDirty) {
            if (this.lastRenderedFrame && this.lastRenderArgs) {
                // Check if render args match current args
                const argsMatch = this.lastRenderArgs.format === format &&
                    this.lastRenderArgs.quality === quality &&
                    this.lastRenderArgs.target === target &&
                    this.lastRenderArgs.imageFormat === imageFormat &&
                    this.lastRenderArgs.imageQuality === imageQuality;
                if (argsMatch && this.lastDeterministicFingerprint === currentDeterministicFingerprint) {
                    return this.lastRenderedFrame;
                }
            }
        }
        let frame = null;
        if (format === 'arraybuffer') {
            frame = (await new Promise((resolve, reject) => {
                requestAnimationFrame(() => {
                    const context = this.domManager.canvas.getContext('2d');
                    if (!context) {
                        reject(new Error('Failed to get canvas context'));
                        return;
                    }
                    const imagewidth = this.domManager.canvas.width;
                    const imageheight = this.domManager.canvas.height;
                    const imagedata = context.getImageData(0, 0, imagewidth, imageheight);
                    const frame = imagedata.data.buffer;
                    resolve(frame);
                });
            }));
        }
        if (format === 'blob') {
            const mimeType = this.resolveBlobMimeType(imageFormat);
            const blobQuality = imageQuality ?? quality;
            frame = (await new Promise((resolve, reject) => {
                requestAnimationFrame(() => {
                    this.domManager.canvas.toBlob((blob) => {
                        if (!blob) {
                            reject(new RenderFrameEncodingError(`RenderFrameCommand: canvas.toBlob returned null for format="blob" (imageFormat="${imageFormat ?? 'default'}").`));
                            return;
                        }
                        resolve(blob);
                    }, mimeType, blobQuality);
                });
            }));
        }
        if (format === 'png' || format === 'jpg' || format === 'jpeg') {
            frame =
                this.sceneState.environment === 'server'
                    ? (await new Promise((resolve) => {
                        requestAnimationFrame(() => {
                            const frame = format === 'jpg' || format === 'jpeg'
                                ? this.domManager.canvas.toDataURL('image/jpeg', imageQuality ?? quality)
                                : this.domManager.canvas.toDataURL();
                            resolve(frame);
                        });
                    }))
                    : (await new Promise((resolve) => {
                        requestAnimationFrame(async () => {
                            // Re-render in the RAF so video texture updates are included
                            this.appManager.render();
                            const b64 = await this.appManager.app.renderer.extract.base64(target || this.appManager.app.stage, format, quality);
                            resolve(b64);
                        });
                    }));
        }
        // Cache frame and render args, then clear dirty flag after successful render
        if (this.sceneState.environment === 'server') {
            this.lastRenderedFrame = frame;
            this.lastRenderArgs = { format, quality, target, imageFormat, imageQuality };
            this.lastDeterministicFingerprint = currentDeterministicFingerprint;
            this.sceneState.clearDirty();
        }
        return frame;
    }
}
