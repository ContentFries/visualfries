import { AppearanceShape, TextComponentShape } from '..';
import * as PIXI from 'pixi.js-legacy';
import { v4 as uuidv4 } from 'uuid';
export function changeIdDeep(obj) {
    if (Array.isArray(obj)) {
        return obj.map(changeIdDeep);
    }
    else if (obj !== null && typeof obj === 'object') {
        const newObj = {};
        for (const key in obj) {
            if (key === 'id') {
                newObj[key] = uuidv4(); // Replace this with the logic to generate new id
            }
            else {
                newObj[key] = changeIdDeep(obj[key]);
            }
        }
        return newObj;
    }
    return obj;
}
export const buildCharactersListFromComponentsAndSubtitles = function (layers, subtitles) {
    const characters = ' ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.-,;:!$?\'"';
    const charactestList = characters.split('');
    const components = layers.flatMap((layer) => layer.components);
    components.forEach((component) => {
        if (component.type === 'TEXT') {
            const c = component;
            const text = c.text;
            if (text) {
                const textList = text.split('');
                const missingChars = textList.filter((char) => {
                    // Check if the character is not whitespace, not in the characters list,
                    // and is a Unicode letter or number
                    return !/\s/.test(char) && !characters.includes(char) && /\p{L}|\p{N}/u.test(char);
                });
                // Add both uppercase and lowercase variants of missing chars
                const variantChars = missingChars.flatMap((char) => [
                    char.toLowerCase(),
                    char.toUpperCase()
                ]);
                charactestList.push(...new Set(variantChars));
            }
        }
        if (component.type === 'SUBTITLES' &&
            component.source &&
            component.source?.assetId &&
            subtitles[component.source.assetId]) {
            const c = component;
            const source = c.source;
            if (source && source.assetId && subtitles[source.assetId]) {
                for (const langSubs of Object.values(subtitles[source.assetId])) {
                    for (const subtitle of langSubs) {
                        const textList = subtitle.text.split('');
                        const missingChars = textList.filter((char) => {
                            // Check if the character is not whitespace, not in the characters list,
                            // and is a Unicode letter or number
                            return !/\s/.test(char) && !characters.includes(char) && /\p{L}|\p{N}/u.test(char);
                        });
                        // Add both uppercase and lowercase variants of missing chars
                        const variantChars = missingChars.flatMap((char) => [
                            char.toLowerCase(),
                            char.toUpperCase()
                        ]);
                        charactestList.push(...new Set(variantChars));
                    }
                }
            }
        }
    });
    return charactestList;
};
const rotationAwareConfig = function (config) {
    const conf = AppearanceShape.safeParse(config);
    if (!conf.success) {
        return config;
    }
    const { rotation } = conf.data;
    if (rotation) {
        const { x, y, width, height } = conf.data;
        const halfWidth = width / 2;
        const halfHeight = height / 2;
        const offsetX = halfWidth;
        const offsetY = halfHeight;
        const rotatedX = x + halfWidth;
        const rotatedY = y + halfHeight;
        return {
            ...config,
            x: rotatedX,
            y: rotatedY,
            offsetX,
            offsetY,
            rotation
        };
    }
    return config;
};
export const setPlacementAndOpacity = function (obj, c) {
    const conf = AppearanceShape.safeParse(c);
    if (!conf.success) {
        return;
    }
    const config = rotationAwareConfig(c);
    const offsetX = config.offsetX ? config.offsetX : 0;
    const offsetY = config.offsetY ? config.offsetY : 0;
    obj.x = config.x;
    obj.y = config.y;
    obj.width = config.width;
    obj.height = config.height;
    obj.alpha = config.opacity || 1;
    if (config.rotation) {
        obj.angle = config.rotation;
    }
    if (obj instanceof PIXI.Sprite) {
        if (config.rotation) {
            obj.anchor.set(0.5);
            // obj.pivot.x = offsetX;
            // obj.pivot.y = offsetY;
        }
    }
    else {
        obj.pivot.x = offsetX;
        obj.pivot.y = offsetY;
    }
};
