import { describe, expect, it } from 'vitest';

import {
	createGlTransitionRenderer,
	listGlTransitions
} from '../../src/lib/browser/glTransitions.js';

type ShaderRecord = { type: number; source: string; compiled: boolean };
type ProgramRecord = { shaders: ShaderRecord[] };

function createMockGl(options: { failRadial?: boolean; missingUniform?: string } = {}) {
	const canvas = document.createElement('canvas');
	const uploadedSources: TexImageSource[] = [];
	const uniformFloats: Array<{ name: string; value: number }> = [];
	const fragmentSources: string[] = [];
	let textureCount = 0;
	let deletedProgramCount = 0;

	const gl = {
		canvas,
		ARRAY_BUFFER: 0x8892,
		STATIC_DRAW: 0x88e4,
		VERTEX_SHADER: 0x8b31,
		FRAGMENT_SHADER: 0x8b30,
		COMPILE_STATUS: 0x8b81,
		LINK_STATUS: 0x8b82,
		TEXTURE_2D: 0x0de1,
		TEXTURE0: 0x84c0,
		TEXTURE1: 0x84c1,
		TEXTURE_WRAP_S: 0x2802,
		TEXTURE_WRAP_T: 0x2803,
		TEXTURE_MIN_FILTER: 0x2801,
		TEXTURE_MAG_FILTER: 0x2800,
		CLAMP_TO_EDGE: 0x812f,
		LINEAR: 0x2601,
		UNPACK_FLIP_Y_WEBGL: 0x9240,
		RGBA: 0x1908,
		UNSIGNED_BYTE: 0x1401,
		FLOAT: 0x1406,
		TRIANGLES: 0x0004,
		createBuffer: () => ({}),
		bindBuffer: () => {},
		bufferData: () => {},
		deleteBuffer: () => {},
		createTexture: () => ({ id: ++textureCount }),
		bindTexture: () => {},
		texParameteri: () => {},
		deleteTexture: () => {},
		pixelStorei: () => {},
		texImage2D: (...args: unknown[]) => uploadedSources.push(args.at(-1) as TexImageSource),
		createShader: (type: number): ShaderRecord => ({ type, source: '', compiled: true }),
		shaderSource: (shader: ShaderRecord, source: string) => {
			shader.source = source;
			if (shader.type === gl.FRAGMENT_SHADER) fragmentSources.push(source);
		},
		compileShader: (shader: ShaderRecord) => {
			shader.compiled = !(options.failRadial && shader.source.includes('farthestCorner'));
		},
		getShaderParameter: (shader: ShaderRecord) => shader.compiled,
		getShaderInfoLog: () => 'mock incompatible radial shader',
		deleteShader: () => {},
		createProgram: (): ProgramRecord => ({ shaders: [] }),
		attachShader: (program: ProgramRecord, shader: ShaderRecord) => program.shaders.push(shader),
		linkProgram: () => {},
		getProgramParameter: () => true,
		getProgramInfoLog: () => '',
		deleteProgram: () => {
			deletedProgramCount += 1;
		},
		viewport: () => {},
		getAttribLocation: () => 0,
		getUniformLocation: (_program: ProgramRecord, name: string) =>
			options.missingUniform === name ? null : { name },
		useProgram: () => {},
		enableVertexAttribArray: () => {},
		vertexAttribPointer: () => {},
		activeTexture: () => {},
		uniform1i: () => {},
		uniform1f: (location: { name: string }, value: number) =>
			uniformFloats.push({ name: location.name, value }),
		drawArrays: () => {}
	};

	return {
		gl: gl as unknown as WebGLRenderingContext,
		canvas,
		fragmentSources,
		uploadedSources,
		uniformFloats,
		getTextureCount: () => textureCount,
		getDeletedProgramCount: () => deletedProgramCount
	};
}

describe('curated WebGL transitions', () => {
	it('exposes only curated transition IDs', () => {
		expect(listGlTransitions()).toEqual(['fade', 'radial-wipe']);
	});

	it('guards exact transition endpoints and reuses two owned textures', () => {
		const mock = createMockGl();
		const renderer = createGlTransitionRenderer(mock.gl);
		const from = document.createElement('canvas');
		const to = document.createElement('canvas');

		renderer.render({ transition: 'radial-wipe', from, to, progress: 0, ratio: 9 / 16 });
		renderer.render({ transition: 'radial-wipe', from, to, progress: 1, ratio: 9 / 16 });

		const radialSource = mock.fragmentSources.find((source) => source.includes('farthestCorner'));
		expect(radialSource).toContain('if (progress <= 0.0)');
		expect(radialSource).toContain('getFromColor(_uv)');
		expect(radialSource).toContain('else if (progress >= 1.0)');
		expect(radialSource).toContain('getToColor(_uv)');
		expect(
			mock.uniformFloats.filter(({ name }) => name === 'progress').map(({ value }) => value)
		).toEqual([0, 1]);
		expect(mock.uploadedSources).toEqual([from, to, from, to]);
		expect(mock.getTextureCount()).toBe(2);
		expect(renderer.canvas).toBe(mock.canvas);
	});

	it('falls back to crossfade after a runtime shader compilation failure', () => {
		const mock = createMockGl({ failRadial: true });
		const renderer = createGlTransitionRenderer(mock.gl);
		const from = document.createElement('canvas');
		const to = document.createElement('canvas');

		const result = renderer.render({
			transition: 'radial-wipe',
			from,
			to,
			progress: 0.5,
			ratio: 1
		});

		expect(result.used).toBe('fade');
		expect(result.fallbackReason).toContain('shader compilation failed');
		expect(mock.fragmentSources.some((source) => source.includes('return mix(getFromColor'))).toBe(
			true
		);
		expect(mock.uploadedSources).toEqual([from, to]);
	});

	it('releases an incompatible linked program before crossfade fallback', () => {
		const mock = createMockGl({ missingUniform: 'softness' });
		const renderer = createGlTransitionRenderer(mock.gl);

		const result = renderer.render({
			transition: 'radial-wipe',
			from: document.createElement('canvas'),
			to: document.createElement('canvas'),
			progress: 0.5,
			ratio: 1
		});

		expect(result.used).toBe('fade');
		expect(mock.getDeletedProgramCount()).toBe(1);
	});
});
