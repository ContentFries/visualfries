<footer>
	<div class="wrap">
		<span>VisualFries · MIT · built by ContentFries</span>
		<span class="grow"></span>
		<a href="/docs">Docs</a>
		<a href="/docs/agents">Agents</a>
		<a href="https://github.com/ContentFries/visualfries">GitHub</a>
		<a href="https://www.npmjs.com/package/visualfries">npm</a>
		<a href="/llms.txt">llms.txt</a>
	</div>
</footer>

<style>
	footer {
		border-top: 1px solid var(--line);
		padding: 40px 0 calc(56px + env(safe-area-inset-bottom, 0px));
		font-size: 14px;
		color: var(--muted);
	}
	.wrap {
		width: min(1360px, 100% - 40px);
		display: flex;
		flex-wrap: wrap;
		gap: 12px 28px;
		align-items: center;
	}
	@media (max-width: 600px) {
		.wrap {
			width: calc(100% - 32px);
		}
	}
	a {
		color: var(--muted);
	}
	a:hover {
		color: var(--ink);
	}
	.grow {
		flex: 1;
	}
</style>
