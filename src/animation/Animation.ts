import { quat, vec3 } from "gl-matrix";
import type { AnimationClip, Node } from "../assets/GLBLoader.ts";

interface Channel {
	jointIndex: number;
	path: "translation" | "rotation" | "scale";
	times: Float32Array;
	values: Float32Array;
	componentCount: number;
	interpolation: string;
}

export class Animation {
	public name: string;
	public duration: number; // Animation duration in seconds
	private channels: Channel[];

	constructor(
		animationClip: AnimationClip,
		nodes: Node[],
		jointIndices: number[], // Map node index to joint index
		jointNameToIndex: Map<string, number>,
		getAccessorDataFn: (accessorIndex: number) => Float32Array,
	) {
		this.name = animationClip.name || "Unnamed Animation";
		this.channels = [];
		this.duration = 0;

		// Parse each animation channel
		for (const channel of animationClip.channels) {
			if (channel.target.node === undefined) {
				continue;
			}

			// Find joint index for this node (prefer name match so we can retarget
			// animations that come from separate GLB files).
			let jointIndex = -1;
			const targetNode = nodes[channel.target.node];
			if (targetNode?.name && jointNameToIndex.has(targetNode.name)) {
				jointIndex = jointNameToIndex.get(targetNode.name)!;
			} else {
				jointIndex = jointIndices.indexOf(channel.target.node);
			}
			if (jointIndex === -1) {
				continue; // This channel doesn't target a joint in our skeleton
			}

			// Get sampler data
			const sampler = animationClip.samplers[channel.sampler];
			const times = getAccessorDataFn(sampler.input);
			const values = getAccessorDataFn(sampler.output);

			// Determine component count based on path
			let componentCount = 3;
			if (channel.target.path === "rotation") {
				componentCount = 4; // Quaternions
			}

			// Update duration
			const maxTime = times[times.length - 1];
			if (maxTime > this.duration) {
				this.duration = maxTime;
			}

			this.channels.push({
				jointIndex,
				path: channel.target.path as "translation" | "rotation" | "scale",
				times,
				values,
				componentCount,
				interpolation: sampler.interpolation || "LINEAR",
			});
		}
	}

	/**
	 * Sample the animation at a given time and return joint transforms
	 * Returns an array of [translation, rotation, scale] tuples for each joint
	 */
	sample(time: number): Map<number, { t?: vec3; r?: quat; s?: vec3 }> {
		const transforms = new Map<
			number,
			{ t?: vec3; r?: quat; s?: vec3 }
		>();

		for (const channel of this.channels) {
			// Find keyframe indices for this time
			const { index0, index1, t } = this.findKeyframes(
				channel.times,
				time,
			);

			// Get joint transform (create if doesn't exist)
			if (!transforms.has(channel.jointIndex)) {
				transforms.set(channel.jointIndex, {});
			}
			const transform = transforms.get(channel.jointIndex)!;

			// Interpolate based on path type
			if (channel.path === "translation") {
				transform.t = this.interpolateVec3(
					channel.values,
					index0,
					index1,
					t,
				);
			} else if (channel.path === "rotation") {
				transform.r = this.interpolateQuat(
					channel.values,
					index0,
					index1,
					t,
				);
			} else if (channel.path === "scale") {
				transform.s = this.interpolateVec3(
					channel.values,
					index0,
					index1,
					t,
				);
			}
		}

		return transforms;
	}

	/**
	 * Find keyframe indices for a given time
	 */
	private findKeyframes(
		times: Float32Array,
		time: number,
	): { index0: number; index1: number; t: number } {
		// Loop time within animation duration
		const loopedTime = time % this.duration;

		// Find the two keyframes we're between
		let index0 = 0;
		let index1 = 0;

		for (let i = 0; i < times.length - 1; i++) {
			if (loopedTime >= times[i] && loopedTime < times[i + 1]) {
				index0 = i;
				index1 = i + 1;
				break;
			}
		}

		// If we're past the last keyframe, use the last keyframe
		if (loopedTime >= times[times.length - 1]) {
			index0 = times.length - 1;
			index1 = times.length - 1;
		}

		// Calculate interpolation factor
		let t = 0;
		if (index0 !== index1) {
			const t0 = times[index0];
			const t1 = times[index1];
			t = (loopedTime - t0) / (t1 - t0);
		}

		return { index0, index1, t };
	}

	/**
	 * Interpolate vec3 (translation or scale)
	 */
	private interpolateVec3(
		values: Float32Array,
		index0: number,
		index1: number,
		t: number,
	): vec3 {
		const v0 = vec3.fromValues(
			values[index0 * 3 + 0],
			values[index0 * 3 + 1],
			values[index0 * 3 + 2],
		);

		if (index0 === index1 || t === 0) {
			return v0;
		}

		const v1 = vec3.fromValues(
			values[index1 * 3 + 0],
			values[index1 * 3 + 1],
			values[index1 * 3 + 2],
		);

		const result = vec3.create();
		vec3.lerp(result, v0, v1, t);
		return result;
	}

	/**
	 * Interpolate quaternion (rotation) using SLERP
	 */
	private interpolateQuat(
		values: Float32Array,
		index0: number,
		index1: number,
		t: number,
	): quat {
		const q0 = quat.fromValues(
			values[index0 * 4 + 0],
			values[index0 * 4 + 1],
			values[index0 * 4 + 2],
			values[index0 * 4 + 3],
		);

		if (index0 === index1 || t === 0) {
			return q0;
		}

		const q1 = quat.fromValues(
			values[index1 * 4 + 0],
			values[index1 * 4 + 1],
			values[index1 * 4 + 2],
			values[index1 * 4 + 3],
		);

		const result = quat.create();
		quat.slerp(result, q0, q1, t);
		return result;
	}
}
