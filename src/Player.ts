import { quat, vec3 } from "gl-matrix";
import { Entity } from "./Entity.ts";
import type { Mesh } from "./Mesh.ts";
import type { SphereCollider } from "./physics/Collider.ts";
import type { Physics } from "./physics/Physics.ts";
import type { Weapon } from "./Weapon.ts";

export class Player {
	public entities: Entity[];
	public position: vec3;
	public velocity: vec3;
	public rotation: number = 0; // Y-axis rotation in radians

	// Movement parameters
	public moveSpeed: number = 3.0; // Base movement speed
	public acceleration: number = 40.0; // How fast we reach max speed (units/s²)
	public deceleration: number = 30.0; // How fast we slow down when not moving (units/s²)
	public speedMultiplier: number = 1.0; // Multiply speed for gameplay effects (buffs/debuffs)

	// Health
	public health: number = 100;
	public maxHealth: number = 100;

	// Weapons
	public weapons: Weapon[] = [];

	constructor(meshes: Mesh[]) {
		this.position = vec3.fromValues(0, -0.5, 0);
		this.velocity = vec3.create();
		this.entities = meshes.map((mesh) => {
			const entity = new Entity(mesh);
			entity.setPosition(0, 0, 0);
			entity.setUniformScale(0.5);
			return entity;
		});
	}

	move(x: number, z: number, deltaTime: number, physics?: Physics): void {
		// Calculate target velocity based on input
		const maxSpeed = this.moveSpeed * this.speedMultiplier;
		const targetVelocity = vec3.fromValues(x * maxSpeed, 0, z * maxSpeed);

		// Apply acceleration towards target velocity
		if (x !== 0 || z !== 0) {
			// Accelerating - move towards target velocity
			const velDiffX = targetVelocity[0] - this.velocity[0];
			const velDiffZ = targetVelocity[2] - this.velocity[2];

			// Apply acceleration
			this.velocity[0] += velDiffX * this.acceleration * deltaTime;
			this.velocity[2] += velDiffZ * this.acceleration * deltaTime;

			// Update rotation to face movement direction
			this.rotation = Math.atan2(x, z);
		} else {
			// No input - apply deceleration (friction)
			const currentSpeed = Math.sqrt(
				this.velocity[0] * this.velocity[0] +
					this.velocity[2] * this.velocity[2],
			);

			if (currentSpeed > 0.01) {
				// Calculate deceleration direction (opposite to velocity)
				const decelerationAmount = this.deceleration * deltaTime;

				// If we would overshoot zero, just stop
				if (decelerationAmount >= currentSpeed) {
					this.velocity[0] = 0;
					this.velocity[2] = 0;
				} else {
					// Apply deceleration proportionally
					const factor = (currentSpeed - decelerationAmount) / currentSpeed;
					this.velocity[0] *= factor;
					this.velocity[2] *= factor;
				}
			} else {
				// Already very slow, just stop
				this.velocity[0] = 0;
				this.velocity[2] = 0;
			}
		}

		// Calculate new position based on velocity
		const oldPos = vec3.clone(this.position);
		const newPos = vec3.create();
		newPos[0] = this.position[0] + this.velocity[0] * deltaTime;
		newPos[1] = this.position[1];
		newPos[2] = this.position[2] + this.velocity[2] * deltaTime;

		// Apply physics collision if available
		if (physics && this.entities[0]?.collider?.type === "sphere") {
			const collider = this.entities[0].collider as SphereCollider;
			const safePos = physics.sweepSphere(
				oldPos,
				newPos,
				collider.radius,
				0, // player layer
				0xffffffff, // collide with all layers
				collider, // exclude self from collision
			);

			// Check if we collided (position was adjusted)
			const didCollide = !vec3.equals(safePos, newPos);
			if (didCollide) {
				// If we hit something, zero out velocity in that direction
				// This prevents "sliding" along walls
				const moveDir = vec3.create();
				vec3.subtract(moveDir, newPos, oldPos);
				const actualMove = vec3.create();
				vec3.subtract(actualMove, safePos, oldPos);

				// If we couldn't move in X, zero X velocity
				if (Math.abs(moveDir[0]) > 0.001 && Math.abs(actualMove[0]) < 0.001) {
					this.velocity[0] = 0;
				}
				// If we couldn't move in Z, zero Z velocity
				if (Math.abs(moveDir[2]) > 0.001 && Math.abs(actualMove[2]) < 0.001) {
					this.velocity[2] = 0;
				}
			}

			vec3.copy(this.position, safePos);
		} else {
			// No physics - just move directly
			vec3.copy(this.position, newPos);
		}

		// Apply to all entities
		this.updateEntities();
	}

	private updateEntities(): void {
		const rotation = quat.create();
		quat.fromEuler(rotation, 0, (this.rotation * 180) / Math.PI, 0);

		for (const entity of this.entities) {
			entity.setPosition(this.position[0], this.position[1], this.position[2]);
			entity.rotation = rotation;

			// Update collider position if it exists
			if (entity.collider) {
				vec3.copy(entity.collider.center, this.position);
			}
		}
	}

	update(_deltaTime: number): void {
		// Future: animations, etc.
	}

	setPosition(x: number, y: number, z: number): void {
		vec3.set(this.position, x, y, z);
		// Reset velocity when teleporting
		vec3.set(this.velocity, 0, 0, 0);
		this.updateEntities();
	}

	getPosition(): vec3 {
		return this.position;
	}

	/**
	 * Damage the player by the specified amount
	 */
	takeDamage(amount: number): void {
		this.health = Math.max(0, this.health - amount);
		console.log(
			`Player took ${amount} damage. Health: ${this.health}/${this.maxHealth}`,
		);
	}
}
