<!-- mdsvex layout for the use-case and comparison pages: title, SEO, FAQ and the way on. -->
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
	const CONTENTFRIES =
		'https://www.contentfries.com/?utm_source=visualfries&utm_medium=site&utm_campaign=v3';
	// mdsvex hands a bare YAML date over as an ISO timestamp; show and publish the day.
	const checked = $derived(String(updated ?? '').slice(0, 10));
	const HUBS: Record<string, string> = { alternatives: 'Alternatives', for: 'Use cases' };
	const path = $derived(page.url.pathname.replace(/\/$/, '') || '/');
	const url = $derived(`${SITE}${path}`);
	const HUB = $derived(`/${path.split('/')[1]}`);
	const hubName = $derived(HUBS[path.split('/')[1]] ?? 'VisualFries');
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
					{ '@type': 'ListItem', position: 2, name: hubName, item: `${SITE}${HUB}` },
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
			{#if isHub}<span>{hubName}</span>{:else}<a href={HUB}>{hubName}</a>{/if}
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
			<h2>Your AI agent is <em>your editor now.</em></h2>
			<p>Install VisualFries, hand your agent something spoken and ask for the first video.</p>
			<div class="cta">
				<a class="btn" href="/docs/quickstart">Quickstart</a>
				<a class="ghost btn" href="/docs/programs">How a program works</a>
				<a class="ghost btn" href="https://github.com/ContentFries/visualfries">GitHub</a>
			</div>
		</div>

		<aside class="cf" aria-label="ContentFries">
			<p>
				<b>Want a visual timeline and cloud render?</b> ContentFries is built on VisualFries. It adds
				a timeline you can see, comments on any block that your agent acts on, and rendering on its servers,
				so your computer stays free. The new version is on its way.
			</p>
			<a href={CONTENTFRIES}>See ContentFries</a>
		</aside>

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
	.cmp :global(.duo) {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 260px));
		gap: 16px;
		margin-top: 18px;
	}
	.cmp :global(.duo figure) {
		margin: 0;
	}
	.cmp :global(.duo video) {
		margin-top: 0;
		aspect-ratio: 9 / 16;
		object-fit: cover;
	}
	.cmp :global(.duo figcaption) {
		margin-top: 8px;
		font-size: 14px;
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
	.cf {
		display: flex;
		flex-wrap: wrap;
		gap: 10px 24px;
		align-items: center;
		justify-content: space-between;
		margin-top: 16px;
		padding: 16px 20px;
		border: 1px dashed var(--line);
		border-radius: var(--r);
		font-size: 15px;
		color: var(--ink-2);
	}
	.cf p {
		margin: 0;
		flex: 1 1 420px;
	}
	.cf b {
		color: var(--ink);
	}
	.cf a {
		color: var(--cool);
		white-space: nowrap;
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
