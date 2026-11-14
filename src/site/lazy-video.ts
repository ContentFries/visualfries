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

/** Whether the page may start a video without the visitor asking for it. */
export function mayAutoStart({ reduce, held }: { reduce: boolean; held: boolean }): boolean {
	return !reduce && !held;
}

/** What to do with one video when its place on the page or its state changes. */
export function videoAction({ near, reduce, paused, held }: VideoState): 'play' | 'pause' | 'none' {
	if (!near) return paused ? 'none' : 'pause';
	if (reduce || held || !paused) return 'none';
	return 'play';
}

/**
 * Start a video and say how it went. When the browser refuses autoplay (blocked, data saver)
 * the video gets the native controls, so the poster never stays a dead picture. A start that our
 * own pause interrupted (the video scrolled away while loading) is "aborted" and changes nothing.
 */
export function startVideo(video: {
	play: () => Promise<unknown>;
	controls: boolean;
}): Promise<'started' | 'refused' | 'aborted'> {
	return video.play().then(
		() => 'started' as const,
		(err: unknown) => {
			if ((err as { name?: string } | null)?.name !== 'NotAllowedError') return 'aborted' as const;
			video.controls = true;
			return 'refused' as const;
		}
	);
}

type Pausable = { paused: boolean; pause: () => void };

/**
 * Tells the visitor's pauses from ours. `leave` pauses a video that left the viewport; feed it the
 * media `pause` and `play` events and `held` says whether the visitor paused the video, which
 * then stays paused until they start it again.
 */
export function pauseTracker<V extends Pausable & object>() {
	const heldByVisitor = new WeakSet<V>();
	const pausedByUs = new WeakSet<V>();
	return {
		leave(v: V) {
			if (v.paused) return;
			pausedByUs.add(v);
			v.pause();
		},
		paused(v: V) {
			if (pausedByUs.has(v)) pausedByUs.delete(v);
			else heldByVisitor.add(v);
		},
		played(v: V) {
			heldByVisitor.delete(v);
		},
		held: (v: V) => heldByVisitor.has(v)
	};
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
	const track = pauseTracker<HTMLVideoElement>();
	const onPause = (e: Event) => track.paused(e.target as HTMLVideoElement);
	const onPlay = (e: Event) => track.played(e.target as HTMLVideoElement);
	const onMotion = () => settleForReducedMotion(videos, motion.matches);

	const io = new IntersectionObserver(
		(entries) =>
			entries.forEach((e) => {
				const v = e.target as HTMLVideoElement;
				const action = videoAction({
					near: e.isIntersecting,
					reduce: motion.matches,
					paused: v.paused,
					held: track.held(v)
				});
				if (action === 'play') void startVideo(v);
				else if (action === 'pause') track.leave(v);
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
