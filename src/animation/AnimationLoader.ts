import { mat4 } from "gl-matrix";
import type { GLTFData } from "../assets/GLBLoader.ts";
import { Animation } from "./Animation.ts";
import { Skeleton } from "./Skeleton.ts";

/**
 * Helper class to load animations and skeletons from GLTF data
 */
export class AnimationLoader {
	/**
	 * Create a skeleton from GLTF skin data
	 */
	static createSkeleton(
		gltfData: GLTFData,
		skinIndex: number,
		getAccessorData: (accessorIndex: number) => Float32Array,
	): Skeleton {
		const skin = gltfData.skins[skinIndex];
		if (!skin) {
			throw new Error(`Skin ${skinIndex} not found`);
		}

		// Get inverse bind matrices if available
		let inverseBindMatrices: mat4[] | null = null;
		if (skin.inverseBindMatrices !== undefined) {
			const data = getAccessorData(skin.inverseBindMatrices);
			// Convert Float32Array to mat4 array
			inverseBindMatrices = [];
			for (let i = 0; i < skin.joints.length; i++) {
				const offset = i * 16;
				const matrix = mat4.fromValues(
					data[offset + 0],
					data[offset + 1],
					data[offset + 2],
					data[offset + 3],
					data[offset + 4],
					data[offset + 5],
					data[offset + 6],
					data[offset + 7],
					data[offset + 8],
					data[offset + 9],
					data[offset + 10],
					data[offset + 11],
					data[offset + 12],
					data[offset + 13],
					data[offset + 14],
					data[offset + 15],
				);
				inverseBindMatrices.push(matrix);
			}
		}

		return new Skeleton(gltfData.nodes, skin, inverseBindMatrices);
	}

	/**
	 * Create all animations from GLTF animation data
	 */
	static createAnimations(
		gltfData: GLTFData,
		skinIndex: number,
		getAccessorData: (accessorIndex: number) => Float32Array,
		targetSkeleton?: { nodes: GLTFData["nodes"]; joints: number[] },
	): Animation[] {
		const skin = targetSkeleton
			? { joints: targetSkeleton.joints }
			: gltfData.skins[skinIndex];
		if (!skin) {
			throw new Error(`Skin ${skinIndex} not found`);
		}

		// Build lookup from joint name -> joint index on the target skeleton so we can
		// remap animations that live in a different GLB file.
		const jointNameToIndex = new Map<string, number>();
		const targetNodes = targetSkeleton ? targetSkeleton.nodes : gltfData.nodes;
		for (let i = 0; i < skin.joints.length; i++) {
			const nodeIndex = skin.joints[i];
			const node = targetNodes[nodeIndex];
			if (node?.name) {
				jointNameToIndex.set(node.name, i);
			}
		}

		const animations: Animation[] = [];

		for (const animClip of gltfData.animations) {
			const animation = new Animation(
				animClip,
				gltfData.nodes,
				skin.joints, // Joint indices mapping
				jointNameToIndex,
				getAccessorData,
			);
			animations.push(animation);
		}

		return animations;
	}

	/**
	 * Helper to get a function that can access GLTF accessor data
	 * This needs access to the internal GLTF structure and binary data
	 */
	static createAccessorGetter(
		gltf: any, // Internal GLTF structure
		binaryData: ArrayBuffer | null,
	): (accessorIndex: number) => Float32Array {
		return (accessorIndex: number): Float32Array => {
			if (!gltf.accessors || !gltf.bufferViews || !binaryData) {
				throw new Error("Missing required GLTF data");
			}

			const accessor = gltf.accessors[accessorIndex];
			const bufferView = gltf.bufferViews[accessor.bufferView ?? 0];

			const offset = (bufferView.byteOffset ?? 0) + (accessor.byteOffset ?? 0);
			const componentCount = this.getComponentCount(accessor.type);
			const elementSize = this.getComponentSize(accessor.componentType);
			const elementCount = accessor.count * componentCount;

			// Read data based on component type
			const arrayBuffer = binaryData.slice(
				offset,
				offset + elementCount * elementSize,
			);

			switch (accessor.componentType) {
				case 5126: // FLOAT
					return new Float32Array(arrayBuffer);
				case 5123: // UNSIGNED_SHORT
					return new Float32Array(new Uint16Array(arrayBuffer));
				case 5121: // UNSIGNED_BYTE
					return new Float32Array(new Uint8Array(arrayBuffer));
				default:
					throw new Error(
						`Unsupported component type: ${accessor.componentType}`,
					);
			}
		};
	}

	private static getComponentCount(type: string): number {
		switch (type) {
			case "SCALAR":
				return 1;
			case "VEC2":
				return 2;
			case "VEC3":
				return 3;
			case "VEC4":
				return 4;
			case "MAT2":
				return 4;
			case "MAT3":
				return 9;
			case "MAT4":
				return 16;
			default:
				throw new Error(`Unknown accessor type: ${type}`);
		}
	}

	private static getComponentSize(componentType: number): number {
		switch (componentType) {
			case 5120: // BYTE
			case 5121: // UNSIGNED_BYTE
				return 1;
			case 5122: // SHORT
			case 5123: // UNSIGNED_SHORT
				return 2;
			case 5125: // UNSIGNED_INT
			case 5126: // FLOAT
				return 4;
			default:
				throw new Error(`Unknown component type: ${componentType}`);
		}
	}
}
