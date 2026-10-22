<!--
	Built-in block "@visualfries/subject": a region of the speaker as its own layer, from JSON
	alone. By default it takes the region at the clip's first frame and holds those pixels, and
	while the clip is on screen the speaker has a hole there with the footage's clean plate in it,
	so placement keys can send the piece flying; `rotation` and `scale` keys turn it about the
	middle of the region, not the frame.

	  region   "all" | { "above": line } | { "below": line } | { "path": "M… Z", "origin"? }
	           line: head heights below the top of the head (0.3 ≈ forehead), { "head", "tilt" }
	           or { "through": [[x1, y1], [x2, y2]] } in footage pixels
	  footage  footage name (default: whatever the program shows)
	  freeze   moment whose pixels the piece keeps (default "start"); false: it stays live
	  hole     false: no hole, the speaker stays whole (a copy flies off)
	  rim      the cut edge on the speaker: true, or { color, width, opening, inside }
	           (opening 0.2 draws the open top of a cartoon head)
	  layer    "subject" (default) or "clean"
-->
<script lang="ts">
	import { useClip } from '../runtime.svelte.js';
	import Subject from '../Subject.svelte';
	import type { SubjectRegion } from '../subject-region.js';
	import type { Rim } from '../subject-canvas.js';

	const clip = useClip();
	const props = clip.props as {
		region?: SubjectRegion;
		footage?: string;
		freeze?: string | number | false;
		hole?: boolean;
		rim?: boolean | Rim;
		layer?: 'subject' | 'clean';
	};
	let center = $state<{ x: number; y: number } | null>(null);
	clip.pivot = () => center;
	const hole = $derived(props.hole === false ? false : { rim: props.rim ?? false });
</script>

<Subject
	region={props.region ?? 'all'}
	name={props.footage}
	layer={props.layer ?? 'subject'}
	freeze={props.freeze === undefined ? 'start' : props.freeze}
	{hole}
	bind:center
/>
