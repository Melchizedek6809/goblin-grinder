import type { Player } from "./Player";
import type { Enemy } from "./Enemy";
import type { Projectile } from "./Projectile";
import type { ParticleSystem } from "./ParticleSystem";
import type { Explosion } from "./Explosion";

export abstract class Weapon {
	protected tickCounter = 0;

	/**
	 * Update the weapon. Called every fixed update tick.
	 * @param player The player who owns this weapon
	 * @param enemies List of all enemies
	 * @param spawnProjectile Callback to spawn a projectile
	 * @param particleSystem The particle system for rendering effects
	 * @param spawnExplosion Callback to spawn an explosion
	 */
	abstract update(
		player: Player,
		enemies: Enemy[],
		spawnProjectile: (projectile: Projectile) => void,
		particleSystem: ParticleSystem,
		spawnExplosion: (explosion: Explosion) => void,
	): void;

	protected incrementTick(): void {
		this.tickCounter++;
	}
}
