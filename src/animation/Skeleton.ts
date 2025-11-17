import { mat4, quat, vec3 } from "gl-matrix";
import type { Node, Skin } from "../assets/GLBLoader.ts";

export interface Joint {
	name?: string;
	parentIndex: number; // -1 for root joints
	children: number[]; // Indices of child joints
	localTransform: mat4; // Local transform (relative to parent)
	worldTransform: mat4; // World transform (computed)
	inverseBindMatrix: mat4; // Inverse bind matrix for skinning
}

export class Skeleton {
	public joints: Joint[];
	public jointMatrices: mat4[]; // Final matrices for shader (worldTransform * inverseBindMatrix)

	constructor(nodes: Node[], skin: Skin, accessorData: mat4[] | null) {
		this.joints = [];
		this.jointMatrices = [];

		// Get inverse bind matrices if available
		const inverseBindMatrices: mat4[] =
			accessorData || this.createIdentityMatrices(skin.joints.length);

		// Build joint hierarchy from nodes
		for (let i = 0; i < skin.joints.length; i++) {
			const nodeIndex = skin.joints[i];
			const node = nodes[nodeIndex];

			// Calculate local transform from node data
			const localTransform = this.nodeToMatrix(node);

			// Find parent joint index (-1 if root)
			let parentIndex = -1;
			for (let j = 0; j < skin.joints.length; j++) {
				const parentNodeIndex = skin.joints[j];
				const parentNode = nodes[parentNodeIndex];
				if (
					parentNode.children &&
					parentNode.children.includes(nodeIndex)
				) {
					parentIndex = j;
					break;
				}
			}

			// Find children joint indices
			const children: number[] = [];
			if (node.children) {
				for (let j = 0; j < skin.joints.length; j++) {
					if (node.children.includes(skin.joints[j])) {
						children.push(j);
					}
				}
			}

			this.joints.push({
				name: node.name,
				parentIndex,
				children,
				localTransform,
				worldTransform: mat4.create(),
				inverseBindMatrix: inverseBindMatrices[i],
			});

			this.jointMatrices.push(mat4.create());
		}

		// Calculate initial world transforms
		this.updateWorldTransforms();
	}

	/**
	 * Convert GLTF node to transformation matrix
	 */
	private nodeToMatrix(node: Node): mat4 {
		const matrix = mat4.create();

		if (node.matrix) {
			// Use matrix directly if provided
			mat4.copy(matrix, node.matrix as unknown as mat4);
		} else {
			// Build from TRS (Translation, Rotation, Scale)
			const translation = node.translation
				? vec3.fromValues(
						node.translation[0],
						node.translation[1],
						node.translation[2],
					)
				: vec3.fromValues(0, 0, 0);

			const rotation = node.rotation
				? quat.fromValues(
						node.rotation[0],
						node.rotation[1],
						node.rotation[2],
						node.rotation[3],
					)
				: quat.create();

			const scale = node.scale
				? vec3.fromValues(node.scale[0], node.scale[1], node.scale[2])
				: vec3.fromValues(1, 1, 1);

			mat4.fromRotationTranslationScale(matrix, rotation, translation, scale);
		}

		return matrix;
	}

	/**
	 * Create identity matrices as fallback
	 */
	private createIdentityMatrices(count: number): mat4[] {
		const matrices: mat4[] = [];
		for (let i = 0; i < count; i++) {
			matrices.push(mat4.create());
		}
		return matrices;
	}

	/**
	 * Update world transforms for all joints based on local transforms
	 */
	updateWorldTransforms(): void {
		// Process joints in order (parents before children)
		for (let i = 0; i < this.joints.length; i++) {
			const joint = this.joints[i];

			if (joint.parentIndex === -1) {
				// Root joint - world transform is same as local
				mat4.copy(joint.worldTransform, joint.localTransform);
			} else {
				// Child joint - multiply parent world by local
				const parent = this.joints[joint.parentIndex];
				mat4.multiply(
					joint.worldTransform,
					parent.worldTransform,
					joint.localTransform,
				);
			}

			// Calculate final joint matrix for shader
			mat4.multiply(
				this.jointMatrices[i],
				joint.worldTransform,
				joint.inverseBindMatrix,
			);
		}
	}

	/**
	 * Set local transform for a joint (used by animation system)
	 */
	setJointLocalTransform(jointIndex: number, transform: mat4): void {
		if (jointIndex >= 0 && jointIndex < this.joints.length) {
			mat4.copy(this.joints[jointIndex].localTransform, transform);
		}
	}

	/**
	 * Get joint index by name
	 */
	getJointIndexByName(name: string): number {
		return this.joints.findIndex((joint) => joint.name === name);
	}
}
