import { vec3 } from "gl-matrix";
import type { Enemy } from "../enemies/Enemy.ts";
import { Explosion } from "./Explosion.ts";
import { Projectile } from "./Projectile.ts";
import { Particle } from "../vfx/Particle.ts";
import type { ParticleSystem } from "../vfx/ParticleSystem.ts";

export class Fireball extends Projectile {
	private particleSystem: ParticleSystem;
	private spawnExplosion: (explosion: Explosion) => void;
	private directDamage: number;
	private explosionRadius: number;
	private explosionDamage: number;
	private particleSpawnTimer = 0;
	private wiggleTime = 0;
	private wiggleOffset = vec3.create();

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

		// Update wiggle effect for smooth random movement
		this.wiggleTime += deltaTime;
		const wiggleAmount = 0.2; // How much the fireball wiggles
		this.wiggleOffset[0] = Math.sin(this.wiggleTime * 5.3) * wiggleAmount;
		this.wiggleOffset[1] = Math.sin(this.wiggleTime * 6.7) * wiggleAmount;
		this.wiggleOffset[2] = Math.cos(this.wiggleTime * 4.9) * wiggleAmount;

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

			// Spawn multiple fire particles per frame for a more intense effect
			for (let i = 0; i < 3; i++) {
				const color = colors[Math.floor(Math.random() * colors.length)];

				// Spawn particles with slight random offset for cluster effect
				const offset = vec3.fromValues(
					(Math.random() - 0.5) * 0.2,
					(Math.random() - 0.5) * 0.2,
					(Math.random() - 0.5) * 0.2,
				);
				const particlePos = vec3.create();
				vec3.add(particlePos, this.position, offset);
				vec3.add(particlePos, particlePos, this.wiggleOffset);

				// Small random velocity (particles trail behind)
				const particleVel = vec3.fromValues(
					(Math.random() - 0.5) * 0.7,
					(Math.random() - 0.5) * 0.5,
					(Math.random() - 0.5) * 0.7,
				);

				this.particleSystem.spawn(
					new Particle(
						particlePos,
						particleVel,
						color,
						18.0 + Math.random() * 8.0, // size 15-25
						0.2 + Math.random() * 0.2, // lifetime 0.3-0.5s
						2.0, // slight gravity
						undefined, // no end color
						undefined, // no end size
						"additive", // additive blending for fire
					),
				);
			}

			// Spawn smoke particles (fewer, larger, slower)
			for (let i = 0; i < 2; i++) {
				// Spawn with slight random offset
				const offset = vec3.fromValues(
					(Math.random() - 0.5) * 0.15,
					(Math.random() - 0.5) * 0.15,
					(Math.random() - 0.5) * 0.15,
				);
				const particlePos = vec3.create();
				vec3.add(particlePos, this.position, offset);
				vec3.add(particlePos, particlePos, this.wiggleOffset);

				// Slow upward velocity with slight random drift
				const particleVel = vec3.fromValues(
					(Math.random() - 0.5) * 0.3,
					0.3 + Math.random() * 0.3, // Upward velocity
					(Math.random() - 0.5) * 0.3,
				);

				// Smoke colors: start dark gray, fade to light gray
				const startColor = vec3.fromValues(0.3, 0.3, 0.3); // Dark gray
				const endColor = vec3.fromValues(0.6, 0.6, 0.6); // Light gray

				this.particleSystem.spawn(
					new Particle(
						particlePos,
						particleVel,
						startColor,
						1.0 + Math.random() * 4.0, // start size 10-15
						0.6 + Math.random() * 0.6, // lifetime 0.6-0.9s (longer than fire)
						-1.0, // negative gravity (rises up)
						endColor, // fade to lighter color
						25.0 + Math.random() * 10.0, // end size 25-35 (grows larger)
					),
				);
			}
		}
	}
}
