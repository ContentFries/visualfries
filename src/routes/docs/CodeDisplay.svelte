<script lang="ts">
	let { code, title } = $props<{ code: string; title?: string }>();
</script>

<div class="code-display h-full flex flex-col bg-zinc-900 overflow-hidden border border-white/10 rounded-xl shadow-2xl">
	{#if title}
		<div class="px-4 py-2 bg-zinc-800/80 border-b border-white/5 flex items-center justify-between">
			<span class="text-xs font-semibold text-zinc-400 uppercase tracking-wider">{title}</span>
			<div class="flex gap-1.5">
				<div class="w-2.5 h-2.5 rounded-full bg-red-500/30"></div>
				<div class="w-2.5 h-2.5 rounded-full bg-yellow-500/30"></div>
				<div class="w-2.5 h-2.5 rounded-full bg-green-500/30"></div>
			</div>
		</div>
	{/if}
	<div class="flex-1 overflow-auto p-4 custom-scrollbar">
		<pre class="text-sm font-mono leading-relaxed"><code class="text-blue-300">{code}</code></pre>
	</div>
</div>

<style>
	.custom-scrollbar::-webkit-scrollbar {
		width: 8px;
		height: 8px;
	}
	.custom-scrollbar::-webkit-scrollbar-track {
		background: rgba(0, 0, 0, 0.2);
	}
	.custom-scrollbar::-webkit-scrollbar-thumb {
		background: rgba(255, 255, 255, 0.1);
		border-radius: 4px;
	}
	.custom-scrollbar::-webkit-scrollbar-thumb:hover {
		background: rgba(255, 255, 255, 0.2);
	}
</style>
