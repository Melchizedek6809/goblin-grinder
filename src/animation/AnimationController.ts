import { mat4, quat, vec3 } from "gl-matrix";
import { Animation } from "./Animation.ts";
import { Skeleton } from "./Skeleton.ts";

const scratchTranslation = vec3.create();
const scratchRotation = quat.create();
const scratchScale = vec3.fromValues(1, 1, 1);
const scratchMatrix = mat4.create();

interface AnimationState {
	animation: Animation;
	time: number;
	weight: number; // 0-1, used for blending
	loop: boolean;
}

export class AnimationController {
	private skeleton: Skeleton;
	private animations: Map<string, Animation>;
	private currentState: AnimationState | null = null;
	private nextState: AnimationState | null = null;
	private blendTime: number = 0.2; // Seconds to blend between animations
	private blendTimer: number = 0;
	private playbackSpeed: number = 1.0; // Animation playback speed multiplier

	constructor(skeleton: Skeleton, animations: Animation[]) {
		this.skeleton = skeleton;
		this.animations = new Map();

		for (const anim of animations) {
			this.animations.set(anim.name, anim);
		}
	}

	/**
	 * Play an animation
	 * @param name - Name of the animation to play
	 * @param loop - Whether to loop the animation
	 * @param blend - Whether to blend from current animation
	 */
	play(name: string, loop = true, blend = true): void {
		const animation = this.animations.get(name);

		if (!animation) {
			// Log error with available animations
			console.error(`[AnimationController] Animation "${name}" not found!`);
			console.log(
				"[AnimationController] Available animations:",
				Array.from(this.animations.keys()),
			);
			return;
		}

		// If we're already playing or already blending to this animation, don't restart
		if (
			this.currentState?.animation === animation ||
			this.nextState?.animation === animation
		) {
			return;
		}

		const fromName = this.currentState?.animation.name ?? null;

		const newState: AnimationState = {
			animation,
			time: 0,
			weight: blend ? 0 : 1,
			loop,
		};

		if (blend && this.currentState) {
			// Start blending to new animation
			this.nextState = newState;
			this.blendTimer = 0;
			this.currentState.weight = 1;
		} else {
			// Snap to new animation immediately
			this.currentState = newState;
			this.nextState = null;
			this.blendTimer = 0;
		}
	}

	/**
	 * Stop current animation
	 */
	stop(): void {
		this.currentState = null;
		this.nextState = null;
		this.blendTimer = 0;
	}

	/**
	 * Set animation playback speed
	 * @param speed - Speed multiplier (1.0 = normal, 0.5 = half speed, 2.0 = double speed)
	 */
	setPlaybackSpeed(speed: number): void {
		this.playbackSpeed = speed;
	}

	/**
	 * Update animation state and skeleton
	 */
	update(deltaTime: number): void {
		if (!this.currentState) {
			return;
		}

		// Apply playback speed to delta time
		const adjustedDeltaTime = deltaTime * this.playbackSpeed;

		// Update blend timer if blending
		if (this.nextState) {
			this.blendTimer += adjustedDeltaTime;
			const blendFactor = Math.min(this.blendTimer / this.blendTime, 1);

			// Update weights
			this.currentState.weight = 1 - blendFactor;
			this.nextState.weight = blendFactor;

			// If blend is complete, switch to next state
			if (blendFactor >= 1) {
				this.currentState = this.nextState;
				this.nextState = null;
				this.blendTimer = 0;
			}
		}

		// Update current animation time
		this.currentState.time += adjustedDeltaTime;
		if (this.currentState.loop) {
			this.currentState.time %= this.currentState.animation.duration;
		} else {
			this.currentState.time = Math.min(
				this.currentState.time,
				this.currentState.animation.duration,
			);
		}

		// Update next animation time if blending
		if (this.nextState) {
			this.nextState.time += adjustedDeltaTime;
			if (this.nextState.loop) {
				this.nextState.time %= this.nextState.animation.duration;
			}
		}

		// Sample animations and blend
		this.updateSkeleton();
	}

	/**
	 * Update skeleton with blended animation transforms
	 */
	private updateSkeleton(): void {
		if (!this.currentState) {
			return;
		}

		// Sample current animation
		const currentTransforms = this.currentState.animation.sample(
			this.currentState.time,
		);

		// Sample next animation if blending
		let nextTransforms: Map<number, { t?: vec3; r?: quat; s?: vec3 }> | null =
			null;
		if (this.nextState) {
			nextTransforms = this.nextState.animation.sample(this.nextState.time);
		}

		// Apply transforms to skeleton
		for (let i = 0; i < this.skeleton.joints.length; i++) {
			const currentTransform = currentTransforms.get(i);
			const nextTransform = nextTransforms?.get(i);

			// Get default TRS from joint
			const translation = scratchTranslation;
			const rotation = scratchRotation;
			const scale = scratchScale;

			// Extract current TRS from joint's local transform
			mat4.getTranslation(translation, this.skeleton.joints[i].localTransform);
			mat4.getRotation(rotation, this.skeleton.joints[i].localTransform);
			mat4.getScaling(scale, this.skeleton.joints[i].localTransform);

			// Apply current animation transform
			if (currentTransform) {
				if (currentTransform.t) {
					if (nextTransform?.t && this.nextState) {
						// Blend translation
						vec3.lerp(
							translation,
							currentTransform.t,
							nextTransform.t,
							this.nextState.weight,
						);
					} else {
						vec3.copy(translation, currentTransform.t);
					}
				}

				if (currentTransform.r) {
					if (nextTransform?.r && this.nextState) {
						// Blend rotation (SLERP)
						quat.slerp(
							rotation,
							currentTransform.r,
							nextTransform.r,
							this.nextState.weight,
						);
					} else {
						quat.copy(rotation, currentTransform.r);
					}
				}

				if (currentTransform.s) {
					if (nextTransform?.s && this.nextState) {
						// Blend scale
						vec3.lerp(
							scale,
							currentTransform.s,
							nextTransform.s,
							this.nextState.weight,
						);
					} else {
						vec3.copy(scale, currentTransform.s);
					}
				}
			}

			// Build matrix from blended TRS
			const matrix = scratchMatrix;
			mat4.fromRotationTranslationScale(matrix, rotation, translation, scale);

			// Update skeleton joint
			this.skeleton.setJointLocalTransform(i, matrix);
		}

		// Update world transforms and joint matrices
		this.skeleton.updateWorldTransforms();
	}

	/**
	 * Get current animation name
	 */
	getCurrentAnimationName(): string | null {
		return this.currentState?.animation.name || null;
	}

	/**
	 * Get current animation duration (in seconds)
	 */
	getCurrentAnimationDuration(): number | null {
		return this.currentState?.animation.duration ?? null;
	}

	/**
	 * Get current animation time (in seconds)
	 */
	getCurrentAnimationTime(): number {
		return this.currentState?.time ?? 0;
	}

	/**
	 * Check if an animation exists
	 */
	hasAnimation(name: string): boolean {
		return this.animations.has(name);
	}

	/**
	 * Get all available animation names
	 */
	getAnimationNames(): string[] {
		return Array.from(this.animations.keys());
	}
}
