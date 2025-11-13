import { vec3 } from "gl-matrix";

export class Particle {
	position: vec3;
	velocity: vec3;
	color: vec3;
	size: number;
	lifetime: number;
	maxLifetime: number;
	gravity: number;

	constructor(
		position: vec3,
		velocity: vec3,
		color: vec3,
		size: number,
		lifetime: number,
		gravity = 0.0,
	) {
		this.position = vec3.clone(position);
		this.velocity = vec3.clone(velocity);
		this.color = vec3.clone(color);
		this.size = size;
		this.lifetime = lifetime;
		this.maxLifetime = lifetime;
		this.gravity = gravity;
	}

	update(deltaTime: number): boolean {
		// Update lifetime
		this.lifetime -= deltaTime;
		if (this.lifetime <= 0) {
			return false; // Particle is dead
		}

		// Apply gravity
		if (this.gravity !== 0) {
			this.velocity[1] -= this.gravity * deltaTime;
		}

		// Update position
		vec3.scaleAndAdd(this.position, this.position, this.velocity, deltaTime);

		return true; // Particle is still alive
	}

	getAlpha(): number {
		// Fade out as lifetime decreases
		return Math.max(0, this.lifetime / this.maxLifetime);
	}
}
