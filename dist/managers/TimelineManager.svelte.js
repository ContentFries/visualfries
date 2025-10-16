import { StateManager } from './StateManager.svelte.js';
import { EventManager } from './EventManager.js';
import gsap from 'gsap';
const MIN_PLAYBACK_RATE = 0.25;
const MAX_PLAYBACK_RATE = 4;
export class TimelineManager {
    #timeline;
    #progressTimeline = undefined;
    #watchTicker;
    playbackRate;
    state;
    eventManager;
    loop;
    constructor(cradle) {
        this.state = cradle.stateManager;
        this.eventManager = cradle.eventManager;
        this.#timeline = gsap.timeline({
            id: this.state.data.id,
            paused: true,
            duration: this.state.duration,
            smoothChildTiming: true,
            repeat: cradle.loop ? -1 : 0,
            onRepeat: () => {
                // when looping, we need to manually reset the timeline's time to the start
                // to prevent the internal time from accumulating indefinitely.
                this.#timeline.seek(this.state.startTime);
            }
        });
        this.loop = cradle.loop;
        // prevent unexpected duration changes when we add other child timelines
        this.#createProgressTimeline();
        if (this.#progressTimeline) {
            this.#timeline.add(this.#progressTimeline, 0);
        }
        const rate = $state(1);
        this.playbackRate = rate;
        this.initStateSyncWatchers();
    }
    #createProgressTimeline() {
        if (this.#progressTimeline) {
            this.#timeline.remove(this.#progressTimeline);
            this.#progressTimeline.kill();
            this.#progressTimeline = undefined;
        }
        const progressObject = { progress: 0 };
        this.#progressTimeline = gsap.to(progressObject, {
            progress: 1,
            duration: this.duration,
            ease: 'none'
        });
    }
    initStateSyncWatchers() {
        this.#watchTicker = () => this.watch();
        this.eventManager.on('changestate', this.#handleChangeState.bind(this));
    }
    watch() {
        const rawTime = this.timeline.time();
        if (rawTime >= this.state.endTime) {
            if (this.loop) {
                // handle looping - if gsap animation is longer than the timeline, we need to reset the time to the start
                this.seek(this.state.startTime);
                return;
            }
            else {
                // we should pause let's check
            }
        }
        // handle disabled time zones
        const time = Math.max(this.state.startTime, Math.min(rawTime, this.state.endTime));
        this.state.setCurrentTime(time);
        let shouldSeek = false;
        let setTime = time;
        for (const zone of this.state.disabledTimeZones) {
            if (setTime > zone.start && setTime < zone.end) {
                // If time is in a disabled zone, move to the end of the zone
                setTime = zone.end;
                shouldSeek = true;
            }
        }
        if (shouldSeek) {
            this.seek(setTime);
        }
    }
    #handleChangeState() {
        if (this.state.isPlaying) {
            this.state.state === 'playing' ? this.play() : this.pause();
        }
        else {
            this.pause();
        }
    }
    // temporary
    get timeline() {
        return this.#timeline;
    }
    get duration() {
        return this.state.duration;
    }
    add(timeline, position) {
        // Defensive check: Forcibly set the duration of the incoming timeline
        // to match the main scene's duration. This prevents any child animations
        // with infinite repeats from breaking the main timeline's duration.
        // timeline.duration(this.state.duration);
        this.timeline.add(timeline, position);
        if (this.timeline.duration() < this.state.duration) {
            // we don't care about main timeline duration, as this is controlled by state
            // we only care that it CAN NOT be shorter
            this.timeline.duration(this.state.duration);
        }
    }
    addLabel(label, position) {
        this.timeline.addLabel(label, position);
    }
    seek(requestedTime) {
        const endTime = this.state.endTime;
        const startTime = this.state.startTime;
        let time = Math.max(startTime, Math.min(requestedTime, endTime));
        // Check if the requested time falls within any disabled zone
        for (const zone of this.state.disabledTimeZones) {
            if (time > zone.start && time < zone.end) {
                // If inside a disabled zone, snap to the nearest boundary
                const distToStart = time - zone.start;
                const distToEnd = zone.end - time;
                time = distToStart < distToEnd ? zone.start : zone.end;
                break; // Assume zones don't overlap, exit after finding the first match
            }
        }
        this.timeline.seek(time, false);
        this.state.setCurrentTime(this.timeline.time());
        if (this.state.state !== 'playing') {
            this.eventManager.emit('rerender');
        }
    }
    play() {
        gsap.ticker.add(this.#watchTicker);
        this.timeline.play();
    }
    pause() {
        gsap.ticker.remove(this.#watchTicker);
        this.timeline.pause();
    }
    setPlaybackRate(rate) {
        const clampedRate = Math.max(MIN_PLAYBACK_RATE, Math.min(rate, MAX_PLAYBACK_RATE));
        this.playbackRate = clampedRate;
        this.timeline.timeScale(clampedRate);
    }
    destroy() {
        gsap.ticker.remove(this.#watchTicker);
        this.pause();
        this.timeline.kill();
    }
}
