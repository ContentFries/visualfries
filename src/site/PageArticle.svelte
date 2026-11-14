<!-- mdsvex layout for the comparison pages: title, SEO, FAQ and the way on. -->
<script lang="ts">
	import { page } from '$app/state';
	import './docs.css';

	type Faq = { q: string; a: string };
	let {
		title = '',
		heading = '',
		description = '',
		updated = '',
		faq = [] as Faq[],
		children
	} = $props();

	const SITE = 'https://www.visualfries.com';
	// mdsvex hands a bare YAML date over as an ISO timestamp; show and publish the day.
	const checked = $derived(String(updated ?? '').slice(0, 10));
	const HUB = '/alternatives';
	const path = $derived(page.url.pathname.replace(/\/$/, '') || '/');
	const url = $derived(`${SITE}${path}`);
	const isHub = $derived(path === HUB);

	const jsonLd = $derived({
		'@context': 'https://schema.org',
		'@graph': [
			{
				'@type': 'TechArticle',
				headline: heading || title,
				description,
				url,
				datePublished: checked || undefined,
				dateModified: checked || undefined,
				author: {
					'@type': 'Organization',
					name: 'ContentFries',
					url: 'https://www.contentfries.com'
				},
				isPartOf: { '@type': 'WebSite', name: 'VisualFries', url: `${SITE}/` },
				about: {
					'@type': 'SoftwareSourceCode',
					name: 'VisualFries',
					codeRepository: 'https://github.com/ContentFries/visualfries',
					license: 'https://opensource.org/licenses/MIT'
				}
			},
			{
				'@type': 'BreadcrumbList',
				itemListElement: [
					{ '@type': 'ListItem', position: 1, name: 'VisualFries', item: `${SITE}/` },
					{ '@type': 'ListItem', position: 2, name: 'Alternatives', item: `${SITE}${HUB}` },
					...(isHub
						? []
						: [{ '@type': 'ListItem', position: 3, name: heading || title, item: url }])
				]
			},
			...(faq.length
				? [
						{
							'@type': 'FAQPage',
							mainEntity: faq.map((f: Faq) => ({
								'@type': 'Question',
								name: f.q,
								acceptedAnswer: { '@type': 'Answer', text: f.a }
							}))
						}
					]
				: [])
		]
	});
</script>

<svelte:head>
	<title>{title}</title>
	<meta name="description" content={description} />
	<link rel="canonical" href={url} />
	<meta property="og:type" content="article" />
	<meta property="og:title" content={title} />
	<meta property="og:description" content={description} />
	<meta property="og:url" content={url} />
	<meta property="og:image" content="{SITE}/media/v2/explainer.jpg" />
	<meta name="twitter:card" content="summary_large_image" />
	{@html '<script type="application/ld+json">' + JSON.stringify(jsonLd) + '</' + 'script>'}
</svelte:head>

<main class="cmp" id="content">
	<article class="doc">
		<nav class="crumbs" aria-label="Breadcrumb">
			<a href="/">VisualFries</a><span>/</span>
			{#if isHub}<span>Alternatives</span>{:else}<a href={HUB}>Alternatives</a>{/if}
		</nav>
		<h1>{heading || title}</h1>

		<div class="prose">
			{@render children?.()}

			{#if faq.length}
				<h2 id="questions">Questions people ask</h2>
				{#each faq as f}
					<h3>{f.q}</h3>
					<p>{f.a}</p>
				{/each}
			{/if}
		</div>

		<div class="next">
			<h2>One raw take in. <em>A finished reel out.</em></h2>
			<p>Install it, hand your agent a recording and ask for the first reel.</p>
			<div class="cta">
				<a class="btn" href="/docs/quickstart">Quickstart</a>
				<a class="ghost btn" href="/docs/programs">How a program works</a>
				<a class="ghost btn" href="https://github.com/ContentFries/visualfries">GitHub</a>
			</div>
		</div>

		<div class="meta">
			{#if checked}<span>Checked {checked}</span>{/if}
			<a href="https://github.com/ContentFries/visualfries/issues"
				>Something wrong or out of date? Tell us</a
			>
		</div>
	</article>
</main>

<style>
	.cmp {
		width: min(900px, 100% - 48px);
		margin-inline: auto;
		padding-top: calc(var(--nav) + env(safe-area-inset-top, 0px));
		font-size: 16.5px;
		line-height: 1.6;
	}
	@media (max-width: 600px) {
		.cmp {
			width: calc(100% - 32px);
		}
	}
	.cmp .doc {
		max-width: none;
	}
	.cmp h1 {
		margin-top: 14px;
		font-size: clamp(34px, 5vw, 56px);
	}
	.cmp .crumbs a:hover {
		color: var(--ink);
	}
	.next {
		margin-top: 56px;
		padding: 28px;
		border: 1px solid var(--line);
		border-radius: var(--r-l);
		background: var(--panel);
	}
	.next h2 {
		font-size: clamp(26px, 3.4vw, 36px);
		line-height: 1.1;
	}
	.next p {
		margin: 10px 0 0;
		color: var(--ink-2);
	}
	.cta {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
		margin-top: 18px;
	}
	.meta {
		display: flex;
		flex-wrap: wrap;
		gap: 8px 20px;
		margin-top: 28px;
		font-size: 13.5px;
		color: var(--muted);
	}
	.meta a {
		color: var(--muted);
	}
</style>
