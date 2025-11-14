import { vec3 } from "gl-matrix";
import type { Enemy } from "./Enemy";
import type { ParticleSystem } from "./ParticleSystem";

export class Explosion {
	position: vec3;
	radius: number;
	damage: number;
	knockbackForce: number;
	hasDealtDamage = false;

	constructor(
		position: vec3,
		radius: number,
		damage: number,
		knockbackForce = 10.0,
	) {
		this.position = vec3.clone(position);
		this.radius = radius;
		this.damage = damage;
		this.knockbackForce = knockbackForce;
	}

	dealDamage(enemies: Enemy[]): void {
		if (this.hasDealtDamage) return;

		// Find all enemies within radius and damage them
		for (const enemy of enemies) {
			const enemyPos = enemy.getPosition();
			const dist = vec3.distance(this.position, enemyPos);

			if (dist <= this.radius) {
				// Apply damage
				enemy.takeDamage(this.damage);

				// Calculate knockback direction (from explosion to enemy)
				const knockbackDir = vec3.create();
				vec3.subtract(knockbackDir, enemyPos, this.position);

				// Handle edge case where enemy is exactly at explosion center
				const dirLength = vec3.length(knockbackDir);
				if (dirLength > 0.01) {
					vec3.normalize(knockbackDir, knockbackDir);

					// Knockback strength decreases with distance (inverse lerp)
					// At center (dist=0): full force, at edge (dist=radius): 50% force
					const distanceRatio = dist / this.radius;
					const knockbackMultiplier = 1.0 - distanceRatio * 0.5;

					// Apply knockback
					enemy.applyKnockback(
						knockbackDir,
						this.knockbackForce * knockbackMultiplier,
					);
				}
			}
		}

		this.hasDealtDamage = true;
	}

	spawnParticles(particleSystem: ParticleSystem): void {
		// Spawn a radial burst of particles
		const colors = [
			vec3.fromValues(1.0, 0.3, 0.1), // Red-orange
			vec3.fromValues(1.0, 0.5, 0.1), // Orange
			vec3.fromValues(1.0, 0.8, 0.2), // Yellow-orange
		];

		particleSystem.spawnBurst(
			this.position,
			512, // particle count
			[2.0, 4.0], // speed range
			[20.0, 40.0], // size range
			[0.2, 0.4], // lifetime range
			colors,
			-12.0, // gravity
			"additive", // additive blending for explosions
		);
	}
}
