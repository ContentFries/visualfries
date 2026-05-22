import { SceneShape, type Scene } from '../schemas/scene/index.js';

export type SceneInspectionIssue = {
	level: 'error' | 'warning';
	type: string;
	message: string;
	componentId?: string;
	layerId?: string;
};

export type SceneInspectionReport = {
	valid: boolean;
	issues: SceneInspectionIssue[];
	summary: {
		duration: number;
		width: number;
		height: number;
		layers: number;
		components: number;
	};
};

export function inspectScene(input: unknown): SceneInspectionReport {
	const parsed = SceneShape.safeParse(input);
	if (!parsed.success) {
		return {
			valid: false,
			issues: [
				{
					level: 'error',
					type: 'schema',
					message: parsed.error.message
				}
			],
			summary: { duration: 0, width: 0, height: 0, layers: 0, components: 0 }
		};
	}

	const scene = parsed.data as Scene;
	const issues: SceneInspectionIssue[] = [];
	const assetIds = new Set((scene.assets ?? []).map((asset) => asset.id));
	let components = 0;

	for (const layer of scene.layers ?? []) {
		for (const component of layer.components ?? []) {
			components += 1;
			if (component.timeline.endAt > scene.settings.duration) {
				issues.push({
					level: 'warning',
					type: 'timeline-outside-scene',
					message: `Component ends after scene duration (${component.timeline.endAt}s > ${scene.settings.duration}s).`,
					componentId: component.id,
					layerId: layer.id
				});
			}

			if ('source' in component && component.source?.assetId && !assetIds.has(component.source.assetId)) {
				issues.push({
					level: 'warning',
					type: 'missing-asset',
					message: `Component references asset "${component.source.assetId}" that is not in scene.assets.`,
					componentId: component.id,
					layerId: layer.id
				});
			}

			if (component.type === 'SUBTITLES') {
				const assetId = component.timingAnchor.assetId ?? component.source?.assetId;
				if (!assetId) {
					issues.push({
						level: 'error',
						type: 'subtitle-anchor-missing',
						message: 'Subtitles component needs timingAnchor.assetId or source.assetId.',
						componentId: component.id,
						layerId: layer.id
					});
				} else if (!scene.settings.subtitles?.data?.[assetId]) {
					issues.push({
						level: 'warning',
						type: 'subtitle-data-missing',
						message: `No scene.settings.subtitles.data entry found for "${assetId}".`,
						componentId: component.id,
						layerId: layer.id
					});
				}
			}
		}
	}

	return {
		valid: !issues.some((issue) => issue.level === 'error'),
		issues,
		summary: {
			duration: scene.settings.duration,
			width: scene.settings.width,
			height: scene.settings.height,
			layers: scene.layers.length,
			components
		}
	};
}
