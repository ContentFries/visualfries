import { ComponentsManager } from '../managers/ComponentsManager.svelte.js';
import { EventManager } from '../managers/EventManager.js';
import { Container } from 'pixi.js-legacy';
import md5 from 'md5';
export class Layer {
    #id;
    #componentsInitData = [];
    #isBuilt = false;
    #displayObject;
    components;
    name;
    order;
    visible;
    componentsManager;
    eventManager;
    constructor(cradle) {
        const name = $state(cradle.layerData.name);
        const order = $state(cradle.layerData.order);
        const visible = $state(cradle.layerData.visible === false ? false : true);
        const components = $state([]);
        this.#id = cradle.layerData.id;
        this.name = name ?? 'Layer';
        this.order = order;
        this.visible = visible;
        this.#componentsInitData = cradle.layerData.components;
        this.components = components;
        this.componentsManager = cradle.componentsManager;
        this.eventManager = cradle.eventManager;
    }
    async build() {
        if (this.#isBuilt) {
            return;
        }
        this.#isBuilt = true;
        this.#displayObject = new Container();
        for (const componentData of this.#componentsInitData) {
            const component = await this.componentsManager.create(componentData);
            if (component) {
                this.addComponent(component);
            }
        }
    }
    #emit(event, props) {
        this.eventManager.emit(event, props);
    }
    addComponent(component) {
        this.components.push(component);
        if (component.displayObject) {
            this.#displayObject.addChild(component.displayObject);
        }
        // resort components
        this.components.sort((a, b) => a.props.timeline.startAt - b.props.timeline.startAt);
        this.#emit('layerschange');
    }
    removeComponent(component) {
        const hasComponent = this.components.find((c) => c.id === component.id);
        if (hasComponent) {
            this.components = this.components.filter((c) => c.id !== component.id);
            if (component.displayObject) {
                this.#displayObject.removeChild(component.displayObject);
            }
            this.components.sort((a, b) => a.props.timeline.startAt - b.props.timeline.startAt);
            this.#emit('layerschange');
        }
    }
    update(props) {
        let changed = false;
        if (props.name) {
            this.name = props.name;
            changed = true;
        }
        if (props.order) {
            this.order = props.order;
            changed = true;
        }
        if (props.visible) {
            this.visible = props.visible;
            changed = true;
        }
        if (changed) {
            this.#emit('layerschange');
        }
    }
    setOrder(order) {
        this.order = order;
        this.#displayObject.zIndex = order;
        this.#emit('layerschange');
    }
    getData() {
        return {
            id: this.id,
            name: this.name,
            // checksum: this.checksum,
            order: this.order,
            components: this.components.map((comp) => comp.props.getData()),
            visible: this.visible,
            muted: false
        };
    }
    destroy() {
        if (this.#displayObject) {
            for (const component of this.components) {
                component.destroy();
            }
            this.#displayObject.destroy();
        }
    }
    get displayObject() {
        return this.#displayObject;
    }
    get id() {
        return this.#id;
    }
    get checksum() {
        const checksums = this.components.map((comp) => comp.checksum);
        const checksum = md5(this.order + checksums.join(','));
        return this.id + '-' + checksum; // TODO generate checksum
    }
    get type() {
        if (this.components.length) {
            return this.components[0].type;
        }
        return undefined;
    }
}
