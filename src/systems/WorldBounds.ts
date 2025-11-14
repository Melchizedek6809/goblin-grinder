export const WORLD_SIZE = 160;
export const HALF_WORLD_SIZE = WORLD_SIZE / 2;

// Shared clearances for gameplay elements
export const PLAYER_BORDER_PADDING = 25;
export const SCENERY_BORDER_PADDING = 26;
export const ENEMY_SPAWN_BORDER_PADDING = 24;

/**
 * Clamp a single axis value so it stays on the ground plane with optional padding.
 */
export function clampWorldAxis(value: number, padding: number = 0): number {
	const min = -HALF_WORLD_SIZE + padding;
	const max = HALF_WORLD_SIZE - padding;
	if (min >= max) {
		return (min + max) * 0.5;
	}
	return Math.min(Math.max(value, min), max);
}

/**
 * Convenience helper to compute the usable radius for items that need border padding.
 */
export function getPlayableRadius(padding: number = 0): number {
	return Math.max(0, HALF_WORLD_SIZE - padding);
}
