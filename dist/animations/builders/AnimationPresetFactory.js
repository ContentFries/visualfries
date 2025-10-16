export class AnimationPresetFactory {
    static create(id) {
        return new PresetComposer(id);
    }
    static from(preset) {
        // Create a new composer initialized with all properties from the existing preset
        const composer = new PresetComposer(preset.id).withData(preset.data || {});
        // Copy the setup steps if they exist
        if (preset.setup && preset.setup.length > 0) {
            composer.withSetup([...preset.setup]);
        }
        // Copy the timeline if it exists
        if (preset.timeline && preset.timeline.length > 0) {
            composer.withTimeline([...preset.timeline]);
        }
        // Copy any other properties we might want to preserve
        if (preset.description) {
            composer.withDescription(preset.description);
        }
        return composer;
    }
}
class PresetComposer {
    _id;
    _data = {};
    _setup = [];
    _timeline = [];
    _description;
    constructor(id) {
        this._id = id;
        // Initialize with default preset or empty structure
    }
    withData(data) {
        this._data = { ...this._data, ...data };
        return this;
    }
    withSetup(setup) {
        this._setup = [...setup];
        return this;
    }
    withTimeline(timeline) {
        this._timeline = [...timeline];
        return this;
    }
    withDescription(description) {
        this._description = description;
        return this;
    }
    // Reset the timeline to start fresh
    resetTimeline() {
        this._timeline = [];
        return this;
    }
    timeline() {
        return new TimelineComposer(this, this._timeline);
    }
    build() {
        // Construct and return the final animation preset
        return {
            id: this._id,
            ...(this._description ? { description: this._description } : {}),
            data: this._data,
            setup: this._setup,
            timeline: this._timeline
        };
    }
}
class TimelineComposer {
    _presetComposer;
    _timeline = [];
    constructor(presetComposer, existingTimeline = []) {
        this._presetComposer = presetComposer;
        this._timeline = [...existingTimeline];
    }
    target(targetQuery) {
        // Create a new sequence item for this target
        const sequenceItem = {
            target: targetQuery,
            tweens: []
        };
        // Add it to the timeline
        this._timeline.push(sequenceItem);
        return new TargetComposer(this, this._timeline.length - 1);
    }
    // Public getter for timeline access
    get timeline() {
        return this._timeline;
    }
    // Allow updating the preset composer with the current timeline
    updateTimeline() {
        return this._presetComposer.withTimeline(this._timeline);
    }
    build() {
        // Update the timeline before building
        return this.updateTimeline().build();
    }
}
class TargetComposer {
    _timelineComposer;
    _timelineIndex;
    _timeline;
    constructor(timelineComposer, timelineIndex) {
        this._timelineComposer = timelineComposer;
        this._timelineIndex = timelineIndex;
        this._timeline = timelineComposer.timeline;
    }
    to(vars, position) {
        this._timeline[this._timelineIndex].tweens.push({ method: 'to', vars, position });
        return this;
    }
    from(vars, position) {
        this._timeline[this._timelineIndex].tweens.push({ method: 'from', vars, position });
        return this;
    }
    fromTo(vars, position) {
        if (!vars.from) {
            throw new Error('from is required for fromTo');
        }
        this._timeline[this._timelineIndex].tweens.push({ method: 'fromTo', vars, position });
        return this;
    }
    set(vars, position) {
        this._timeline[this._timelineIndex].tweens.push({ method: 'set', vars, position });
        return this;
    }
    // Set the position of this timeline item
    position(pos) {
        this._timeline[this._timelineIndex].position = pos;
        return this;
    }
    // Return to timeline context
    timeline() {
        return this._timelineComposer;
    }
    // Build the final preset
    build() {
        return this.timeline().build();
    }
}
