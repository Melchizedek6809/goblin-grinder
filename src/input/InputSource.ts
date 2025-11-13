import type { InputState } from "./InputState.ts";

/**
 * Interface for input sources (keyboard, gamepad, touch, etc.)
 * Each implementation translates device-specific input into normalized InputState
 */
export interface InputSource {
	/**
	 * Poll the current input state
	 * @param cameraAngle - Current camera angle for relative movement calculation
	 * @returns Normalized input state
	 */
	poll(cameraAngle: number): InputState;

	/**
	 * Clean up resources (event listeners, etc.)
	 */
	destroy(): void;
}
