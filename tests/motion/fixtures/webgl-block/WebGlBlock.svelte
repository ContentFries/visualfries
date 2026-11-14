<!--
  A block with its own WebGL canvas that samples its HTML children (HTML-in-Canvas): every
  frame it waits for the canvas to paint, uploads its drawable child with texElementSubImage2D
  (texElementImage2D on Chromium before the API's rename) and draws it through a shader. The child
  has its size set in CSS: current Chromium lays a drawable canvas's children out statically. The colour changes with the frame, so a frame that comes out
  without the canvas, or with another frame's pixels, shows. `props.wrap` puts a CSS style on
  an element around the canvas; `props.from` mounts the canvas only from that frame on.
-->
<script>
	import { useClip, useFrame } from 'visualfries/motion';

	const clip = useClip();
	const { width, height } = clip;
	let canvas = $state();
	let source = $state();
	let gl;
	let glCanvas;

	function setup() {
		glCanvas = canvas;
		gl = canvas.getContext('webgl2', { preserveDrawingBuffer: true });
		const shader = (type, text) => {
			const s = gl.createShader(type);
			gl.shaderSource(s, text);
			gl.compileShader(s);
			return s;
		};
		const program = gl.createProgram();
		gl.attachShader(
			program,
			shader(
				gl.VERTEX_SHADER,
				'#version 300 es\nin vec2 a; void main() { gl_Position = vec4(a, 0, 1); }'
			)
		);
		gl.attachShader(
			program,
			shader(
				gl.FRAGMENT_SHADER,
				'#version 300 es\nprecision highp float; uniform sampler2D tex; uniform vec2 size; out vec4 o;\n' +
					'void main() { vec2 p = gl_FragCoord.xy / size; o = texture(tex, vec2(p.x, 1.0 - p.y)); }'
			)
		);
		gl.linkProgram(program);
		gl.useProgram(program);
		gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
		gl.enableVertexAttribArray(0);
		gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
		gl.uniform2f(gl.getUniformLocation(program, 'size'), width, height);
		gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
	}

	useFrame(async () => {
		if (!canvas) return;
		if (glCanvas !== canvas) setup();
		// The children's pixels exist only once the canvas has painted them.
		await new Promise((resolve) => {
			canvas.addEventListener('paint', resolve, { once: true });
			canvas.requestPaint();
		});
		if (gl.texElementImage2D) gl.texElementImage2D(gl.TEXTURE_2D, gl.RGBA8, source);
		else {
			// Current API: allocate the texture, then copy the drawable child into it.
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
			gl.texElementSubImage2D(gl.TEXTURE_2D, 0, 0, 0, source);
		}
		gl.viewport(0, 0, width, height);
		gl.drawArrays(gl.TRIANGLES, 0, 3);
	});
</script>

<div class="wrap" style={clip.props.wrap ?? ''}>
	{#if clip.frame >= (clip.props.from ?? 0)}
		<canvas bind:this={canvas} layoutsubtree content="drawable" {width} {height}>
			<div
				bind:this={source}
				drawable
				style:background="rgb({(clip.frame * 8) % 256} 128 64)"
			>
				{clip.frame}
			</div>
		</canvas>
	{/if}
</div>

<style>
	.wrap,
	canvas,
	div {
		position: absolute;
		inset: 0;
	}
	/* Current Chromium lays a drawable canvas's children out statically: size it explicitly. The
	   number sits in the middle, away from the pixel the test reads. */
	canvas > div {
		width: 100%;
		height: 100%;
		display: grid;
		place-items: center;
	}
	div {
		color: white;
		font: bold 48px sans-serif;
	}
</style>
