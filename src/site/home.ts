import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

/**
 * Homepage scroll story: a `.vf.json` document types itself on the left while the stage on
 * the right reacts, chapter by chapter (Document → Blocks → Time → Surfaces → Render).
 * Returns a cleanup function.
 */
export function initHome(root: HTMLElement): () => void {
	const q = <T extends Element = HTMLElement>(s: string) => root.querySelector(s) as T;
	const qa = <T extends Element = HTMLElement>(s: string) =>
		Array.from(root.querySelectorAll(s)) as T[];
	const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

	// ---- transcript ribbon: real cue mechanics, phrase → time ----
	const words: [string, number, number][] = [
		['nothing', 0, 0.4],
		['is', 0.45, 0.55],
		['ever', 0.6, 0.9],
		['matched', 1.0, 1.5],
		['silently', 1.6, 2.3],
		['—', 2.6, 2.7],
		['a', 2.9, 3.0],
		['missing', 3.05, 3.5],
		['phrase', 3.55, 3.95],
		['suggests', 4.1, 4.7],
		['the', 4.75, 4.85],
		['closest', 4.9, 5.4],
		['spoken', 5.45, 5.9],
		['ones', 5.95, 6.3]
	];
	const DUR = 6.5;
	const FPS = 30;
	const cues: Record<string, string> = { reveal: 'nothing', hit: 'silently', by: 'suggests' };
	const cueT: Record<string, number> = {};
	words.forEach(([t, s]) => {
		for (const k in cues) if (cues[k] === t && cueT[k] == null) cueT[k] = s;
	});
	const rw = q('#rwords');
	rw.replaceChildren();
	const wEls = words.map(([t]) => {
		const s = document.createElement('span');
		s.textContent = t;
		rw.appendChild(s);
		return s;
	});

	const lines = qa('#code .ln');
	function typeLine(t: gsap.core.Timeline, i: number, at: number, dur?: number) {
		const ln = lines[i];
		const len = ln.textContent?.length ?? 0;
		t.set(ln, { opacity: 1 }, at);
		t.to(
			ln.firstElementChild,
			{ clipPath: 'inset(0 0% 0 0)', duration: dur ?? Math.min(0.35, 0.012 * len), ease: 'none' },
			at
		);
	}
	function chapterOn(t: gsap.core.Timeline, at: number, i: number) {
		qa('#chapters span').forEach((c, j) => t.set(c, { className: j === i ? 'on' : '' }, at));
		qa('#caps p').forEach((p, j) => {
			if (at === 0) t.set(p, { opacity: j === 0 ? 1 : 0 }, 0);
			else t.to(p, { opacity: j === i ? 1 : 0, duration: 0.15 }, at);
		});
	}

	function build() {
		const canvas = q('#canvas');
		// Sizes are functions: GSAP re-evaluates them when ScrollTrigger refreshes after a resize.
		const scale = (w: number, h: number) =>
			Math.min((canvas.clientWidth - 48) / w, (canvas.clientHeight - 48) / h);
		const fit = (w: number, h: number, k = 1) => ({
			width: () => Math.round(w * scale(w, h) * k),
			height: () => Math.round(h * scale(w, h) * k),
			'--fs': () => Math.round((w * scale(w, h) * k) / 11)
		});
		const S45 = fit(1080, 1350);
		const S916 = fit(1080, 1920);
		const S11 = fit(1080, 1080);
		const S169 = fit(1920, 1080);
		const C = [0, 0.3, 1.3, 2.3, 3.3];
		const t = gsap.timeline({ paused: true, defaults: { ease: 'none' } });

		// 01 Document: already on screen at rest
		chapterOn(t, 0, 0);
		t.set('#doc-state', { textContent: 'draft' }, 0);
		[0, 1, 2, 3, 4].forEach((i) => {
			t.set(lines[i], { opacity: 1 }, 0);
			t.set(lines[i].firstElementChild, { clipPath: 'inset(0 0% 0 0)' }, 0);
		});
		t.set('#frame', { ...S45, opacity: 1 }, 0);
		t.fromTo('#frame', { scale: 0.96 }, { scale: 1, duration: 0.3, ease: 'power2.out' }, 0);

		// 02 Blocks
		chapterOn(t, C[1], 1);
		typeLine(t, 5, C[1] + 0.05);
		typeLine(t, 6, C[1] + 0.15);
		typeLine(t, 7, C[1] + 0.3, 0.5);
		t.to('#frame .mark', { rotate: 405, duration: 0.3, ease: 'power2.out' }, C[1] + 0.15);
		t.to(
			'#quote .w',
			{ opacity: 1, duration: 0.25, stagger: 0.08, ease: 'power2.out' },
			C[1] + 0.35
		);
		t.to('#by', { opacity: 1, duration: 0.25 }, C[1] + 0.75);

		// 03 Time: the still gets a timeline; cues resolve from words
		chapterOn(t, C[2], 2);
		typeLine(t, 8, C[2] + 0.02, 0.4);
		typeLine(t, 9, C[2] + 0.12, 0.5);
		typeLine(t, 10, C[2] + 0.3);
		typeLine(t, 11, C[2] + 0.32, 0.4);
		t.set('#doc-state', { textContent: 'timed by voice.transcript.json' }, C[2] + 0.12);
		t.set('#quote .w', { opacity: 0 }, C[2] + 0.4);
		t.set('#by', { opacity: 0 }, C[2] + 0.4);
		t.set('#quote em', { color: 'inherit' }, C[2] + 0.4);
		const T0 = C[2] + 0.45;
		const K = 0.5 / DUR;
		t.to('#rhead', { width: '100%', duration: DUR * K }, T0);
		words.forEach(([txt, s, e], i) => {
			if (txt === '—') return;
			t.to(
				wEls[i],
				{ backgroundColor: 'rgba(124,196,255,.22)', color: '#ecebe6', duration: 0.01 },
				T0 + s * K
			);
			t.to(
				wEls[i],
				{ backgroundColor: 'rgba(124,196,255,0)', color: '#8d8f97', duration: 0.03 },
				T0 + Math.max(e, s + 0.3) * K
			);
		});
		t.to(
			'#quote .w',
			{ opacity: 1, duration: 0.08, stagger: 0.04, ease: 'power2.out' },
			T0 + cueT.reveal * K
		);
		t.to('#quote em', { color: '#ff6b2c', duration: 0.05 }, T0 + cueT.hit * K);
		t.to('#quote em', { '--ul': 1, duration: 0.08 }, T0 + cueT.hit * K);
		t.to('#by', { opacity: 1, duration: 0.08 }, T0 + cueT.by * K);
		const clock = q('#rclock');
		t.eventCallback('onUpdate', () => {
			const u = t.time();
			const clipT = gsap.utils.clamp(0, DUR, (u - T0) / K);
			clock.textContent =
				u >= C[2] + 0.4 && u < C[3] + 0.05
					? 'clip.t ' + clipT.toFixed(2) + 's · f' + Math.round(clipT * FPS)
					: '';
		});

		// 04 Surfaces: size changes, DOM reflows, then a carousel
		chapterOn(t, C[3], 3);
		const sw = qa('#sw-size i');
		const swap = (at: number, i: number, lab: string, size: object) => {
			sw.forEach((el, j) => t.to(el, { opacity: j === i ? 1 : 0, duration: 0.05 }, at));
			t.set('#size-lab', { textContent: lab }, at);
			t.to('#frame', { ...size, duration: 0.25, ease: 'power3.inOut' }, at);
			t.to(lines[1], { className: 'ln hi', duration: 0.01 }, at);
			t.to(lines[1], { className: 'ln', duration: 0.01 }, at + 0.2);
		};
		swap(C[3] + 0.05, 1, '1080 × 1920', S916);
		swap(C[3] + 0.35, 2, '1080 × 1080', S11);
		swap(C[3] + 0.62, 3, '1920 × 1080', S169);
		typeLine(t, 12, C[3] + 0.85);
		const Scar = fit(1080, 1080, 0.6);
		swap(C[3] + 0.9, 2, '1080 × 1080', Scar);
		['#g1', '#g2'].forEach((id) =>
			t.set(id, { ...Scar, opacity: 0, x: 0, scale: 0.9 }, C[3] + 0.9)
		);
		const off = () => Math.min(Scar.width() * 1.08, canvas.clientWidth / 2 - Scar.width() / 2 - 8);
		t.to(
			'#g1',
			{ opacity: 1, x: () => -off(), scale: 0.92, duration: 0.3, ease: 'power3.out' },
			C[3] + 0.95
		);
		t.to(
			'#g2',
			{ opacity: 1, x: () => off(), scale: 0.92, duration: 0.3, ease: 'power3.out' },
			C[3] + 0.95
		);
		t.set('#by', { textContent: '2 / 3' }, C[3] + 0.95);
		t.to('#plan-flag', { opacity: 1, duration: 0.1 }, C[3] + 0.95);

		// 05 Render
		chapterOn(t, C[4], 4);
		// the rendered frames below are 4:5, so the document returns to that size first
		swap(C[4] + 0.02, 0, '1080 × 1350', S45);
		t.set('#by', { textContent: '— docs/MOTION.md' }, C[4] + 0.02);
		typeLine(t, 13, C[4] + 0.02);
		t.set('#doc-state', { textContent: 'checked · rendered' }, C[4] + 0.4);
		const term = qa('#term > div');
		t.to(term[0], { opacity: 1, duration: 0.05 }, C[4] + 0.05);
		t.to(term[1], { opacity: 1, duration: 0.05 }, C[4] + 0.2);
		t.to(term[2], { opacity: 1, duration: 0.05 }, C[4] + 0.35);
		t.to(term[3], { opacity: 1, duration: 0.05 }, C[4] + 0.4);
		t.to('#bar', { width: '100%', duration: 0.4 }, C[4] + 0.42);
		t.to(term[4], { opacity: 1, duration: 0.05 }, C[4] + 0.85);
		t.to(
			['#frame', '#g1', '#g2', '#plan-flag'],
			{ opacity: 0, scale: 0.8, duration: 0.2, ease: 'power2.in' },
			C[4] + 0.35
		);
		t.to(
			'#sheet img',
			{ opacity: 1, duration: 0.08, stagger: 0.035, ease: 'power2.out' },
			C[4] + 0.45
		);
		t.to('#sheet figcaption', { opacity: 1, duration: 0.1 }, C[4] + 0.9);
		t.to({}, { duration: 0.1 }, C[4] + 0.9);
		return t;
	}

	// ---- live still (planned): drag = document edit, zero re-renders ----
	(function live() {
		const post = q('#post');
		const txt = q('#txt');
		const handle = q('#handle');
		let edits = 0;
		const SCALE = 1080;
		const sync = () => {
			const r = post.getBoundingClientRect();
			const k = SCALE / r.width;
			q('#lx').textContent = String(Math.round(txt.offsetLeft * k));
			q('#ly').textContent = String(Math.round(txt.offsetTop * k));
			q('#lw').textContent = String(Math.round(txt.offsetWidth * k));
		};
		let drag: { x: number; y: number; l: number; t: number; w: number; resize: boolean } | null =
			null;
		txt.addEventListener('pointerdown', (e) => {
			drag = {
				x: e.clientX,
				y: e.clientY,
				l: txt.offsetLeft,
				t: txt.offsetTop,
				w: txt.offsetWidth,
				resize: e.target === handle
			};
			txt.setPointerCapture(e.pointerId);
			txt.classList.add('drag');
		});
		txt.addEventListener('pointermove', (e) => {
			if (!drag) return;
			const dx = e.clientX - drag.x;
			const dy = e.clientY - drag.y;
			if (drag.resize)
				txt.style.width =
					Math.max(120, Math.min(post.clientWidth - drag.l - 8, drag.w + dx)) + 'px';
			else {
				txt.style.left =
					Math.max(0, Math.min(post.clientWidth - txt.offsetWidth, drag.l + dx)) + 'px';
				txt.style.top =
					Math.max(0, Math.min(post.clientHeight - txt.offsetHeight, drag.t + dy)) + 'px';
			}
			sync();
		});
		const end = () => {
			if (!drag) return;
			drag = null;
			txt.classList.remove('drag');
			q('#edits').textContent = String(++edits);
		};
		txt.addEventListener('pointerup', end);
		txt.addEventListener('pointercancel', end);
		txt.addEventListener('keydown', (e) => {
			const step = e.shiftKey ? 20 : 4;
			const m = (
				{
					ArrowLeft: [-step, 0],
					ArrowRight: [step, 0],
					ArrowUp: [0, -step],
					ArrowDown: [0, step]
				} as Record<string, number[]>
			)[e.key];
			if (!m) return;
			e.preventDefault();
			txt.style.left = txt.offsetLeft + m[0] + 'px';
			txt.style.top = txt.offsetTop + m[1] + 'px';
			sync();
			q('#edits').textContent = String(++edits);
		});
		q('#reelify').addEventListener('click', (e) => {
			e.preventDefault();
			q('#frames').textContent = '270';
			q('#edits').textContent = String(++edits);
			if (!reduce)
				gsap.fromTo(
					txt,
					{ opacity: 0, y: 24 },
					{ opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' }
				);
		});
		sync();
	})();

	// ---- wire to scroll ----
	root.classList.add('motion');
	gsap.registerPlugin(ScrollTrigger);
	const ctx = gsap.context(() => {}, root);
	let master = build();
	if (reduce) {
		// No scroll animation: show the finished state, videos stay under the viewer's control.
		master.progress(1);
		return () => {
			master.kill();
			ctx.revert();
			root.classList.remove('motion');
		};
	}
	const mm = gsap.matchMedia(root);
	mm.add('(min-width: 900px)', () => {
		master.kill();
		master = build();
		ScrollTrigger.create({
			trigger: '#engine',
			start: 'top top',
			end: '+=420%',
			pin: true,
			scrub: 0.8,
			animation: master,
			anticipatePin: 1,
			invalidateOnRefresh: true
		});
	});
	mm.add('(max-width: 899px)', () => {
		// Phones and narrow windows: no pinning, the story scrubs while the section passes.
		master.kill();
		master = build();
		ScrollTrigger.create({
			trigger: '#engine',
			start: 'top 70%',
			end: 'bottom 30%',
			scrub: 0.8,
			animation: master,
			invalidateOnRefresh: true
		});
	});
	ctx.add(() => {
		qa('.rv').forEach((el) =>
			gsap.to(el, {
				opacity: 1,
				y: 0,
				duration: 0.8,
				ease: 'power2.out',
				scrollTrigger: { trigger: el, start: 'top 88%', once: true }
			})
		);
		qa<HTMLVideoElement>('video').forEach((v) =>
			ScrollTrigger.create({
				trigger: v,
				start: 'top 85%',
				end: 'bottom 15%',
				onEnter: () => void v.play().catch(() => {}),
				onLeave: () => v.pause(),
				onEnterBack: () => void v.play().catch(() => {}),
				onLeaveBack: () => v.pause()
			})
		);
	});
	return () => {
		mm.revert();
		ctx.revert();
		master.kill();
		root.classList.remove('motion');
	};
}
