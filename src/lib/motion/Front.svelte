<!--
	Draws its children in the clip's front part: a second root of the same clip in the stage's
	front clip layer, so a clip with `"layer": "behind"` keeps its picture behind the speaker and
	puts its labels in front of them. Same block instance, same state, same time: a label can sit
	on a point the block projects from its 3D scene. The front part stacks among the front clips
	where the clip stands in project order, shows and hides with the clip, and follows its
	placement keys, its slot and the transitions it rides or owns. In a clip rendered alone it is
	drawn over the rest of the block.

	Selectors of the block's styles that pass from an element outside `<Front>` to one inside it
	(`.stage .label`) no longer match: the children are elsewhere in the page. A `<Front>` inside
	another one draws its children in place: they are in front already.
-->
<script module lang="ts">
	/** Marks the children of a `<Front>`, so one inside them draws in place. */
	const IN_FRONT = Symbol('vf-front');
	/** Per `<Front>`, the comment that opens its children in the front part, and its own mark. */
	const marks = new WeakMap<Node, Comment>();
	let made = 0;
</script>

<script lang="ts">
	import { getAllContexts, getContext, mount, onDestroy, onMount, unmount } from 'svelte';
	import type { Snippet } from 'svelte';
	import { useController } from './runtime.svelte.js';
	import FrontPart from './FrontPart.svelte';

	let { children }: { children: Snippet } = $props();

	const controller = useController();
	const target = getContext(IN_FRONT) ? null : (controller.front?.() ?? null);
	// Its children go between two comments of its own, with no element around them: what the
	// block's selectors and `useTimeline`'s `q` find stays the same. The range moves as a whole
	// to keep markup order with the block's other `<Front>`s, however late they mount.
	const start = target ? document.createComment('') : null;
	const end = target ? document.createComment('') : null;
	if (start && end) target!.append(start, end);
	// Mounted now, while the block renders: its children exist before the block's `onMount`
	// (`useTimeline` finds them) and before the stage's first seek. The snippet keeps reading
	// the block's state, so they update with it.
	const part =
		target && end
			? mount(FrontPart, {
					target,
					anchor: end,
					props: { children },
					context: new Map([...getAllContexts(), [IN_FRONT, true]])
				})
			: null;
	/** What this `<Front>` leaves in the block: a comment, found by its text once it is there. */
	const id = target ? `vf-front-${++made}` : '';

	/**
	 * Moves the children before those of the first `<Front>` that comes after this one in the
	 * markup. A `<Front>` that mounts later (inside an `{#if}`) would otherwise stack over the
	 * others in the order the seeks mounted them.
	 */
	onMount(() => {
		if (!target || !start || !end) return;
		const walk = document.createTreeWalker(controller.root, NodeFilter.SHOW_COMMENT);
		let found: Comment | null = null;
		while (!found && walk.nextNode())
			if (walk.currentNode.nodeValue === id) found = walk.currentNode as Comment;
		if (!found) return;
		const mark = found;
		marks.set(start, mark);
		const next = [...target.childNodes].find((other) => {
			const at = other !== start && marks.get(other);
			return at && mark.compareDocumentPosition(at) & Node.DOCUMENT_POSITION_FOLLOWING;
		});
		const range: Node[] = [];
		for (let n: Node | null = start; n; n = n === end ? null : n.nextSibling) range.push(n);
		for (const n of range) target.insertBefore(n, next ?? null);
	});
	onDestroy(() => {
		if (part) unmount(part);
		start?.remove();
		end?.remove();
	});
</script>

<!-- eslint-disable-next-line svelte/no-at-html-tags -- a comment of our own, no user text -->
{#if target}{@html `<!--${id}-->`}{:else}{@render children()}{/if}
