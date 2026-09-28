<script lang="ts">
	import '../site/site.css';
	import Nav from '../site/Nav.svelte';
	import Footer from '../site/Footer.svelte';
	let { children } = $props();
</script>

<a class="skip" href="#content">Skip to content</a>
<Nav />
{@render children()}
<Footer />
