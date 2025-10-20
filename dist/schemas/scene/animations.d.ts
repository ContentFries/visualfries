import { z } from 'zod';
declare const StaggerShape: z.ZodUnion<readonly [z.ZodNumber, z.ZodObject<{
    type: z.ZodOptional<z.ZodLiteral<"fromData">>;
    dataKey: z.ZodOptional<z.ZodString>;
    referencePoint: z.ZodOptional<z.ZodLiteral<"tweenStart">>;
    each: z.ZodOptional<z.ZodPipe<z.ZodTransform<unknown, unknown>, z.ZodCoercedNumber<unknown>>>;
    from: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodPipe<z.ZodTransform<unknown, unknown>, z.ZodCoercedNumber<unknown>>]>>;
    grid: z.ZodOptional<z.ZodTuple<[z.ZodUnion<readonly [z.ZodLiteral<"auto">, z.ZodPipe<z.ZodTransform<unknown, unknown>, z.ZodCoercedNumber<unknown>>]>, z.ZodUnion<readonly [z.ZodLiteral<"auto">, z.ZodPipe<z.ZodTransform<unknown, unknown>, z.ZodCoercedNumber<unknown>>]>], null>>;
    axis: z.ZodOptional<z.ZodEnum<{
        x: "x";
        y: "y";
    }>>;
    ease: z.ZodOptional<z.ZodString>;
    amount: z.ZodOptional<z.ZodPipe<z.ZodTransform<unknown, unknown>, z.ZodCoercedNumber<unknown>>>;
}, z.core.$strip>]>;
declare const BaseAnimatableProperties: z.ZodObject<{
    opacity: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull, z.ZodObject<{
        fromData: z.ZodString;
        mode: z.ZodPrefault<z.ZodOptional<z.ZodEnum<{
            cycle: "cycle";
            useFallback: "useFallback";
            clamp: "clamp";
        }>>>;
        fallbackValue: z.ZodOptional<z.ZodAny>;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"byIndex">;
        expression: z.ZodString;
        fallbackValue: z.ZodOptional<z.ZodAny>;
    }, z.core.$strip>]>>;
    x: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull, z.ZodObject<{
        fromData: z.ZodString;
        mode: z.ZodPrefault<z.ZodOptional<z.ZodEnum<{
            cycle: "cycle";
            useFallback: "useFallback";
            clamp: "clamp";
        }>>>;
        fallbackValue: z.ZodOptional<z.ZodAny>;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"byIndex">;
        expression: z.ZodString;
        fallbackValue: z.ZodOptional<z.ZodAny>;
    }, z.core.$strip>]>>;
    y: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull, z.ZodObject<{
        fromData: z.ZodString;
        mode: z.ZodPrefault<z.ZodOptional<z.ZodEnum<{
            cycle: "cycle";
            useFallback: "useFallback";
            clamp: "clamp";
        }>>>;
        fallbackValue: z.ZodOptional<z.ZodAny>;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"byIndex">;
        expression: z.ZodString;
        fallbackValue: z.ZodOptional<z.ZodAny>;
    }, z.core.$strip>]>>;
    scale: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull, z.ZodObject<{
        fromData: z.ZodString;
        mode: z.ZodPrefault<z.ZodOptional<z.ZodEnum<{
            cycle: "cycle";
            useFallback: "useFallback";
            clamp: "clamp";
        }>>>;
        fallbackValue: z.ZodOptional<z.ZodAny>;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"byIndex">;
        expression: z.ZodString;
        fallbackValue: z.ZodOptional<z.ZodAny>;
    }, z.core.$strip>]>>;
    scaleX: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull, z.ZodObject<{
        fromData: z.ZodString;
        mode: z.ZodPrefault<z.ZodOptional<z.ZodEnum<{
            cycle: "cycle";
            useFallback: "useFallback";
            clamp: "clamp";
        }>>>;
        fallbackValue: z.ZodOptional<z.ZodAny>;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"byIndex">;
        expression: z.ZodString;
        fallbackValue: z.ZodOptional<z.ZodAny>;
    }, z.core.$strip>]>>;
    scaleY: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull, z.ZodObject<{
        fromData: z.ZodString;
        mode: z.ZodPrefault<z.ZodOptional<z.ZodEnum<{
            cycle: "cycle";
            useFallback: "useFallback";
            clamp: "clamp";
        }>>>;
        fallbackValue: z.ZodOptional<z.ZodAny>;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"byIndex">;
        expression: z.ZodString;
        fallbackValue: z.ZodOptional<z.ZodAny>;
    }, z.core.$strip>]>>;
    rotation: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull, z.ZodObject<{
        fromData: z.ZodString;
        mode: z.ZodPrefault<z.ZodOptional<z.ZodEnum<{
            cycle: "cycle";
            useFallback: "useFallback";
            clamp: "clamp";
        }>>>;
        fallbackValue: z.ZodOptional<z.ZodAny>;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"byIndex">;
        expression: z.ZodString;
        fallbackValue: z.ZodOptional<z.ZodAny>;
    }, z.core.$strip>]>>;
    width: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull, z.ZodObject<{
        fromData: z.ZodString;
        mode: z.ZodPrefault<z.ZodOptional<z.ZodEnum<{
            cycle: "cycle";
            useFallback: "useFallback";
            clamp: "clamp";
        }>>>;
        fallbackValue: z.ZodOptional<z.ZodAny>;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"byIndex">;
        expression: z.ZodString;
        fallbackValue: z.ZodOptional<z.ZodAny>;
    }, z.core.$strip>]>>;
    height: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull, z.ZodObject<{
        fromData: z.ZodString;
        mode: z.ZodPrefault<z.ZodOptional<z.ZodEnum<{
            cycle: "cycle";
            useFallback: "useFallback";
            clamp: "clamp";
        }>>>;
        fallbackValue: z.ZodOptional<z.ZodAny>;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"byIndex">;
        expression: z.ZodString;
        fallbackValue: z.ZodOptional<z.ZodAny>;
    }, z.core.$strip>]>>;
    color: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull, z.ZodObject<{
        fromData: z.ZodString;
        mode: z.ZodPrefault<z.ZodOptional<z.ZodEnum<{
            cycle: "cycle";
            useFallback: "useFallback";
            clamp: "clamp";
        }>>>;
        fallbackValue: z.ZodOptional<z.ZodAny>;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"byIndex">;
        expression: z.ZodString;
        fallbackValue: z.ZodOptional<z.ZodAny>;
    }, z.core.$strip>]>>;
}, z.core.$catchall<z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull, z.ZodObject<{
    fromData: z.ZodString;
    mode: z.ZodPrefault<z.ZodOptional<z.ZodEnum<{
        cycle: "cycle";
        useFallback: "useFallback";
        clamp: "clamp";
    }>>>;
    fallbackValue: z.ZodOptional<z.ZodAny>;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"byIndex">;
    expression: z.ZodString;
    fallbackValue: z.ZodOptional<z.ZodAny>;
}, z.core.$strip>]>>>;
declare const FinalTweenVarsShape: z.ZodObject<{
    from: z.ZodOptional<z.ZodObject<{
        opacity: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull, z.ZodObject<{
            fromData: z.ZodString;
            mode: z.ZodPrefault<z.ZodOptional<z.ZodEnum<{
                cycle: "cycle";
                useFallback: "useFallback";
                clamp: "clamp";
            }>>>;
            fallbackValue: z.ZodOptional<z.ZodAny>;
        }, z.core.$strip>, z.ZodObject<{
            type: z.ZodLiteral<"byIndex">;
            expression: z.ZodString;
            fallbackValue: z.ZodOptional<z.ZodAny>;
        }, z.core.$strip>]>>;
        x: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull, z.ZodObject<{
            fromData: z.ZodString;
            mode: z.ZodPrefault<z.ZodOptional<z.ZodEnum<{
                cycle: "cycle";
                useFallback: "useFallback";
                clamp: "clamp";
            }>>>;
            fallbackValue: z.ZodOptional<z.ZodAny>;
        }, z.core.$strip>, z.ZodObject<{
            type: z.ZodLiteral<"byIndex">;
            expression: z.ZodString;
            fallbackValue: z.ZodOptional<z.ZodAny>;
        }, z.core.$strip>]>>;
        y: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull, z.ZodObject<{
            fromData: z.ZodString;
            mode: z.ZodPrefault<z.ZodOptional<z.ZodEnum<{
                cycle: "cycle";
                useFallback: "useFallback";
                clamp: "clamp";
            }>>>;
            fallbackValue: z.ZodOptional<z.ZodAny>;
        }, z.core.$strip>, z.ZodObject<{
            type: z.ZodLiteral<"byIndex">;
            expression: z.ZodString;
            fallbackValue: z.ZodOptional<z.ZodAny>;
        }, z.core.$strip>]>>;
        scale: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull, z.ZodObject<{
            fromData: z.ZodString;
            mode: z.ZodPrefault<z.ZodOptional<z.ZodEnum<{
                cycle: "cycle";
                useFallback: "useFallback";
                clamp: "clamp";
            }>>>;
            fallbackValue: z.ZodOptional<z.ZodAny>;
        }, z.core.$strip>, z.ZodObject<{
            type: z.ZodLiteral<"byIndex">;
            expression: z.ZodString;
            fallbackValue: z.ZodOptional<z.ZodAny>;
        }, z.core.$strip>]>>;
        scaleX: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull, z.ZodObject<{
            fromData: z.ZodString;
            mode: z.ZodPrefault<z.ZodOptional<z.ZodEnum<{
                cycle: "cycle";
                useFallback: "useFallback";
                clamp: "clamp";
            }>>>;
            fallbackValue: z.ZodOptional<z.ZodAny>;
        }, z.core.$strip>, z.ZodObject<{
            type: z.ZodLiteral<"byIndex">;
            expression: z.ZodString;
            fallbackValue: z.ZodOptional<z.ZodAny>;
        }, z.core.$strip>]>>;
        scaleY: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull, z.ZodObject<{
            fromData: z.ZodString;
            mode: z.ZodPrefault<z.ZodOptional<z.ZodEnum<{
                cycle: "cycle";
                useFallback: "useFallback";
                clamp: "clamp";
            }>>>;
            fallbackValue: z.ZodOptional<z.ZodAny>;
        }, z.core.$strip>, z.ZodObject<{
            type: z.ZodLiteral<"byIndex">;
            expression: z.ZodString;
            fallbackValue: z.ZodOptional<z.ZodAny>;
        }, z.core.$strip>]>>;
        rotation: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull, z.ZodObject<{
            fromData: z.ZodString;
            mode: z.ZodPrefault<z.ZodOptional<z.ZodEnum<{
                cycle: "cycle";
                useFallback: "useFallback";
                clamp: "clamp";
            }>>>;
            fallbackValue: z.ZodOptional<z.ZodAny>;
        }, z.core.$strip>, z.ZodObject<{
            type: z.ZodLiteral<"byIndex">;
            expression: z.ZodString;
            fallbackValue: z.ZodOptional<z.ZodAny>;
        }, z.core.$strip>]>>;
        width: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull, z.ZodObject<{
            fromData: z.ZodString;
            mode: z.ZodPrefault<z.ZodOptional<z.ZodEnum<{
                cycle: "cycle";
                useFallback: "useFallback";
                clamp: "clamp";
            }>>>;
            fallbackValue: z.ZodOptional<z.ZodAny>;
        }, z.core.$strip>, z.ZodObject<{
            type: z.ZodLiteral<"byIndex">;
            expression: z.ZodString;
            fallbackValue: z.ZodOptional<z.ZodAny>;
        }, z.core.$strip>]>>;
        height: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull, z.ZodObject<{
            fromData: z.ZodString;
            mode: z.ZodPrefault<z.ZodOptional<z.ZodEnum<{
                cycle: "cycle";
                useFallback: "useFallback";
                clamp: "clamp";
            }>>>;
            fallbackValue: z.ZodOptional<z.ZodAny>;
        }, z.core.$strip>, z.ZodObject<{
            type: z.ZodLiteral<"byIndex">;
            expression: z.ZodString;
            fallbackValue: z.ZodOptional<z.ZodAny>;
        }, z.core.$strip>]>>;
        color: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull, z.ZodObject<{
            fromData: z.ZodString;
            mode: z.ZodPrefault<z.ZodOptional<z.ZodEnum<{
                cycle: "cycle";
                useFallback: "useFallback";
                clamp: "clamp";
            }>>>;
            fallbackValue: z.ZodOptional<z.ZodAny>;
        }, z.core.$strip>, z.ZodObject<{
            type: z.ZodLiteral<"byIndex">;
            expression: z.ZodString;
            fallbackValue: z.ZodOptional<z.ZodAny>;
        }, z.core.$strip>]>>;
    }, z.core.$catchall<z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull, z.ZodObject<{
        fromData: z.ZodString;
        mode: z.ZodPrefault<z.ZodOptional<z.ZodEnum<{
            cycle: "cycle";
            useFallback: "useFallback";
            clamp: "clamp";
        }>>>;
        fallbackValue: z.ZodOptional<z.ZodAny>;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"byIndex">;
        expression: z.ZodString;
        fallbackValue: z.ZodOptional<z.ZodAny>;
    }, z.core.$strip>]>>>>;
    duration: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull, z.ZodObject<{
        fromData: z.ZodString;
        mode: z.ZodPrefault<z.ZodOptional<z.ZodEnum<{
            cycle: "cycle";
            useFallback: "useFallback";
            clamp: "clamp";
        }>>>;
        fallbackValue: z.ZodOptional<z.ZodAny>;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"byIndex">;
        expression: z.ZodString;
        fallbackValue: z.ZodOptional<z.ZodAny>;
    }, z.core.$strip>]>>;
    ease: z.ZodOptional<z.ZodString>;
    delay: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull, z.ZodObject<{
        fromData: z.ZodString;
        mode: z.ZodPrefault<z.ZodOptional<z.ZodEnum<{
            cycle: "cycle";
            useFallback: "useFallback";
            clamp: "clamp";
        }>>>;
        fallbackValue: z.ZodOptional<z.ZodAny>;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"byIndex">;
        expression: z.ZodString;
        fallbackValue: z.ZodOptional<z.ZodAny>;
    }, z.core.$strip>]>>;
    stagger: z.ZodOptional<z.ZodUnion<readonly [z.ZodNumber, z.ZodObject<{
        type: z.ZodOptional<z.ZodLiteral<"fromData">>;
        dataKey: z.ZodOptional<z.ZodString>;
        referencePoint: z.ZodOptional<z.ZodLiteral<"tweenStart">>;
        each: z.ZodOptional<z.ZodPipe<z.ZodTransform<unknown, unknown>, z.ZodCoercedNumber<unknown>>>;
        from: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodPipe<z.ZodTransform<unknown, unknown>, z.ZodCoercedNumber<unknown>>]>>;
        grid: z.ZodOptional<z.ZodTuple<[z.ZodUnion<readonly [z.ZodLiteral<"auto">, z.ZodPipe<z.ZodTransform<unknown, unknown>, z.ZodCoercedNumber<unknown>>]>, z.ZodUnion<readonly [z.ZodLiteral<"auto">, z.ZodPipe<z.ZodTransform<unknown, unknown>, z.ZodCoercedNumber<unknown>>]>], null>>;
        axis: z.ZodOptional<z.ZodEnum<{
            x: "x";
            y: "y";
        }>>;
        ease: z.ZodOptional<z.ZodString>;
        amount: z.ZodOptional<z.ZodPipe<z.ZodTransform<unknown, unknown>, z.ZodCoercedNumber<unknown>>>;
    }, z.core.$strip>]>>;
}, z.core.$catchall<z.ZodAny>>;
declare const AnimationTimelinePositionShape: z.ZodUnion<readonly [z.ZodString, z.ZodPipe<z.ZodTransform<unknown, unknown>, z.ZodCoercedNumber<unknown>>, z.ZodObject<{
    anchor: z.ZodString;
    anchorPoint: z.ZodOptional<z.ZodEnum<{
        start: "start";
        end: "end";
    }>>;
    alignTween: z.ZodPrefault<z.ZodOptional<z.ZodEnum<{
        start: "start";
        end: "end";
        center: "center";
    }>>>;
    offset: z.ZodPrefault<z.ZodOptional<z.ZodString>>;
}, z.core.$strip>]>;
declare const TweenDefinitionShape: z.ZodObject<{
    method: z.ZodEnum<{
        set: "set";
        to: "to";
        from: "from";
        fromTo: "fromTo";
    }>;
    position: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodPipe<z.ZodTransform<unknown, unknown>, z.ZodCoercedNumber<unknown>>, z.ZodObject<{
        anchor: z.ZodString;
        anchorPoint: z.ZodOptional<z.ZodEnum<{
            start: "start";
            end: "end";
        }>>;
        alignTween: z.ZodPrefault<z.ZodOptional<z.ZodEnum<{
            start: "start";
            end: "end";
            center: "center";
        }>>>;
        offset: z.ZodPrefault<z.ZodOptional<z.ZodString>>;
    }, z.core.$strip>]>>;
    vars: z.ZodObject<{
        from: z.ZodOptional<z.ZodObject<{
            opacity: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull, z.ZodObject<{
                fromData: z.ZodString;
                mode: z.ZodPrefault<z.ZodOptional<z.ZodEnum<{
                    cycle: "cycle";
                    useFallback: "useFallback";
                    clamp: "clamp";
                }>>>;
                fallbackValue: z.ZodOptional<z.ZodAny>;
            }, z.core.$strip>, z.ZodObject<{
                type: z.ZodLiteral<"byIndex">;
                expression: z.ZodString;
                fallbackValue: z.ZodOptional<z.ZodAny>;
            }, z.core.$strip>]>>;
            x: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull, z.ZodObject<{
                fromData: z.ZodString;
                mode: z.ZodPrefault<z.ZodOptional<z.ZodEnum<{
                    cycle: "cycle";
                    useFallback: "useFallback";
                    clamp: "clamp";
                }>>>;
                fallbackValue: z.ZodOptional<z.ZodAny>;
            }, z.core.$strip>, z.ZodObject<{
                type: z.ZodLiteral<"byIndex">;
                expression: z.ZodString;
                fallbackValue: z.ZodOptional<z.ZodAny>;
            }, z.core.$strip>]>>;
            y: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull, z.ZodObject<{
                fromData: z.ZodString;
                mode: z.ZodPrefault<z.ZodOptional<z.ZodEnum<{
                    cycle: "cycle";
                    useFallback: "useFallback";
                    clamp: "clamp";
                }>>>;
                fallbackValue: z.ZodOptional<z.ZodAny>;
            }, z.core.$strip>, z.ZodObject<{
                type: z.ZodLiteral<"byIndex">;
                expression: z.ZodString;
                fallbackValue: z.ZodOptional<z.ZodAny>;
            }, z.core.$strip>]>>;
            scale: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull, z.ZodObject<{
                fromData: z.ZodString;
                mode: z.ZodPrefault<z.ZodOptional<z.ZodEnum<{
                    cycle: "cycle";
                    useFallback: "useFallback";
                    clamp: "clamp";
                }>>>;
                fallbackValue: z.ZodOptional<z.ZodAny>;
            }, z.core.$strip>, z.ZodObject<{
                type: z.ZodLiteral<"byIndex">;
                expression: z.ZodString;
                fallbackValue: z.ZodOptional<z.ZodAny>;
            }, z.core.$strip>]>>;
            scaleX: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull, z.ZodObject<{
                fromData: z.ZodString;
                mode: z.ZodPrefault<z.ZodOptional<z.ZodEnum<{
                    cycle: "cycle";
                    useFallback: "useFallback";
                    clamp: "clamp";
                }>>>;
                fallbackValue: z.ZodOptional<z.ZodAny>;
            }, z.core.$strip>, z.ZodObject<{
                type: z.ZodLiteral<"byIndex">;
                expression: z.ZodString;
                fallbackValue: z.ZodOptional<z.ZodAny>;
            }, z.core.$strip>]>>;
            scaleY: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull, z.ZodObject<{
                fromData: z.ZodString;
                mode: z.ZodPrefault<z.ZodOptional<z.ZodEnum<{
                    cycle: "cycle";
                    useFallback: "useFallback";
                    clamp: "clamp";
                }>>>;
                fallbackValue: z.ZodOptional<z.ZodAny>;
            }, z.core.$strip>, z.ZodObject<{
                type: z.ZodLiteral<"byIndex">;
                expression: z.ZodString;
                fallbackValue: z.ZodOptional<z.ZodAny>;
            }, z.core.$strip>]>>;
            rotation: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull, z.ZodObject<{
                fromData: z.ZodString;
                mode: z.ZodPrefault<z.ZodOptional<z.ZodEnum<{
                    cycle: "cycle";
                    useFallback: "useFallback";
                    clamp: "clamp";
                }>>>;
                fallbackValue: z.ZodOptional<z.ZodAny>;
            }, z.core.$strip>, z.ZodObject<{
                type: z.ZodLiteral<"byIndex">;
                expression: z.ZodString;
                fallbackValue: z.ZodOptional<z.ZodAny>;
            }, z.core.$strip>]>>;
            width: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull, z.ZodObject<{
                fromData: z.ZodString;
                mode: z.ZodPrefault<z.ZodOptional<z.ZodEnum<{
                    cycle: "cycle";
                    useFallback: "useFallback";
                    clamp: "clamp";
                }>>>;
                fallbackValue: z.ZodOptional<z.ZodAny>;
            }, z.core.$strip>, z.ZodObject<{
                type: z.ZodLiteral<"byIndex">;
                expression: z.ZodString;
                fallbackValue: z.ZodOptional<z.ZodAny>;
            }, z.core.$strip>]>>;
            height: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull, z.ZodObject<{
                fromData: z.ZodString;
                mode: z.ZodPrefault<z.ZodOptional<z.ZodEnum<{
                    cycle: "cycle";
                    useFallback: "useFallback";
                    clamp: "clamp";
                }>>>;
                fallbackValue: z.ZodOptional<z.ZodAny>;
            }, z.core.$strip>, z.ZodObject<{
                type: z.ZodLiteral<"byIndex">;
                expression: z.ZodString;
                fallbackValue: z.ZodOptional<z.ZodAny>;
            }, z.core.$strip>]>>;
            color: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull, z.ZodObject<{
                fromData: z.ZodString;
                mode: z.ZodPrefault<z.ZodOptional<z.ZodEnum<{
                    cycle: "cycle";
                    useFallback: "useFallback";
                    clamp: "clamp";
                }>>>;
                fallbackValue: z.ZodOptional<z.ZodAny>;
            }, z.core.$strip>, z.ZodObject<{
                type: z.ZodLiteral<"byIndex">;
                expression: z.ZodString;
                fallbackValue: z.ZodOptional<z.ZodAny>;
            }, z.core.$strip>]>>;
        }, z.core.$catchall<z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull, z.ZodObject<{
            fromData: z.ZodString;
            mode: z.ZodPrefault<z.ZodOptional<z.ZodEnum<{
                cycle: "cycle";
                useFallback: "useFallback";
                clamp: "clamp";
            }>>>;
            fallbackValue: z.ZodOptional<z.ZodAny>;
        }, z.core.$strip>, z.ZodObject<{
            type: z.ZodLiteral<"byIndex">;
            expression: z.ZodString;
            fallbackValue: z.ZodOptional<z.ZodAny>;
        }, z.core.$strip>]>>>>;
        duration: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull, z.ZodObject<{
            fromData: z.ZodString;
            mode: z.ZodPrefault<z.ZodOptional<z.ZodEnum<{
                cycle: "cycle";
                useFallback: "useFallback";
                clamp: "clamp";
            }>>>;
            fallbackValue: z.ZodOptional<z.ZodAny>;
        }, z.core.$strip>, z.ZodObject<{
            type: z.ZodLiteral<"byIndex">;
            expression: z.ZodString;
            fallbackValue: z.ZodOptional<z.ZodAny>;
        }, z.core.$strip>]>>;
        ease: z.ZodOptional<z.ZodString>;
        delay: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull, z.ZodObject<{
            fromData: z.ZodString;
            mode: z.ZodPrefault<z.ZodOptional<z.ZodEnum<{
                cycle: "cycle";
                useFallback: "useFallback";
                clamp: "clamp";
            }>>>;
            fallbackValue: z.ZodOptional<z.ZodAny>;
        }, z.core.$strip>, z.ZodObject<{
            type: z.ZodLiteral<"byIndex">;
            expression: z.ZodString;
            fallbackValue: z.ZodOptional<z.ZodAny>;
        }, z.core.$strip>]>>;
        stagger: z.ZodOptional<z.ZodUnion<readonly [z.ZodNumber, z.ZodObject<{
            type: z.ZodOptional<z.ZodLiteral<"fromData">>;
            dataKey: z.ZodOptional<z.ZodString>;
            referencePoint: z.ZodOptional<z.ZodLiteral<"tweenStart">>;
            each: z.ZodOptional<z.ZodPipe<z.ZodTransform<unknown, unknown>, z.ZodCoercedNumber<unknown>>>;
            from: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodPipe<z.ZodTransform<unknown, unknown>, z.ZodCoercedNumber<unknown>>]>>;
            grid: z.ZodOptional<z.ZodTuple<[z.ZodUnion<readonly [z.ZodLiteral<"auto">, z.ZodPipe<z.ZodTransform<unknown, unknown>, z.ZodCoercedNumber<unknown>>]>, z.ZodUnion<readonly [z.ZodLiteral<"auto">, z.ZodPipe<z.ZodTransform<unknown, unknown>, z.ZodCoercedNumber<unknown>>]>], null>>;
            axis: z.ZodOptional<z.ZodEnum<{
                x: "x";
                y: "y";
            }>>;
            ease: z.ZodOptional<z.ZodString>;
            amount: z.ZodOptional<z.ZodPipe<z.ZodTransform<unknown, unknown>, z.ZodCoercedNumber<unknown>>>;
        }, z.core.$strip>]>>;
    }, z.core.$catchall<z.ZodAny>>;
}, z.core.$strip>;
export declare const KeyframeAnimationShape: z.ZodObject<{
    id: z.ZodOptional<z.ZodString>;
    tween: z.ZodObject<{
        method: z.ZodEnum<{
            set: "set";
            to: "to";
            from: "from";
            fromTo: "fromTo";
        }>;
        position: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodPipe<z.ZodTransform<unknown, unknown>, z.ZodCoercedNumber<unknown>>, z.ZodObject<{
            anchor: z.ZodString;
            anchorPoint: z.ZodOptional<z.ZodEnum<{
                start: "start";
                end: "end";
            }>>;
            alignTween: z.ZodPrefault<z.ZodOptional<z.ZodEnum<{
                start: "start";
                end: "end";
                center: "center";
            }>>>;
            offset: z.ZodPrefault<z.ZodOptional<z.ZodString>>;
        }, z.core.$strip>]>>;
        vars: z.ZodObject<{
            from: z.ZodOptional<z.ZodObject<{
                opacity: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull, z.ZodObject<{
                    fromData: z.ZodString;
                    mode: z.ZodPrefault<z.ZodOptional<z.ZodEnum<{
                        cycle: "cycle";
                        useFallback: "useFallback";
                        clamp: "clamp";
                    }>>>;
                    fallbackValue: z.ZodOptional<z.ZodAny>;
                }, z.core.$strip>, z.ZodObject<{
                    type: z.ZodLiteral<"byIndex">;
                    expression: z.ZodString;
                    fallbackValue: z.ZodOptional<z.ZodAny>;
                }, z.core.$strip>]>>;
                x: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull, z.ZodObject<{
                    fromData: z.ZodString;
                    mode: z.ZodPrefault<z.ZodOptional<z.ZodEnum<{
                        cycle: "cycle";
                        useFallback: "useFallback";
                        clamp: "clamp";
                    }>>>;
                    fallbackValue: z.ZodOptional<z.ZodAny>;
                }, z.core.$strip>, z.ZodObject<{
                    type: z.ZodLiteral<"byIndex">;
                    expression: z.ZodString;
                    fallbackValue: z.ZodOptional<z.ZodAny>;
                }, z.core.$strip>]>>;
                y: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull, z.ZodObject<{
                    fromData: z.ZodString;
                    mode: z.ZodPrefault<z.ZodOptional<z.ZodEnum<{
                        cycle: "cycle";
                        useFallback: "useFallback";
                        clamp: "clamp";
                    }>>>;
                    fallbackValue: z.ZodOptional<z.ZodAny>;
                }, z.core.$strip>, z.ZodObject<{
                    type: z.ZodLiteral<"byIndex">;
                    expression: z.ZodString;
                    fallbackValue: z.ZodOptional<z.ZodAny>;
                }, z.core.$strip>]>>;
                scale: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull, z.ZodObject<{
                    fromData: z.ZodString;
                    mode: z.ZodPrefault<z.ZodOptional<z.ZodEnum<{
                        cycle: "cycle";
                        useFallback: "useFallback";
                        clamp: "clamp";
                    }>>>;
                    fallbackValue: z.ZodOptional<z.ZodAny>;
                }, z.core.$strip>, z.ZodObject<{
                    type: z.ZodLiteral<"byIndex">;
                    expression: z.ZodString;
                    fallbackValue: z.ZodOptional<z.ZodAny>;
                }, z.core.$strip>]>>;
                scaleX: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull, z.ZodObject<{
                    fromData: z.ZodString;
                    mode: z.ZodPrefault<z.ZodOptional<z.ZodEnum<{
                        cycle: "cycle";
                        useFallback: "useFallback";
                        clamp: "clamp";
                    }>>>;
                    fallbackValue: z.ZodOptional<z.ZodAny>;
                }, z.core.$strip>, z.ZodObject<{
                    type: z.ZodLiteral<"byIndex">;
                    expression: z.ZodString;
                    fallbackValue: z.ZodOptional<z.ZodAny>;
                }, z.core.$strip>]>>;
                scaleY: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull, z.ZodObject<{
                    fromData: z.ZodString;
                    mode: z.ZodPrefault<z.ZodOptional<z.ZodEnum<{
                        cycle: "cycle";
                        useFallback: "useFallback";
                        clamp: "clamp";
                    }>>>;
                    fallbackValue: z.ZodOptional<z.ZodAny>;
                }, z.core.$strip>, z.ZodObject<{
                    type: z.ZodLiteral<"byIndex">;
                    expression: z.ZodString;
                    fallbackValue: z.ZodOptional<z.ZodAny>;
                }, z.core.$strip>]>>;
                rotation: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull, z.ZodObject<{
                    fromData: z.ZodString;
                    mode: z.ZodPrefault<z.ZodOptional<z.ZodEnum<{
                        cycle: "cycle";
                        useFallback: "useFallback";
                        clamp: "clamp";
                    }>>>;
                    fallbackValue: z.ZodOptional<z.ZodAny>;
                }, z.core.$strip>, z.ZodObject<{
                    type: z.ZodLiteral<"byIndex">;
                    expression: z.ZodString;
                    fallbackValue: z.ZodOptional<z.ZodAny>;
                }, z.core.$strip>]>>;
                width: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull, z.ZodObject<{
                    fromData: z.ZodString;
                    mode: z.ZodPrefault<z.ZodOptional<z.ZodEnum<{
                        cycle: "cycle";
                        useFallback: "useFallback";
                        clamp: "clamp";
                    }>>>;
                    fallbackValue: z.ZodOptional<z.ZodAny>;
                }, z.core.$strip>, z.ZodObject<{
                    type: z.ZodLiteral<"byIndex">;
                    expression: z.ZodString;
                    fallbackValue: z.ZodOptional<z.ZodAny>;
                }, z.core.$strip>]>>;
                height: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull, z.ZodObject<{
                    fromData: z.ZodString;
                    mode: z.ZodPrefault<z.ZodOptional<z.ZodEnum<{
                        cycle: "cycle";
                        useFallback: "useFallback";
                        clamp: "clamp";
                    }>>>;
                    fallbackValue: z.ZodOptional<z.ZodAny>;
                }, z.core.$strip>, z.ZodObject<{
                    type: z.ZodLiteral<"byIndex">;
                    expression: z.ZodString;
                    fallbackValue: z.ZodOptional<z.ZodAny>;
                }, z.core.$strip>]>>;
                color: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull, z.ZodObject<{
                    fromData: z.ZodString;
                    mode: z.ZodPrefault<z.ZodOptional<z.ZodEnum<{
                        cycle: "cycle";
                        useFallback: "useFallback";
                        clamp: "clamp";
                    }>>>;
                    fallbackValue: z.ZodOptional<z.ZodAny>;
                }, z.core.$strip>, z.ZodObject<{
                    type: z.ZodLiteral<"byIndex">;
                    expression: z.ZodString;
                    fallbackValue: z.ZodOptional<z.ZodAny>;
                }, z.core.$strip>]>>;
            }, z.core.$catchall<z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull, z.ZodObject<{
                fromData: z.ZodString;
                mode: z.ZodPrefault<z.ZodOptional<z.ZodEnum<{
                    cycle: "cycle";
                    useFallback: "useFallback";
                    clamp: "clamp";
                }>>>;
                fallbackValue: z.ZodOptional<z.ZodAny>;
            }, z.core.$strip>, z.ZodObject<{
                type: z.ZodLiteral<"byIndex">;
                expression: z.ZodString;
                fallbackValue: z.ZodOptional<z.ZodAny>;
            }, z.core.$strip>]>>>>;
            duration: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull, z.ZodObject<{
                fromData: z.ZodString;
                mode: z.ZodPrefault<z.ZodOptional<z.ZodEnum<{
                    cycle: "cycle";
                    useFallback: "useFallback";
                    clamp: "clamp";
                }>>>;
                fallbackValue: z.ZodOptional<z.ZodAny>;
            }, z.core.$strip>, z.ZodObject<{
                type: z.ZodLiteral<"byIndex">;
                expression: z.ZodString;
                fallbackValue: z.ZodOptional<z.ZodAny>;
            }, z.core.$strip>]>>;
            ease: z.ZodOptional<z.ZodString>;
            delay: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull, z.ZodObject<{
                fromData: z.ZodString;
                mode: z.ZodPrefault<z.ZodOptional<z.ZodEnum<{
                    cycle: "cycle";
                    useFallback: "useFallback";
                    clamp: "clamp";
                }>>>;
                fallbackValue: z.ZodOptional<z.ZodAny>;
            }, z.core.$strip>, z.ZodObject<{
                type: z.ZodLiteral<"byIndex">;
                expression: z.ZodString;
                fallbackValue: z.ZodOptional<z.ZodAny>;
            }, z.core.$strip>]>>;
            stagger: z.ZodOptional<z.ZodUnion<readonly [z.ZodNumber, z.ZodObject<{
                type: z.ZodOptional<z.ZodLiteral<"fromData">>;
                dataKey: z.ZodOptional<z.ZodString>;
                referencePoint: z.ZodOptional<z.ZodLiteral<"tweenStart">>;
                each: z.ZodOptional<z.ZodPipe<z.ZodTransform<unknown, unknown>, z.ZodCoercedNumber<unknown>>>;
                from: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodPipe<z.ZodTransform<unknown, unknown>, z.ZodCoercedNumber<unknown>>]>>;
                grid: z.ZodOptional<z.ZodTuple<[z.ZodUnion<readonly [z.ZodLiteral<"auto">, z.ZodPipe<z.ZodTransform<unknown, unknown>, z.ZodCoercedNumber<unknown>>]>, z.ZodUnion<readonly [z.ZodLiteral<"auto">, z.ZodPipe<z.ZodTransform<unknown, unknown>, z.ZodCoercedNumber<unknown>>]>], null>>;
                axis: z.ZodOptional<z.ZodEnum<{
                    x: "x";
                    y: "y";
                }>>;
                ease: z.ZodOptional<z.ZodString>;
                amount: z.ZodOptional<z.ZodPipe<z.ZodTransform<unknown, unknown>, z.ZodCoercedNumber<unknown>>>;
            }, z.core.$strip>]>>;
        }, z.core.$catchall<z.ZodAny>>;
    }, z.core.$strip>;
    target: z.ZodOptional<z.ZodPrefault<z.ZodString>>;
}, z.core.$strip>;
declare const AnimationSequenceItemShape: z.ZodObject<{
    id: z.ZodOptional<z.ZodString>;
    target: z.ZodOptional<z.ZodString>;
    position: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodPipe<z.ZodTransform<unknown, unknown>, z.ZodCoercedNumber<unknown>>, z.ZodObject<{
        anchor: z.ZodString;
        anchorPoint: z.ZodOptional<z.ZodEnum<{
            start: "start";
            end: "end";
        }>>;
        alignTween: z.ZodPrefault<z.ZodOptional<z.ZodEnum<{
            start: "start";
            end: "end";
            center: "center";
        }>>>;
        offset: z.ZodPrefault<z.ZodOptional<z.ZodString>>;
    }, z.core.$strip>]>>;
    tweens: z.ZodArray<z.ZodObject<{
        method: z.ZodEnum<{
            set: "set";
            to: "to";
            from: "from";
            fromTo: "fromTo";
        }>;
        position: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodPipe<z.ZodTransform<unknown, unknown>, z.ZodCoercedNumber<unknown>>, z.ZodObject<{
            anchor: z.ZodString;
            anchorPoint: z.ZodOptional<z.ZodEnum<{
                start: "start";
                end: "end";
            }>>;
            alignTween: z.ZodPrefault<z.ZodOptional<z.ZodEnum<{
                start: "start";
                end: "end";
                center: "center";
            }>>>;
            offset: z.ZodPrefault<z.ZodOptional<z.ZodString>>;
        }, z.core.$strip>]>>;
        vars: z.ZodObject<{
            from: z.ZodOptional<z.ZodObject<{
                opacity: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull, z.ZodObject<{
                    fromData: z.ZodString;
                    mode: z.ZodPrefault<z.ZodOptional<z.ZodEnum<{
                        cycle: "cycle";
                        useFallback: "useFallback";
                        clamp: "clamp";
                    }>>>;
                    fallbackValue: z.ZodOptional<z.ZodAny>;
                }, z.core.$strip>, z.ZodObject<{
                    type: z.ZodLiteral<"byIndex">;
                    expression: z.ZodString;
                    fallbackValue: z.ZodOptional<z.ZodAny>;
                }, z.core.$strip>]>>;
                x: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull, z.ZodObject<{
                    fromData: z.ZodString;
                    mode: z.ZodPrefault<z.ZodOptional<z.ZodEnum<{
                        cycle: "cycle";
                        useFallback: "useFallback";
                        clamp: "clamp";
                    }>>>;
                    fallbackValue: z.ZodOptional<z.ZodAny>;
                }, z.core.$strip>, z.ZodObject<{
                    type: z.ZodLiteral<"byIndex">;
                    expression: z.ZodString;
                    fallbackValue: z.ZodOptional<z.ZodAny>;
                }, z.core.$strip>]>>;
                y: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull, z.ZodObject<{
                    fromData: z.ZodString;
                    mode: z.ZodPrefault<z.ZodOptional<z.ZodEnum<{
                        cycle: "cycle";
                        useFallback: "useFallback";
                        clamp: "clamp";
                    }>>>;
                    fallbackValue: z.ZodOptional<z.ZodAny>;
                }, z.core.$strip>, z.ZodObject<{
                    type: z.ZodLiteral<"byIndex">;
                    expression: z.ZodString;
                    fallbackValue: z.ZodOptional<z.ZodAny>;
                }, z.core.$strip>]>>;
                scale: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull, z.ZodObject<{
                    fromData: z.ZodString;
                    mode: z.ZodPrefault<z.ZodOptional<z.ZodEnum<{
                        cycle: "cycle";
                        useFallback: "useFallback";
                        clamp: "clamp";
                    }>>>;
                    fallbackValue: z.ZodOptional<z.ZodAny>;
                }, z.core.$strip>, z.ZodObject<{
                    type: z.ZodLiteral<"byIndex">;
                    expression: z.ZodString;
                    fallbackValue: z.ZodOptional<z.ZodAny>;
                }, z.core.$strip>]>>;
                scaleX: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull, z.ZodObject<{
                    fromData: z.ZodString;
                    mode: z.ZodPrefault<z.ZodOptional<z.ZodEnum<{
                        cycle: "cycle";
                        useFallback: "useFallback";
                        clamp: "clamp";
                    }>>>;
                    fallbackValue: z.ZodOptional<z.ZodAny>;
                }, z.core.$strip>, z.ZodObject<{
                    type: z.ZodLiteral<"byIndex">;
                    expression: z.ZodString;
                    fallbackValue: z.ZodOptional<z.ZodAny>;
                }, z.core.$strip>]>>;
                scaleY: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull, z.ZodObject<{
                    fromData: z.ZodString;
                    mode: z.ZodPrefault<z.ZodOptional<z.ZodEnum<{
                        cycle: "cycle";
                        useFallback: "useFallback";
                        clamp: "clamp";
                    }>>>;
                    fallbackValue: z.ZodOptional<z.ZodAny>;
                }, z.core.$strip>, z.ZodObject<{
                    type: z.ZodLiteral<"byIndex">;
                    expression: z.ZodString;
                    fallbackValue: z.ZodOptional<z.ZodAny>;
                }, z.core.$strip>]>>;
                rotation: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull, z.ZodObject<{
                    fromData: z.ZodString;
                    mode: z.ZodPrefault<z.ZodOptional<z.ZodEnum<{
                        cycle: "cycle";
                        useFallback: "useFallback";
                        clamp: "clamp";
                    }>>>;
                    fallbackValue: z.ZodOptional<z.ZodAny>;
                }, z.core.$strip>, z.ZodObject<{
                    type: z.ZodLiteral<"byIndex">;
                    expression: z.ZodString;
                    fallbackValue: z.ZodOptional<z.ZodAny>;
                }, z.core.$strip>]>>;
                width: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull, z.ZodObject<{
                    fromData: z.ZodString;
                    mode: z.ZodPrefault<z.ZodOptional<z.ZodEnum<{
                        cycle: "cycle";
                        useFallback: "useFallback";
                        clamp: "clamp";
                    }>>>;
                    fallbackValue: z.ZodOptional<z.ZodAny>;
                }, z.core.$strip>, z.ZodObject<{
                    type: z.ZodLiteral<"byIndex">;
                    expression: z.ZodString;
                    fallbackValue: z.ZodOptional<z.ZodAny>;
                }, z.core.$strip>]>>;
                height: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull, z.ZodObject<{
                    fromData: z.ZodString;
                    mode: z.ZodPrefault<z.ZodOptional<z.ZodEnum<{
                        cycle: "cycle";
                        useFallback: "useFallback";
                        clamp: "clamp";
                    }>>>;
                    fallbackValue: z.ZodOptional<z.ZodAny>;
                }, z.core.$strip>, z.ZodObject<{
                    type: z.ZodLiteral<"byIndex">;
                    expression: z.ZodString;
                    fallbackValue: z.ZodOptional<z.ZodAny>;
                }, z.core.$strip>]>>;
                color: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull, z.ZodObject<{
                    fromData: z.ZodString;
                    mode: z.ZodPrefault<z.ZodOptional<z.ZodEnum<{
                        cycle: "cycle";
                        useFallback: "useFallback";
                        clamp: "clamp";
                    }>>>;
                    fallbackValue: z.ZodOptional<z.ZodAny>;
                }, z.core.$strip>, z.ZodObject<{
                    type: z.ZodLiteral<"byIndex">;
                    expression: z.ZodString;
                    fallbackValue: z.ZodOptional<z.ZodAny>;
                }, z.core.$strip>]>>;
            }, z.core.$catchall<z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull, z.ZodObject<{
                fromData: z.ZodString;
                mode: z.ZodPrefault<z.ZodOptional<z.ZodEnum<{
                    cycle: "cycle";
                    useFallback: "useFallback";
                    clamp: "clamp";
                }>>>;
                fallbackValue: z.ZodOptional<z.ZodAny>;
            }, z.core.$strip>, z.ZodObject<{
                type: z.ZodLiteral<"byIndex">;
                expression: z.ZodString;
                fallbackValue: z.ZodOptional<z.ZodAny>;
            }, z.core.$strip>]>>>>;
            duration: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull, z.ZodObject<{
                fromData: z.ZodString;
                mode: z.ZodPrefault<z.ZodOptional<z.ZodEnum<{
                    cycle: "cycle";
                    useFallback: "useFallback";
                    clamp: "clamp";
                }>>>;
                fallbackValue: z.ZodOptional<z.ZodAny>;
            }, z.core.$strip>, z.ZodObject<{
                type: z.ZodLiteral<"byIndex">;
                expression: z.ZodString;
                fallbackValue: z.ZodOptional<z.ZodAny>;
            }, z.core.$strip>]>>;
            ease: z.ZodOptional<z.ZodString>;
            delay: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull, z.ZodObject<{
                fromData: z.ZodString;
                mode: z.ZodPrefault<z.ZodOptional<z.ZodEnum<{
                    cycle: "cycle";
                    useFallback: "useFallback";
                    clamp: "clamp";
                }>>>;
                fallbackValue: z.ZodOptional<z.ZodAny>;
            }, z.core.$strip>, z.ZodObject<{
                type: z.ZodLiteral<"byIndex">;
                expression: z.ZodString;
                fallbackValue: z.ZodOptional<z.ZodAny>;
            }, z.core.$strip>]>>;
            stagger: z.ZodOptional<z.ZodUnion<readonly [z.ZodNumber, z.ZodObject<{
                type: z.ZodOptional<z.ZodLiteral<"fromData">>;
                dataKey: z.ZodOptional<z.ZodString>;
                referencePoint: z.ZodOptional<z.ZodLiteral<"tweenStart">>;
                each: z.ZodOptional<z.ZodPipe<z.ZodTransform<unknown, unknown>, z.ZodCoercedNumber<unknown>>>;
                from: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodPipe<z.ZodTransform<unknown, unknown>, z.ZodCoercedNumber<unknown>>]>>;
                grid: z.ZodOptional<z.ZodTuple<[z.ZodUnion<readonly [z.ZodLiteral<"auto">, z.ZodPipe<z.ZodTransform<unknown, unknown>, z.ZodCoercedNumber<unknown>>]>, z.ZodUnion<readonly [z.ZodLiteral<"auto">, z.ZodPipe<z.ZodTransform<unknown, unknown>, z.ZodCoercedNumber<unknown>>]>], null>>;
                axis: z.ZodOptional<z.ZodEnum<{
                    x: "x";
                    y: "y";
                }>>;
                ease: z.ZodOptional<z.ZodString>;
                amount: z.ZodOptional<z.ZodPipe<z.ZodTransform<unknown, unknown>, z.ZodCoercedNumber<unknown>>>;
            }, z.core.$strip>]>>;
        }, z.core.$catchall<z.ZodAny>>;
    }, z.core.$strip>>;
}, z.core.$strip>;
declare const SetupStepShape: z.ZodDiscriminatedUnion<[z.ZodObject<{
    type: z.ZodLiteral<"style">;
    properties: z.ZodObject<{}, z.core.$catchall<z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull, z.ZodObject<{
        fromData: z.ZodString;
        mode: z.ZodPrefault<z.ZodOptional<z.ZodEnum<{
            cycle: "cycle";
            useFallback: "useFallback";
            clamp: "clamp";
        }>>>;
        fallbackValue: z.ZodOptional<z.ZodAny>;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"byIndex">;
        expression: z.ZodString;
        fallbackValue: z.ZodOptional<z.ZodAny>;
    }, z.core.$strip>]>>>;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"splitText">;
    by: z.ZodEnum<{
        words: "words";
        lines: "lines";
        chars: "chars";
    }>;
}, z.core.$strip>], "type">;
export declare const AnimationPresetShape: z.ZodObject<{
    id: z.ZodString;
    presetId: z.ZodOptional<z.ZodString>;
    version: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    duration: z.ZodOptional<z.ZodPipe<z.ZodTransform<unknown, unknown>, z.ZodCoercedNumber<unknown>>>;
    data: z.ZodOptional<z.ZodPrefault<z.ZodRecord<z.ZodString, z.ZodAny>>>;
    setup: z.ZodOptional<z.ZodPrefault<z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
        type: z.ZodLiteral<"style">;
        properties: z.ZodObject<{}, z.core.$catchall<z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull, z.ZodObject<{
            fromData: z.ZodString;
            mode: z.ZodPrefault<z.ZodOptional<z.ZodEnum<{
                cycle: "cycle";
                useFallback: "useFallback";
                clamp: "clamp";
            }>>>;
            fallbackValue: z.ZodOptional<z.ZodAny>;
        }, z.core.$strip>, z.ZodObject<{
            type: z.ZodLiteral<"byIndex">;
            expression: z.ZodString;
            fallbackValue: z.ZodOptional<z.ZodAny>;
        }, z.core.$strip>]>>>;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"splitText">;
        by: z.ZodEnum<{
            words: "words";
            lines: "lines";
            chars: "chars";
        }>;
    }, z.core.$strip>], "type">>>>;
    revertAfterComplete: z.ZodOptional<z.ZodPrefault<z.ZodBoolean>>;
    timeline: z.ZodArray<z.ZodObject<{
        id: z.ZodOptional<z.ZodString>;
        target: z.ZodOptional<z.ZodString>;
        position: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodPipe<z.ZodTransform<unknown, unknown>, z.ZodCoercedNumber<unknown>>, z.ZodObject<{
            anchor: z.ZodString;
            anchorPoint: z.ZodOptional<z.ZodEnum<{
                start: "start";
                end: "end";
            }>>;
            alignTween: z.ZodPrefault<z.ZodOptional<z.ZodEnum<{
                start: "start";
                end: "end";
                center: "center";
            }>>>;
            offset: z.ZodPrefault<z.ZodOptional<z.ZodString>>;
        }, z.core.$strip>]>>;
        tweens: z.ZodArray<z.ZodObject<{
            method: z.ZodEnum<{
                set: "set";
                to: "to";
                from: "from";
                fromTo: "fromTo";
            }>;
            position: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodPipe<z.ZodTransform<unknown, unknown>, z.ZodCoercedNumber<unknown>>, z.ZodObject<{
                anchor: z.ZodString;
                anchorPoint: z.ZodOptional<z.ZodEnum<{
                    start: "start";
                    end: "end";
                }>>;
                alignTween: z.ZodPrefault<z.ZodOptional<z.ZodEnum<{
                    start: "start";
                    end: "end";
                    center: "center";
                }>>>;
                offset: z.ZodPrefault<z.ZodOptional<z.ZodString>>;
            }, z.core.$strip>]>>;
            vars: z.ZodObject<{
                from: z.ZodOptional<z.ZodObject<{
                    opacity: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull, z.ZodObject<{
                        fromData: z.ZodString;
                        mode: z.ZodPrefault<z.ZodOptional<z.ZodEnum<{
                            cycle: "cycle";
                            useFallback: "useFallback";
                            clamp: "clamp";
                        }>>>;
                        fallbackValue: z.ZodOptional<z.ZodAny>;
                    }, z.core.$strip>, z.ZodObject<{
                        type: z.ZodLiteral<"byIndex">;
                        expression: z.ZodString;
                        fallbackValue: z.ZodOptional<z.ZodAny>;
                    }, z.core.$strip>]>>;
                    x: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull, z.ZodObject<{
                        fromData: z.ZodString;
                        mode: z.ZodPrefault<z.ZodOptional<z.ZodEnum<{
                            cycle: "cycle";
                            useFallback: "useFallback";
                            clamp: "clamp";
                        }>>>;
                        fallbackValue: z.ZodOptional<z.ZodAny>;
                    }, z.core.$strip>, z.ZodObject<{
                        type: z.ZodLiteral<"byIndex">;
                        expression: z.ZodString;
                        fallbackValue: z.ZodOptional<z.ZodAny>;
                    }, z.core.$strip>]>>;
                    y: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull, z.ZodObject<{
                        fromData: z.ZodString;
                        mode: z.ZodPrefault<z.ZodOptional<z.ZodEnum<{
                            cycle: "cycle";
                            useFallback: "useFallback";
                            clamp: "clamp";
                        }>>>;
                        fallbackValue: z.ZodOptional<z.ZodAny>;
                    }, z.core.$strip>, z.ZodObject<{
                        type: z.ZodLiteral<"byIndex">;
                        expression: z.ZodString;
                        fallbackValue: z.ZodOptional<z.ZodAny>;
                    }, z.core.$strip>]>>;
                    scale: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull, z.ZodObject<{
                        fromData: z.ZodString;
                        mode: z.ZodPrefault<z.ZodOptional<z.ZodEnum<{
                            cycle: "cycle";
                            useFallback: "useFallback";
                            clamp: "clamp";
                        }>>>;
                        fallbackValue: z.ZodOptional<z.ZodAny>;
                    }, z.core.$strip>, z.ZodObject<{
                        type: z.ZodLiteral<"byIndex">;
                        expression: z.ZodString;
                        fallbackValue: z.ZodOptional<z.ZodAny>;
                    }, z.core.$strip>]>>;
                    scaleX: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull, z.ZodObject<{
                        fromData: z.ZodString;
                        mode: z.ZodPrefault<z.ZodOptional<z.ZodEnum<{
                            cycle: "cycle";
                            useFallback: "useFallback";
                            clamp: "clamp";
                        }>>>;
                        fallbackValue: z.ZodOptional<z.ZodAny>;
                    }, z.core.$strip>, z.ZodObject<{
                        type: z.ZodLiteral<"byIndex">;
                        expression: z.ZodString;
                        fallbackValue: z.ZodOptional<z.ZodAny>;
                    }, z.core.$strip>]>>;
                    scaleY: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull, z.ZodObject<{
                        fromData: z.ZodString;
                        mode: z.ZodPrefault<z.ZodOptional<z.ZodEnum<{
                            cycle: "cycle";
                            useFallback: "useFallback";
                            clamp: "clamp";
                        }>>>;
                        fallbackValue: z.ZodOptional<z.ZodAny>;
                    }, z.core.$strip>, z.ZodObject<{
                        type: z.ZodLiteral<"byIndex">;
                        expression: z.ZodString;
                        fallbackValue: z.ZodOptional<z.ZodAny>;
                    }, z.core.$strip>]>>;
                    rotation: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull, z.ZodObject<{
                        fromData: z.ZodString;
                        mode: z.ZodPrefault<z.ZodOptional<z.ZodEnum<{
                            cycle: "cycle";
                            useFallback: "useFallback";
                            clamp: "clamp";
                        }>>>;
                        fallbackValue: z.ZodOptional<z.ZodAny>;
                    }, z.core.$strip>, z.ZodObject<{
                        type: z.ZodLiteral<"byIndex">;
                        expression: z.ZodString;
                        fallbackValue: z.ZodOptional<z.ZodAny>;
                    }, z.core.$strip>]>>;
                    width: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull, z.ZodObject<{
                        fromData: z.ZodString;
                        mode: z.ZodPrefault<z.ZodOptional<z.ZodEnum<{
                            cycle: "cycle";
                            useFallback: "useFallback";
                            clamp: "clamp";
                        }>>>;
                        fallbackValue: z.ZodOptional<z.ZodAny>;
                    }, z.core.$strip>, z.ZodObject<{
                        type: z.ZodLiteral<"byIndex">;
                        expression: z.ZodString;
                        fallbackValue: z.ZodOptional<z.ZodAny>;
                    }, z.core.$strip>]>>;
                    height: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull, z.ZodObject<{
                        fromData: z.ZodString;
                        mode: z.ZodPrefault<z.ZodOptional<z.ZodEnum<{
                            cycle: "cycle";
                            useFallback: "useFallback";
                            clamp: "clamp";
                        }>>>;
                        fallbackValue: z.ZodOptional<z.ZodAny>;
                    }, z.core.$strip>, z.ZodObject<{
                        type: z.ZodLiteral<"byIndex">;
                        expression: z.ZodString;
                        fallbackValue: z.ZodOptional<z.ZodAny>;
                    }, z.core.$strip>]>>;
                    color: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull, z.ZodObject<{
                        fromData: z.ZodString;
                        mode: z.ZodPrefault<z.ZodOptional<z.ZodEnum<{
                            cycle: "cycle";
                            useFallback: "useFallback";
                            clamp: "clamp";
                        }>>>;
                        fallbackValue: z.ZodOptional<z.ZodAny>;
                    }, z.core.$strip>, z.ZodObject<{
                        type: z.ZodLiteral<"byIndex">;
                        expression: z.ZodString;
                        fallbackValue: z.ZodOptional<z.ZodAny>;
                    }, z.core.$strip>]>>;
                }, z.core.$catchall<z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull, z.ZodObject<{
                    fromData: z.ZodString;
                    mode: z.ZodPrefault<z.ZodOptional<z.ZodEnum<{
                        cycle: "cycle";
                        useFallback: "useFallback";
                        clamp: "clamp";
                    }>>>;
                    fallbackValue: z.ZodOptional<z.ZodAny>;
                }, z.core.$strip>, z.ZodObject<{
                    type: z.ZodLiteral<"byIndex">;
                    expression: z.ZodString;
                    fallbackValue: z.ZodOptional<z.ZodAny>;
                }, z.core.$strip>]>>>>;
                duration: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull, z.ZodObject<{
                    fromData: z.ZodString;
                    mode: z.ZodPrefault<z.ZodOptional<z.ZodEnum<{
                        cycle: "cycle";
                        useFallback: "useFallback";
                        clamp: "clamp";
                    }>>>;
                    fallbackValue: z.ZodOptional<z.ZodAny>;
                }, z.core.$strip>, z.ZodObject<{
                    type: z.ZodLiteral<"byIndex">;
                    expression: z.ZodString;
                    fallbackValue: z.ZodOptional<z.ZodAny>;
                }, z.core.$strip>]>>;
                ease: z.ZodOptional<z.ZodString>;
                delay: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull, z.ZodObject<{
                    fromData: z.ZodString;
                    mode: z.ZodPrefault<z.ZodOptional<z.ZodEnum<{
                        cycle: "cycle";
                        useFallback: "useFallback";
                        clamp: "clamp";
                    }>>>;
                    fallbackValue: z.ZodOptional<z.ZodAny>;
                }, z.core.$strip>, z.ZodObject<{
                    type: z.ZodLiteral<"byIndex">;
                    expression: z.ZodString;
                    fallbackValue: z.ZodOptional<z.ZodAny>;
                }, z.core.$strip>]>>;
                stagger: z.ZodOptional<z.ZodUnion<readonly [z.ZodNumber, z.ZodObject<{
                    type: z.ZodOptional<z.ZodLiteral<"fromData">>;
                    dataKey: z.ZodOptional<z.ZodString>;
                    referencePoint: z.ZodOptional<z.ZodLiteral<"tweenStart">>;
                    each: z.ZodOptional<z.ZodPipe<z.ZodTransform<unknown, unknown>, z.ZodCoercedNumber<unknown>>>;
                    from: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodPipe<z.ZodTransform<unknown, unknown>, z.ZodCoercedNumber<unknown>>]>>;
                    grid: z.ZodOptional<z.ZodTuple<[z.ZodUnion<readonly [z.ZodLiteral<"auto">, z.ZodPipe<z.ZodTransform<unknown, unknown>, z.ZodCoercedNumber<unknown>>]>, z.ZodUnion<readonly [z.ZodLiteral<"auto">, z.ZodPipe<z.ZodTransform<unknown, unknown>, z.ZodCoercedNumber<unknown>>]>], null>>;
                    axis: z.ZodOptional<z.ZodEnum<{
                        x: "x";
                        y: "y";
                    }>>;
                    ease: z.ZodOptional<z.ZodString>;
                    amount: z.ZodOptional<z.ZodPipe<z.ZodTransform<unknown, unknown>, z.ZodCoercedNumber<unknown>>>;
                }, z.core.$strip>]>>;
            }, z.core.$catchall<z.ZodAny>>;
        }, z.core.$strip>>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export declare const AnimationReferenceShape: z.ZodUnion<readonly [z.ZodString, z.ZodObject<{
    id: z.ZodString;
    presetId: z.ZodOptional<z.ZodString>;
    version: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    duration: z.ZodOptional<z.ZodPipe<z.ZodTransform<unknown, unknown>, z.ZodCoercedNumber<unknown>>>;
    data: z.ZodOptional<z.ZodPrefault<z.ZodRecord<z.ZodString, z.ZodAny>>>;
    setup: z.ZodOptional<z.ZodPrefault<z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
        type: z.ZodLiteral<"style">;
        properties: z.ZodObject<{}, z.core.$catchall<z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull, z.ZodObject<{
            fromData: z.ZodString;
            mode: z.ZodPrefault<z.ZodOptional<z.ZodEnum<{
                cycle: "cycle";
                useFallback: "useFallback";
                clamp: "clamp";
            }>>>;
            fallbackValue: z.ZodOptional<z.ZodAny>;
        }, z.core.$strip>, z.ZodObject<{
            type: z.ZodLiteral<"byIndex">;
            expression: z.ZodString;
            fallbackValue: z.ZodOptional<z.ZodAny>;
        }, z.core.$strip>]>>>;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"splitText">;
        by: z.ZodEnum<{
            words: "words";
            lines: "lines";
            chars: "chars";
        }>;
    }, z.core.$strip>], "type">>>>;
    revertAfterComplete: z.ZodOptional<z.ZodPrefault<z.ZodBoolean>>;
    timeline: z.ZodArray<z.ZodObject<{
        id: z.ZodOptional<z.ZodString>;
        target: z.ZodOptional<z.ZodString>;
        position: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodPipe<z.ZodTransform<unknown, unknown>, z.ZodCoercedNumber<unknown>>, z.ZodObject<{
            anchor: z.ZodString;
            anchorPoint: z.ZodOptional<z.ZodEnum<{
                start: "start";
                end: "end";
            }>>;
            alignTween: z.ZodPrefault<z.ZodOptional<z.ZodEnum<{
                start: "start";
                end: "end";
                center: "center";
            }>>>;
            offset: z.ZodPrefault<z.ZodOptional<z.ZodString>>;
        }, z.core.$strip>]>>;
        tweens: z.ZodArray<z.ZodObject<{
            method: z.ZodEnum<{
                set: "set";
                to: "to";
                from: "from";
                fromTo: "fromTo";
            }>;
            position: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodPipe<z.ZodTransform<unknown, unknown>, z.ZodCoercedNumber<unknown>>, z.ZodObject<{
                anchor: z.ZodString;
                anchorPoint: z.ZodOptional<z.ZodEnum<{
                    start: "start";
                    end: "end";
                }>>;
                alignTween: z.ZodPrefault<z.ZodOptional<z.ZodEnum<{
                    start: "start";
                    end: "end";
                    center: "center";
                }>>>;
                offset: z.ZodPrefault<z.ZodOptional<z.ZodString>>;
            }, z.core.$strip>]>>;
            vars: z.ZodObject<{
                from: z.ZodOptional<z.ZodObject<{
                    opacity: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull, z.ZodObject<{
                        fromData: z.ZodString;
                        mode: z.ZodPrefault<z.ZodOptional<z.ZodEnum<{
                            cycle: "cycle";
                            useFallback: "useFallback";
                            clamp: "clamp";
                        }>>>;
                        fallbackValue: z.ZodOptional<z.ZodAny>;
                    }, z.core.$strip>, z.ZodObject<{
                        type: z.ZodLiteral<"byIndex">;
                        expression: z.ZodString;
                        fallbackValue: z.ZodOptional<z.ZodAny>;
                    }, z.core.$strip>]>>;
                    x: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull, z.ZodObject<{
                        fromData: z.ZodString;
                        mode: z.ZodPrefault<z.ZodOptional<z.ZodEnum<{
                            cycle: "cycle";
                            useFallback: "useFallback";
                            clamp: "clamp";
                        }>>>;
                        fallbackValue: z.ZodOptional<z.ZodAny>;
                    }, z.core.$strip>, z.ZodObject<{
                        type: z.ZodLiteral<"byIndex">;
                        expression: z.ZodString;
                        fallbackValue: z.ZodOptional<z.ZodAny>;
                    }, z.core.$strip>]>>;
                    y: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull, z.ZodObject<{
                        fromData: z.ZodString;
                        mode: z.ZodPrefault<z.ZodOptional<z.ZodEnum<{
                            cycle: "cycle";
                            useFallback: "useFallback";
                            clamp: "clamp";
                        }>>>;
                        fallbackValue: z.ZodOptional<z.ZodAny>;
                    }, z.core.$strip>, z.ZodObject<{
                        type: z.ZodLiteral<"byIndex">;
                        expression: z.ZodString;
                        fallbackValue: z.ZodOptional<z.ZodAny>;
                    }, z.core.$strip>]>>;
                    scale: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull, z.ZodObject<{
                        fromData: z.ZodString;
                        mode: z.ZodPrefault<z.ZodOptional<z.ZodEnum<{
                            cycle: "cycle";
                            useFallback: "useFallback";
                            clamp: "clamp";
                        }>>>;
                        fallbackValue: z.ZodOptional<z.ZodAny>;
                    }, z.core.$strip>, z.ZodObject<{
                        type: z.ZodLiteral<"byIndex">;
                        expression: z.ZodString;
                        fallbackValue: z.ZodOptional<z.ZodAny>;
                    }, z.core.$strip>]>>;
                    scaleX: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull, z.ZodObject<{
                        fromData: z.ZodString;
                        mode: z.ZodPrefault<z.ZodOptional<z.ZodEnum<{
                            cycle: "cycle";
                            useFallback: "useFallback";
                            clamp: "clamp";
                        }>>>;
                        fallbackValue: z.ZodOptional<z.ZodAny>;
                    }, z.core.$strip>, z.ZodObject<{
                        type: z.ZodLiteral<"byIndex">;
                        expression: z.ZodString;
                        fallbackValue: z.ZodOptional<z.ZodAny>;
                    }, z.core.$strip>]>>;
                    scaleY: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull, z.ZodObject<{
                        fromData: z.ZodString;
                        mode: z.ZodPrefault<z.ZodOptional<z.ZodEnum<{
                            cycle: "cycle";
                            useFallback: "useFallback";
                            clamp: "clamp";
                        }>>>;
                        fallbackValue: z.ZodOptional<z.ZodAny>;
                    }, z.core.$strip>, z.ZodObject<{
                        type: z.ZodLiteral<"byIndex">;
                        expression: z.ZodString;
                        fallbackValue: z.ZodOptional<z.ZodAny>;
                    }, z.core.$strip>]>>;
                    rotation: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull, z.ZodObject<{
                        fromData: z.ZodString;
                        mode: z.ZodPrefault<z.ZodOptional<z.ZodEnum<{
                            cycle: "cycle";
                            useFallback: "useFallback";
                            clamp: "clamp";
                        }>>>;
                        fallbackValue: z.ZodOptional<z.ZodAny>;
                    }, z.core.$strip>, z.ZodObject<{
                        type: z.ZodLiteral<"byIndex">;
                        expression: z.ZodString;
                        fallbackValue: z.ZodOptional<z.ZodAny>;
                    }, z.core.$strip>]>>;
                    width: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull, z.ZodObject<{
                        fromData: z.ZodString;
                        mode: z.ZodPrefault<z.ZodOptional<z.ZodEnum<{
                            cycle: "cycle";
                            useFallback: "useFallback";
                            clamp: "clamp";
                        }>>>;
                        fallbackValue: z.ZodOptional<z.ZodAny>;
                    }, z.core.$strip>, z.ZodObject<{
                        type: z.ZodLiteral<"byIndex">;
                        expression: z.ZodString;
                        fallbackValue: z.ZodOptional<z.ZodAny>;
                    }, z.core.$strip>]>>;
                    height: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull, z.ZodObject<{
                        fromData: z.ZodString;
                        mode: z.ZodPrefault<z.ZodOptional<z.ZodEnum<{
                            cycle: "cycle";
                            useFallback: "useFallback";
                            clamp: "clamp";
                        }>>>;
                        fallbackValue: z.ZodOptional<z.ZodAny>;
                    }, z.core.$strip>, z.ZodObject<{
                        type: z.ZodLiteral<"byIndex">;
                        expression: z.ZodString;
                        fallbackValue: z.ZodOptional<z.ZodAny>;
                    }, z.core.$strip>]>>;
                    color: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull, z.ZodObject<{
                        fromData: z.ZodString;
                        mode: z.ZodPrefault<z.ZodOptional<z.ZodEnum<{
                            cycle: "cycle";
                            useFallback: "useFallback";
                            clamp: "clamp";
                        }>>>;
                        fallbackValue: z.ZodOptional<z.ZodAny>;
                    }, z.core.$strip>, z.ZodObject<{
                        type: z.ZodLiteral<"byIndex">;
                        expression: z.ZodString;
                        fallbackValue: z.ZodOptional<z.ZodAny>;
                    }, z.core.$strip>]>>;
                }, z.core.$catchall<z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull, z.ZodObject<{
                    fromData: z.ZodString;
                    mode: z.ZodPrefault<z.ZodOptional<z.ZodEnum<{
                        cycle: "cycle";
                        useFallback: "useFallback";
                        clamp: "clamp";
                    }>>>;
                    fallbackValue: z.ZodOptional<z.ZodAny>;
                }, z.core.$strip>, z.ZodObject<{
                    type: z.ZodLiteral<"byIndex">;
                    expression: z.ZodString;
                    fallbackValue: z.ZodOptional<z.ZodAny>;
                }, z.core.$strip>]>>>>;
                duration: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull, z.ZodObject<{
                    fromData: z.ZodString;
                    mode: z.ZodPrefault<z.ZodOptional<z.ZodEnum<{
                        cycle: "cycle";
                        useFallback: "useFallback";
                        clamp: "clamp";
                    }>>>;
                    fallbackValue: z.ZodOptional<z.ZodAny>;
                }, z.core.$strip>, z.ZodObject<{
                    type: z.ZodLiteral<"byIndex">;
                    expression: z.ZodString;
                    fallbackValue: z.ZodOptional<z.ZodAny>;
                }, z.core.$strip>]>>;
                ease: z.ZodOptional<z.ZodString>;
                delay: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull, z.ZodObject<{
                    fromData: z.ZodString;
                    mode: z.ZodPrefault<z.ZodOptional<z.ZodEnum<{
                        cycle: "cycle";
                        useFallback: "useFallback";
                        clamp: "clamp";
                    }>>>;
                    fallbackValue: z.ZodOptional<z.ZodAny>;
                }, z.core.$strip>, z.ZodObject<{
                    type: z.ZodLiteral<"byIndex">;
                    expression: z.ZodString;
                    fallbackValue: z.ZodOptional<z.ZodAny>;
                }, z.core.$strip>]>>;
                stagger: z.ZodOptional<z.ZodUnion<readonly [z.ZodNumber, z.ZodObject<{
                    type: z.ZodOptional<z.ZodLiteral<"fromData">>;
                    dataKey: z.ZodOptional<z.ZodString>;
                    referencePoint: z.ZodOptional<z.ZodLiteral<"tweenStart">>;
                    each: z.ZodOptional<z.ZodPipe<z.ZodTransform<unknown, unknown>, z.ZodCoercedNumber<unknown>>>;
                    from: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodPipe<z.ZodTransform<unknown, unknown>, z.ZodCoercedNumber<unknown>>]>>;
                    grid: z.ZodOptional<z.ZodTuple<[z.ZodUnion<readonly [z.ZodLiteral<"auto">, z.ZodPipe<z.ZodTransform<unknown, unknown>, z.ZodCoercedNumber<unknown>>]>, z.ZodUnion<readonly [z.ZodLiteral<"auto">, z.ZodPipe<z.ZodTransform<unknown, unknown>, z.ZodCoercedNumber<unknown>>]>], null>>;
                    axis: z.ZodOptional<z.ZodEnum<{
                        x: "x";
                        y: "y";
                    }>>;
                    ease: z.ZodOptional<z.ZodString>;
                    amount: z.ZodOptional<z.ZodPipe<z.ZodTransform<unknown, unknown>, z.ZodCoercedNumber<unknown>>>;
                }, z.core.$strip>]>>;
            }, z.core.$catchall<z.ZodAny>>;
        }, z.core.$strip>>;
    }, z.core.$strip>>;
}, z.core.$strip>, z.ZodObject<{
    id: z.ZodOptional<z.ZodString>;
    tween: z.ZodObject<{
        method: z.ZodEnum<{
            set: "set";
            to: "to";
            from: "from";
            fromTo: "fromTo";
        }>;
        position: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodPipe<z.ZodTransform<unknown, unknown>, z.ZodCoercedNumber<unknown>>, z.ZodObject<{
            anchor: z.ZodString;
            anchorPoint: z.ZodOptional<z.ZodEnum<{
                start: "start";
                end: "end";
            }>>;
            alignTween: z.ZodPrefault<z.ZodOptional<z.ZodEnum<{
                start: "start";
                end: "end";
                center: "center";
            }>>>;
            offset: z.ZodPrefault<z.ZodOptional<z.ZodString>>;
        }, z.core.$strip>]>>;
        vars: z.ZodObject<{
            from: z.ZodOptional<z.ZodObject<{
                opacity: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull, z.ZodObject<{
                    fromData: z.ZodString;
                    mode: z.ZodPrefault<z.ZodOptional<z.ZodEnum<{
                        cycle: "cycle";
                        useFallback: "useFallback";
                        clamp: "clamp";
                    }>>>;
                    fallbackValue: z.ZodOptional<z.ZodAny>;
                }, z.core.$strip>, z.ZodObject<{
                    type: z.ZodLiteral<"byIndex">;
                    expression: z.ZodString;
                    fallbackValue: z.ZodOptional<z.ZodAny>;
                }, z.core.$strip>]>>;
                x: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull, z.ZodObject<{
                    fromData: z.ZodString;
                    mode: z.ZodPrefault<z.ZodOptional<z.ZodEnum<{
                        cycle: "cycle";
                        useFallback: "useFallback";
                        clamp: "clamp";
                    }>>>;
                    fallbackValue: z.ZodOptional<z.ZodAny>;
                }, z.core.$strip>, z.ZodObject<{
                    type: z.ZodLiteral<"byIndex">;
                    expression: z.ZodString;
                    fallbackValue: z.ZodOptional<z.ZodAny>;
                }, z.core.$strip>]>>;
                y: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull, z.ZodObject<{
                    fromData: z.ZodString;
                    mode: z.ZodPrefault<z.ZodOptional<z.ZodEnum<{
                        cycle: "cycle";
                        useFallback: "useFallback";
                        clamp: "clamp";
                    }>>>;
                    fallbackValue: z.ZodOptional<z.ZodAny>;
                }, z.core.$strip>, z.ZodObject<{
                    type: z.ZodLiteral<"byIndex">;
                    expression: z.ZodString;
                    fallbackValue: z.ZodOptional<z.ZodAny>;
                }, z.core.$strip>]>>;
                scale: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull, z.ZodObject<{
                    fromData: z.ZodString;
                    mode: z.ZodPrefault<z.ZodOptional<z.ZodEnum<{
                        cycle: "cycle";
                        useFallback: "useFallback";
                        clamp: "clamp";
                    }>>>;
                    fallbackValue: z.ZodOptional<z.ZodAny>;
                }, z.core.$strip>, z.ZodObject<{
                    type: z.ZodLiteral<"byIndex">;
                    expression: z.ZodString;
                    fallbackValue: z.ZodOptional<z.ZodAny>;
                }, z.core.$strip>]>>;
                scaleX: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull, z.ZodObject<{
                    fromData: z.ZodString;
                    mode: z.ZodPrefault<z.ZodOptional<z.ZodEnum<{
                        cycle: "cycle";
                        useFallback: "useFallback";
                        clamp: "clamp";
                    }>>>;
                    fallbackValue: z.ZodOptional<z.ZodAny>;
                }, z.core.$strip>, z.ZodObject<{
                    type: z.ZodLiteral<"byIndex">;
                    expression: z.ZodString;
                    fallbackValue: z.ZodOptional<z.ZodAny>;
                }, z.core.$strip>]>>;
                scaleY: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull, z.ZodObject<{
                    fromData: z.ZodString;
                    mode: z.ZodPrefault<z.ZodOptional<z.ZodEnum<{
                        cycle: "cycle";
                        useFallback: "useFallback";
                        clamp: "clamp";
                    }>>>;
                    fallbackValue: z.ZodOptional<z.ZodAny>;
                }, z.core.$strip>, z.ZodObject<{
                    type: z.ZodLiteral<"byIndex">;
                    expression: z.ZodString;
                    fallbackValue: z.ZodOptional<z.ZodAny>;
                }, z.core.$strip>]>>;
                rotation: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull, z.ZodObject<{
                    fromData: z.ZodString;
                    mode: z.ZodPrefault<z.ZodOptional<z.ZodEnum<{
                        cycle: "cycle";
                        useFallback: "useFallback";
                        clamp: "clamp";
                    }>>>;
                    fallbackValue: z.ZodOptional<z.ZodAny>;
                }, z.core.$strip>, z.ZodObject<{
                    type: z.ZodLiteral<"byIndex">;
                    expression: z.ZodString;
                    fallbackValue: z.ZodOptional<z.ZodAny>;
                }, z.core.$strip>]>>;
                width: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull, z.ZodObject<{
                    fromData: z.ZodString;
                    mode: z.ZodPrefault<z.ZodOptional<z.ZodEnum<{
                        cycle: "cycle";
                        useFallback: "useFallback";
                        clamp: "clamp";
                    }>>>;
                    fallbackValue: z.ZodOptional<z.ZodAny>;
                }, z.core.$strip>, z.ZodObject<{
                    type: z.ZodLiteral<"byIndex">;
                    expression: z.ZodString;
                    fallbackValue: z.ZodOptional<z.ZodAny>;
                }, z.core.$strip>]>>;
                height: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull, z.ZodObject<{
                    fromData: z.ZodString;
                    mode: z.ZodPrefault<z.ZodOptional<z.ZodEnum<{
                        cycle: "cycle";
                        useFallback: "useFallback";
                        clamp: "clamp";
                    }>>>;
                    fallbackValue: z.ZodOptional<z.ZodAny>;
                }, z.core.$strip>, z.ZodObject<{
                    type: z.ZodLiteral<"byIndex">;
                    expression: z.ZodString;
                    fallbackValue: z.ZodOptional<z.ZodAny>;
                }, z.core.$strip>]>>;
                color: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull, z.ZodObject<{
                    fromData: z.ZodString;
                    mode: z.ZodPrefault<z.ZodOptional<z.ZodEnum<{
                        cycle: "cycle";
                        useFallback: "useFallback";
                        clamp: "clamp";
                    }>>>;
                    fallbackValue: z.ZodOptional<z.ZodAny>;
                }, z.core.$strip>, z.ZodObject<{
                    type: z.ZodLiteral<"byIndex">;
                    expression: z.ZodString;
                    fallbackValue: z.ZodOptional<z.ZodAny>;
                }, z.core.$strip>]>>;
            }, z.core.$catchall<z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull, z.ZodObject<{
                fromData: z.ZodString;
                mode: z.ZodPrefault<z.ZodOptional<z.ZodEnum<{
                    cycle: "cycle";
                    useFallback: "useFallback";
                    clamp: "clamp";
                }>>>;
                fallbackValue: z.ZodOptional<z.ZodAny>;
            }, z.core.$strip>, z.ZodObject<{
                type: z.ZodLiteral<"byIndex">;
                expression: z.ZodString;
                fallbackValue: z.ZodOptional<z.ZodAny>;
            }, z.core.$strip>]>>>>;
            duration: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull, z.ZodObject<{
                fromData: z.ZodString;
                mode: z.ZodPrefault<z.ZodOptional<z.ZodEnum<{
                    cycle: "cycle";
                    useFallback: "useFallback";
                    clamp: "clamp";
                }>>>;
                fallbackValue: z.ZodOptional<z.ZodAny>;
            }, z.core.$strip>, z.ZodObject<{
                type: z.ZodLiteral<"byIndex">;
                expression: z.ZodString;
                fallbackValue: z.ZodOptional<z.ZodAny>;
            }, z.core.$strip>]>>;
            ease: z.ZodOptional<z.ZodString>;
            delay: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull, z.ZodObject<{
                fromData: z.ZodString;
                mode: z.ZodPrefault<z.ZodOptional<z.ZodEnum<{
                    cycle: "cycle";
                    useFallback: "useFallback";
                    clamp: "clamp";
                }>>>;
                fallbackValue: z.ZodOptional<z.ZodAny>;
            }, z.core.$strip>, z.ZodObject<{
                type: z.ZodLiteral<"byIndex">;
                expression: z.ZodString;
                fallbackValue: z.ZodOptional<z.ZodAny>;
            }, z.core.$strip>]>>;
            stagger: z.ZodOptional<z.ZodUnion<readonly [z.ZodNumber, z.ZodObject<{
                type: z.ZodOptional<z.ZodLiteral<"fromData">>;
                dataKey: z.ZodOptional<z.ZodString>;
                referencePoint: z.ZodOptional<z.ZodLiteral<"tweenStart">>;
                each: z.ZodOptional<z.ZodPipe<z.ZodTransform<unknown, unknown>, z.ZodCoercedNumber<unknown>>>;
                from: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodPipe<z.ZodTransform<unknown, unknown>, z.ZodCoercedNumber<unknown>>]>>;
                grid: z.ZodOptional<z.ZodTuple<[z.ZodUnion<readonly [z.ZodLiteral<"auto">, z.ZodPipe<z.ZodTransform<unknown, unknown>, z.ZodCoercedNumber<unknown>>]>, z.ZodUnion<readonly [z.ZodLiteral<"auto">, z.ZodPipe<z.ZodTransform<unknown, unknown>, z.ZodCoercedNumber<unknown>>]>], null>>;
                axis: z.ZodOptional<z.ZodEnum<{
                    x: "x";
                    y: "y";
                }>>;
                ease: z.ZodOptional<z.ZodString>;
                amount: z.ZodOptional<z.ZodPipe<z.ZodTransform<unknown, unknown>, z.ZodCoercedNumber<unknown>>>;
            }, z.core.$strip>]>>;
        }, z.core.$catchall<z.ZodAny>>;
    }, z.core.$strip>;
    target: z.ZodOptional<z.ZodPrefault<z.ZodString>>;
}, z.core.$strip>]>;
export interface AnimationReferenceTransformer {
    canHandle(input: unknown): boolean;
    normalize(input: unknown, registry: Map<string, AnimationPreset>): AnimationPreset | null;
    setNext(handler: AnimationReferenceTransformer): AnimationReferenceTransformer;
    handle(input: unknown, registry: Map<string, AnimationPreset>): AnimationPreset | null;
}
export type AnimationReference = z.infer<typeof AnimationReferenceShape>;
export type AnimationPresetInput = z.input<typeof AnimationPresetShape>;
export type AnimationPreset = z.infer<typeof AnimationPresetShape>;
export type AnimationSequenceItem = z.infer<typeof AnimationSequenceItemShape>;
export type TweenDefinition = z.infer<typeof TweenDefinitionShape>;
export type TweenVars = z.infer<typeof FinalTweenVarsShape>;
export type SetupStep = z.infer<typeof SetupStepShape>;
export type AnimationTimelinePosition = z.infer<typeof AnimationTimelinePositionShape>;
export type AnimationStagger = z.infer<typeof StaggerShape>;
export type BaseAnimatableProperties = z.infer<typeof BaseAnimatableProperties>;
export type KeyframeAnimation = z.infer<typeof KeyframeAnimationShape>;
export {};
