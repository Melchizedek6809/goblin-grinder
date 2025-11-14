import type { Enemy } from "../enemies/Enemy.ts";
import type { Explosion } from "./Explosion.ts";
import type { Player } from "../objects/Player.ts";
import type { Projectile } from "./Projectile.ts";
import type { ParticleSystem } from "../vfx/ParticleSystem.ts";

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
