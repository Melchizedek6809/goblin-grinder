import { quat, vec3 } from "gl-matrix";
import type { Mesh } from "../assets/Mesh.ts";
import type { SkinnedMesh } from "../animation/SkinnedMesh.ts";
import type { AnimationController } from "../animation/AnimationController.ts";
import { Entity } from "./Entity.ts";
import type { SphereCollider } from "../physics/Collider.ts";
import type { Physics } from "../physics/Physics.ts";
import { Particle } from "../vfx/Particle.ts";
import type { ParticleSystem } from "../vfx/ParticleSystem.ts";
import type { Weapon } from "../weapons/Weapon.ts";
import {
	PLAYER_BORDER_PADDING,
	clampWorldAxis,
} from "../systems/WorldBounds.ts";

export class Player {
	public entities: Entity[];
	public position: vec3;
	public velocity: vec3;
	public rotation: number = 0; // Y-axis rotation in radians
	private animationController: AnimationController | null = null;

	// Movement parameters
	public moveSpeed: number = 3.0; // Base movement speed
	public acceleration: number = 40.0; // How fast we reach max speed (units/s²)
	public deceleration: number = 30.0; // How fast we slow down when not moving (units/s²)
	public speedMultiplier: number = 1.0; // Multiply speed for gameplay effects (buffs/debuffs)
	public attackSpeedMultiplier: number = 1.0; // Scales weapon cooldowns (higher = faster)
	public damageMultiplier: number = 1.0; // Boosts outgoing damage
	public healthRegenRate: number = 0; // HP recovered per second
	public knockbackPower: number = 1.0; // Multiplier for knockback strength
	public coinMagnetRange: number = 1.0; // Multiplier for coin collection radius

	// Health
	public health: number = 100;
	public maxHealth: number = 100;
	public experience: number = 0;
	private xpToNextLevel: number = 4;
	private levelUpReady: boolean = false;
	private idleAnimationName: string | null = null;
	private moveAnimationName: string | null = null;
	private animationState: "idle" | "walk" = "idle";
	private appliedAnimationState: "idle" | "walk" = "idle";

	// Weapons
	public weapons: Weapon[] = [];

	// Walking particles
	private particleTimer: number = 0;
	private particleSpawnRate: number = 0.08; // Spawn particles every 0.08 seconds

	constructor(
		meshes: Mesh[] | SkinnedMesh[],
		animationController?: AnimationController,
	) {
		this.position = vec3.fromValues(0, -0.5, 0);
		this.velocity = vec3.create();
		this.animationController = animationController || null;

		this.entities = meshes.map((mesh) => {
			const entity = new Entity(mesh);
			entity.setPosition(0, 0, 0);
			entity.setUniformScale(0.5);
			return entity;
		});

		this.resolveAnimationNames();
		// Apply the starting pose immediately so we don't show the bind pose on spawn
		if (this.animationController && this.idleAnimationName) {
			this.animationController.play(this.idleAnimationName, true, false);
			this.animationController.update(0);
		}
	}

	move(x: number, z: number, deltaTime: number, physics?: Physics): void {
		// Drive animation state directly from input intent
		this.animationState = x !== 0 || z !== 0 ? "walk" : "idle";

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

		this.enforceGroundBounds();

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

	private enforceGroundBounds(): void {
		const clampedX = clampWorldAxis(this.position[0], PLAYER_BORDER_PADDING);
		const clampedZ = clampWorldAxis(this.position[2], PLAYER_BORDER_PADDING);

		if (clampedX !== this.position[0]) {
			this.position[0] = clampedX;
			this.velocity[0] = 0;
		}
		if (clampedZ !== this.position[2]) {
			this.position[2] = clampedZ;
			this.velocity[2] = 0;
		}
	}

	update(deltaTime: number, particleSystem?: ParticleSystem): void {
		// Apply health regeneration
		if (this.healthRegenRate > 0 && this.health < this.maxHealth) {
			this.health = Math.min(
				this.maxHealth,
				this.health + this.healthRegenRate * deltaTime,
			);
		}

		// Update animation based on movement
		if (this.animationController) {
			if (!this.idleAnimationName || !this.moveAnimationName) {
				this.resolveAnimationNames();
			}

			// Determine which clip should play for the current animation state
			let desiredClip: string | null = null;
			if (this.animationState === "walk") {
				desiredClip = this.moveAnimationName ?? this.idleAnimationName;
			} else {
				desiredClip = this.idleAnimationName ?? this.moveAnimationName;
			}

			// Only switch if the state changed or the clip isn't already playing
			if (desiredClip) {
				const currentClip = this.animationController.getCurrentAnimationName();
				if (
					this.animationState !== this.appliedAnimationState ||
					currentClip !== desiredClip
				) {
					this.animationController.play(desiredClip, true, true);
					this.appliedAnimationState = this.animationState;
				}
			}

			// Update animation controller
			this.animationController.update(deltaTime);
		}

		// Spawn walking particles if moving
		if (particleSystem) {
			this.spawnWalkingParticles(deltaTime, particleSystem);
		}
	}

	/**
	 * Spawn dust particles when the player is walking
	 */
	private spawnWalkingParticles(
		deltaTime: number,
		particleSystem: ParticleSystem,
	): void {
		// Check if player is moving (velocity magnitude > threshold)
		const speed = Math.sqrt(
			this.velocity[0] * this.velocity[0] + this.velocity[2] * this.velocity[2],
		);

		// Only spawn particles if moving at a decent speed
		if (speed < 0.5) {
			this.particleTimer = 0; // Reset timer when not moving
			return;
		}

		this.particleTimer += deltaTime;

		// Spawn particles at the configured rate
		if (this.particleTimer >= this.particleSpawnRate) {
			this.particleTimer = 0;

			// Spawn 1-2 dust particles
			const particleCount = Math.floor(Math.random() * 2) + 1;
			for (let i = 0; i < particleCount; i++) {
				// Spawn at player's feet with slight random offset
				const offsetX = (Math.random() - 0.5) * 0.3;
				const offsetZ = (Math.random() - 0.5) * 0.3;

				const particlePos = vec3.fromValues(
					this.position[0] + offsetX,
					this.position[1] + 0.1, // Slightly above ground
					this.position[2] + offsetZ,
				);

				// Velocity: slight upward and outward movement
				const velocity = vec3.fromValues(
					(Math.random() - 0.5) * 0.3,
					Math.random() * 0.2 + 0.1, // Upward
					(Math.random() - 0.5) * 0.3,
				);

				// Dust color (gray-white)
				const color = vec3.fromValues(0.7, 0.7, 0.7);
				const endColor = vec3.fromValues(0.5, 0.5, 0.5);

				// Create dust particle
				const particle = new Particle(
					particlePos,
					velocity,
					color,
					12.0 + Math.random() * 12.0, // Start size 12-24
					0.3 + Math.random() * 0.2, // Lifetime 0.3-0.5s
					0.0, // No gravity for dust
					endColor,
					0.5, // End size (shrink)
				);

				particleSystem.spawn(particle);
			}
		}
	}

	private resolveAnimationNames(): void {
		if (!this.animationController) {
			return;
		}

		const names = this.animationController.getAnimationNames();

		// Pick idle animation (prefer names containing "idle")
		const idle =
			names.find((n) => n === "Idle_A") ??
			names.find((n) => /idle/i.test(n)) ??
			names.find((n) => /stand/i.test(n)) ??
			null;

		// Pick movement animation (prefer walk/run/move)
		const move =
			names.find((n) => n === "Running_A") ??
			names.find((n) => n === "Running_B") ??
			names.find((n) => n === "Walking_A") ??
			names.find((n) => /walk/i.test(n)) ??
			names.find((n) => /run/i.test(n)) ??
			names.find((n) => /move/i.test(n)) ??
			null;

		this.idleAnimationName = idle;
		this.moveAnimationName = move;

		if (this.idleAnimationName) {
			this.animationController.play(this.idleAnimationName, true, false);
			console.log(
				"[Player] Using animations",
				{ idle: this.idleAnimationName, move: this.moveAnimationName },
				names,
			);
		}
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

	addExperience(amount: number): void {
		if (this.levelUpReady) {
			return;
		}

		this.experience += amount;
		console.log(
			`Gained ${amount} XP. Total XP: ${this.experience}/${this.xpToNextLevel}`,
		);

		if (this.experience >= this.xpToNextLevel) {
			this.experience = this.xpToNextLevel;
			this.levelUpReady = true;
			console.log("Level up ready!");
		}
	}

	getExperienceProgress(): number {
		if (this.levelUpReady) {
			return 1;
		}
		if (this.xpToNextLevel <= 0) return 0;
		return Math.min(this.experience / this.xpToNextLevel, 1);
	}

	hasPendingLevelUp(): boolean {
		return this.levelUpReady;
	}

	levelUp(): void {
		if (!this.levelUpReady) {
			return;
		}
		this.levelUpReady = false;
		this.experience = 0;
		this.xpToNextLevel *= 2;
		console.log(`Level up! Next level at ${this.xpToNextLevel} XP.`);
	}

	increaseMaxHealth(amount: number): void {
		this.maxHealth += amount;
		this.health = this.maxHealth;
		console.log(`Max HP increased to ${this.maxHealth}`);
	}

	increaseSpeedMultiplier(amount: number): void {
		this.speedMultiplier += amount;
		console.log(
			`Speed multiplier increased to ${this.speedMultiplier.toFixed(2)}x`,
		);
	}

	increaseAttackSpeedMultiplier(amount: number): void {
		this.attackSpeedMultiplier += amount;
		console.log(
			`Attack speed multiplier increased to ${this.attackSpeedMultiplier.toFixed(2)}x`,
		);
	}

	increaseDamageMultiplier(amount: number): void {
		this.damageMultiplier += amount;
		console.log(
			`Damage multiplier increased to ${this.damageMultiplier.toFixed(2)}x`,
		);
	}

	increaseHealthRegenRate(amount: number): void {
		this.healthRegenRate += amount;
		console.log(
			`Health regen rate increased to ${this.healthRegenRate.toFixed(2)} HP/s`,
		);
	}

	increaseKnockbackPower(amount: number): void {
		this.knockbackPower += amount;
		console.log(
			`Knockback power increased to ${this.knockbackPower.toFixed(2)}x`,
		);
	}

	increaseCoinMagnetRange(amount: number): void {
		this.coinMagnetRange += amount;
		console.log(
			`Coin magnet range increased to ${this.coinMagnetRange.toFixed(2)}x`,
		);
	}

	getModifiedAttackCooldown(baseCooldown: number): number {
		const multiplier = Math.max(this.attackSpeedMultiplier, 0.01);
		return baseCooldown / multiplier;
	}

	getModifiedDamage(baseDamage: number): number {
		return baseDamage * this.damageMultiplier;
	}

	resetStatMultipliers(): void {
		this.speedMultiplier = 1.0;
		this.attackSpeedMultiplier = 1.0;
		this.damageMultiplier = 1.0;
		this.healthRegenRate = 0;
		this.knockbackPower = 1.0;
		this.coinMagnetRange = 1.0;
	}
}
