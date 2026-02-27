import type { Command } from './Command.js';
import { z } from 'zod';
import { StateManager } from '$lib/managers/StateManager.svelte.js';
import { DeterministicMediaManager } from '$lib/managers/DeterministicMediaManager.js';

const replaceSourceOnTimeSchema = z.object({
	componentId: z.string(),
	base64data: z.string(),
	time: z.number()
});

export class ReplaceSourceOnTimeCommand implements Command<void> {
	private stateManager: StateManager;
	private deterministicMediaManager: DeterministicMediaManager;

	constructor(cradle: {
		stateManager: StateManager;
		deterministicMediaManager: DeterministicMediaManager;
	}) {
		this.stateManager = cradle.stateManager;
		this.deterministicMediaManager = cradle.deterministicMediaManager;
	}

	async execute(args: unknown): Promise<void> {
		const check = replaceSourceOnTimeSchema.safeParse(args);
		if (!check.success) {
			return;
		}

		const { componentId, base64data, time } = check.data;
		if (!this.deterministicMediaManager.isEnabled()) {
			return;
		}

		const frameIndex = Math.max(0, Math.round(time * (this.stateManager.data.settings.fps || 30)));
		const blob = this.#base64ToBlob(base64data);
		if (!blob) {
			return;
		}

		const cacheKey = `replace:${componentId}:${frameIndex}:${this.#hashBase64(base64data)}`;
		this.deterministicMediaManager.setOneTimeOverride(componentId, frameIndex, {
			kind: 'blob',
			cacheKey,
			blob
		});
		this.stateManager.markDirty();
		return;
	}

	#base64ToBlob(base64Data: string): Blob | null {
		try {
			const [header, encoded] = base64Data.split(',', 2);
			const mimeMatch = /data:(.*?);base64/.exec(header ?? '');
			const mimeType = mimeMatch?.[1] || 'image/png';
			const binary = atob(encoded ?? base64Data);
			const bytes = new Uint8Array(binary.length);
			for (let index = 0; index < binary.length; index += 1) {
				bytes[index] = binary.charCodeAt(index);
			}
			return new Blob([bytes], { type: mimeType });
		} catch {
			return null;
		}
	}

	#hashBase64(value: string): string {
		let hash = 0x811c9dc5;
		for (let index = 0; index < value.length; index += 1) {
			hash ^= value.charCodeAt(index);
			hash = Math.imul(hash, 0x01000193) >>> 0;
		}
		return hash.toString(16).padStart(8, '0');
	}
}
