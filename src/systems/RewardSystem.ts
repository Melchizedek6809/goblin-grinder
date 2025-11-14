import type { MeshAtlas } from "../assets/MeshAtlas.ts";
import { Coin } from "../rewards/Coin.ts";
import { HealthPotion } from "../rewards/HealthPotion.ts";
import type { Enemy } from "../enemies/Enemy.ts";
import type { Pickup } from "../rewards/Pickup.ts";
import type { Game } from "../main.ts";
import type { EntityManager } from "./EntityManager.ts";

/**
 * Manages game rewards: score, coins, and pickups
 */
export class RewardSystem {
	private score: number = 0;
	private coins: number = 0;
	private pickups: Pickup[] = [];

	/**
	 * Reset score and coins to zero
	 */
	reset(): void {
		this.score = 0;
		this.coins = 0;
		this.pickups = [];
	}

	/**
	 * Add points to the score
	 */
	addScore(points: number): void {
		this.score += points;
	}

	/**
	 * Add coins to the player's total
	 */
	addCoins(amount: number): void {
		this.coins += amount;
	}

	/**
	 * Get current score
	 */
	getScore(): number {
		return this.score;
	}

	/**
	 * Get current coin count
	 */
	getCoins(): number {
		return this.coins;
	}

	/**
	 * Add a pickup to be managed
	 */
	addPickup(pickup: Pickup): void {
		this.pickups.push(pickup);
	}

	/**
	 * Update all pickups and handle collection
	 * @param deltaTime Time since last update
	 * @param game Game instance (needed for pickup update logic)
	 * @param entityManager Entity manager to remove collected pickups from
	 */
	updatePickups(
		deltaTime: number,
		game: Game,
		entityManager: EntityManager,
	): void {
		const collectedPickups: Pickup[] = [];

		// Update pickups and collect completed ones
		this.pickups = this.pickups.filter((pickup) => {
			const shouldRemove = pickup.update(deltaTime, game);
			if (shouldRemove) {
				collectedPickups.push(pickup);
				return false;
			}
			return true;
		});

		// Remove collected pickup entities from the entity manager
		for (const pickup of collectedPickups) {
			entityManager.removeEntity(pickup);
		}
	}

	/**
	 * Award points and spawn coins for killed enemies
	 * @param enemies List of all enemies
	 * @param game Game instance (for coin spawning)
	 * @param atlas Mesh atlas for coin meshes
	 */
	processEnemyRewards(
		enemies: Enemy[],
		game: Game,
		atlas: MeshAtlas | null,
	): void {
		for (const enemy of enemies) {
			if (enemy.getState() === "death" && !enemy.rewardGranted) {
				enemy.rewardGranted = true;
				this.addScore(100); // 100 points per kill

				if (atlas) {
					const enemyPos = enemy.getPosition();

					// Spawn health potion from killed enemies (2% chance)
					if (Math.random() < 0.05) {
						HealthPotion.spawn(
							game,
							atlas,
							enemyPos[0],
							0.3,
							enemyPos[2],
							true, // Play spawn animation
						);
					} else if (Math.random() < 0.5) {
						const coinAmount = Math.floor(Math.random() * 3) + 1; // 1-3 coins
						Coin.spawn(
							game,
							atlas,
							coinAmount,
							enemyPos[0],
							0.3,
							enemyPos[2],
							true, // Play spawn animation
						);
					}
				}
			}
		}
	}

	/**
	 * Clear all pickups
	 */
	clearPickups(): void {
		this.pickups = [];
	}

	/**
	 * Get all pickups (read-only)
	 */
	getPickups(): ReadonlyArray<Pickup> {
		return this.pickups;
	}

	/**
	 * Get mutable pickups array (for legacy compatibility)
	 * @deprecated Use addPickup() instead
	 */
	getMutablePickups(): Pickup[] {
		return this.pickups;
	}

	/**
	 * Get the number of active pickups
	 */
	getPickupCount(): number {
		return this.pickups.length;
	}
}
