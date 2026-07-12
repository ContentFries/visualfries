import { describe, expect, it, vi } from 'vitest';

const hoisted = vi.hoisted(() => ({ created: [] as any[] }));

vi.mock('awilix/browser', async (importOriginal) => {
	const actual = await importOriginal<typeof import('awilix/browser')>();
	return {
		...actual,
		createContainer: vi.fn(() => {
			const container = {
				register: vi.fn(),
				resolve: vi.fn(() => ({})),
				dispose: vi.fn().mockResolvedValue(undefined)
			};
			hoisted.created.push(container);
			return container;
		})
	};
});

import { evictContainer, registerNewContainer, removeContainer } from '$lib/DIContainer.ts';

describe('DI container lifecycle', () => {
	it('evicts synchronously and never removes a same-id replacement by stale identity', async () => {
		const scene = { id: 'scene-container-lifecycle' } as any;
		const first = registerNewContainer(scene, []);
		expect(registerNewContainer(scene, [])).toBe(first);

		expect(evictContainer(scene.id)).toBe(first);
		const replacement = registerNewContainer(scene, []);
		expect(replacement).not.toBe(first);

		await removeContainer(scene.id, first);
		expect(registerNewContainer(scene, [])).toBe(replacement);
		expect(replacement.dispose).not.toHaveBeenCalled();

		await removeContainer(scene.id, replacement);
		expect(replacement.dispose).toHaveBeenCalledTimes(1);
		expect(registerNewContainer(scene, [])).not.toBe(replacement);
	});
});
