// The runtime imports `gsap/SplitText.js` (Node ESM needs the extension); gsap ships the
// types under `gsap/SplitText`.
declare module 'gsap/SplitText.js' {
	export * from 'gsap/SplitText';
	export { default } from 'gsap/SplitText';
}
