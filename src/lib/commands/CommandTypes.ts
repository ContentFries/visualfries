export enum CommandType {
	PLAY = 'play',
	PAUSE = 'pause',
	SEEK = 'seek',
	UPDATE_COMPONENT = 'updateComponent',
	UPDATE_ANIMATED_PROPERTY = 'updateAnimatedProperty',
	GET_COMPONENT_DATA = 'getComponentData',
	RENDER = 'render',
	REPLACE_SOURCE_ON_TIME = 'replaceSourceOnTime',
	RENDER_FRAME = 'renderFrame'
	// ... add other command types as needed
}
