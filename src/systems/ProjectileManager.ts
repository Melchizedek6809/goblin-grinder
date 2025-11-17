import { vec3 } from "gl-matrix";
import type { Enemy } from "../enemies/Enemy.ts";
import type { Physics } from "../physics/Physics.ts";
import type { Projectile } from "../weapons/Projectile.ts";

/**
 * Manages all projectiles in the game
 * Handles updates, collision detection, and cleanup
 */
export class ProjectileManager {
	private projectiles: Projectile[] = [];

	/**
	 * Add a new projectile to the scene
	 */
	spawn(projectile: Projectile): void {
		this.projectiles.push(projectile);
	}

	/**
	 * Update all projectiles and check for collisions
	 * @param deltaTime Time since last update
	 * @param enemies List of enemies to check collisions against
	 * @param physics Physics system for obstacle collision detection
	 */
	update(deltaTime: number, enemies: Enemy[], physics: Physics): void {
		for (const projectile of this.projectiles) {
			projectile.update(deltaTime);

			// Check collision with static objects (trees, rocks) - XZ plane only
			const hitObstacle = physics.overlapSphere(
				vec3.fromValues(projectile.position[0], -0.5, projectile.position[2]),
				0.2, // smaller projectile collision radius
				3, // projectile layer
				0x00000004, // only collide with layer 2 (environment)
			);

			if (hitObstacle) {
				const shouldDestroy = projectile.onHitObstacle();
				if (shouldDestroy) {
					projectile.destroy();
					continue; // Skip enemy check if destroyed
				}
			}

			// Check collision with enemies - XZ plane only
			for (const enemy of enemies) {
				if (enemy.isDead()) continue; // Skip dead enemies

				// Calculate XZ distance only
				const dx = projectile.position[0] - enemy.getPosition()[0];
				const dz = projectile.position[2] - enemy.getPosition()[2];
				const distXZ = Math.sqrt(dx * dx + dz * dz);

				// Smaller collision radius: enemy (0.25) + projectile (0.2) = 0.45
				if (distXZ < 0.5) {
					const shouldDestroy = projectile.onHit(enemy);
					if (shouldDestroy) {
						projectile.destroy();
					}
					break; // Only hit one enemy
				}
			}
		}

		// Remove dead projectiles
		this.projectiles = this.projectiles.filter((p) => p.isAlive);
	}

	/**
	 * Render all projectiles (update their particle effects)
	 */
	render(deltaTime: number): void {
		for (const projectile of this.projectiles) {
			projectile.render(deltaTime);
		}
	}

	/**
	 * Clear all projectiles
	 */
	clear(): void {
		this.projectiles = [];
	}

	/**
	 * Get all active projectiles (read-only)
	 */
	getProjectiles(): ReadonlyArray<Projectile> {
		return this.projectiles;
	}

	/**
	 * Get the number of active projectiles
	 */
	getCount(): number {
		return this.projectiles.length;
	}
}
