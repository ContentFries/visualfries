import { describe, expect, it, vi } from 'vitest';

vi.mock('pixi.js-legacy', async (importOriginal) => {
	const actual = await importOriginal<typeof import('pixi.js-legacy')>();
	class Container {
		children: any[] = [];
		parent: any;
		zIndex = 0;
		addChild(child: any) {
			if (child?.parent && typeof child.parent.removeChild === 'function') {
				child.parent.removeChild(child);
			}
			child.parent = this;
			this.children.push(child);
			return child;
		}
		addChildAt(child: any, index: number) {
			if (index < 0 || index > this.children.length) {
				throw new Error(`The index ${index} supplied is out of bounds ${this.children.length}`);
			}
			if (child?.parent && typeof child.parent.removeChild === 'function') {
				child.parent.removeChild(child);
			}
			child.parent = this;
			this.children.splice(index, 0, child);
			return child;
		}
		removeChild(child: any) {
			const index = this.children.indexOf(child);
			if (index >= 0) {
				this.children.splice(index, 1);
				child.parent = undefined;
			}
			return child;
		}
		getChildIndex(child: any) {
			return this.children.indexOf(child);
		}
		setChildIndex(child: any, index: number) {
			const currentIndex = this.children.indexOf(child);
			if (currentIndex < 0) {
				throw new Error('Child does not belong to this container');
			}
			if (index < 0 || index >= this.children.length) {
				throw new Error(`The index ${index} supplied is out of bounds ${this.children.length}`);
			}
			this.children.splice(currentIndex, 1);
			this.children.splice(index, 0, child);
		}
		destroy() {}
	}

	return {
		...actual,
		Container
	};
});

import { Layer } from '$lib/layers/Layer.svelte.ts';

const createComponent = (id: string, startAt: number, displayObject?: any) =>
	({
		id,
		type: 'VIDEO',
		checksum: id,
		displayObject,
		props: {
			timeline: { startAt, endAt: startAt + 1 },
			getData: () => ({ id })
		},
		destroy: vi.fn()
	}) as any;

describe('Layer.syncDisplayObjects', () => {
	it('handles sparse component display objects and non-component children without out-of-bounds setChildIndex', async () => {
		const layer = new Layer({
			layerData: {
				id: 'layer-1',
				name: 'Layer 1',
				order: 0,
				visible: true,
				muted: false,
				components: []
			} as any,
			componentsManager: { create: vi.fn() } as any,
			eventManager: { emit: vi.fn() } as any
		});
		await layer.build();

		const delayed = createComponent('c-delayed', 0, undefined);
		const activeA = createComponent('c-active-a', 1, { id: 'obj-a' });
		const activeB = createComponent('c-active-b', 2, { id: 'obj-b' });
		layer.addComponent(delayed);
		layer.addComponent(activeA);
		layer.addComponent(activeB);

		const overlayChild = { id: 'overlay' };
		layer.displayObject.addChild(overlayChild);

		expect(() => layer.syncDisplayObjects()).not.toThrow();
		expect(activeA.displayObject.parent).toBe(layer.displayObject);
		expect(activeB.displayObject.parent).toBe(layer.displayObject);
		expect(layer.displayObject.children.includes(overlayChild)).toBe(true);
	});

	it('is idempotent and safely attaches delayed display objects later', async () => {
		const layer = new Layer({
			layerData: {
				id: 'layer-2',
				name: 'Layer 2',
				order: 0,
				visible: true,
				muted: false,
				components: []
			} as any,
			componentsManager: { create: vi.fn() } as any,
			eventManager: { emit: vi.fn() } as any
		});
		await layer.build();

		const delayed = createComponent('c-delayed', 0, undefined);
		const active = createComponent('c-active', 1, { id: 'obj-active' });
		layer.addComponent(delayed);
		layer.addComponent(active);

		const firstSyncChanged = layer.syncDisplayObjects();
		const snapshot = [...layer.displayObject.children];
		const secondSyncChanged = layer.syncDisplayObjects();

		expect(firstSyncChanged).toBe(false);
		expect(secondSyncChanged).toBe(false);
		expect(layer.displayObject.children).toEqual(snapshot);

		const delayedFromLayer = layer.components.find((component) => component.id === 'c-delayed') as any;
		delayedFromLayer.displayObject = { id: 'obj-delayed' };
		expect(() => layer.syncDisplayObjects()).not.toThrow();
		expect(layer.displayObject.children.includes(delayedFromLayer.displayObject)).toBe(true);
		expect(layer.displayObject.getChildIndex(delayedFromLayer.displayObject)).toBe(0);
	});
});
