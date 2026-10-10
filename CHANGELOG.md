# Changelog

All notable changes to this project will be documented in this file. See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [0.6.0](https://github.com/ContentFries/visualfries/compare/visualfries-v0.5.0...visualfries-v0.6.0) (2026-10-03)


### Features

* **motion:** built-in captions and speaker-depth blocks, subject boxes, CI ([#62](https://github.com/ContentFries/visualfries/issues/62)) ([c64fb48](https://github.com/ContentFries/visualfries/commit/c64fb48c7e1e31d13e544b832b61aff410bbe047))


### Bug Fixes

* **build:** approve build scripts for pnpm 11 ([#65](https://github.com/ContentFries/visualfries/issues/65)) ([89aee91](https://github.com/ContentFries/visualfries/commit/89aee913b5dd4be0895737fbca43b713a0f86132))
* **motion:** make frames independent of seek order for every block ([#66](https://github.com/ContentFries/visualfries/issues/66)) ([479564d](https://github.com/ContentFries/visualfries/commit/479564dd1bc0f7700360491d4d7b559e0ff2a72a))
* **render:** draw scene text in its font in the CLI renderer ([#56](https://github.com/ContentFries/visualfries/issues/56)) ([#70](https://github.com/ContentFries/visualfries/issues/70)) ([aa44e8f](https://github.com/ContentFries/visualfries/commit/aa44e8fb8e0a409a4abf17339dbef3fb2709b05e))

## [0.5.0](https://github.com/ContentFries/visualfries/compare/visualfries-v0.4.1...visualfries-v0.5.0) (2026-10-02)


### Features

* **motion:** footage with subject mattes, clip audio and the matte command ([#57](https://github.com/ContentFries/visualfries/issues/57)) ([ee4c2a3](https://github.com/ContentFries/visualfries/commit/ee4c2a3aa01e1b68e081402d2492430d68b3b598))
* **motion:** pluggable matte providers ([#58](https://github.com/ContentFries/visualfries/issues/58)) ([cb0ea1c](https://github.com/ContentFries/visualfries/commit/cb0ea1ca6b696510b84df96de762cd93f920dd36))


### Bug Fixes

* **types:** declare gsap/SplitText.js ([#61](https://github.com/ContentFries/visualfries/issues/61)) ([29deaed](https://github.com/ContentFries/visualfries/commit/29deaeda733f57db8088e9fa7d3d6f253a449613))


### Documentation

* English examples throughout and an English-only rule for agents ([#59](https://github.com/ContentFries/visualfries/issues/59)) ([1206c12](https://github.com/ContentFries/visualfries/commit/1206c1294c1a813678b7655b69be230f50c6b75b))

## [0.4.1](https://github.com/ContentFries/visualfries/compare/visualfries-v0.4.0...visualfries-v0.4.1) (2026-10-02)


### Bug Fixes

* **agent:** drop an ffmpeg input option ffmpeg does not have ([#55](https://github.com/ContentFries/visualfries/issues/55)) ([eba3a63](https://github.com/ContentFries/visualfries/commit/eba3a63800b4121bfe7cc4018c1f2c98d4059066))
* **build:** declare workspace packages for older pnpm ([#52](https://github.com/ContentFries/visualfries/issues/52)) ([1b5440a](https://github.com/ContentFries/visualfries/commit/1b5440a5073193853e36c6650056c0a3a525353f))
* **package:** make the published build importable from Node ESM ([#54](https://github.com/ContentFries/visualfries/issues/54)) ([f71111a](https://github.com/ContentFries/visualfries/commit/f71111af62ffeceda425f89d958ed31178706a3f))

## [0.4.0](https://github.com/ContentFries/visualfries/compare/visualfries-v0.3.2...visualfries-v0.4.0) (2026-09-28)


### Features

* **motion:** transcript-timed Svelte motion blocks ([#49](https://github.com/ContentFries/visualfries/issues/49)) ([7b1cd04](https://github.com/ContentFries/visualfries/commit/7b1cd044b8afd75c138004c9fdc4219c353136cc))
* **site:** homepage, docs and machine-readable docs ([#50](https://github.com/ContentFries/visualfries/issues/50)) ([6af7ba2](https://github.com/ContentFries/visualfries/commit/6af7ba289c7ba2e0aacbb997efd7aeeb4808ef6b))

## [0.3.2](https://github.com/ContentFries/visualfries/compare/visualfries-v0.3.1...visualfries-v0.3.2) (2026-07-12)


### Bug Fixes

* **release:** align repository metadata ([#47](https://github.com/ContentFries/visualfries/issues/47)) ([639586b](https://github.com/ContentFries/visualfries/commit/639586b091bafce6d17ba3a9bcbc8c087e933d08))

## [0.3.1](https://github.com/ContentFries/visualfries/compare/visualfries-v0.3.0...visualfries-v0.3.1) (2026-07-12)


### Bug Fixes

* **release:** restore npm trusted publishing ([#44](https://github.com/ContentFries/visualfries/issues/44)) ([9533cd7](https://github.com/ContentFries/visualfries/commit/9533cd7c4ddb34988288f73eba072dc0f6887fd2))

## [0.3.0](https://github.com/ContentFries/visualfries/compare/visualfries-v0.2.0...visualfries-v0.3.0) (2026-07-12)


### Features

* **authoring:** align runtime capabilities and preview parity ([#43](https://github.com/ContentFries/visualfries/issues/43)) ([414e9e9](https://github.com/ContentFries/visualfries/commit/414e9e92117380bb1b62d512dc99d30dcc8d2b85))
* **browser:** add WebGL MediaBunny export path ([#41](https://github.com/ContentFries/visualfries/issues/41)) ([d66e9c3](https://github.com/ContentFries/visualfries/commit/d66e9c3377030365f7e597cf8ea8665a4981ec6c))

## [0.2.0](https://github.com/ContentFries/visualfries/compare/visualfries-v0.1.13...visualfries-v0.2.0) (2026-07-11)


### Features

* **agent:** add deterministic CLI and production-plan rendering ([#39](https://github.com/ContentFries/visualfries/issues/39)) ([0a5a83b](https://github.com/ContentFries/visualfries/commit/0a5a83bd2e6587a11fda5a795545a244c9c039b4))

## [0.1.13](https://github.com/ContentFries/visualfries/compare/visualfries-v0.1.12...visualfries-v0.1.13) (2026-03-23)


### Features

* **time:** align frame timing and decouple refresh from update execution ([#37](https://github.com/ContentFries/visualfries/issues/37)) ([3bd94be](https://github.com/ContentFries/visualfries/commit/3bd94becd2fc0d6b0b605d5605211cd540c06142))

## [0.1.12](https://github.com/ContentFries/visualfries/compare/visualfries-v0.1.11...visualfries-v0.1.12) (2026-03-22)


### Features

* optimize video playback with media warm windows ([#34](https://github.com/ContentFries/visualfries/issues/34)) ([4b090ca](https://github.com/ContentFries/visualfries/commit/4b090caf7890290c8aa3925bb00ab5a34ecddb92))

## [0.1.11](https://github.com/ContentFries/visualfries/compare/visualfries-v0.1.10...visualfries-v0.1.11) (2026-02-28)


### Bug Fixes

* video elements rendering improvements and deterministic server-side rendering ([#31](https://github.com/ContentFries/visualfries/issues/31)) ([c40cad2](https://github.com/ContentFries/visualfries/commit/c40cad20ad9ae77ce6a318b5ea705aea5b3326c7))

## [0.1.10](https://github.com/ContentFries/visualfries/compare/visualfries-v0.1.9...visualfries-v0.1.10) (2025-12-10)


### Bug Fixes

* filter out emojis from font character list to prevent Google Fonts API failures ([#29](https://github.com/ContentFries/visualfries/issues/29)) ([8acb34e](https://github.com/ContentFries/visualfries/commit/8acb34e7980197e7eb342f5e071ca627cec1ced7))

## [0.1.9](https://github.com/ContentFries/visualfries/compare/visualfries-v0.1.8...visualfries-v0.1.9) (2025-12-01)


### Bug Fixes

* **SceneSettings:** update stops range from 0-1 to 0-100 ([02b3afd](https://github.com/ContentFries/visualfries/commit/02b3afd6ac69e4fa5c7405da4a4de39202b9048f))
* **SceneSettings:** update stops range from 0-1 to 0-100 ([8971af6](https://github.com/ContentFries/visualfries/commit/8971af6d1fda9d3f2ec1ca8e8647956e2812b59e))

## [0.1.8](https://github.com/ContentFries/visualfries/compare/visualfries-v0.1.7...visualfries-v0.1.8) (2025-11-06)


### Bug Fixes

* **MediaHook:** ensure mediaElement is defined before proceeding with operations ([#25](https://github.com/ContentFries/visualfries/issues/25)) ([c6cd362](https://github.com/ContentFries/visualfries/commit/c6cd3621d134256d2b6b666d4c55041cee0c415f))

## [0.1.7](https://github.com/ContentFries/visualfries/compare/visualfries-v0.1.6...visualfries-v0.1.7) (2025-11-06)


### Bug Fixes

* **MediaHook:** handle undefined mediaElement in methods to prevent errors ([#23](https://github.com/ContentFries/visualfries/issues/23)) ([641305f](https://github.com/ContentFries/visualfries/commit/641305f130f1a80b4ae68faa3c93a6a2eb11386c))

## [0.1.6](https://github.com/ContentFries/visualfries/compare/visualfries-v0.1.5...visualfries-v0.1.6) (2025-10-23)


### Bug Fixes

* improve scene destroying ([1810c60](https://github.com/ContentFries/visualfries/commit/1810c60c62e2dcff2681eb078f0102093ebbfefc))

## [0.1.5](https://github.com/ContentFries/visualfries/compare/visualfries-v0.1.4...visualfries-v0.1.5) (2025-10-22)


### Bug Fixes

* characters loading now loads google fonts as expected ([b8e13e2](https://github.com/ContentFries/visualfries/commit/b8e13e2a8b3cce69f27deaf5b2415986bacd7934))
* chars loading now loads google fonts as expected, code is also simpler ([23a82c1](https://github.com/ContentFries/visualfries/commit/23a82c189e277278e594a1ccb8617ccd19d4efb8))

## [0.1.4](https://github.com/ContentFries/visualfries/compare/visualfries-v0.1.3...visualfries-v0.1.4) (2025-10-20)


### Bug Fixes

* allow null background values in component validation ([4aebdc3](https://github.com/ContentFries/visualfries/commit/4aebdc3049f4a3a5f96870b24b338a7915f1464f))

## [0.1.3](https://github.com/ContentFries/visualfries/compare/visualfries-v0.1.2...visualfries-v0.1.3) (2025-10-20)


### Features

* implement comprehensive schema coercion validators and timing validations ([b13a19d](https://github.com/ContentFries/visualfries/commit/b13a19d37d300a3edac7bf3803b8853d50999bfa)), closes [#9](https://github.com/ContentFries/visualfries/issues/9)

## [0.1.2](https://github.com/ContentFries/visualfries/compare/visualfries-v0.1.1...visualfries-v0.1.2) (2025-10-16)


### Features

* initial VisualFries library implementation ([e407968](https://github.com/ContentFries/visualfries/commit/e4079687d1c680190a80e8fa5ec046b86dabe9de))
* integrate release-please for automated versioning and releases ([89634b3](https://github.com/ContentFries/visualfries/commit/89634b3701f6fbdcee0363b3416595998fe54724))


### Bug Fixes

* add missing release-please manifest file ([afff6ad](https://github.com/ContentFries/visualfries/commit/afff6ada7a69af69f754eed1cccc79ae8507e4de))
* prettier config ([71d58c7](https://github.com/ContentFries/visualfries/commit/71d58c796389ab7a3a9df083d715311d29c3542b))

## [Unreleased]

- Initial release setup with release-please automation
- Test feature to verify release automation works
- Add server renderer opt-in mode: `serverRendererMode: "canvas" | "webgl"` (default `canvas`)
- Add server webgl tuning options: `preferWebGL2` and `powerPreference`
- Add automatic server webgl fallback to canvas when unsupported/init fails (with warning)
- Extend deterministic diagnostics with renderer metadata: `selectedRendererType`, `rendererFallbackOccurred`, `rendererFallbackReason`
- In `serverRendererMode: "webgl"`, use native `PIXI.BlurFilter` for `fillBackgroundBlur` (client-parity path)
