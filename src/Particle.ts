import { vec3 } from "gl-matrix";

export class Particle {
	position: vec3;
	velocity: vec3;
	color: vec3;
	size: number;
	lifetime: number;
	maxLifetime: number;
	gravity: number;

	// Optional color/size interpolation
	private startColor: vec3;
	private endColor?: vec3;
	private startSize: number;
	private endSize?: number;

	constructor(
		position: vec3,
		velocity: vec3,
		color: vec3,
		size: number,
		lifetime: number,
		gravity = 0.0,
		endColor?: vec3,
		endSize?: number,
	) {
		this.position = vec3.clone(position);
		this.velocity = vec3.clone(velocity);
		this.color = vec3.clone(color);
		this.startColor = vec3.clone(color);
		this.endColor = endColor ? vec3.clone(endColor) : undefined;
		this.size = size;
		this.startSize = size;
		this.endSize = endSize;
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

		// Calculate progress (0 = just spawned, 1 = about to die)
		const progress = 1.0 - this.lifetime / this.maxLifetime;

		// Interpolate color if endColor is provided
		if (this.endColor) {
			vec3.lerp(this.color, this.startColor, this.endColor, progress);
		}

		// Interpolate size if endSize is provided
		if (this.endSize !== undefined) {
			this.size = this.startSize + (this.endSize - this.startSize) * progress;
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
