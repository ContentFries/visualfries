import type { Command } from './Command.js';
import { ComponentShape } from '../schemas/scene/components.js';
import { z } from 'zod';

const replaceSourceOnTimeSchema = z.object({
	componentId: z.string(),
	data: ComponentShape
});

export class UpdateComponentCommand implements Command<boolean> {
	async execute(props: unknown): Promise<boolean> {
		const check = replaceSourceOnTimeSchema.safeParse(props);
		if (!check.success) {
			// this.sceneBuilder.log('UpdateComponentCommand validation error: ' + check.error);
			return false;
		}
		// should return true on successful component update, false otherwise (component not found etc.)
		return false;
	}
}
