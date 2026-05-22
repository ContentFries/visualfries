function clampTime(value, duration) {
    return Number(Math.min(Math.max(value, 0), duration).toFixed(3));
}
function timed(start, length, duration) {
    const safeStart = clampTime(start, duration);
    return {
        start: safeStart,
        end: clampTime(Math.max(safeStart + 0.1, start + length), duration)
    };
}
function transitionTimes(duration) {
    const count = Math.max(0, Math.min(8, Math.floor(duration / 5)));
    return Array.from({ length: count }, (_, index) => clampTime((index + 1) * (duration / (count + 1)), duration));
}
export function createAgentCuePreset(input) {
    const preset = input.preset ?? 'hidden-engine-dynamic';
    const duration = Math.max(0.5, input.duration);
    if (preset === 'captioned-clean') {
        return {
            overlays: [],
            broll: [],
            transitions: transitionTimes(duration).map((time) => ({
                time,
                style: 'dip-to-black',
                duration: 0.18
            }))
        };
    }
    const hook = timed(0.35, 0.9, duration);
    const proof = timed(Math.min(8, duration * 0.22), 1.2, duration);
    const mechanism = timed(Math.min(16, duration * 0.42), 1.15, duration);
    const choice = timed(Math.max(0.4, duration - 7), 1.1, duration);
    const cta = timed(Math.max(0.5, duration - 3.2), 1.4, duration);
    return {
        overlays: [
            { text: 'HOOK', ...hook, style: 'hook-punch' },
            { text: 'PROOF', ...proof, style: 'proof-pill' },
            { text: 'THE MACHINE', ...mechanism, style: 'metric-badge' },
            { text: 'CHOOSE', ...choice, style: 'shock-word' },
            { text: 'your move', ...cta, style: 'cta-card' }
        ],
        broll: [],
        transitions: transitionTimes(duration).map((time, index) => ({
            time,
            style: index % 3 === 0 ? 'swipe-left' : 'dip-to-black',
            color: index % 3 === 0 ? '#04483D' : undefined,
            duration: index % 3 === 0 ? 0.24 : 0.2
        }))
    };
}
