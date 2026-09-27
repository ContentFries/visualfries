<!-- mdsvex layout for every docs page: title, actions, SEO, previous/next. -->
<script lang="ts">
	import { page } from '$app/state';
	import { findPage, pageUrl, sectionLabel } from './docs';

	let { title = '', description = '', updated = '', children } = $props();

	const current = $derived(findPage(page.url.pathname));
	const url = $derived(`https://visualfries.com${pageUrl(current.page?.slug ?? '')}`);
	const mdUrl = $derived(`${pageUrl(current.page?.slug ?? '')}.md`);
	let copied = $state('');

	async function copyMarkdown() {
		try {
			const text = await (await fetch(mdUrl)).text();
			await navigator.clipboard.writeText(text);
			copied = 'Copied page as Markdown';
		} catch {
			copied = 'Copy failed: open the Markdown link instead';
		}
		setTimeout(() => (copied = ''), 1800);
	}

	const jsonLd = $derived({
		'@context': 'https://schema.org',
		'@graph': [
			{
				'@type': 'TechArticle',
				headline: title,
				description,
				url,
				dateModified: updated || undefined,
				isPartOf: { '@type': 'WebSite', name: 'VisualFries', url: 'https://visualfries.com/' },
				about: {
					'@type': 'SoftwareSourceCode',
					name: 'VisualFries',
					codeRepository: 'https://github.com/ContentFries/visualfries'
				}
			},
			{
				'@type': 'BreadcrumbList',
				itemListElement: [
					{ '@type': 'ListItem', position: 1, name: 'Docs', item: 'https://visualfries.com/docs' },
					{
						'@type': 'ListItem',
						position: 2,
						name: current.page ? sectionLabel(current.page.section) : 'Docs'
					},
					{ '@type': 'ListItem', position: 3, name: title, item: url }
				]
			}
		]
	});
</script>

<svelte:head>
	<title>{title} · VisualFries docs</title>
	<meta name="description" content={description} />
	<link rel="canonical" href={url} />
	<link rel="alternate" type="text/markdown" href={mdUrl} />
	<meta property="og:type" content="article" />
	<meta property="og:title" content="{title} · VisualFries" />
	<meta property="og:description" content={description} />
	<meta property="og:url" content={url} />
	<meta name="twitter:card" content="summary" />
	{@html `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>`}
</svelte:head>

<article class="doc">
	<nav class="crumbs" aria-label="Breadcrumb">
		<a href="/docs">Docs</a><span>/</span>
		{#if current.page}<span>{sectionLabel(current.page.section)}</span><span>/</span>{/if}
		<span>{title}</span>
	</nav>
	<div class="titlebar">
		<h1>{title}</h1>
		<div class="actions">
			<button class="small btn" type="button" onclick={copyMarkdown}>Copy page as Markdown</button>
			<a class="small btn" href={mdUrl}>.md</a>
		</div>
	</div>

	<div class="prose">
		{@render children?.()}
	</div>

	<nav class="pn" aria-label="Previous and next page">
		{#if current.prev}
			<a href={pageUrl(current.prev.slug)}>
				<small>Previous · {sectionLabel(current.prev.section)}</small><span
					>{current.prev.title}</span
				>
			</a>
		{:else}<span></span>{/if}
		{#if current.next}
			<a class="next" href={pageUrl(current.next.slug)}>
				<small>Next · {sectionLabel(current.next.section)}</small><span>{current.next.title}</span>
			</a>
		{/if}
	</nav>
	<div class="meta">
		{#if updated}<span>Updated {updated}</span>{/if}
		<a href="https://github.com/ContentFries/visualfries/tree/main/src/routes/docs"
			>Edit on GitHub</a
		>
		<a href={mdUrl}>Raw Markdown</a>
	</div>
	<div class="toast" class:on={!!copied} role="status" aria-live="polite">{copied}</div>
</article>
