import type {
	AnimationPreset,
	AnimationSequenceItem,
	SetupStep,
	TweenVars
} from '$lib';

export class AnimationPresetFactory {
	static create(id: string): PresetComposer {
		return new PresetComposer(id);
	}

	static from(preset: AnimationPreset): PresetComposer {
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
	private _id: string;
	private _data: Record<string, any> = {};
	private _setup: SetupStep[] = [];
	private _timeline: any[] = [];
	private _description?: string;

	constructor(id: string) {
		this._id = id;
		// Initialize with default preset or empty structure
	}

	withData(data: Record<string, any>): PresetComposer {
		this._data = { ...this._data, ...data };
		return this;
	}

	withSetup(setup: SetupStep[]): PresetComposer {
		this._setup = [...setup];
		return this;
	}

	withTimeline(timeline: AnimationSequenceItem[]): PresetComposer {
		this._timeline = [...timeline];
		return this;
	}

	withDescription(description: string): PresetComposer {
		this._description = description;
		return this;
	}

	// Reset the timeline to start fresh
	resetTimeline(): PresetComposer {
		this._timeline = [];
		return this;
	}

	timeline(): TimelineComposer {
		return new TimelineComposer(this, this._timeline);
	}

	build(): AnimationPreset {
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
	private _presetComposer: PresetComposer;
	private _timeline: any[] = [];

	constructor(presetComposer: PresetComposer, existingTimeline: any[] = []) {
		this._presetComposer = presetComposer;
		this._timeline = [...existingTimeline];
	}

	target(targetQuery: string): TargetComposer {
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
	get timeline(): any[] {
		return this._timeline;
	}

	// Allow updating the preset composer with the current timeline
	updateTimeline(): PresetComposer {
		return this._presetComposer.withTimeline(this._timeline);
	}

	build(): AnimationPreset {
		// Update the timeline before building
		return this.updateTimeline().build();
	}
}

class TargetComposer {
	private _timelineComposer: TimelineComposer;
	private _timelineIndex: number;
	private _timeline: any[];

	constructor(timelineComposer: TimelineComposer, timelineIndex: number) {
		this._timelineComposer = timelineComposer;
		this._timelineIndex = timelineIndex;
		this._timeline = timelineComposer.timeline;
	}

	to(vars: TweenVars, position?: string | number): TargetComposer {
		this._timeline[this._timelineIndex].tweens.push({ method: 'to', vars, position });
		return this;
	}

	from(vars: TweenVars, position?: string | number): TargetComposer {
		this._timeline[this._timelineIndex].tweens.push({ method: 'from', vars, position });
		return this;
	}

	fromTo(vars: TweenVars, position?: string | number): TargetComposer {
		if (!vars.from) {
			throw new Error('from is required for fromTo');
		}
		this._timeline[this._timelineIndex].tweens.push({ method: 'fromTo', vars, position });
		return this;
	}

	set(vars: TweenVars, position?: string | number): TargetComposer {
		this._timeline[this._timelineIndex].tweens.push({ method: 'set', vars, position });
		return this;
	}

	// Set the position of this timeline item
	position(pos: string | number): TargetComposer {
		this._timeline[this._timelineIndex].position = pos;
		return this;
	}

	// Return to timeline context
	timeline(): TimelineComposer {
		return this._timelineComposer;
	}

	// Build the final preset
	build(): AnimationPreset {
		return this.timeline().build();
	}
}
