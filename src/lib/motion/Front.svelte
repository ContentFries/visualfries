<!--
	Draws its children in the clip's front part: a second root of the same clip in the stage's
	front clip layer, so a clip with `"layer": "behind"` keeps its picture behind the speaker and
	puts its labels in front of them. Same block instance, same state, same time: a label can sit
	on a point the block projects from its 3D scene. The front part stacks among the front clips
	where the clip stands in project order, shows and hides with the clip, and follows its
	placement keys, its slot and the transitions it rides or owns. In a clip rendered alone it is
	drawn over the rest of the block.

	Selectors of the block's styles that pass from an element outside `<Front>` to one inside it
	(`.stage .label`) no longer match: the children are elsewhere in the page.
-->
<script lang="ts">
	import { getAllContexts, mount, onDestroy, unmount, type Snippet } from 'svelte';
	import { useController } from './runtime.svelte.js';
	import FrontPart from './FrontPart.svelte';

	let { children }: { children: Snippet } = $props();

	const target = useController().front?.() ?? null;
	// Mounted now, while the block renders: its children exist before the block's `onMount`
	// (`useTimeline` finds them) and before the stage's first seek. The snippet keeps reading
	// the block's state, so they update with it.
	const part = target
		? mount(FrontPart, { target, props: { children }, context: getAllContexts() })
		: null;
	onDestroy(() => {
		if (part) unmount(part);
	});
</script>

{#if !target}{@render children()}{/if}
