<!-- What `<Front>` mounts in the clip's front part: its children, rendered there. -->
<script lang="ts">
	import type { Snippet } from 'svelte';

	let { children }: { children: Snippet } = $props();
</script>

{@render children()}
