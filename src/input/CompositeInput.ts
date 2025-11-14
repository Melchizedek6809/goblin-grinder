import type { InputSource } from "./InputSource.ts";
import type { InputState } from "./InputState.ts";

/**
 * Combines multiple input sources into one
 * Allows keyboard, mouse, and touch to all work simultaneously
 */
export class CompositeInput implements InputSource {
	private sources: InputSource[];

	constructor(sources: InputSource[]) {
		this.sources = sources;
	}

	poll(cameraAngle: number): InputState {
		// Aggregate input from all sources
		let moveX = 0;
		let moveZ = 0;
		let rotateLeft = false;
		let rotateRight = false;

		for (const source of this.sources) {
			const state = source.poll(cameraAngle);

			// Accumulate movement (allows multiple sources to contribute)
			moveX += state.moveX;
			moveZ += state.moveZ;

			// Logical OR for rotation (any source can trigger)
			rotateLeft = rotateLeft || state.rotateLeft;
			rotateRight = rotateRight || state.rotateRight;
		}

		// Normalize movement if it exceeds 1.0 (from multiple sources)
		const moveLength = Math.sqrt(moveX * moveX + moveZ * moveZ);
		if (moveLength > 1.0) {
			moveX /= moveLength;
			moveZ /= moveLength;
		}

		return {
			moveX,
			moveZ,
			rotateLeft,
			rotateRight,
		};
	}

	destroy(): void {
		for (const source of this.sources) {
			source.destroy();
		}
	}
}
