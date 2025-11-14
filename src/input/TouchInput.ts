import type { InputSource } from "./InputSource.ts";
import type { InputState } from "./InputState.ts";

/**
 * Touch input implementation
 * - Touch screen areas to move in that direction
 * - Swipe left/right to rotate camera
 */
export class TouchInput implements InputSource {
	private touchX: number = 0;
	private touchY: number = 0;
	private isTouching: boolean = false;

	// Swipe detection
	private swipeStartX: number = 0;
	private swipeStartTime: number = 0;
	private rotateLeftTriggered: boolean = false;
	private rotateRightTriggered: boolean = false;

	// Swipe thresholds
	private readonly SWIPE_MIN_DISTANCE = 50; // pixels
	private readonly SWIPE_MAX_TIME = 300; // ms

	constructor() {
		window.addEventListener("touchstart", this.onTouchStart);
		window.addEventListener("touchmove", this.onTouchMove);
		window.addEventListener("touchend", this.onTouchEnd);
		window.addEventListener("touchcancel", this.onTouchEnd);
	}

	private onTouchStart = (e: TouchEvent) => {
		e.preventDefault();

		if (e.touches.length > 0) {
			const touch = e.touches[0];
			this.touchX = touch.clientX;
			this.touchY = touch.clientY;
			this.isTouching = true;

			// Record swipe start
			this.swipeStartX = touch.clientX;
			this.swipeStartTime = Date.now();
		}
	};

	private onTouchMove = (e: TouchEvent) => {
		e.preventDefault();

		if (e.touches.length > 0) {
			const touch = e.touches[0];
			this.touchX = touch.clientX;
			this.touchY = touch.clientY;
		}
	};

	private onTouchEnd = (e: TouchEvent) => {
		e.preventDefault();

		// Detect swipe gesture for rotation
		if (this.isTouching && e.changedTouches.length > 0) {
			const touch = e.changedTouches[0];
			const swipeDistance = touch.clientX - this.swipeStartX;
			const swipeTime = Date.now() - this.swipeStartTime;

			// Quick horizontal swipe = rotation
			if (swipeTime < this.SWIPE_MAX_TIME && Math.abs(swipeDistance) > this.SWIPE_MIN_DISTANCE) {
				if (swipeDistance > 0) {
					// Swipe right = rotate camera right
					this.rotateRightTriggered = true;
				} else {
					// Swipe left = rotate camera left
					this.rotateLeftTriggered = true;
				}
			}
		}

		this.isTouching = false;
		this.touchX = 0;
		this.touchY = 0;
	};

	poll(cameraAngle: number): InputState {
		let moveX = 0;
		let moveZ = 0;

		if (this.isTouching) {
			// Use touch position as analog stick - direction from center = movement direction
			const screenCenterX = window.innerWidth / 2;
			const screenCenterY = window.innerHeight / 2;

			// Calculate vector from center to touch point
			const dx = this.touchX - screenCenterX;
			const dy = this.touchY - screenCenterY;

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

		// Build input state
		const state: InputState = {
			moveX,
			moveZ,
			rotateLeft: this.rotateLeftTriggered,
			rotateRight: this.rotateRightTriggered,
		};

		// Clear rotation triggers (one-shot)
		this.rotateLeftTriggered = false;
		this.rotateRightTriggered = false;

		return state;
	}

	destroy(): void {
		window.removeEventListener("touchstart", this.onTouchStart);
		window.removeEventListener("touchmove", this.onTouchMove);
		window.removeEventListener("touchend", this.onTouchEnd);
		window.removeEventListener("touchcancel", this.onTouchEnd);
	}
}
