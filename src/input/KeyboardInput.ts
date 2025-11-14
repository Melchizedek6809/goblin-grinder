import type { InputSource } from "./InputSource.ts";
import type { InputState } from "./InputState.ts";

/**
 * Keyboard input implementation using WASD for movement and Q/E for camera rotation
 */
export class KeyboardInput implements InputSource {
	private pressedKeys: Set<string> = new Set();
	private rotateLeftPressed = false;
	private rotateRightPressed = false;

	constructor() {
		window.addEventListener("keydown", this.onKeyDown);
		window.addEventListener("keyup", this.onKeyUp);
	}

	private onKeyDown = (e: KeyboardEvent) => {
		const key = e.key.toLowerCase();
		const wasPressed = this.pressedKeys.has(key);
		this.pressedKeys.add(key);

		// Track rotation triggers (only fire once per press)
		if (!wasPressed) {
			if (key === "q") {
				this.rotateLeftPressed = true;
			} else if (key === "e") {
				this.rotateRightPressed = true;
			}
		}
	};

	private onKeyUp = (e: KeyboardEvent) => {
		this.pressedKeys.delete(e.key.toLowerCase());
	};

	poll(cameraAngle: number): InputState {
		// Calculate movement direction based on camera angle
		let moveX = 0;
		let moveZ = 0;

		if (this.pressedKeys.has("s")) {
			// Move away from camera (up on screen)
			moveX += Math.cos(cameraAngle);
			moveZ += Math.sin(cameraAngle);
		}
		if (this.pressedKeys.has("w")) {
			// Move towards camera (down on screen)
			moveX += Math.cos(cameraAngle + Math.PI);
			moveZ += Math.sin(cameraAngle + Math.PI);
		}
		if (this.pressedKeys.has("a")) {
			// Move left on screen
			moveX += Math.cos(cameraAngle + Math.PI / 2);
			moveZ += Math.sin(cameraAngle + Math.PI / 2);
		}
		if (this.pressedKeys.has("d")) {
			// Move right on screen
			moveX += Math.cos(cameraAngle - Math.PI / 2);
			moveZ += Math.sin(cameraAngle - Math.PI / 2);
		}

		// Normalize movement vector
		const moveLength = Math.sqrt(moveX * moveX + moveZ * moveZ);
		if (moveLength > 0) {
			moveX = moveX / moveLength;
			moveZ = moveZ / moveLength;
		}

		// Build input state
		const state: InputState = {
			moveX,
			moveZ,
			rotateLeft: this.rotateLeftPressed,
			rotateRight: this.rotateRightPressed,
			rotationDelta: 0, // Keyboard uses discrete rotation (Q/E), not smooth delta
		};

		// Clear rotation triggers (one-shot)
		this.rotateLeftPressed = false;
		this.rotateRightPressed = false;

		return state;
	}

	destroy(): void {
		window.removeEventListener("keydown", this.onKeyDown);
		window.removeEventListener("keyup", this.onKeyUp);
		this.pressedKeys.clear();
	}
}
