import { vec3 } from "gl-matrix";
import type { Game } from "./main.ts";
import type { MeshAtlas } from "./MeshAtlas.ts";
import { Particle } from "./Particle.ts";
import { Pickup } from "./Pickup.ts";

export class Coin extends Pickup {
	private amount: number;
	private meshAtlas: MeshAtlas;
	private particleTimer: number = 0;
	private particleSpawnRate: number = 0.1; // Spawn particles every 0.1 seconds

	private static readonly MERGE_DISTANCE = 1.0; // Distance to merge coins

	constructor(
		meshAtlas: MeshAtlas,
		amount: number,
		x: number,
		y: number,
		z: number,
	) {
		// Select initial mesh based on amount
		const mesh = Coin.getMeshForAmount(meshAtlas, amount);
		super(mesh, x, y, z);

		this.amount = amount;
		this.meshAtlas = meshAtlas;

		// Scale coins to be smaller
		this.setUniformScale(0.5);
	}

	/**
	 * Get the appropriate mesh for the given coin amount
	 */
	private static getMeshForAmount(meshAtlas: MeshAtlas, amount: number) {
		if (amount === 1) {
			return meshAtlas.coin!;
		}
		if (amount < 5) {
			return meshAtlas.coinStackSmall!;
		}
		if (amount < 10) {
			return meshAtlas.coinStackMedium!;
		}
		return meshAtlas.coinStackLarge!;
	}

	/**
	 * Increase the amount of coins in this pickup and update the mesh if needed
	 */
	public addAmount(additionalAmount: number): void {
		this.amount += additionalAmount;
		this.mesh = Coin.getMeshForAmount(this.meshAtlas, this.amount);
	}

	/**
	 * Get the current amount of coins
	 */
	public getAmount(): number {
		return this.amount;
	}

	/**
	 * Override update to add particle effects for stacks
	 */
	public update(deltaTime: number, game: Game): boolean {
		// Call parent update (returns true if should be removed)
		const shouldRemove = super.update(deltaTime, game);
		if (shouldRemove) return true;

		// Spawn glitter particles for stacks (amount > 1)
		if (this.amount > 1 && game.particleSystem) {
			this.particleTimer += deltaTime;

			// Spawn particles at the configured rate
			if (this.particleTimer >= this.particleSpawnRate) {
				this.particleTimer = 0;

				// Spawn 1-2 sparkle particles
				const particleCount = Math.floor(Math.random() * 2) + 1;
				for (let i = 0; i < particleCount; i++) {
					// Random offset around the coin
					const offsetX = (Math.random() - 0.5) * 0.3;
					const offsetZ = (Math.random() - 0.5) * 0.3;
					const offsetY = Math.random() * 0.2;

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

					// Gold/yellow color
					const color = vec3.fromValues(1.0, 0.9, 0.3);
					const endColor = vec3.fromValues(1.0, 0.8, 0.2);

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
		game.coins += this.amount;

		// Spawn collection particles flying towards the player
		if (game.particleSystem && game.player) {
			const particleCount = Math.min(this.amount * 3, 30); // 3 particles per coin, max 30
			const playerPos = game.player.position;

			for (let i = 0; i < particleCount; i++) {
				// Random offset around the coin
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

				// Golden color
				const color = vec3.fromValues(1.0, 0.85, 0.2);
				const endColor = vec3.fromValues(1.0, 0.9, 0.4);

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
				);

				game.particleSystem.spawn(particle);
			}
		}
	}

	/**
	 * Static spawn method that checks for nearby coins and merges if found
	 * @param game The game instance
	 * @param meshAtlas The mesh atlas containing coin meshes
	 * @param amount The amount of coins to spawn
	 * @param x X position
	 * @param y Y position
	 * @param z Z position
	 * @returns The coin that was spawned or merged into
	 */
	public static spawn(
		game: Game,
		meshAtlas: MeshAtlas,
		amount: number,
		x: number,
		y: number,
		z: number,
	): Coin {
		// Check if there's already a coin nearby
		for (const pickup of game.pickups) {
			if (pickup instanceof Coin) {
				const dx = pickup.position[0] - x;
				const dz = pickup.position[2] - z;
				const distance = Math.sqrt(dx * dx + dz * dz);

				if (distance < Coin.MERGE_DISTANCE) {
					// Merge into existing coin
					pickup.addAmount(amount);
					return pickup;
				}
			}
		}

		// No nearby coin found, create a new one
		const coin = new Coin(meshAtlas, amount, x, y, z);
		game.pickups.push(coin);
		game.entities.push(coin);
		return coin;
	}
}
