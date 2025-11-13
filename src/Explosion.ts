import { vec3 } from "gl-matrix";
import type { Enemy } from "./Enemy";
import type { ParticleSystem } from "./ParticleSystem";

export class Explosion {
	position: vec3;
	radius: number;
	damage: number;
	hasDealtDamage = false;

	constructor(position: vec3, radius: number, damage: number) {
		this.position = vec3.clone(position);
		this.radius = radius;
		this.damage = damage;
	}

	dealDamage(enemies: Enemy[]): void {
		if (this.hasDealtDamage) return;

		// Find all enemies within radius and damage them
		for (const enemy of enemies) {
			const dist = vec3.distance(this.position, enemy.getPosition());
			if (dist <= this.radius) {
				enemy.takeDamage(this.damage);
			}
		}

		this.hasDealtDamage = true;
	}

	spawnParticles(particleSystem: ParticleSystem): void {
		// Spawn a radial burst of particles
		const color = vec3.fromValues(1.0, 0.5, 0.1); // Orange/fire color

		particleSystem.spawnBurst(
			this.position,
			30, // particle count
			[2.0, 5.0], // speed range
			[20.0, 40.0], // size range
			[0.3, 0.6], // lifetime range
			color,
			5.0, // gravity
		);
	}
}
