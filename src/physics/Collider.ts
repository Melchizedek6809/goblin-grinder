import type { vec3 } from "gl-matrix";

/**
 * Base interface for all collider types
 */
export interface Collider {
	readonly type: "sphere" | "capsule" | "box";

	/**
	 * World-space center position of the collider
	 */
	center: vec3;

	/**
	 * Whether this collider is active for collision detection
	 */
	enabled: boolean;

	/**
	 * Collision layer this collider belongs to (0-31)
	 * Common layers: 0=player, 1=enemy, 2=environment, 3=projectile
	 */
	layer: number;

	/**
	 * Bitmask of layers this collider can collide with
	 * Example: 0xFFFFFFFE = collide with all layers except 0
	 */
	mask: number;

	/**
	 * Optional tag for identification/filtering
	 */
	tag?: string;
}

/**
 * Sphere collider - most efficient for 3D collision detection
 * Perfect for characters, projectiles, and round objects
 */
export interface SphereCollider extends Collider {
	type: "sphere";
	radius: number;
}

/**
 * Capsule collider - good for characters (standing pill shape)
 * Not yet implemented, but interface is here for future use
 */
export interface CapsuleCollider extends Collider {
	type: "capsule";
	radius: number;
	height: number;
}

/**
 * Box collider - axis-aligned bounding box
 * Not yet implemented, but interface is here for future use
 */
export interface BoxCollider extends Collider {
	type: "box";
	halfExtents: vec3; // Half-size in each dimension
}

/**
 * Create a sphere collider
 */
export function createSphereCollider(
	center: vec3,
	radius: number,
	layer = 0,
	mask = 0xffffffff,
): SphereCollider {
	return {
		type: "sphere",
		center,
		radius,
		enabled: true,
		layer,
		mask,
	};
}

/**
 * Check if a collider should collide with another based on layer masks
 */
export function shouldCollide(a: Collider, b: Collider): boolean {
	if (!a.enabled || !b.enabled) return false;

	// Check if A's mask includes B's layer AND B's mask includes A's layer
	const aCanHitB = (a.mask & (1 << b.layer)) !== 0;
	const bCanHitA = (b.mask & (1 << a.layer)) !== 0;

	return aCanHitB && bCanHitA;
}
