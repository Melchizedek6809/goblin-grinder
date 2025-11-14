import { vec3 } from "gl-matrix";
import type { Enemy } from "../enemies/Enemy.ts";

export abstract class Projectile {
	position: vec3;
	velocity: vec3;
	lifetime: number;
	maxLifetime: number;
	isAlive = true;

	constructor(position: vec3, velocity: vec3, lifetime: number) {
		this.position = vec3.clone(position);
		this.velocity = vec3.clone(velocity);
		this.lifetime = lifetime;
		this.maxLifetime = lifetime;
	}

	update(deltaTime: number): void {
		if (!this.isAlive) return;

		// Update lifetime
		this.lifetime -= deltaTime;
		if (this.lifetime <= 0) {
			this.onExpire();
			this.isAlive = false;
			return;
		}

		// Update position
		vec3.scaleAndAdd(this.position, this.position, this.velocity, deltaTime);
	}

	/**
	 * Called when the projectile hits an enemy
	 * @returns true if the projectile should be destroyed
	 */
	abstract onHit(enemy: Enemy): boolean;

	/**
	 * Called when the projectile expires (lifetime reaches 0)
	 */
	abstract onExpire(): void;

	/**
	 * Called when the projectile hits an obstacle (tree, rock, etc)
	 */
	abstract onHitObstacle(): boolean;

	/**
	 * Render the projectile
	 */
	abstract render(deltaTime: number): void;

	destroy(): void {
		this.isAlive = false;
	}
}
