/**
 * Homepage behaviour: reveals, play-when-visible videos, copy buttons, the walking caption word,
 * the brief tabs, and the exploded layer stack (scroll-driven, pointer-tilted).
 * Framework-free; returns a cleanup function.
 */
const AGENT_PROMPT = `Install VisualFries: npm install visualfries svelte playwright && npx playwright install chromium && npx visualfries doctor.
Read https://visualfries.com/llms.txt before writing anything.
Then: make a 9:16 reel from talk.mp4 and its word-level transcript. Cut me out of the room with visualfries matte, slam the words I stress in behind my head (start from the @visualfries/speaker-depth block), and caption it with @visualfries/captions, spoken word highlighted.
Loop: clips -> check --determinism -> still -> render. Show me the stills before you render.`;

export function initHome(root: HTMLElement): () => void {
	const $ = <T extends Element = HTMLElement>(s: string, r: ParentNode = root) => r.querySelector(s) as T | null;
	const $$ = <T extends Element = HTMLElement>(s: string, r: ParentNode = root) =>
		Array.from(r.querySelectorAll(s)) as T[];
	const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
	const cleanups: (() => void)[] = [];
	const on = <K extends keyof HTMLElementEventMap>(
		el: EventTarget,
		type: K | string,
		fn: (e: Event) => void,
		opts?: AddEventListenerOptions
	) => {
		el.addEventListener(type, fn, opts);
		cleanups.push(() => el.removeEventListener(type, fn, opts));
	};

	// ---- toast + copy ----
	const toast = $('#toast');
	let tt = 0;
	const say = (m: string) => {
		if (!toast) return;
		toast.textContent = m;
		toast.classList.add('on');
		clearTimeout(tt);
		tt = window.setTimeout(() => toast.classList.remove('on'), 1800);
	};
	cleanups.push(() => clearTimeout(tt));
	$$('[data-copy]').forEach((b) =>
		on(b, 'click', async () => {
			const id = b.dataset.copy!;
			const text = id === 'agent-prompt' ? AGENT_PROMPT : ($('#' + id)?.textContent ?? '');
			try {
				await navigator.clipboard.writeText(text);
				say(id === 'agent-prompt' ? 'Agent prompt copied. Paste it into your coding agent.' : 'Copied');
			} catch {
				say('Copy failed');
			}
		})
	);

	// ---- ticker: duplicate content for a seamless loop ----
	const tick = $('#ticker');
	if (tick && !reduce) tick.innerHTML += tick.innerHTML;

	// ---- reveal on scroll ----
	if (!reduce && 'IntersectionObserver' in window) {
		const io = new IntersectionObserver(
			(es) =>
				es.forEach((e) => {
					if (e.isIntersecting) {
						e.target.classList.add('in');
						io.unobserve(e.target);
					}
				}),
			{ rootMargin: '0px 0px -8% 0px' }
		);
		$$('.rv').forEach((el) => io.observe(el));
		cleanups.push(() => io.disconnect());
	} else $$('.rv').forEach((el) => el.classList.add('in'));

	// ---- videos: play only when visible; never autoplay with reduced motion ----
	const vids = $$<HTMLVideoElement>('video');
	vids.forEach((v) => {
		if (reduce) v.controls = true;
	});
	if (!reduce && 'IntersectionObserver' in window) {
		const vo = new IntersectionObserver(
			(es) =>
				es.forEach((e) => {
					const v = e.target as HTMLVideoElement;
					if (e.isIntersecting) v.play().catch(() => {});
					else v.pause();
				}),
			{ threshold: 0.25 }
		);
		vids.forEach((v) => vo.observe(v));
		cleanups.push(() => vo.disconnect());
	}

	// ---- broken images: hide so the labelled box shows ----
	$$<HTMLImageElement>('img').forEach((i) => on(i, 'error', () => (i.style.display = 'none')));

	// ---- caption demo: the lit word walks through the line ----
	const cw = $$('.capword span');
	if (cw.length && !reduce) {
		let i = 2;
		const id = window.setInterval(() => {
			cw.forEach((w) => w.classList.remove('on'));
			i = (i + 1) % cw.length;
			cw[i].classList.add('on');
		}, 520);
		cleanups.push(() => clearInterval(id));
	}

	// ---- brief tabs ----
	const tabs = $$('.tabs [role=tab]');
	tabs.forEach((t) =>
		on(t, 'click', () => {
			tabs.forEach((x) => x.setAttribute('aria-selected', String(x === t)));
			$$('.brief').forEach((p) => {
				const active = p.dataset.brief === t.dataset.brief;
				p.classList.toggle('on', active);
				p.hidden = !active;
				$$<HTMLVideoElement>('video', p).forEach((v) => {
					if (!active) v.pause();
					else if (!reduce) v.play().catch(() => {});
				});
			});
		})
	);

	// ---- exploded layers: scroll-driven, hover-tilted, click-focusable ----
	const stage = $('#stage');
	const stack = $('#stack');
	if (stage && stack) {
		let target = reduce ? 1 : 0;
		let cur = target;
		let manual: number | null = null;
		let raf = 0;
		const setE = (e: number) => stack.style.setProperty('--e', e.toFixed(3));
		const progress = () => {
			if (manual !== null) return manual;
			const r = stage.getBoundingClientRect();
			const vh = innerHeight;
			// 0 when the stage enters at the bottom, 1 when its centre crosses 55% of the viewport
			const p = (vh * 0.95 - r.top) / (vh * 0.95 - (vh * 0.55 - r.height / 2));
			return Math.max(0, Math.min(1, p));
		};
		const loop = () => {
			target = progress();
			cur += (target - cur) * 0.12;
			setE(cur);
			if (Math.abs(target - cur) > 0.002) raf = requestAnimationFrame(loop);
			else {
				setE(target);
				raf = 0;
			}
		};
		const kick = () => {
			if (!raf) raf = requestAnimationFrame(loop);
		};
		cleanups.push(() => cancelAnimationFrame(raf));
		if (reduce) setE(1);
		else {
			on(window, 'scroll', kick, { passive: true });
			on(window, 'resize', kick);
			kick();
		}
		const ex = $('#explode');
		const co = $('#collapse');
		if (ex)
			on(ex, 'click', () => {
				manual = 1;
				kick();
			});
		if (co)
			on(co, 'click', () => {
				manual = 0;
				kick();
			});
		if (!reduce && matchMedia('(hover: hover)').matches) {
			on(stage, 'pointermove', (ev) => {
				const e = ev as PointerEvent;
				const r = stage.getBoundingClientRect();
				const x = (e.clientX - r.left) / r.width - 0.5;
				const y = (e.clientY - r.top) / r.height - 0.5;
				stack.style.setProperty('--ry', (-34 + x * 28).toFixed(1) + 'deg');
				stack.style.setProperty('--rx', (12 - y * 18).toFixed(1) + 'deg');
			});
			on(stage, 'pointerleave', () => {
				stack.style.removeProperty('--ry');
				stack.style.removeProperty('--rx');
			});
		}
		// rail: hover or click a description to lift that layer
		const rails = $$('.rail div');
		const layers = $$('.layer');
		rails.forEach((d) => {
			const lift = () => {
				rails.forEach((x) => x.classList.toggle('on', x === d));
				layers.forEach((l, i) => (l.style.opacity = String(i + 1) === d.dataset.l ? '1' : '.35'));
			};
			const drop = () => {
				d.classList.remove('on');
				layers.forEach((l) => (l.style.opacity = '1'));
			};
			on(d, 'pointerenter', lift);
			on(d, 'pointerleave', drop);
			on(d, 'click', lift);
		});
	}

	return () => cleanups.forEach((f) => f());
}
