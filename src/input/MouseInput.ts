import type { InputSource } from "./InputSource.ts";
import type { InputState } from "./InputState.ts";

/**
 * Mouse input implementation
 * - Click and hold to move in that direction
 * - Optional: Could add mouse wheel for rotation (not implemented)
 */
export class MouseInput implements InputSource {
	private mouseX: number = 0;
	private mouseY: number = 0;
	private isMouseDown: boolean = false;

	constructor() {
		window.addEventListener("mousedown", this.onMouseDown);
		window.addEventListener("mousemove", this.onMouseMove);
		window.addEventListener("mouseup", this.onMouseUp);
	}

	private onMouseDown = (e: MouseEvent) => {
		this.mouseX = e.clientX;
		this.mouseY = e.clientY;
		this.isMouseDown = true;
	};

	private onMouseMove = (e: MouseEvent) => {
		if (this.isMouseDown) {
			this.mouseX = e.clientX;
			this.mouseY = e.clientY;
		}
	};

	private onMouseUp = (_e: MouseEvent) => {
		this.isMouseDown = false;
		this.mouseX = 0;
		this.mouseY = 0;
	};

	poll(cameraAngle: number): InputState {
		let moveX = 0;
		let moveZ = 0;

		if (this.isMouseDown) {
			// Use mouse position as analog stick - direction from center = movement direction
			const screenCenterX = window.innerWidth / 2;
			const screenCenterY = window.innerHeight / 2;

			// Calculate vector from center to mouse point
			const dx = this.mouseX - screenCenterX;
			const dy = this.mouseY - screenCenterY;

			// Dead zone in the center (10% of screen)
			const deadZone = Math.min(window.innerWidth, window.innerHeight) * 0.1;
			const distance = Math.sqrt(dx * dx + dy * dy);

			if (distance > deadZone) {
				// Normalize the vector (direction from center)
				const dirX = dx / distance;
				const dirY = dy / distance;

				// Convert screen space to movement direction
				// Invert Y because screen Y increases downward
				const screenX = dirX;
				const screenY = -dirY;

				// Rotate 90 degrees counter-clockwise to align with game axes
				// This makes: top=W, bottom=S, left=A, right=D
				const screenMoveX = -screenY; // Screen up/down becomes left/right movement
				const screenMoveY = screenX;   // Screen left/right becomes up/down movement

				// Apply camera rotation to transform screen space to world space
				// This matches keyboard movement (W/S/A/D relative to camera)
				moveX = screenMoveX * Math.cos(cameraAngle) + screenMoveY * Math.sin(cameraAngle);
				moveZ = screenMoveX * Math.sin(cameraAngle) - screenMoveY * Math.cos(cameraAngle);
			}
		}

		// Build input state (no rotation for mouse)
		const state: InputState = {
			moveX,
			moveZ,
			rotateLeft: false,
			rotateRight: false,
		};

		return state;
	}

	destroy(): void {
		window.removeEventListener("mousedown", this.onMouseDown);
		window.removeEventListener("mousemove", this.onMouseMove);
		window.removeEventListener("mouseup", this.onMouseUp);
	}
}
