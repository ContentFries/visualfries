<script lang="ts">
	import '../site/site.css';
	import Nav from '../site/Nav.svelte';
	import Footer from '../site/Footer.svelte';
	let { children } = $props();
</script>

<Nav />
{@render children()}
<Footer />
