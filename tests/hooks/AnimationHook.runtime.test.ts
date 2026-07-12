import { describe, expect, it, vi } from 'vitest';
import { gsap } from 'gsap';
import { AnimationHook } from '../../src/lib/components/hooks/AnimationHook.js';

function createHarness(entries: any[]) {
	const main = gsap.timeline({ paused: true });
	const timelineManager = {
		addLabel: (label: string, position: number) => main.addLabel(label, position),
		add: (timeline: gsap.core.Timeline, position: gsap.Position) => main.add(timeline, position)
	};
	const target = document.createElement('div');
	document.body.appendChild(target);
	const resources = new Map<string, unknown>([['animationTarget', target]]);
	const context = {
		data: { animations: { enabled: true } },
		contextData: {
			id: 'text-card',
			type: 'TEXT',
			timeline: { startAt: 2, endAt: 6 },
			animations: { enabled: true, list: entries },
			appearance: {}
		},
		resources,
		duration: 4,
		isActive: true,
		disabled: false
	} as any;
	const hook = new AnimationHook({
		timelineManager: timelineManager as any,
		componentAnimationTransformer: { handle: (value: unknown) => value } as any,
		splitTextCache: { clearCache: vi.fn(), getSplitText: vi.fn() } as any
	});
	return { hook, context, main, target };
}

const opacityEntry = (enabled = true) => ({
	id: 'fade',
	name: 'Fade',
	startAt: 0.5,
	enabled,
	animation: {
		id: 'fade-preset',
		duration: 1,
		timeline: [
			{
				tweens: [{ method: 'from', vars: { duration: 1, opacity: 0, ease: 'none' } }]
			}
		]
	}
});

describe('AnimationHook runtime evaluation', () => {
	it('honors component and animation start offsets and deterministic reseeks', async () => {
		const { hook, context, main, target } = createHarness([opacityEntry()]);
		await hook.handle('setup', context);

		main.seek(2.5, false);
		expect(Number(target.style.opacity)).toBeCloseTo(0, 6);
		main.seek(3, false);
		const midpoint = Number(target.style.opacity);
		main.seek(3.5, false);
		main.seek(3, false);
		expect(Number(target.style.opacity)).toBeCloseTo(midpoint, 6);
		expect(midpoint).toBeCloseTo(0.5, 6);

		await hook.handle('destroy', context);
		main.kill();
		target.remove();
	});

	it('does not build entries explicitly disabled by the author', async () => {
		const { hook, context, main, target } = createHarness([opacityEntry(false)]);
		await hook.handle('setup', context);
		expect(main.getChildren()).toHaveLength(0);
		main.kill();
		target.remove();
	});
});
