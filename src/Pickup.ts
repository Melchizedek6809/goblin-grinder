import { Entity } from "./Entity.ts";
import type { Mesh } from "./Mesh.ts";
import type { Game } from "./main.ts";

export abstract class Pickup extends Entity {
	public isCollected: boolean = false;
	public pickupRange: number = 2.0; // Distance at which pickup starts moving towards player
	public collectRange: number = 0.8; // Distance at which pickup is collected
	public gravityStrength: number = 8.0; // Acceleration towards player when in range

	private velocityX: number = 0; // Horizontal velocity (X)
	private velocityZ: number = 0; // Horizontal velocity (Z)
	private animationTime: number = 0;
	protected baseY: number = 0.3; // Base Y position for bobbing animation
	private bobbingSpeed: number = 2.0; // Speed of bobbing animation
	private bobbingHeight: number = 0.15; // Height of bobbing animation
	private rotationSpeed: number = 90.0; // Degrees per second

	constructor(mesh: Mesh, x: number, y: number, z: number) {
		super(mesh);
		this.setPosition(x, y, z);

		// Use a fixed base Y for hovering, ignore the initial Y parameter
		this.baseY = 0.3;

		// Random rotation offset for variety
		this.animationTime = Math.random() * Math.PI * 2;
	}

	/**
	 * Update the pickup: animate, apply gravity towards player, check collection
	 * @returns true if the pickup should be removed (collected)
	 */
	public update(deltaTime: number, game: Game): boolean {
		if (this.isCollected) {
			return true;
		}

		// Update animation timer
		this.animationTime += deltaTime;

		// Bobbing animation (sine wave) - Y position is purely animation-based
		const bobbingOffset =
			Math.sin(this.animationTime * this.bobbingSpeed) * this.bobbingHeight;
		this.position[1] = this.baseY + bobbingOffset;

		// Y-axis rotation
		const rotationRadians =
			(this.animationTime * this.rotationSpeed * Math.PI) / 180;
		this.setRotationFromEuler(0, rotationRadians, 0);

		// Check distance to player
		if (game.player) {
			const playerPos = game.player.position;
			const dx = playerPos[0] - this.position[0];
			const dz = playerPos[2] - this.position[2];
			const distanceXZ = Math.sqrt(dx * dx + dz * dz);

			// If player is within collect range, collect the pickup
			if (distanceXZ < this.collectRange) {
				this.collect(game);
				return true;
			}

			// If player is within pickup range, apply gravity towards player (XZ only)
			if (distanceXZ < this.pickupRange && distanceXZ > 0.01) {
				// Calculate direction to player (normalize)
				const dirX = dx / distanceXZ;
				const dirZ = dz / distanceXZ;

				// Apply acceleration towards player (horizontal only)
				this.velocityX += dirX * this.gravityStrength * deltaTime;
				this.velocityZ += dirZ * this.gravityStrength * deltaTime;

				// Apply horizontal velocity
				this.position[0] += this.velocityX * deltaTime;
				this.position[2] += this.velocityZ * deltaTime;
			} else {
				// Decay velocity when not in range
				this.velocityX *= 0.95;
				this.velocityZ *= 0.95;
			}
		}

		return false;
	}

	/**
	 * Collect this pickup
	 */
	private collect(game: Game): void {
		this.isCollected = true;
		this.onCollect(game);
	}

	/**
	 * Called when the pickup is collected.
	 * Subclasses should implement this to define what happens when collected.
	 */
	protected abstract onCollect(game: Game): void;
}
