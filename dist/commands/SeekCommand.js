import { z } from 'zod';
import { TimelineManager } from '../managers/TimelineManager.svelte.js';
import { StateManager } from '../managers/StateManager.svelte.js';
import { RenderManager } from '../managers/RenderManager.js';
const seekSchema = z.object({
    time: z.number()
});
export class SeekCommand {
    timeline;
    state;
    renderManager;
    constructor(cradle) {
        this.timeline = cradle.timelineManager;
        this.state = cradle.stateManager;
        this.renderManager = cradle.renderManager;
    }
    async execute(args) {
        const check = seekSchema.safeParse(args);
        if (!check.success) {
            return;
        }
        const time = Math.max(0, Math.min(check.data.time, this.state.duration));
        this.timeline.seek(time);
        // Ensure a deterministic render on server after seek to advance media frames
        if (this.state.environment === 'server') {
            // Wait for fonts to be ready before rendering
            // This is critical for subtitle animations that use SplitText -
            // if fonts aren't loaded, text measurements will be wrong and
            // animations may fail silently or not appear on first subtitles
            if (typeof document !== 'undefined' && document.fonts?.ready) {
                try {
                    await Promise.race([
                        document.fonts.ready,
                        new Promise((resolve) => setTimeout(resolve, 2000)) // 2s timeout
                    ]);
                }
                catch {
                    // Ignore font loading errors, continue with rendering
                }
            }
            // Try multiple render passes until loading state clears or attempts exhausted
            const maxAttempts = 10;
            for (let i = 0; i < maxAttempts; i += 1) {
                await this.renderManager.render();
                if (this.state.state !== 'loading')
                    break;
                await new Promise((resolve) => setTimeout(resolve, 30));
            }
            if (this.state.state === 'loading') {
                console.warn('SeekCommand: Max render attempts exhausted while still loading');
            }
            // Re-seek to apply correct animation state to any animations
            // that were added during the render passes above.
            // This fixes the race condition where subtitle animations are added
            // AFTER the initial seek, causing them to miss their initial state.
            this.timeline.seek(time);
        }
    }
}
