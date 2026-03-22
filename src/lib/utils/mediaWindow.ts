import type { ComponentData } from '$lib';

export const DEFAULT_MEDIA_PREROLL_SECONDS = 0.75;
export const STREAMING_MEDIA_PREROLL_SECONDS = 2;
export const DEFAULT_MEDIA_POSTROLL_SECONDS = 0.25;

type MediaWindowComponent = Pick<ComponentData, 'type' | 'visible' | 'timeline'> & {
	source?: {
		url?: string | null;
	};
};

export function isMediaWindowComponent(
	data: MediaWindowComponent | undefined
): data is MediaWindowComponent {
	return data?.type === 'VIDEO' || data?.type === 'AUDIO';
}

export function getMediaPrerollSeconds(data: MediaWindowComponent | undefined): number {
	if (!isMediaWindowComponent(data)) {
		return 0;
	}

	const url = data.source?.url ?? '';
	return /\.m3u8(?:$|[?#])/i.test(url)
		? STREAMING_MEDIA_PREROLL_SECONDS
		: DEFAULT_MEDIA_PREROLL_SECONDS;
}

export function shouldPrepareMediaAtTime(
	data: MediaWindowComponent | undefined,
	currentTime: number
): boolean {
	if (!isMediaWindowComponent(data) || data.visible === false) {
		return false;
	}

	const startAt = data.timeline.startAt ?? 0;
	const endAt = data.timeline.endAt ?? startAt;
	const prerollSeconds = getMediaPrerollSeconds(data);

	return (
		currentTime >= startAt - prerollSeconds &&
		currentTime <= endAt + DEFAULT_MEDIA_POSTROLL_SECONDS
	);
}
