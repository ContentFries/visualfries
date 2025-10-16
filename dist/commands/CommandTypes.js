export var CommandType;
(function (CommandType) {
    CommandType["PLAY"] = "play";
    CommandType["PAUSE"] = "pause";
    CommandType["SEEK"] = "seek";
    CommandType["UPDATE_COMPONENT"] = "updateComponent";
    CommandType["UPDATE_ANIMATED_PROPERTY"] = "updateAnimatedProperty";
    CommandType["GET_COMPONENT_DATA"] = "getComponentData";
    CommandType["RENDER"] = "render";
    CommandType["REPLACE_SOURCE_ON_TIME"] = "replaceSourceOnTime";
    CommandType["RENDER_FRAME"] = "renderFrame";
    // ... add other command types as needed
})(CommandType || (CommandType = {}));
