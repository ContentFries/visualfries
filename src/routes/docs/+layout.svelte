<script lang="ts">
	import { page } from '$app/state';
	import { afterNavigate } from '$app/navigation';
	import { onMount } from 'svelte';
	import '../../site/docs.css';
	import { pages, sections, pageUrl, findPage, sectionLabel } from '../../site/docs';

	let { children } = $props();
	const current = $derived(findPage(page.url.pathname));
	const section = $derived(current.page?.section ?? 'start');
	const sectionPages = $derived(pages.filter((p) => p.section === section));

	// "On this page" is built from the rendered headings, so pages stay plain Markdown.
	let toc = $state<{ id: string; text: string }[]>([]);
	let active = $state('');
	let main: HTMLElement;
	let observer: IntersectionObserver | undefined;

	function buildToc() {
		observer?.disconnect();
		const heads = Array.from(main?.querySelectorAll('.prose h2[id]') ?? []) as HTMLElement[];
		toc = heads.map((h) => ({ id: h.id, text: h.textContent ?? '' }));
		active = toc[0]?.id ?? '';
		observer = new IntersectionObserver(
			(entries) => entries.forEach((e) => e.isIntersecting && (active = e.target.id)),
			{ rootMargin: '-120px 0px -70% 0px' }
		);
		heads.forEach((h) => observer!.observe(h));
	}
	onMount(() => {
		buildToc();
		return () => observer?.disconnect();
	});
	afterNavigate(() => queueMicrotask(buildToc));
</script>

<nav class="docs-bar" aria-label="Docs sections">
	<div class="docs-bar-wrap">
		{#each sections as s}
			{@const first = pages.find((p) => p.section === s.key)}
			{#if first}
				<a
					href={pageUrl(first.slug)}
					class:sep={s.key === 'scenes'}
					aria-current={s.key === section ? 'true' : undefined}
				>
					{#if s.number}<b>{s.number}</b>{/if}{s.label}
				</a>
			{/if}
		{/each}
		<a href="/llms.txt">llms.txt</a>
	</div>
</nav>

<div class="docs">
	<aside class="side" aria-label="{sectionLabel(section)} pages">
		<h4>{sectionLabel(section)}</h4>
		<ul>
			{#each sectionPages as p}
				<li>
					<a
						href={pageUrl(p.slug)}
						aria-current={p.slug === current.page?.slug ? 'page' : undefined}
					>
						{p.title}{#if p.planned}<span class="tag plan">planned</span>{/if}
					</a>
				</li>
			{/each}
		</ul>
		<h4>Other sections</h4>
		<ul>
			{#each sections.filter((s) => s.key !== section) as s}
				{@const first = pages.find((p) => p.section === s.key)}
				{#if first}<li><a href={pageUrl(first.slug)}>{sectionLabel(s.key)}</a></li>{/if}
			{/each}
		</ul>
	</aside>

	<div class="docs-main" bind:this={main}>
		{@render children()}
	</div>

	<aside class="toc" aria-label="On this page">
		{#if toc.length}
			<div class="eyebrow">On this page</div>
			<ol>
				{#each toc as item}
					<li><a href="#{item.id}" class:on={active === item.id}>{item.text}</a></li>
				{/each}
			</ol>
		{/if}
		<div class="agent-note">
			For agents: <a href="/llms.txt">llms.txt</a> lists every page as Markdown. Append
			<code>.md</code> to any docs URL.
		</div>
	</aside>
</div>
