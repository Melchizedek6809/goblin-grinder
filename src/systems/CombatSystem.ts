import type { Enemy } from "../enemies/Enemy.ts";
import type { Explosion } from "../weapons/Explosion.ts";
import type { ParticleSystem } from "../vfx/ParticleSystem.ts";

/**
 * Manages combat-related systems including explosions and damage
 */
export class CombatSystem {
	private explosions: Explosion[] = [];

	/**
	 * Register an explosion to be processed
	 */
	addExplosion(explosion: Explosion): void {
		this.explosions.push(explosion);
	}

	/**
	 * Process all pending explosions (deal damage and spawn particles)
	 * Explosions are cleared after processing
	 */
	processExplosions(enemies: Enemy[], particleSystem: ParticleSystem): void {
		for (const explosion of this.explosions) {
			explosion.dealDamage(enemies);
			explosion.spawnParticles(particleSystem);
		}

		// Clear explosions after processing
		this.explosions = [];
	}

	/**
	 * Clear all pending explosions
	 */
	clear(): void {
		this.explosions = [];
	}

	/**
	 * Get the number of pending explosions
	 */
	getPendingExplosionCount(): number {
		return this.explosions.length;
	}
}
