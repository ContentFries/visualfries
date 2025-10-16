import { EventManager } from '../managers/EventManager.js';
import { StateManager } from '../managers/StateManager.svelte.js';
import { merge } from 'lodash-es';
import md5 from 'md5';
export class ComponentState {
    #data = $state();
    eventManager;
    sceneState;
    refreshCallback;
    constructor(cradle) {
        this.#data = cradle.componentData;
        this.eventManager = cradle.eventManager;
        this.sceneState = cradle.stateManager;
    }
    setRefreshCallback(callback) {
        this.refreshCallback = callback;
    }
    async maybeAutoRefresh() {
        if (this.refreshCallback) {
            try {
                await this.refreshCallback();
            }
            catch (error) {
                console.warn('Auto-refresh callback failed:', error);
                // Don't re-throw to avoid breaking the update operation
            }
        }
    }
    get id() {
        return this.#data.id;
    }
    get type() {
        return this.#data.type;
    }
    get name() {
        return (this.#data.name ??
            this.#data.type.charAt(0).toUpperCase() + this.#data.type.slice(1) + ' Component');
    }
    get start_at() {
        return this.#data.timeline.startAt;
    }
    get end_at() {
        return this.#data.timeline.endAt;
    }
    set start_at(time) {
        this.#data.timeline.startAt = time;
    }
    set end_at(time) {
        this.#data.timeline.endAt = time;
    }
    set name(name) {
        this.#data.name = name;
    }
    get order() {
        return this.#data.order || 1;
    }
    get visible() {
        return this.#data.visible ? this.#data.visible : true;
    }
    get duration() {
        return this.#data.timeline.endAt - this.#data.timeline.startAt;
    }
    get asset_id() {
        // TODO
        return '';
        // return this.#data!.source.assetId;
    }
    get timeline() {
        return this.#data.timeline;
    }
    get appearance() {
        return this.#data.appearance;
    }
    get animations() {
        return this.#data.animations ?? {};
    }
    get effects() {
        return this.#data.effects ?? {};
    }
    get checksum() {
        return (this.id +
            '-' +
            md5(JSON.stringify({
                ...$state.snapshot(this.#data)
                // element: {
                // 	...this.#data!.element,
                // 	path: undefined
                // }
            })));
    }
    #emitChange() {
        this.#data.checksum = md5(JSON.stringify(this.#data)).slice(0, 8);
        this.eventManager.emit('componentchange', this.getData());
    }
    getData() {
        return {
            ...$state.snapshot(this.#data),
            order: this.order,
            // checksum: this.checksum,
            visible: this.visible
        };
    }
    setData(data) {
        const id = this.id;
        const type = this.type;
        const newData = $state({ ...data, id, type });
        this.#data = newData;
        this.#emitChange();
    }
    #changeVideoStart(diff) {
        if (this.type === 'VIDEO') {
            let source = this.#data.source;
            if (!source) {
                source = {
                    startAt: 0
                };
                this.#data.source = source;
            }
            if (source.startAt !== undefined && source.startAt !== null) {
                source.startAt += diff;
                source.startAt = Math.max(0, source.startAt);
            }
            if (source.endAt !== undefined && source.endAt !== null) {
                source.endAt += diff;
            }
        }
        // TODO verify starting time is not beyond video duration
        // const metadata = this.#data!.metadata
        // 	? (this.#data!.metadata as Metadata)
        // 	: ({ starting_time: 0 } as Metadata);
        // let startingTime = metadata.starting_time ? (metadata.starting_time as number) : 0;
        // startingTime += diff;
        // startingTime = Math.max(0, startingTime);
        // this.updateMetadata({
        // 	starting_time: startingTime
        // });
    }
    setStart(start) {
        const beforeStart = this.sceneState.transformTime(this.#data.timeline.startAt);
        const newStart = this.sceneState.transformTime(start);
        const diff = newStart - beforeStart;
        if (diff !== 0) {
            if (this.type === 'VIDEO') {
                this.#changeVideoStart(diff);
            }
            this.#data.timeline.startAt = this.sceneState.transformTime(start);
            this.#emitChange();
        }
    }
    setEnd(end) {
        this.#data.timeline.endAt = this.sceneState.transformTime(end);
        this.#emitChange();
    }
    setStreamPath(path) {
        // if (this.type === 'VIDEO' || this.type === 'AUDIO') {
        //     this.#data!.element.stream_path = path;
        //     this.#emitChange();
        // }
    }
    async updateText(text) {
        if (this.type === 'TEXT') {
            this.#data.text = text;
            this.#emitChange();
            await this.maybeAutoRefresh();
        }
    }
    update(data) {
        console.warn('update not implemented yet', data);
        // const newConfig = {
        // 	...this.#data!.element.config,
        // 	...data
        // };
        // const res = PlacableConfigShape.safeParse(newConfig);
        // if (res.success) {
        // 	this.#data!.element.config = newConfig;
        // 	this.#emitChange();
        // } else {
        // 	console.error('Error updating component data', res.error);
        // }
    }
    async updateAppearance(appearance) {
        const mergedAppearance = merge({}, this.#data.appearance, appearance);
        this.#data = { ...this.#data, appearance: mergedAppearance };
        this.#emitChange();
        await this.maybeAutoRefresh();
    }
    async setVisible(visible) {
        if (this.#data.visible !== visible) {
            this.#data.visible = visible;
            this.#emitChange();
            await this.maybeAutoRefresh();
        }
    }
    async setOrder(order) {
        if (this.#data.order !== order) {
            this.#data.order = order;
            // Note: Emitting change here might trigger frequent updates if order changes often.
            // Consider if the parent manager should handle order changes and emit less frequently.
            this.#emitChange();
            await this.maybeAutoRefresh();
        }
    }
}
