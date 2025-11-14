import { vec3 } from "gl-matrix";
import type { MeshAtlas } from "../assets/MeshAtlas.ts";
import type { Game } from "../main.ts";
import { Particle } from "../vfx/Particle.ts";
import { Pickup } from "./Pickup.ts";

export class HealthPotion extends Pickup {
	private particleTimer: number = 0;
	private particleSpawnRate: number = 0.15; // Spawn particles every 0.15 seconds
	private healAmount: number = 50;

	// Spawn animation
	private isSpawnAnimating: boolean = false;
	private spawnAnimationTime: number = 0;
	private spawnAnimationDuration: number = 0.8; // 0.8 seconds for spawn animation
	private spawnJumpHeight: number = 1.0; // How high to jump
	private targetScale: number = 0.5; // Final scale after animation
	private spawnStartX: number = 0;
	private spawnStartZ: number = 0;
	private spawnTargetX: number = 0;
	private spawnTargetZ: number = 0;
	private spawnRotationAngle: number = 0;
	private spawnRotationSpeed: number = 120; // Degrees per second while spawning

	constructor(
		meshAtlas: MeshAtlas,
		x: number,
		y: number,
		z: number,
		playSpawnAnimation: boolean = false,
	) {
		// Use bottle mesh
		const mesh = meshAtlas.bottle!;
		super(mesh, x, y, z);

		// If spawn animation is enabled, start at scale 0
		if (playSpawnAnimation) {
			this.isSpawnAnimating = true;
			this.setUniformScale(0);
			this.configureSpawnArc(x, z);
		} else {
			// Scale bottle to be smaller
			this.setUniformScale(0.5);
		}
	}

	private configureSpawnArc(x: number, z: number): void {
		this.spawnStartX = x;
		this.spawnStartZ = z;
		const angle = Math.random() * Math.PI * 2;
		const radius = 0.6 + Math.random() * 0.9; // Spread pickups up to ~1.5 units away
		this.spawnTargetX = x + Math.cos(angle) * radius;
		this.spawnTargetZ = z + Math.sin(angle) * radius;
		this.spawnRotationAngle = Math.random() * 360;
	}

	/**
	 * Override update to add spawn animation and particle effects
	 */
	public update(deltaTime: number, game: Game): boolean {
		// Handle spawn animation
		if (this.isSpawnAnimating) {
			this.spawnAnimationTime += deltaTime;
			const t = Math.min(
				this.spawnAnimationTime / this.spawnAnimationDuration,
				1.0,
			);

			// Ease-out cubic for smooth scaling
			const easeT = 1 - (1 - t) ** 3;
			this.setUniformScale(easeT * this.targetScale);

			// Parabolic jump: starts at 0 (ground), peaks at spawnJumpHeight, lands at baseY
			const peak = this.spawnJumpHeight;
			const base = this.baseY;
			const a = -4 * (peak - 0.5 * base);
			const b = 4 * peak - base;
			const jumpY = a * t * t + b * t;
			this.position[1] = jumpY;

			// Slide away from the spawn center while scaling
			this.position[0] =
				this.spawnStartX + (this.spawnTargetX - this.spawnStartX) * easeT;
			this.position[2] =
				this.spawnStartZ + (this.spawnTargetZ - this.spawnStartZ) * easeT;

			// Keep spinning so the pickup never looks static
			this.spawnRotationAngle += this.spawnRotationSpeed * deltaTime;
			const rotationRadians = (this.spawnRotationAngle * Math.PI) / 180;
			this.setRotationFromEuler(0, rotationRadians, 0);

			// End spawn animation
			if (t >= 1.0) {
				this.isSpawnAnimating = false;
				this.setUniformScale(this.targetScale);
				this.position[0] = this.spawnTargetX;
				this.position[2] = this.spawnTargetZ;
				this.position[1] = this.baseY;
			}

			// Don't run parent update during spawn animation
			return false;
		}

		// Call parent update (returns true if should be removed)
		const shouldRemove = super.update(deltaTime, game);
		if (shouldRemove) return true;

		// Spawn red sparkle particles
		if (game.particleSystem) {
			this.particleTimer += deltaTime;

			// Spawn particles at the configured rate
			if (this.particleTimer >= this.particleSpawnRate) {
				this.particleTimer = 0;

				// Spawn 1-2 sparkle particles
				const particleCount = Math.floor(Math.random() * 2) + 1;
				for (let i = 0; i < particleCount; i++) {
					// Random offset around the potion
					const offsetX = (Math.random() - 0.5) * 0.4;
					const offsetZ = (Math.random() - 0.5) * 0.4;
					const offsetY = Math.random() * 0.3;

					const particlePos = vec3.fromValues(
						this.position[0] + offsetX,
						this.position[1] + offsetY,
						this.position[2] + offsetZ,
					);

					// Upward velocity with slight random spread
					const velocity = vec3.fromValues(
						(Math.random() - 0.5) * 0.2,
						Math.random() * 0.5 + 0.3, // Upward
						(Math.random() - 0.5) * 0.2,
					);

					// Red/pink color for health
					const color = vec3.fromValues(1.0, 0.2, 0.3);
					const endColor = vec3.fromValues(1.0, 0.3, 0.4);

					// Create sparkle particle
					const particle = new Particle(
						particlePos,
						velocity,
						color,
						4.0 + Math.random() * 4.0, // Start size 4-8
						0.4, // Lifetime
						0.0, // No gravity for sparkles
						endColor,
						1.0, // End size (shrink)
						"additive", // Additive blending for glow
					);

					game.particleSystem.spawn(particle);
				}
			}
		}

		return false;
	}

	/**
	 * Called when the pickup is collected
	 */
	protected onCollect(game: Game): void {
		// Heal the player (don't exceed max health)
		if (game.player) {
			const oldHealth = game.player.health;
			game.player.health = Math.min(
				game.player.maxHealth,
				game.player.health + this.healAmount,
			);
			const actualHeal = game.player.health - oldHealth;
			console.log(
				`Healed for ${actualHeal} HP! Health: ${game.player.health}/${game.player.maxHealth}`,
			);
		}

		// Spawn collection burst particles
		if (game.particleSystem && game.player) {
			const particleCount = 20; // Fixed number of particles for health potion
			const playerPos = game.player.position;

			for (let i = 0; i < particleCount; i++) {
				// Random offset around the potion
				const offsetX = (Math.random() - 0.5) * 0.4;
				const offsetY = Math.random() * 0.3;
				const offsetZ = (Math.random() - 0.5) * 0.4;

				const particlePos = vec3.fromValues(
					this.position[0] + offsetX,
					this.position[1] + offsetY,
					this.position[2] + offsetZ,
				);

				// Calculate direction towards player
				const dx = playerPos[0] - particlePos[0];
				const dy = playerPos[1] - particlePos[1];
				const dz = playerPos[2] - particlePos[2];
				const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

				// Velocity towards player with some randomness
				const speed = 3.0 + Math.random() * 2.0;
				const velocity = vec3.fromValues(
					(dx / dist) * speed + (Math.random() - 0.5) * 0.5,
					(dy / dist) * speed + Math.random() * 0.5,
					(dz / dist) * speed + (Math.random() - 0.5) * 0.5,
				);

				// Red/pink color for health
				const color = vec3.fromValues(1.0, 0.2, 0.2);
				const endColor = vec3.fromValues(1.0, 0.4, 0.5);

				// Create particle
				const particle = new Particle(
					particlePos,
					velocity,
					color,
					8.0 + Math.random() * 8.0, // Start size 8-16
					0.5, // Lifetime
					0.0, // No gravity
					endColor,
					2.0, // End size (shrink)
					"additive", // Additive blending for glow
				);

				game.particleSystem.spawn(particle);
			}
		}
	}

	/**
	 * Static spawn method to create health potions
	 * @param game The game instance
	 * @param meshAtlas The mesh atlas containing the bottle mesh
	 * @param x X position
	 * @param y Y position
	 * @param z Z position
	 * @param playSpawnAnimation Whether to play the spawn animation (default: false)
	 * @returns The health potion that was spawned
	 */
	public static spawn(
		game: Game,
		meshAtlas: MeshAtlas,
		x: number,
		y: number,
		z: number,
		playSpawnAnimation: boolean = false,
	): HealthPotion {
		const potion = new HealthPotion(meshAtlas, x, y, z, playSpawnAnimation);
		game.pickups.push(potion);
		game.entities.push(potion);
		return potion;
	}
}
