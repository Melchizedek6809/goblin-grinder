import { vec3 } from "gl-matrix";
import type { Enemy } from "../enemies/Enemy.ts";
import type { Explosion } from "./Explosion.ts";
import { Fireball } from "./Fireball.ts";
import type { Player } from "../objects/Player.ts";
import type { Projectile } from "./Projectile.ts";
import type { ParticleSystem } from "../vfx/ParticleSystem.ts";
import { Weapon } from "./Weapon.ts";

export class FireballWeapon extends Weapon {
	private baseFireRate = 45; // Fire every 45 ticks (1.5 seconds at 30fps)
	private cooldownTimer = 0;
	private maxRange = 8.0; // Maximum firing range
	private baseDirectDamage = 25;
	private baseExplosionDamage = 15;

	update(
		player: Player,
		enemies: Enemy[],
		spawnProjectile: (projectile: Projectile) => void,
		particleSystem: ParticleSystem,
		spawnExplosion: (explosion: Explosion) => void,
	): void {
		this.incrementTick();
		this.cooldownTimer -= 1;

		// Check if it's time to fire
		if (this.cooldownTimer > 0) {
			return;
		}

		// Find closest enemy
		const closestEnemy = this.findClosestEnemy(player, enemies);
		if (!closestEnemy) {
			return; // No enemies to target
		}

		// Spawn fireball toward enemy
		const playerPos = player.getPosition();
		const enemyPos = closestEnemy.getPosition();

		// Calculate direction
		const direction = vec3.create();
		vec3.subtract(direction, enemyPos, playerPos);
		vec3.normalize(direction, direction);

		// Set velocity (5.5 units/sec)
		const speed = 5.5;
		const velocity = vec3.create();
		vec3.scale(velocity, direction, speed);

		// Spawn position slightly above player
		const spawnPos = vec3.clone(playerPos);
		spawnPos[1] += 0.5;

		// Create fireball with proper dependencies
		const fireball = new Fireball(
			spawnPos,
			velocity,
			particleSystem,
			spawnExplosion,
			player.getModifiedDamage(this.baseDirectDamage),
			undefined,
			player.getModifiedDamage(this.baseExplosionDamage),
		);

		this.cooldownTimer = Math.max(
			1,
			Math.round(player.getModifiedAttackCooldown(this.baseFireRate)),
		);

		spawnProjectile(fireball);
	}

	private findClosestEnemy(player: Player, enemies: Enemy[]): Enemy | null {
		let closestEnemy: Enemy | null = null;
		let closestDistance = Number.POSITIVE_INFINITY;

		const playerPos = player.getPosition();

		for (const enemy of enemies) {
			// Skip dead enemies
			if (enemy.getState() === "death") continue;

			const enemyPos = enemy.getPosition();
			const distance = vec3.distance(playerPos, enemyPos);

			// Only target enemies within max range
			if (distance < closestDistance && distance <= this.maxRange) {
				closestDistance = distance;
				closestEnemy = enemy;
			}
		}

		return closestEnemy;
	}
}
