import type { Component } from '../..';
export declare class StyleBuilder {
    private component;
    private processors;
    private omitStyles;
    private onlyStyles;
    constructor(component: Component);
    private prepareComponent;
    omit(keys: string[]): void;
    only(keys: string[]): void;
    build(): Record<string, any>;
    private _mergeStyles;
}
