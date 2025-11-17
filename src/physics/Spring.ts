import { vec3 } from "gl-matrix";

const diff = vec3.create();
const accel = vec3.create();
const move = vec3.create();

/**
 * Apply spring physics to move current toward target with smooth overshoot
 * @param current - Current position/value to update
 * @param target - Target position/value to move towards
 * @param velocity - Current velocity (modified in-place)
 * @param stiffness - Spring stiffness (higher = faster movement, more overshoot)
 * @param damping - Velocity damping factor (0-1, lower = more oscillation)
 * @param deltaTime - Time step
 */
export function applySpring(
	current: vec3,
	target: vec3,
	velocity: vec3,
	stiffness: number,
	damping: number,
	deltaTime: number,
): void {
	// Calculate difference between target and current position
	vec3.subtract(diff, target, current);

	// Apply spring force (acceleration = stiffness * distance)
	vec3.scale(accel, diff, stiffness * deltaTime);
	vec3.add(velocity, velocity, accel);

	// Apply damping to velocity
	vec3.scale(velocity, velocity, damping);

	// Update position based on velocity
	vec3.scale(move, velocity, deltaTime);
	vec3.add(current, current, move);
}
