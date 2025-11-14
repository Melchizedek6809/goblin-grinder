import { quat, vec3 } from "gl-matrix";
import type { Mesh } from "../assets/Mesh.ts";
import { Entity } from "../objects/Entity.ts";
import type { SphereCollider } from "../physics/Collider.ts";
import type { Physics } from "../physics/Physics.ts";
import type { Player } from "../objects/Player.ts";

export type EnemyState = "idle" | "chase" | "attack" | "death";

export class Enemy {
	public entities: Entity[];
	public position: vec3;
	public velocity: vec3;
	public goalVelocity: vec3; // Target velocity set by AI
	public rotation: number = 0; // Y-axis rotation in radians

	// AI state machine
	public state: EnemyState = "idle";
	private attackTimer: number = 0; // Counts fixed update ticks during attack

	// Jump mechanics
	private isJumping: boolean = false;
	private jumpVelocity: number = 0; // Current vertical velocity
	private readonly jumpSpeed: number = 4.0; // Initial upward velocity when jumping
	private readonly gravity: number = 12.0; // Gravity constant (units/s²)
	private readonly groundY: number = -0.5; // Default ground level for enemies
	private jumpChance: number = 0.2; // 20% chance to jump on idle->chase transition

	// Health system
	public health: number = 50;
	public maxHealth: number = 50;
	private deathTimer: number = 0; // Time spent in death state (seconds)
	private deathDuration: number = 2.0; // How long to stay in death state before despawn
	private sinkSpeed: number = 0.5; // How fast to sink into ground (units/second)
	public rewardGranted: boolean = false; // Track if points/coins have been awarded for this enemy

	// Movement parameters
	public moveSpeed: number = 1.5; // Base movement speed (slower than player's 3.0)
	public acceleration: number = 20.0; // How fast we reach goal velocity (units/s²)

	// Detection ranges
	public chaseStartRange: number = 8.0; // Start chasing when player is this close
	public chaseEndRange: number = 10.0; // Stop chasing when player is this far (higher to avoid flickering)
	public attackRange: number = 1.5; // Attack when player is this close
	public attackDuration: number = 3; // Number of fixed update ticks to attack for

	// Combat
	public attackDamage: number = 10; // Damage dealt to player per attack

	constructor(meshes: Mesh[]) {
		this.position = vec3.fromValues(0, -0.5, 0);
		this.velocity = vec3.create();
		this.goalVelocity = vec3.create();
		this.entities = meshes.map((mesh) => {
			const entity = new Entity(mesh);
			entity.setPosition(0, 0, 0);
			entity.setUniformScale(0.5);
			return entity;
		});
	}

	setPosition(x: number, y: number, z: number): void {
		vec3.set(this.position, x, y, z);
		this.updateEntities();
	}

	setRotation(radians: number): void {
		this.rotation = radians;
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

	/**
	 * Deal damage to this enemy
	 * @param amount Amount of damage to deal
	 */
	takeDamage(amount: number): void {
		if (this.state === "death") return; // Already dead

		this.health -= amount;
		console.log(
			`Enemy took ${amount} damage, health: ${this.health}/${this.maxHealth}`,
		);

		if (this.health <= 0) {
			this.health = 0;
			this.state = "death";
			this.deathTimer = 0;
			vec3.set(this.goalVelocity, 0, 0, 0);
			vec3.set(this.velocity, 0, 0, 0);
			console.log("Enemy died!");
		}
	}

	/**
	 * Apply knockback force to this enemy
	 * @param direction Normalized direction vector for knockback
	 * @param force Knockback force magnitude
	 */
	applyKnockback(direction: vec3, force: number): void {
		// Don't apply knockback to dead enemies
		if (this.state === "death") return;

		// Apply knockback by directly modifying velocity (instantaneous push)
		// Only apply horizontal knockback (X and Z), not vertical
		this.velocity[0] += direction[0] * force;
		this.velocity[2] += direction[2] * force;
	}

	/**
	 * Check if enemy should be removed from the game
	 */
	shouldDespawn(): boolean {
		return this.state === "death" && this.deathTimer >= this.deathDuration;
	}

	/**
	 * Update AI logic (called at fixed timestep, e.g., 30fps)
	 * State machine that controls enemy behavior based on player
	 */
	update(player: Player): void {
		// Skip AI logic if dead
		if (this.state === "death") return;
		const playerPosition = player.getPosition();

		// Calculate distance and direction to player
		const toPlayer = vec3.create();
		vec3.subtract(toPlayer, playerPosition, this.position);
		const distanceToPlayer = vec3.length(toPlayer);

		// State machine transitions
		switch (this.state) {
			case "idle":
				// Transition: idle -> chase (player gets close)
				if (distanceToPlayer < this.chaseStartRange) {
					// 20% chance to jump first before chasing
					if (Math.random() < this.jumpChance) {
						this.isJumping = true;
						this.jumpVelocity = this.jumpSpeed;
						vec3.set(this.goalVelocity, 0, 0, 0); // Don't move horizontally while jumping
					} else {
						this.state = "chase";
					}
				}
				// Idle: no movement
				if (!this.isJumping) {
					vec3.set(this.goalVelocity, 0, 0, 0);
				}
				break;

			case "chase":
				// Transition: chase -> attack (player gets very close)
				if (distanceToPlayer < this.attackRange) {
					this.state = "attack";
					this.attackTimer = this.attackDuration;
					vec3.set(this.goalVelocity, 0, 0, 0); // Stop moving
					break;
				}

				// Transition: chase -> idle (player gets too far away)
				if (distanceToPlayer > this.chaseEndRange) {
					this.state = "idle";
					vec3.set(this.goalVelocity, 0, 0, 0);
					break;
				}

				// Chase: move towards player
				if (distanceToPlayer > 0.1) {
					vec3.normalize(toPlayer, toPlayer);
					this.goalVelocity[0] = toPlayer[0] * this.moveSpeed;
					this.goalVelocity[1] = 0;
					this.goalVelocity[2] = toPlayer[2] * this.moveSpeed;

					// Update rotation to face player
					this.rotation = Math.atan2(toPlayer[0], toPlayer[2]);
				}
				break;

			case "attack":
				// Don't move during attack
				vec3.set(this.goalVelocity, 0, 0, 0);

				// Always face the player during attack
				if (distanceToPlayer > 0.1) {
					vec3.normalize(toPlayer, toPlayer);
					this.rotation = Math.atan2(toPlayer[0], toPlayer[2]);
				}

				// Count down attack timer
				this.attackTimer--;

				// Transition: attack -> chase (attack duration finished)
				if (this.attackTimer <= 0) {
					// Check if player is still in range and deal damage
					if (distanceToPlayer < this.attackRange) {
						player.takeDamage(this.attackDamage);
					}
					this.state = "chase";
				}
				break;
		}
	}

	/**
	 * Apply movement and interpolate velocity (called every render frame)
	 * This creates smooth movement between fixed updates
	 */
	applyMovement(deltaTime: number, physics?: Physics): void {
		// Handle death state
		if (this.state === "death") {
			this.deathTimer += deltaTime;

			// Sink into the ground
			this.position[1] -= this.sinkSpeed * deltaTime;

			// Update entity transforms
			this.updateEntities();
			return;
		}

		// Handle jump physics
		if (this.isJumping) {
			// Apply jump velocity to vertical position
			this.position[1] += this.jumpVelocity * deltaTime;

			// Apply gravity to jump velocity
			this.jumpVelocity -= this.gravity * deltaTime;

			// Check if we've landed (back on or below ground level)
			if (this.position[1] <= this.groundY) {
				this.position[1] = this.groundY;
				this.jumpVelocity = 0;
				this.isJumping = false;
				// Transition to chase state after landing
				this.state = "chase";
			}

			// Update entity transforms and return (no horizontal movement while jumping)
			this.updateEntities();
			return;
		}

		// Interpolate current velocity towards goal velocity
		const velDiffX = this.goalVelocity[0] - this.velocity[0];
		const velDiffZ = this.goalVelocity[2] - this.velocity[2];

		this.velocity[0] += velDiffX * this.acceleration * deltaTime;
		this.velocity[2] += velDiffZ * this.acceleration * deltaTime;

		// Clamp velocity to prevent it from exceeding move speed
		const currentSpeed = Math.sqrt(
			this.velocity[0] * this.velocity[0] + this.velocity[2] * this.velocity[2],
		);
		if (currentSpeed > this.moveSpeed) {
			const scale = this.moveSpeed / currentSpeed;
			this.velocity[0] *= scale;
			this.velocity[2] *= scale;
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
				1, // enemy layer
				0xffffffff, // collide with all layers (including other enemies)
				collider, // exclude self from collision
			);

			// Check if we collided (position was adjusted)
			const didCollide = !vec3.equals(safePos, newPos);
			if (didCollide) {
				// If we hit something, zero out velocity in that direction
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

		// Update entity transforms
		this.updateEntities();
	}

	getPosition(): vec3 {
		return this.position;
	}

	getState(): EnemyState {
		return this.state;
	}
}
