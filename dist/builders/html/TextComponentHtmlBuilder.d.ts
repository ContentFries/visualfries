import type { TextComponent } from '../..';
export declare class TextComponentHtmlBuilder {
    private component;
    private document;
    constructor(component: TextComponent, document: Document);
    private getWrapperConfig;
    private getElementConfig;
    build(): {
        wrapper: HTMLElement;
        element: HTMLElement;
    };
    buildAndExtractStyles(): {
        wrapper: HTMLElement;
        element: HTMLElement;
    };
}
