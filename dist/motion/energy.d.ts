/**
 * Motion energy: how much a clip's style moves. The only definition of the names; everything
 * else (the `use:motion` defaults, a project style) imports them from here.
 */
export declare const ENERGIES: readonly ["calm", "balanced", "punchy"];
export type Energy = (typeof ENERGIES)[number];
export declare const isEnergy: (value: unknown) => value is Energy;
/**
 * The energy a clip's `use:motion` defaults follow: its `props.energy` when that is one of
 * `calm`, `balanced` or `punchy`, else `balanced`. A block may already use a prop called
 * `energy` for its own purpose (`0.8`, `"high"`), so any other value is ignored, never an error.
 * This is the one place that decides a clip's energy; a project style can feed in here.
 */
export declare function clipEnergy(clip: {
    props?: Record<string, unknown>;
}): Energy;
