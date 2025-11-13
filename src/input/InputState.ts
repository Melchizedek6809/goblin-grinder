/**
 * Normalized input state representing player intentions
 * Values are device-agnostic (keyboard, gamepad, touch, etc.)
 */
export interface InputState {
	/**
	 * Horizontal movement (-1 to 1, normalized)
	 * Positive = right relative to camera
	 */
	moveX: number;

	/**
	 * Vertical movement (-1 to 1, normalized)
	 * Positive = forward relative to camera
	 */
	moveZ: number;

	/**
	 * Camera rotation commands (triggered once per press)
	 */
	rotateLeft: boolean;
	rotateRight: boolean;

	/**
	 * Future: action buttons for gameplay
	 */
	attack?: boolean;
	dodge?: boolean;
	interact?: boolean;
}

/**
 * Create an empty input state with no input
 */
export function createEmptyInputState(): InputState {
	return {
		moveX: 0,
		moveZ: 0,
		rotateLeft: false,
		rotateRight: false,
	};
}
