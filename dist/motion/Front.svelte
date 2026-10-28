<!--
	Draws its children in the clip's front part: a second root of the same clip in the stage's
	front clip layer, so a clip with `"layer": "behind"` keeps its picture behind the speaker and
	puts its labels in front of them. Same block instance, same state, same time: a label can sit
	on a point the block projects from its 3D scene. The front part stacks among the front clips
	where the clip stands in project order, shows and hides with the clip, and follows its
	placement keys, its slot and the transitions it rides or owns. In a clip rendered alone it is
	drawn over the rest of the block.

	Selectors of the block's styles that pass from an element outside `<Front>` to one inside it
	(`.stage .label`) no longer match: the children are elsewhere in the page. In its place
	`<Front>` leaves an empty `<template>`, which keeps several of them in markup order.
-->
<script module lang="ts">
	/** Each `<Front>`'s box in the front part, and the `<template>` it left in the block. */
	const marks = new WeakMap<Element, Element>();
</script>

<script lang="ts">
	import { getAllContexts, mount, onDestroy, unmount, type Snippet } from 'svelte';
	import { useController } from './runtime.svelte.js';
	import FrontPart from './FrontPart.svelte';

	let { children }: { children: Snippet } = $props();

	const target = useController().front?.() ?? null;
	// A box of its own (no box in the layout): its children stay in markup order with those of
	// the block's other `<Front>`s, however late they mount (see `place`).
	const box = target ? document.createElement('div') : null;
	if (box) {
		box.style.display = 'contents';
		target!.appendChild(box);
	}
	// Mounted now, while the block renders: its children exist before the block's `onMount`
	// (`useTimeline` finds them) and before the stage's first seek. The snippet keeps reading
	// the block's state, so they update with it.
	const part = box
		? mount(FrontPart, { target: box, props: { children }, context: getAllContexts() })
		: null;
	onDestroy(() => {
		if (part) unmount(part);
		box?.remove();
	});

	/**
	 * Once its `<template>` is in the block: moves the box before the first one whose
	 * `<Front>` comes after this one in the markup. A `<Front>` that mounts later (inside an
	 * `{#if}`) would otherwise stack over the others in the order the seeks mounted them.
	 */
	function place(mark: HTMLTemplateElement) {
		if (!box || !target) return;
		marks.set(box, mark);
		const next = [...target.children].find((other) => {
			const at = other !== box && marks.get(other);
			return at && mark.compareDocumentPosition(at) & Node.DOCUMENT_POSITION_FOLLOWING;
		});
		target.insertBefore(box, next ?? null);
	}
</script>

{#if target}<template use:place></template>{:else}{@render children()}{/if}
