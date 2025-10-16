export const PIXI_DEFAULTS = {
    // preference: "webgl" as const, // webgpu
    eventMode: 'none',
    autoStart: false,
    backgroundAlpha: 0,
    // antialias: false,
    eventFeatures: {
        move: false,
        /** disables the global move events which can be expensive in large scenes */
        globalMove: false,
        click: false,
        wheel: false
    }
};
