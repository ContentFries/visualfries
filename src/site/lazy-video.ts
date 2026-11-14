/**
 * Videos on the article pages load and play only near the viewport: the poster shows until then,
 * and with reduced motion they never start by themselves (they get controls instead).
 */
export type VideoState = { near: boolean; reduce: boolean; paused: boolean };

/** What to do with one video when its place on the page or its state changes. */
export function videoAction({ near, reduce, paused }: VideoState): 'play' | 'pause' | 'none' {
	if (!near) return paused ? 'none' : 'pause';
	if (reduce || !paused) return 'none';
	return 'play';
}

/** Watch every video under `root`; returns the cleanup. Runs in the browser only. */
export function watchVideos(root: ParentNode, margin = '200px'): () => void {
	const videos = Array.from(root.querySelectorAll('video'));
	const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	if (reduce || !('IntersectionObserver' in window)) {
		videos.forEach((v) => (v.controls = true));
		return () => {};
	}
	const io = new IntersectionObserver(
		(entries) =>
			entries.forEach((e) => {
				const v = e.target as HTMLVideoElement;
				const action = videoAction({ near: e.isIntersecting, reduce, paused: v.paused });
				if (action === 'play') v.play().catch(() => {});
				else if (action === 'pause') v.pause();
			}),
		{ rootMargin: margin }
	);
	videos.forEach((v) => io.observe(v));
	return () => io.disconnect();
}
