import { gsap } from 'gsap';
import { get } from 'lodash-es';
export class SubtitlesHook {
    #handlers = {
        setup: this.#handleSetup.bind(this),
        destroy: this.#handleDestroy.bind(this),
        refresh: this.#handleRefresh.bind(this),
        update: this.#handleUpdate.bind(this),
        'refresh:content': this.#handleRefresh.bind(this),
        'refresh:config': this.#handleRefresh.bind(this)
    };
    types = ['setup', 'update', 'destroy', 'refresh'];
    priority = 1;
    #context;
    #initialized = false;
    #subtitles = [];
    #currentSubtitle = undefined;
    #currentId = undefined;
    #refreshed = false;
    subtitlesManager;
    state;
    constructor(cradle) {
        this.subtitlesManager = cradle.subtitlesManager;
        this.state = cradle.stateManager;
        cradle.eventManager.addEventListener('subtitlessettingschange', () => {
            this.#refreshed = true;
        });
    }
    #removePunctuation(text) {
        if (this.subtitlesManager.settings.punctuation) {
            // punctuation is enabled
            return text;
        }
        // Remove common punctuation marks and chinese punctuation while preserving spaces and word structure
        const regex = /[,.!，。！，]/g;
        return text.replace(regex, '').trim();
    }
    async #handleSetup() {
        if (this.#initialized) {
            return;
        }
        this.#initialized = true;
        const subtitles = this.subtitlesManager.data;
        // Only SubtitleComponent has .source, so check type
        const data = this.#context.data;
        const source = data.source;
        const assetId = data.source && typeof data.source.assetId === 'string' ? data.source.assetId : '';
        if (!assetId) {
            this.#buildFakeContext();
            return;
        }
        const componentSubtitles = subtitles[assetId];
        if (!componentSubtitles || Object.keys(componentSubtitles).length === 0) {
            this.#buildFakeContext();
            return;
        }
        // Extract subtitle array for the specific language or default
        const assetSubtitles = this.subtitlesManager.getAssetSubtitles(assetId);
        const languageCode = source?.languageCode || 'default';
        const subtitleArray = assetSubtitles[languageCode] || Object.values(assetSubtitles)[0] || [];
        this.#subtitles = subtitleArray;
        // const el = this.#buildHtmlElement();
        // this.#context.setResource('wrapperHtmlEl', el);
        if (this.activeSubtitle === undefined) {
            this.#buildFakeContext();
        }
    }
    get activeSubtitle() {
        if (this.#currentSubtitle) {
            if (this.state.currentTime >= this.#currentSubtitle.start_at &&
                this.state.currentTime <= this.#currentSubtitle.end_at) {
                return this.#currentSubtitle.visible ? this.#currentSubtitle : undefined;
            }
        }
        const subtitle = this.#subtitles.find((sub) => this.state.currentTime >= sub.start_at &&
            this.state.currentTime <= sub.end_at &&
            sub.visible !== false);
        return subtitle;
    }
    #buildFakeContext() {
        let background = this.#context.data.appearance.background;
        if (typeof background === 'string') {
            background = null;
        }
        const appearance = {
            x: this.#context.data.appearance.x,
            y: this.#context.data.appearance.y,
            width: this.#context.data.appearance.width,
            height: this.#context.data.appearance.height,
            opacity: this.#context.data.appearance.opacity,
            rotation: this.#context.data.appearance.rotation,
            scaleX: this.#context.data.appearance.scaleX,
            scaleY: this.#context.data.appearance.scaleY,
            background,
            backgroundAlwaysVisible: get(this.#context.data.appearance, 'backgroundAlwaysVisible', false)
        };
        const updateData = {
            ...this.#context.data,
            timeline: { startAt: -2, endAt: -1 },
            appearance,
            type: 'TEXT',
            text: '',
            animations: {
                enabled: false,
                list: []
            }
        };
        this.#context.updateContextData(updateData);
    }
    async #handleUpdate() {
        const contextId = this.activeSubtitle ? this.activeSubtitle.id : undefined;
        if (contextId === this.#currentId && !this.#refreshed) {
            return;
        }
        if ((this.activeSubtitle && this.activeSubtitle.id !== this.#context.contextData.id) ||
            (this.activeSubtitle && this.#refreshed)) {
            this.#currentId = this.activeSubtitle.id;
            const startTime = this.activeSubtitle?.start_at ?? 0;
            const endTime = this.activeSubtitle?.end_at ?? 0;
            const duration = endTime - startTime;
            const animationData = {};
            const wordTimings = [];
            this.activeSubtitle?.words?.forEach((word) => {
                wordTimings.push(gsap.utils.clamp(0, duration, word[1] - startTime)); // timings is relative to the start of the subtitle
            });
            // reorder wordTimings by start_at
            wordTimings.sort((a, b) => a - b);
            animationData.wordStartTimes = wordTimings;
            const wordUnhighlightTimes = [...wordTimings].slice(1);
            if (wordUnhighlightTimes.length > 0) {
                animationData.wordUnhighlightTimes = wordUnhighlightTimes;
            }
            animationData.lineStartTimes = [0, 1];
            animationData.lineUnhighlightTimes = [1];
            this.#context.setResource('animationData', animationData);
            // we need to rebuild subtitle component as text component
            const currentSize = get(this.#context.data, 'appearance.text.fontSize.value', get(this.#context.data, 'appearance.text.fontSize', 50));
            const colorOverride = this.activeSubtitle.color ? { color: this.activeSubtitle.color } : {};
            const visibleOverride = 'visible' in this.activeSubtitle ? { visible: this.activeSubtitle.visible } : {};
            const fontSizeOverride = 'enlarge' in this.activeSubtitle && currentSize
                ? {
                    fontSize: {
                        value: currentSize * (this.activeSubtitle.enlarge / 100),
                        unit: this.#context.data.appearance.text?.fontSize?.unit
                    }
                }
                : {};
            const subtitleContextData = {
                ...this.#context.data,
                id: this.activeSubtitle.id,
                type: 'TEXT',
                text: this.#removePunctuation(this.activeSubtitle.text || ''),
                timeline: {
                    startAt: this.activeSubtitle.start_at,
                    endAt: this.activeSubtitle.end_at
                },
                appearance: {
                    ...this.#context.data.appearance,
                    text: {
                        ...this.#context.data.appearance.text,
                        ...colorOverride,
                        ...fontSizeOverride
                    }
                },
                ...visibleOverride
            };
            this.#context.updateContextData(subtitleContextData);
            if (this.#refreshed) {
                this.#refreshed = false;
            }
        }
        if (!this.activeSubtitle) {
            this.#buildFakeContext();
        }
    }
    async #handleRefresh() {
        await this.#handleDestroy();
        await this.#handleSetup();
        this.#refreshed = true;
    }
    async #handleDestroy() {
        const el = this.#context.getResource('wrapperHtmlEl');
        if (el) {
            el.remove();
            this.#context.setResource('wrapperHtmlEl', undefined);
        }
        this.#subtitles = [];
        this.#currentSubtitle = undefined;
        this.#currentId = undefined;
        this.#initialized = false;
    }
    async handle(type, context) {
        this.#context = context;
        const handler = this.#handlers[type];
        if (handler) {
            await handler();
        }
    }
}
