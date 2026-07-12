/**
 * Curated, gl-transitions-compatible WebGL transitions for deterministic browser export.
 *
 * Shader source is intentionally private. Callers select a known transition and may only
 * provide the parameters declared by that transition; arbitrary GLSL is never accepted.
 */
export const GL_TRANSITION_NAMES = ['fade', 'radial-wipe'];
const DEFINITIONS = {
    fade: {
        parameters: {},
        body: 'return mix(getFromColor(p), getToColor(p), progress);'
    },
    'radial-wipe': {
        parameters: {
            softness: { uniform: 'softness', defaultValue: 0.02, min: 0.001, max: 0.25 }
        },
        body: `
			vec2 centered = p - vec2(0.5);
			centered.x *= ratio;
			float farthestCorner = 0.5 * sqrt(ratio * ratio + 1.0);
			float radius = length(centered) / farthestCorner;
			float leadingEdge = progress * (1.0 + softness);
			float edge = smoothstep(leadingEdge - softness, leadingEdge, radius);
			return mix(getToColor(p), getFromColor(p), edge);
		`
    }
};
export function listGlTransitions() {
    return GL_TRANSITION_NAMES;
}
export function createGlTransitionRenderer(gl) {
    return new GlTransitionRenderer(gl);
}
export class GlTransitionRenderer {
    #gl;
    #isWebGl2;
    #programs = new Map();
    #failures = new Map();
    #quadBuffer;
    #fromTexture;
    #toTexture;
    canvas;
    constructor(gl) {
        this.#gl = gl;
        this.canvas = gl.canvas;
        this.#isWebGl2 = typeof gl.texStorage2D === 'function';
        const quadBuffer = gl.createBuffer();
        if (!quadBuffer)
            throw new Error('Unable to create WebGL transition vertex buffer');
        this.#quadBuffer = quadBuffer;
        this.#fromTexture = createTexture(gl);
        this.#toTexture = createTexture(gl);
        gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
    }
    render(input) {
        const requested = input.transition;
        let used = requested;
        let fallbackReason;
        let compiled;
        try {
            compiled = this.#getOrCompile(requested);
        }
        catch (error) {
            if (requested === 'fade')
                throw error;
            used = 'fade';
            fallbackReason = errorMessage(error);
            compiled = this.#getOrCompile('fade');
        }
        this.#draw(compiled, DEFINITIONS[used], input);
        return fallbackReason ? { requested, used, fallbackReason } : { requested, used };
    }
    destroy() {
        for (const compiled of this.#programs.values())
            this.#gl.deleteProgram(compiled.program);
        this.#programs.clear();
        this.#gl.deleteTexture(this.#fromTexture);
        this.#gl.deleteTexture(this.#toTexture);
        this.#gl.deleteBuffer(this.#quadBuffer);
    }
    #getOrCompile(name) {
        const existing = this.#programs.get(name);
        if (existing)
            return existing;
        const previousFailure = this.#failures.get(name);
        if (previousFailure)
            throw new Error(previousFailure);
        try {
            const compiled = this.#compile(name, DEFINITIONS[name]);
            this.#programs.set(name, compiled);
            return compiled;
        }
        catch (error) {
            const message = `${name} transition unavailable: ${errorMessage(error)}`;
            this.#failures.set(name, message);
            throw new Error(message, { cause: error });
        }
    }
    #compile(name, definition) {
        const gl = this.#gl;
        const vertexShader = compileShader(gl, gl.VERTEX_SHADER, vertexSource(this.#isWebGl2));
        let fragmentShader;
        let program;
        let compiledSuccessfully = false;
        try {
            fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource(this.#isWebGl2, definition));
            program = gl.createProgram() ?? undefined;
            if (!program)
                throw new Error('program allocation failed');
            gl.attachShader(program, vertexShader);
            gl.attachShader(program, fragmentShader);
            gl.linkProgram(program);
            if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
                const log = gl.getProgramInfoLog(program) || 'unknown link error';
                throw new Error(`program link failed: ${log}`);
            }
            const parameterLocations = {};
            for (const [parameterName, parameter] of Object.entries(definition.parameters)) {
                parameterLocations[parameterName] = requiredUniform(gl, program, parameter.uniform, name);
            }
            const position = gl.getAttribLocation(program, 'position');
            if (position < 0) {
                gl.deleteProgram(program);
                throw new Error(`${name} shader missing position attribute`);
            }
            const result = {
                program,
                position,
                from: requiredUniform(gl, program, 'from', name),
                to: requiredUniform(gl, program, 'to', name),
                progress: requiredUniform(gl, program, 'progress', name),
                // Crossfade does not mathematically need ratio, so a real GLSL compiler may optimize it out.
                ratio: gl.getUniformLocation(program, 'ratio'),
                parameters: parameterLocations
            };
            compiledSuccessfully = true;
            return result;
        }
        finally {
            if (program && !compiledSuccessfully)
                gl.deleteProgram(program);
            gl.deleteShader(vertexShader);
            if (fragmentShader)
                gl.deleteShader(fragmentShader);
        }
    }
    #draw(compiled, definition, input) {
        const gl = this.#gl;
        gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        gl.useProgram(compiled.program);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.#quadBuffer);
        gl.enableVertexAttribArray(compiled.position);
        gl.vertexAttribPointer(compiled.position, 2, gl.FLOAT, false, 0, 0);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
        gl.activeTexture(gl.TEXTURE0);
        uploadTexture(gl, this.#fromTexture, input.from);
        gl.uniform1i(compiled.from, 0);
        gl.activeTexture(gl.TEXTURE1);
        uploadTexture(gl, this.#toTexture, input.to);
        gl.uniform1i(compiled.to, 1);
        gl.uniform1f(compiled.progress, clampFinite(input.progress, 0, 1, 0));
        gl.uniform1f(compiled.ratio, clampFinite(input.ratio, 0.000001, 1_000_000, 1));
        for (const [parameterName, parameter] of Object.entries(definition.parameters)) {
            const requested = input.parameters?.[parameterName] ?? parameter.defaultValue;
            gl.uniform1f(compiled.parameters[parameterName], clampFinite(requested, parameter.min, parameter.max, parameter.defaultValue));
        }
        gl.drawArrays(gl.TRIANGLES, 0, 6);
    }
}
function vertexSource(webGl2) {
    if (webGl2) {
        return `#version 300 es
			in vec2 position;
			out vec2 _uv;
			void main() {
				_uv = position * 0.5 + 0.5;
				gl_Position = vec4(position, 0.0, 1.0);
			}`;
    }
    return `
		attribute vec2 position;
		varying vec2 _uv;
		void main() {
			_uv = position * 0.5 + 0.5;
			gl_Position = vec4(position, 0.0, 1.0);
		}`;
}
function fragmentSource(webGl2, definition) {
    const parameterUniforms = Object.values(definition.parameters)
        .map((parameter) => `uniform float ${parameter.uniform};`)
        .join('\n');
    const varying = webGl2 ? 'in vec2 _uv;' : 'varying vec2 _uv;';
    const sample = webGl2 ? 'texture' : 'texture2D';
    const output = webGl2 ? 'out vec4 transitionColor;' : '';
    const setColor = webGl2 ? 'transitionColor =' : 'gl_FragColor =';
    const version = webGl2 ? '#version 300 es' : '';
    return `${version}
		precision highp float;
		uniform sampler2D from;
		uniform sampler2D to;
		uniform float progress;
		uniform float ratio;
		${parameterUniforms}
		${varying}
		${output}

		vec4 getFromColor(vec2 p) { return ${sample}(from, p); }
		vec4 getToColor(vec2 p) { return ${sample}(to, p); }
		vec4 transition(vec2 p) { ${definition.body} }

		void main() {
			if (progress <= 0.0) {
				${setColor} getFromColor(_uv);
			} else if (progress >= 1.0) {
				${setColor} getToColor(_uv);
			} else {
				${setColor} transition(_uv);
			}
		}`;
}
function compileShader(gl, type, source) {
    const shader = gl.createShader(type);
    if (!shader)
        throw new Error('shader allocation failed');
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const log = gl.getShaderInfoLog(shader) || 'unknown compile error';
        gl.deleteShader(shader);
        throw new Error(`shader compilation failed: ${log}`);
    }
    return shader;
}
function createTexture(gl) {
    const texture = gl.createTexture();
    if (!texture)
        throw new Error('Unable to create WebGL transition texture');
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    return texture;
}
function uploadTexture(gl, texture, source) {
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
}
function requiredUniform(gl, program, name, transition) {
    const location = gl.getUniformLocation(program, name);
    if (location === null)
        throw new Error(`${transition} shader missing ${name} uniform`);
    return location;
}
function clampFinite(value, min, max, fallback) {
    return Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
}
function errorMessage(error) {
    return error instanceof Error ? error.message : String(error);
}
