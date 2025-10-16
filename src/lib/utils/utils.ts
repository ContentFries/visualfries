import { AppearanceShape, TextComponentShape } from '$lib';
import type {
	Appearance,
	SceneLayer,
	SubtitleComponent,
	TextComponent,
	SubtitleCollection
} from '$lib';
import * as PIXI from 'pixi.js-legacy';
import { v4 as uuidv4 } from 'uuid';

export function changeIdDeep<T>(obj: T): T {
	if (Array.isArray(obj)) {
		return (obj as any).map(changeIdDeep) as any;
	} else if (obj !== null && typeof obj === 'object') {
		const newObj: { [k: string]: any } = {};
		for (const key in obj as any) {
			if (key === 'id') {
				newObj[key] = uuidv4(); // Replace this with the logic to generate new id
			} else {
				newObj[key] = changeIdDeep((obj as any)[key]);
			}
		}
		return newObj as T;
	}
	return obj;
}

export const buildCharactersListFromComponentsAndSubtitles = function (
	layers: SceneLayer[],
	subtitles: Record<string, SubtitleCollection>
) {
	const characters = ' ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.-,;:!$?\'"';
	const charactestList = characters.split('');

	const components = layers.flatMap((layer) => layer.components);
	components.forEach((component) => {
		if (component.type === 'TEXT') {
			const c = component as TextComponent;

			const text = c.text;
			if (text) {
				const textList = text.split('');
				const missingChars = textList.filter((char: string) => {
					// Check if the character is not whitespace, not in the characters list,
					// and is a Unicode letter or number
					return !/\s/.test(char) && !characters.includes(char) && /\p{L}|\p{N}/u.test(char);
				});

				// Add both uppercase and lowercase variants of missing chars
				const variantChars: string[] = missingChars.flatMap((char: string) => [
					char.toLowerCase(),
					char.toUpperCase()
				]);
				charactestList.push(...new Set(variantChars));
			}
		}

		if (
			component.type === 'SUBTITLES' &&
			component.source &&
			component.source?.assetId &&
			subtitles[component.source.assetId]
		) {
			const c = component as SubtitleComponent;
			const source = c.source;

			if (source && source.assetId && subtitles[source.assetId]) {
				for (const langSubs of Object.values(subtitles[source.assetId])) {
					for (const subtitle of langSubs) {
						const textList = subtitle.text.split('');
						const missingChars = textList.filter((char: string) => {
							// Check if the character is not whitespace, not in the characters list,
							// and is a Unicode letter or number
							return !/\s/.test(char) && !characters.includes(char) && /\p{L}|\p{N}/u.test(char);
						});

						// Add both uppercase and lowercase variants of missing chars
						const variantChars: string[] = missingChars.flatMap((char: string) => [
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

const rotationAwareConfig = function <T>(config: T): T {
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
		} as T;
	}
	return config;
};

export const setPlacementAndOpacity = function (obj: PIXI.Sprite | PIXI.Graphics, c: Appearance) {
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
	} else {
		obj.pivot.x = offsetX;
		obj.pivot.y = offsetY;
	}
};
