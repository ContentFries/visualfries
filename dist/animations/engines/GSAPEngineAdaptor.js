import { gsap } from 'gsap';
import { get } from 'lodash-es';
export class GsapEngineAdaptor {
    createTimeline(options) {
        if (!options) {
            options = {};
        }
        const revertAfterComplete = get(options, 'revertAfterComplete', false);
        // options.smoothChildTiming = true;
        if (revertAfterComplete) {
            options.onComplete = function () {
                this.seek(0);
            };
        }
        const tl = gsap.timeline(options); // options
        tl.callbackScope = tl;
        return tl;
    }
    addTween(timeline, targets, method, vars, // GSAP's TweenVars is very flexible
    position) {
        if (!targets || (Array.isArray(targets) && targets.length === 0)) {
            console.warn('GSAP addTween: No targets provided.');
            return 0;
        }
        let populatedVars = { ...vars }; // Clone vars to avoid mutating original from preset
        // GSAP's .fromTo() expects 'from' vars as the second argument,
        // and 'to' vars as the third.
        // Our 'vars' for 'fromTo' contains 'vars.from' and the 'to' vars directly in 'vars'.
        if (method === 'fromTo') {
            const fromVars = populatedVars.from || {};
            delete populatedVars.from; // Remove it from the 'to' vars object
            timeline.set(targets, fromVars, position);
            const tween = timeline.to(targets, populatedVars, position);
            return tween.duration();
        }
        const tween = timeline[method](targets, populatedVars, position);
        return tween.duration();
    }
    resolveStagger(staggerDefinition, context, _tweenDuration // GSAP often handles duration within stagger context if 'amount' is used
    ) {
        // Returns GSAPStaggerVars
        if (typeof staggerDefinition === 'number') {
            return staggerDefinition; // GSAP shorthand for { each: number }
        }
        const { type, dataKey, ...restOfStagger } = staggerDefinition;
        if (type === 'fromData' && dataKey) {
            const timingsArray = context.getData(dataKey);
            if (!Array.isArray(timingsArray)) {
                console.warn(`Stagger 'fromData': dataKey "${dataKey}" did not resolve to an array.`);
                return restOfStagger; // Fallback to other stagger props if any
            }
            // GSAP functional stagger:
            // The function receives (index, target, targetsArray)
            // We want the Nth word to start at timingsArray[N] relative to this stagger block's start.
            return (index, _target, _targets) => {
                // Ensure the specific timing applies to the start of the individual tween.
                // If the stagger block itself has an overall duration ('amount'), GSAP handles distribution.
                // If 'each' is explicitly needed for individual tween starts based on data,
                // this functional value for 'each' is very powerful.
                // However, GSAP's 'amount' along with a from/distribution model often handles this.
                // For precise start times from an array, a function directly controlling delay is more robust.
                //
                // Simpler approach if timingsArray are ABSOLUTE start times for items within this stagger block:
                // We return a value that GSAP interprets as the delay for *that specific element*.
                // GSAP's stagger `each` can accept a function.
                // But for explicit timings, it's usually better to create individual tweens
                // or use a function that returns the DELAY.
                //
                // Let's assume timingsArray contains offsets for each element for this stagger.
                // This is a bit tricky as GSAP's `each` or `amount` with a function is nuanced.
                // A common GSAP pattern for fully custom time placement within a stagger:
                // The function for 'each' might determine *how much longer* than the PREVIOUS one,
                // or 'amount' is used to distribute over a total time.
                //
                // If `timingsArray` are desired *absolute start times* within the current tween:
                // The most robust way in GSAP, if not using `amount`, is for the function
                // passed to `stagger` to directly return the *delay from the start of the stagger sequence*.
                // This is often what a functional value for `each` or if `stagger` itself is a function would achieve.
                // For now, let's assume `timingsArray[index]` is the desired start offset for `targets[index]`.
                // This might need refinement based on how GSAP's `stagger` function is structured.
                // A direct mapping to individual delays is typically done by passing a function to stagger itself:
                // stagger: (index, target, list) => timingsArray[index] // This is the delay for that element
                if (timingsArray && index < timingsArray.length) {
                    return timingsArray[index];
                }
                return 0; // Default delay if no timing found
            };
        }
        return staggerDefinition; // Standard GSAP stagger object or number
    }
    play(timeline, position) {
        timeline.play(position);
    }
    pause(timeline) {
        timeline.pause();
    }
    resume(timeline, position) {
        // GSAP's play() handles resuming correctly. If a position is given, it seeks and plays.
        timeline.play(position);
    }
    seek(timeline, position, suppressEvents = true) {
        timeline.seek(position, suppressEvents);
    }
    totalDuration(timeline) {
        return timeline.totalDuration();
    }
    kill(timeline) {
        timeline.kill();
    }
    addPause(timeline, duration, position) {
        // GSAP timeline.addPause(position, callback, params)
        // To add a pause of a certain duration, we can add an empty tween or a specific delay.
        // A common way is to add a label then another label offset by duration,
        // or simply an empty tween if that's how you want to signify it.
        // Or more directly:
        if (position !== undefined) {
            timeline.addLabel('pauseStart', position);
            timeline.addLabel('pauseEnd', `+= ${duration}`);
        }
        else {
            timeline.addPause(`+=${duration}`); // Adds a pause at the current end for 'duration' seconds.
            // Actually, GSAP's addPause creates a hard stop.
            // To create a gap of 'duration':
            timeline.to({}, { duration }, position); // Empty tween to create a gap
        }
    }
    addLabel(timeline, label, position) {
        timeline.addLabel(label, position);
    }
    addCallback(timeline, callback, position) {
        timeline.call(callback, undefined, position); // GSAP's call method
    }
    onComplete(timeline, callback) {
        timeline.onComplete(callback);
    }
    repositionLabel(timeline, labelName, newPosition) {
        if (!get(timeline, 'labels.' + labelName)) {
            console.warn(`Label "${labelName}" not found in timeline`);
        }
        else {
            timeline.removeLabel(labelName);
        }
        timeline.addLabel(labelName, newPosition);
    }
}
