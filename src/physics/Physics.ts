import { vec3 } from "gl-matrix";
import type {
	Collider,
	SphereCollider,
} from "./Collider.ts";
import { shouldCollide } from "./Collider.ts";

/**
 * Simple physics system for collision detection and resolution
 * Currently supports sphere-sphere collisions
 */
export class Physics {
	private colliders: Collider[] = [];

	/**
	 * Register a collider with the physics system
	 */
	addCollider(collider: Collider): void {
		if (!this.colliders.includes(collider)) {
			this.colliders.push(collider);
		}
	}

	/**
	 * Unregister a collider from the physics system
	 */
	removeCollider(collider: Collider): void {
		const index = this.colliders.indexOf(collider);
		if (index >= 0) {
			this.colliders.splice(index, 1);
		}
	}

	/**
	 * Get all registered colliders (useful for debug rendering)
	 */
	getAllColliders(): Collider[] {
		return this.colliders;
	}

	/**
	 * Check if two sphere colliders intersect
	 */
	private checkSphereSphere(
		a: SphereCollider,
		b: SphereCollider,
	): boolean {
		const dx = a.center[0] - b.center[0];
		const dy = a.center[1] - b.center[1];
		const dz = a.center[2] - b.center[2];
		const distSq = dx * dx + dy * dy + dz * dz;
		const radiusSum = a.radius + b.radius;
		return distSq < radiusSum * radiusSum;
	}

	/**
	 * Get all colliders that intersect with the given collider
	 */
	getCollisions(collider: Collider): Collider[] {
		const results: Collider[] = [];

		for (const other of this.colliders) {
			if (other === collider) continue;
			if (!shouldCollide(collider, other)) continue;

			// Type-specific collision check
			if (collider.type === "sphere" && other.type === "sphere") {
				if (
					this.checkSphereSphere(
						collider as SphereCollider,
						other as SphereCollider,
					)
				) {
					results.push(other);
				}
			}
			// Future: add capsule and box collision checks here
		}

		return results;
	}

	/**
	 * Sweep a sphere from start to end position and resolve collisions
	 * Returns the furthest safe position the sphere can move to
	 *
	 * This is useful for character movement - you can move the character
	 * as far as possible without penetrating obstacles
	 */
	sweepSphere(
		_start: vec3,
		end: vec3,
		radius: number,
		layer = 0,
		mask = 0xffffffff,
	): vec3 {
		// Create a temporary test collider at the destination
		const testCollider: SphereCollider = {
			type: "sphere",
			center: vec3.clone(end),
			radius,
			enabled: true,
			layer,
			mask,
		};

		// Check for collisions at destination
		const collisions = this.getCollisions(testCollider);

		// If no collisions, we can move to the destination
		if (collisions.length === 0) {
			return vec3.clone(end);
		}

		// Resolve collisions by pushing away from obstacles
		const result = vec3.clone(end);

		for (const col of collisions) {
			if (col.type === "sphere") {
				const sphere = col as SphereCollider;

				// Calculate direction from obstacle to player (in XZ plane)
				let dx = result[0] - sphere.center[0];
				let dz = result[2] - sphere.center[2];
				const dist = Math.sqrt(dx * dx + dz * dz);

				// Avoid division by zero
				if (dist < 0.0001) {
					dx = 1;
					dz = 0;
				} else {
					dx /= dist;
					dz /= dist;
				}

				// Calculate required separation distance
				const requiredDist = radius + sphere.radius;
				const overlap = requiredDist - dist;

				// Push away if overlapping
				if (overlap > 0) {
					result[0] += dx * overlap;
					result[2] += dz * overlap;
				}
			}
			// Future: handle capsule and box collisions
		}

		return result;
	}

	/**
	 * Simple overlap test - check if a sphere at a given position would collide
	 * Useful for checking if a spawn position is valid
	 */
	overlapSphere(
		center: vec3,
		radius: number,
		layer = 0,
		mask = 0xffffffff,
	): boolean {
		const testCollider: SphereCollider = {
			type: "sphere",
			center,
			radius,
			enabled: true,
			layer,
			mask,
		};

		return this.getCollisions(testCollider).length > 0;
	}

	/**
	 * Find the closest collider to a given point
	 * Returns null if no colliders exist
	 */
	findClosestCollider(point: vec3): Collider | null {
		let closest: Collider | null = null;
		let closestDistSq = Number.POSITIVE_INFINITY;

		for (const collider of this.colliders) {
			if (!collider.enabled) continue;

			const dx = collider.center[0] - point[0];
			const dy = collider.center[1] - point[1];
			const dz = collider.center[2] - point[2];
			const distSq = dx * dx + dy * dy + dz * dz;

			if (distSq < closestDistSq) {
				closestDistSq = distSq;
				closest = collider;
			}
		}

		return closest;
	}
}
