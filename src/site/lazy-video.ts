/**
 * Videos on the article pages load and play only near the viewport: the poster shows until then.
 * Every one has the native controls, so a visitor can pause it, and with reduced motion none
 * starts by itself.
 */
export type VideoState = {
	near: boolean;
	reduce: boolean;
	paused: boolean;
	/** The visitor paused it: it stays paused until they start it again. */
	held: boolean;
};

/** What to do with one video when its place on the page or its state changes. */
export function videoAction({ near, reduce, paused, held }: VideoState): 'play' | 'pause' | 'none' {
	if (!near) return paused ? 'none' : 'pause';
	if (reduce || held || !paused) return 'none';
	return 'play';
}

/**
 * Start a video and say whether it started. A browser may refuse (autoplay blocked, data
 * saver): the video then gets the native controls, so the poster never stays a dead picture.
 */
export function startVideo(video: {
	play: () => Promise<unknown>;
	controls: boolean;
}): Promise<boolean> {
	return video.play().then(
		() => true,
		() => {
			video.controls = true;
			return false;
		}
	);
}

/** When the visitor turns reduced motion on, stop what plays and hand over the controls. */
export function settleForReducedMotion(
	videos: Iterable<{ paused: boolean; controls: boolean; pause: () => void }>,
	reduce: boolean
): void {
	if (!reduce) return;
	for (const v of videos) {
		if (!v.paused) v.pause();
		v.controls = true;
	}
}

/** Watch every video under `root`; returns the cleanup. Runs in the browser only. */
export function watchVideos(root: ParentNode, margin = '200px'): () => void {
	const videos = Array.from(root.querySelectorAll('video'));
	videos.forEach((v) => (v.controls = true));
	if (!('IntersectionObserver' in window)) return () => {};

	const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
	const held = new WeakSet<HTMLVideoElement>();
	const left = new WeakSet<HTMLVideoElement>();
	// A pause that did not come from leaving the viewport is the visitor's.
	const onPause = (e: Event) => {
		const v = e.target as HTMLVideoElement;
		if (left.has(v)) left.delete(v);
		else held.add(v);
	};
	const onPlay = (e: Event) => held.delete(e.target as HTMLVideoElement);
	const onMotion = () => settleForReducedMotion(videos, motion.matches);

	const io = new IntersectionObserver(
		(entries) =>
			entries.forEach((e) => {
				const v = e.target as HTMLVideoElement;
				const action = videoAction({
					near: e.isIntersecting,
					reduce: motion.matches,
					paused: v.paused,
					held: held.has(v)
				});
				if (action === 'play') void startVideo(v);
				else if (action === 'pause') {
					left.add(v);
					v.pause();
				}
			}),
		{ rootMargin: margin }
	);
	videos.forEach((v) => {
		v.addEventListener('pause', onPause);
		v.addEventListener('play', onPlay);
		io.observe(v);
	});
	motion.addEventListener('change', onMotion);
	return () => {
		io.disconnect();
		motion.removeEventListener('change', onMotion);
		videos.forEach((v) => {
			v.removeEventListener('pause', onPause);
			v.removeEventListener('play', onPlay);
		});
	};
}
