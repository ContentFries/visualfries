export class RenderCommand {
    eventManager;
    state;
    renderManager;
    constructor(cradle) {
        this.eventManager = cradle.eventManager;
        this.state = cradle.stateManager;
        this.renderManager = cradle.renderManager;
    }
    execute() {
        if (this.state.state === 'loading') {
            return false;
        }
        this.eventManager.emit('beforerender');
        this.renderManager.render();
        return this.state.currentTime;
    }
}
