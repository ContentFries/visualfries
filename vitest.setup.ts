// Mock Canvas 2D Context for PIXI.js testing
// This provides a minimal mock that allows PIXI to initialize without native canvas bindings

// Create a mock 2D context that has all the properties PIXI needs
function createMock2DContext() {
	return {
		canvas: { width: 300, height: 150 },
		fillStyle: '',
		strokeStyle: '',
		globalAlpha: 1,
		globalCompositeOperation: 'source-over',
		imageSmoothingEnabled: true,
		lineWidth: 1,
		lineCap: 'butt',
		lineJoin: 'miter',
		miterLimit: 10,
		shadowBlur: 0,
		shadowColor: 'rgba(0, 0, 0, 0)',
		shadowOffsetX: 0,
		shadowOffsetY: 0,
		
		// Methods
		save: () => {},
		restore: () => {},
		scale: () => {},
		rotate: () => {},
		translate: () => {},
		transform: () => {},
		setTransform: () => {},
		resetTransform: () => {},
		createLinearGradient: () => ({ addColorStop: () => {} }),
		createRadialGradient: () => ({ addColorStop: () => {} }),
		createPattern: () => null,
		clearRect: () => {},
		fillRect: () => {},
		strokeRect: () => {},
		beginPath: () => {},
		closePath: () => {},
		moveTo: () => {},
		lineTo: () => {},
		quadraticCurveTo: () => {},
		bezierCurveTo: () => {},
		arc: () => {},
		arcTo: () => {},
		ellipse: () => {},
		rect: () => {},
		fill: () => {},
		stroke: () => {},
		clip: () => {},
		isPointInPath: () => false,
		isPointInStroke: () => false,
		measureText: (text: string) => ({ width: text.length * 10 }),
		fillText: () => {},
		strokeText: () => {},
		drawImage: () => {},
		createImageData: () => ({ data: new Uint8ClampedArray(), width: 0, height: 0 }),
		getImageData: () => ({ data: new Uint8ClampedArray(), width: 0, height: 0 }),
		putImageData: () => {},
		getTransform: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }),
	};
}

// Mock HTMLCanvasElement.prototype.getContext
const originalGetContext = HTMLCanvasElement.prototype.getContext;

HTMLCanvasElement.prototype.getContext = function (
	contextType: string,
	options?: any
): any {
	if (contextType === '2d') {
		return createMock2DContext();
	}
	if (contextType === 'webgl' || contextType === 'experimental-webgl') {
		// Return null for WebGL - PIXI will fallback to canvas renderer
		return null;
	}
	return null;
};

// Mock WebGL for PIXI (forces it to use canvas fallback)
if (typeof WebGLRenderingContext === 'undefined') {
	(globalThis as any).WebGLRenderingContext = class WebGLRenderingContext {};
}

