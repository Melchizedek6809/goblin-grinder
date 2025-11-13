import { vec3 } from "gl-matrix";
import { Projectile } from "./Projectile";
import { Particle } from "./Particle";
import { Explosion } from "./Explosion";
import type { Enemy } from "./Enemy";
import type { ParticleSystem } from "./ParticleSystem";

export class Fireball extends Projectile {
	private particleSystem: ParticleSystem;
	private spawnExplosion: (explosion: Explosion) => void;
	private directDamage: number;
	private explosionRadius: number;
	private explosionDamage: number;
	private particleSpawnTimer = 0;

	constructor(
		position: vec3,
		velocity: vec3,
		particleSystem: ParticleSystem,
		spawnExplosion: (explosion: Explosion) => void,
		directDamage = 25,
		explosionRadius = 1.5,
		explosionDamage = 15,
	) {
		super(position, velocity, 1.5); // 1.5 second max lifetime (~8 units range at 5.5 speed)
		this.particleSystem = particleSystem;
		this.spawnExplosion = spawnExplosion;
		this.directDamage = directDamage;
		this.explosionRadius = explosionRadius;
		this.explosionDamage = explosionDamage;
	}

	onHit(enemy: Enemy): boolean {
		// Deal direct damage to the hit enemy
		enemy.takeDamage(this.directDamage);

		// Create explosion at impact point
		this.createExplosion();

		// Destroy the fireball
		return true;
	}

	onExpire(): void {
		// Explode when lifetime expires
		this.createExplosion();
	}

	onHitObstacle(): boolean {
		// Explode when hitting obstacles
		this.createExplosion();
		return true;
	}

	private createExplosion(): void {
		const explosion = new Explosion(
			this.position,
			this.explosionRadius,
			this.explosionDamage,
		);
		this.spawnExplosion(explosion);
	}

	render(deltaTime: number): void {
		if (!this.isAlive) return;

		// Spawn particles continuously to create a cluster effect
		this.particleSpawnTimer += deltaTime;
		if (this.particleSpawnTimer >= 0.016) {
			// Spawn at ~60fps
			this.particleSpawnTimer = 0;

			// Fire colors (red, orange, yellow)
			const colors = [
				vec3.fromValues(1.0, 0.3, 0.1), // Red-orange
				vec3.fromValues(1.0, 0.5, 0.1), // Orange
				vec3.fromValues(1.0, 0.8, 0.2), // Yellow-orange
			];
			const color = colors[Math.floor(Math.random() * colors.length)];

			// Spawn particles with slight random offset for cluster effect
			const offset = vec3.fromValues(
				(Math.random() - 0.5) * 0.2,
				(Math.random() - 0.5) * 0.2,
				(Math.random() - 0.5) * 0.2,
			);
			const particlePos = vec3.create();
			vec3.add(particlePos, this.position, offset);

			// Small random velocity (particles trail behind)
			const particleVel = vec3.fromValues(
				(Math.random() - 0.5) * 0.5,
				(Math.random() - 0.5) * 0.5,
				(Math.random() - 0.5) * 0.5,
			);

			this.particleSystem.spawn(
				new Particle(
					particlePos,
					particleVel,
					color,
					15.0 + Math.random() * 10.0, // size 15-25
					0.3 + Math.random() * 0.2, // lifetime 0.3-0.5s
					2.0, // slight gravity
				),
			);
		}
	}
}
