// Generic mesh data structure (format-agnostic)
export interface MeshData {
	vertices: Float32Array; // Interleaved: position(3) + normal(3) + uv(2) + color(3)
	indices: Uint16Array;
	name?: string;
}

// Skinned mesh data with joint/bone information
export interface SkinnedMeshData extends MeshData {
	vertices: Float32Array; // Interleaved: position(3) + normal(3) + uv(2) + color(3) + joints(4) + weights(4)
	joints: Uint16Array; // Joint indices per vertex (vec4 per vertex)
	weights: Float32Array; // Joint weights per vertex (vec4 per vertex)
	skinIndex?: number; // Index into skins array
}

// Animation keyframe data
export interface AnimationSampler {
	input: number; // Accessor index for keyframe times
	output: number; // Accessor index for keyframe values
	interpolation?: string; // "LINEAR", "STEP", "CUBICSPLINE"
}

export interface AnimationChannel {
	sampler: number; // Index into samplers array
	target: {
		node?: number; // Target node/joint index
		path: string; // "translation", "rotation", "scale"
	};
}

export interface AnimationClip {
	name?: string;
	samplers: AnimationSampler[];
	channels: AnimationChannel[];
}

// Skeleton/skin data
export interface Skin {
	name?: string;
	joints: number[]; // Node indices for each joint
	inverseBindMatrices?: number; // Accessor index for inverse bind matrices
	skeleton?: number; // Root node index
}

// Node hierarchy (for skeleton)
export interface Node {
	name?: string;
	children?: number[]; // Child node indices
	translation?: number[]; // [x, y, z]
	rotation?: number[]; // Quaternion [x, y, z, w]
	scale?: number[]; // [x, y, z]
	matrix?: number[]; // 4x4 matrix (column-major)
	mesh?: number; // Mesh index
	skin?: number; // Skin index
}

// Complete GLTF data including animations
export interface GLTFData {
	meshes: MeshData[] | SkinnedMeshData[];
	animations: AnimationClip[];
	skins: Skin[];
	nodes: Node[];
	getAccessorData: (accessorIndex: number) => Float32Array;
}

interface GLTFAccessor {
	bufferView?: number;
	byteOffset?: number;
	componentType: number;
	count: number;
	type: string;
	max?: number[];
	min?: number[];
}

interface GLTFBufferView {
	buffer: number;
	byteOffset?: number;
	byteLength: number;
	byteStride?: number;
	target?: number;
}

interface GLTFPrimitive {
	attributes: {
		POSITION?: number;
		NORMAL?: number;
		TEXCOORD_0?: number;
		COLOR_0?: number;
		JOINTS_0?: number;
		WEIGHTS_0?: number;
	};
	indices?: number;
	mode?: number;
}

interface GLTFMesh {
	name?: string;
	primitives: GLTFPrimitive[];
}

interface GLTFAnimation {
	name?: string;
	samplers: AnimationSampler[];
	channels: AnimationChannel[];
}

interface GLTFSkin {
	name?: string;
	joints: number[];
	inverseBindMatrices?: number;
	skeleton?: number;
}

interface GLTFNode {
	name?: string;
	children?: number[];
	translation?: number[];
	rotation?: number[];
	scale?: number[];
	matrix?: number[];
	mesh?: number;
	skin?: number;
}

interface GLTF {
	accessors?: GLTFAccessor[];
	bufferViews?: GLTFBufferView[];
	meshes?: GLTFMesh[];
	buffers?: { byteLength: number }[];
	animations?: GLTFAnimation[];
	skins?: GLTFSkin[];
	nodes?: GLTFNode[];
}

export class GLBLoader {
	/**
	 * Load a GLB file and extract mesh data (legacy method, no animations)
	 */
	static async load(url: string): Promise<MeshData[]> {
		const response = await fetch(url);
		const arrayBuffer = await response.arrayBuffer();
		return GLBLoader.parse(arrayBuffer);
	}

	/**
	 * Load a GLB file with full animation support
	 */
	static async loadWithAnimations(url: string): Promise<GLTFData> {
		const response = await fetch(url);
		const arrayBuffer = await response.arrayBuffer();
		return GLBLoader.parseWithAnimations(arrayBuffer);
	}

	/**
	 * Parse GLB binary data (legacy method, no animations)
	 */
	static parse(arrayBuffer: ArrayBuffer): MeshData[] {
		const dataView = new DataView(arrayBuffer);

		// Read GLB header (12 bytes)
		const magic = dataView.getUint32(0, true);
		if (magic !== 0x46546c67) {
			throw new Error("Invalid GLB file: wrong magic number");
		}

		const version = dataView.getUint32(4, true);
		if (version !== 2) {
			throw new Error(`Unsupported GLB version: ${version}`);
		}

		const length = dataView.getUint32(8, true);

		// Read JSON chunk
		let offset = 12;
		const jsonChunkLength = dataView.getUint32(offset, true);
		const jsonChunkType = dataView.getUint32(offset + 4, true);

		if (jsonChunkType !== 0x4e4f534a) {
			throw new Error("Invalid GLB: JSON chunk not found");
		}

		const jsonData = new Uint8Array(arrayBuffer, offset + 8, jsonChunkLength);
		const jsonString = new TextDecoder().decode(jsonData);
		const gltf: GLTF = JSON.parse(jsonString);

		offset += 8 + jsonChunkLength;

		// Read binary chunk
		let binaryData: ArrayBuffer | null = null;
		if (offset < length) {
			const binaryChunkLength = dataView.getUint32(offset, true);
			const binaryChunkType = dataView.getUint32(offset + 4, true);

			if (binaryChunkType === 0x004e4942) {
				binaryData = arrayBuffer.slice(
					offset + 8,
					offset + 8 + binaryChunkLength,
				);
			}
		}

		// Extract meshes
		return GLBLoader.extractMeshes(gltf, binaryData);
	}

	/**
	 * Parse GLB binary data with full animation support
	 */
	static parseWithAnimations(arrayBuffer: ArrayBuffer): GLTFData {
		const dataView = new DataView(arrayBuffer);

		// Read GLB header (12 bytes)
		const magic = dataView.getUint32(0, true);
		if (magic !== 0x46546c67) {
			throw new Error("Invalid GLB file: wrong magic number");
		}

		const version = dataView.getUint32(4, true);
		if (version !== 2) {
			throw new Error(`Unsupported GLB version: ${version}`);
		}

		const length = dataView.getUint32(8, true);

		// Read JSON chunk
		let offset = 12;
		const jsonChunkLength = dataView.getUint32(offset, true);
		const jsonChunkType = dataView.getUint32(offset + 4, true);

		if (jsonChunkType !== 0x4e4f534a) {
			throw new Error("Invalid GLB: JSON chunk not found");
		}

		const jsonData = new Uint8Array(arrayBuffer, offset + 8, jsonChunkLength);
		const jsonString = new TextDecoder().decode(jsonData);
		const gltf: GLTF = JSON.parse(jsonString);

		offset += 8 + jsonChunkLength;

		// Read binary chunk
		let binaryData: ArrayBuffer | null = null;
		if (offset < length) {
			const binaryChunkLength = dataView.getUint32(offset, true);
			const binaryChunkType = dataView.getUint32(offset + 4, true);

			if (binaryChunkType === 0x004e4942) {
				binaryData = arrayBuffer.slice(
					offset + 8,
					offset + 8 + binaryChunkLength,
				);
			}
		}

		// Extract all data
		const meshes = GLBLoader.extractSkinnedMeshes(gltf, binaryData);
		const animations = GLBLoader.extractAnimations(gltf, binaryData);
		const skins = GLBLoader.extractSkins(gltf, binaryData);
		const nodes = GLBLoader.extractNodes(gltf);

		// Create accessor getter function
		const getAccessorData = (accessorIndex: number): Float32Array => {
			if (!binaryData) {
				throw new Error("No binary data available");
			}
			return GLBLoader.getAccessorData(accessorIndex, gltf, binaryData);
		};

		return {
			meshes,
			animations,
			skins,
			nodes,
			getAccessorData,
		};
	}

	private static extractMeshes(
		gltf: GLTF,
		binaryData: ArrayBuffer | null,
	): MeshData[] {
		if (!gltf.meshes || !gltf.accessors || !gltf.bufferViews) {
			return [];
		}

		const meshes: MeshData[] = [];

		for (const gltfMesh of gltf.meshes) {
			for (const primitive of gltfMesh.primitives) {
				const meshData = GLBLoader.extractPrimitive(
					primitive,
					gltf,
					binaryData,
					gltfMesh.name,
				);
				if (meshData) {
					meshes.push(meshData);
				}
			}
		}

		return meshes;
	}

	private static extractPrimitive(
		primitive: GLTFPrimitive,
		gltf: GLTF,
		binaryData: ArrayBuffer | null,
		name?: string,
	): MeshData | null {
		if (!binaryData || !gltf.accessors || !gltf.bufferViews) {
			return null;
		}

		// Get position data
		const positionAccessorIndex = primitive.attributes.POSITION;
		if (positionAccessorIndex === undefined) {
			return null;
		}

		const positions = GLBLoader.getAccessorData(
			positionAccessorIndex,
			gltf,
			binaryData,
		);

		// Get normal data (optional)
		let normals: Float32Array | null = null;
		if (primitive.attributes.NORMAL !== undefined) {
			normals = GLBLoader.getAccessorData(
				primitive.attributes.NORMAL,
				gltf,
				binaryData,
			);
		}

		// Get UV data (optional)
		let uvs: Float32Array | null = null;
		if (primitive.attributes.TEXCOORD_0 !== undefined) {
			uvs = GLBLoader.getAccessorData(
				primitive.attributes.TEXCOORD_0,
				gltf,
				binaryData,
			);
		}

		// Get color data (optional)
		let colors: Float32Array | null = null;
		if (primitive.attributes.COLOR_0 !== undefined) {
			colors = GLBLoader.getAccessorData(
				primitive.attributes.COLOR_0,
				gltf,
				binaryData,
			);
		}

		// Get indices (optional)
		let indices: Uint16Array;
		if (primitive.indices !== undefined) {
			const indexData = GLBLoader.getAccessorData(
				primitive.indices,
				gltf,
				binaryData,
			);
			indices = new Uint16Array(indexData);
		} else {
			// Generate indices for non-indexed geometry
			const vertexCount = positions.length / 3;
			indices = new Uint16Array(vertexCount);
			for (let i = 0; i < vertexCount; i++) {
				indices[i] = i;
			}
		}

		// Interleave vertex data: position(3) + normal(3) + uv(2) + color(3)
		const vertexCount = positions.length / 3;
		const vertices = new Float32Array(vertexCount * 11);

		// Calculate components per attribute (to avoid repeated division in loop)
		const componentsPerColor = colors ? colors.length / vertexCount : 0;

		for (let i = 0; i < vertexCount; i++) {
			const vOffset = i * 11;
			const pOffset = i * 3;
			const uvOffset = i * 2;

			// Position
			vertices[vOffset + 0] = positions[pOffset + 0];
			vertices[vOffset + 1] = positions[pOffset + 1];
			vertices[vOffset + 2] = positions[pOffset + 2];

			// Normal (default to up if not provided)
			if (normals) {
				vertices[vOffset + 3] = normals[pOffset + 0];
				vertices[vOffset + 4] = normals[pOffset + 1];
				vertices[vOffset + 5] = normals[pOffset + 2];
			} else {
				vertices[vOffset + 3] = 0;
				vertices[vOffset + 4] = 1;
				vertices[vOffset + 5] = 0;
			}

			// UV coordinates (default to 0,0 if not provided)
			if (uvs) {
				vertices[vOffset + 6] = uvs[uvOffset + 0];
				vertices[vOffset + 7] = uvs[uvOffset + 1];
			} else {
				vertices[vOffset + 6] = 0;
				vertices[vOffset + 7] = 0;
			}

			// Color (default to white if not provided)
			// glTF COLOR_0 can be VEC3 (RGB) or VEC4 (RGBA), we only use RGB
			if (colors) {
				const cOffset = i * componentsPerColor;
				vertices[vOffset + 8] = colors[cOffset + 0];
				vertices[vOffset + 9] = colors[cOffset + 1];
				vertices[vOffset + 10] = colors[cOffset + 2];
			} else {
				vertices[vOffset + 8] = 1.0;
				vertices[vOffset + 9] = 1.0;
				vertices[vOffset + 10] = 1.0;
			}
		}

		return {
			vertices,
			indices,
			name,
		};
	}

	private static extractSkinnedMeshes(
		gltf: GLTF,
		binaryData: ArrayBuffer | null,
	): SkinnedMeshData[] {
		if (!gltf.meshes || !gltf.accessors || !gltf.bufferViews) {
			return [];
		}

		const meshes: SkinnedMeshData[] = [];

		for (const gltfMesh of gltf.meshes) {
			for (const primitive of gltfMesh.primitives) {
				const meshData = GLBLoader.extractSkinnedPrimitive(
					primitive,
					gltf,
					binaryData,
					gltfMesh.name,
				);
				if (meshData) {
					meshes.push(meshData);
				}
			}
		}

		return meshes;
	}

	private static extractSkinnedPrimitive(
		primitive: GLTFPrimitive,
		gltf: GLTF,
		binaryData: ArrayBuffer | null,
		name?: string,
	): SkinnedMeshData | null {
		if (!binaryData || !gltf.accessors || !gltf.bufferViews) {
			return null;
		}

		// Get position data
		const positionAccessorIndex = primitive.attributes.POSITION;
		if (positionAccessorIndex === undefined) {
			return null;
		}

		const positions = GLBLoader.getAccessorData(
			positionAccessorIndex,
			gltf,
			binaryData,
		);

		// Get normal data (optional)
		let normals: Float32Array | null = null;
		if (primitive.attributes.NORMAL !== undefined) {
			normals = GLBLoader.getAccessorData(
				primitive.attributes.NORMAL,
				gltf,
				binaryData,
			);
		}

		// Get UV data (optional)
		let uvs: Float32Array | null = null;
		if (primitive.attributes.TEXCOORD_0 !== undefined) {
			uvs = GLBLoader.getAccessorData(
				primitive.attributes.TEXCOORD_0,
				gltf,
				binaryData,
			);
		}

		// Get color data (optional)
		let colors: Float32Array | null = null;
		if (primitive.attributes.COLOR_0 !== undefined) {
			colors = GLBLoader.getAccessorData(
				primitive.attributes.COLOR_0,
				gltf,
				binaryData,
			);
		}

		// Get joint indices (for skinning)
		let joints: Uint16Array | null = null;
		if (primitive.attributes.JOINTS_0 !== undefined) {
			const jointData = GLBLoader.getAccessorData(
				primitive.attributes.JOINTS_0,
				gltf,
				binaryData,
			);
			joints = new Uint16Array(jointData);
		}

		// Get joint weights (for skinning)
		let weights: Float32Array | null = null;
		if (primitive.attributes.WEIGHTS_0 !== undefined) {
			weights = GLBLoader.getAccessorData(
				primitive.attributes.WEIGHTS_0,
				gltf,
				binaryData,
			);
		}

		// Get indices (optional)
		let indices: Uint16Array;
		if (primitive.indices !== undefined) {
			const indexData = GLBLoader.getAccessorData(
				primitive.indices,
				gltf,
				binaryData,
			);
			indices = new Uint16Array(indexData);
		} else {
			// Generate indices for non-indexed geometry
			const vertexCount = positions.length / 3;
			indices = new Uint16Array(vertexCount);
			for (let i = 0; i < vertexCount; i++) {
				indices[i] = i;
			}
		}

		// Interleave vertex data: position(3) + normal(3) + uv(2) + color(3) + joints(4) + weights(4) = 19 floats
		const vertexCount = positions.length / 3;
		const vertices = new Float32Array(vertexCount * 19);

		// Calculate components per attribute
		const componentsPerColor = colors ? colors.length / vertexCount : 0;

		for (let i = 0; i < vertexCount; i++) {
			const vOffset = i * 19;
			const pOffset = i * 3;
			const uvOffset = i * 2;
			const jOffset = i * 4;

			// Position
			vertices[vOffset + 0] = positions[pOffset + 0];
			vertices[vOffset + 1] = positions[pOffset + 1];
			vertices[vOffset + 2] = positions[pOffset + 2];

			// Normal (default to up if not provided)
			if (normals) {
				vertices[vOffset + 3] = normals[pOffset + 0];
				vertices[vOffset + 4] = normals[pOffset + 1];
				vertices[vOffset + 5] = normals[pOffset + 2];
			} else {
				vertices[vOffset + 3] = 0;
				vertices[vOffset + 4] = 1;
				vertices[vOffset + 5] = 0;
			}

			// UV coordinates (default to 0,0 if not provided)
			if (uvs) {
				vertices[vOffset + 6] = uvs[uvOffset + 0];
				vertices[vOffset + 7] = uvs[uvOffset + 1];
			} else {
				vertices[vOffset + 6] = 0;
				vertices[vOffset + 7] = 0;
			}

			// Color (default to white if not provided)
			if (colors) {
				const cOffset = i * componentsPerColor;
				vertices[vOffset + 8] = colors[cOffset + 0];
				vertices[vOffset + 9] = colors[cOffset + 1];
				vertices[vOffset + 10] = colors[cOffset + 2];
			} else {
				vertices[vOffset + 8] = 1.0;
				vertices[vOffset + 9] = 1.0;
				vertices[vOffset + 10] = 1.0;
			}

			// Joint indices (default to 0,0,0,0)
			if (joints) {
				vertices[vOffset + 11] = joints[jOffset + 0];
				vertices[vOffset + 12] = joints[jOffset + 1];
				vertices[vOffset + 13] = joints[jOffset + 2];
				vertices[vOffset + 14] = joints[jOffset + 3];
			} else {
				vertices[vOffset + 11] = 0;
				vertices[vOffset + 12] = 0;
				vertices[vOffset + 13] = 0;
				vertices[vOffset + 14] = 0;
			}

			// Joint weights (default to 1,0,0,0 - all weight to first joint)
			if (weights) {
				vertices[vOffset + 15] = weights[jOffset + 0];
				vertices[vOffset + 16] = weights[jOffset + 1];
				vertices[vOffset + 17] = weights[jOffset + 2];
				vertices[vOffset + 18] = weights[jOffset + 3];
			} else {
				vertices[vOffset + 15] = 1.0;
				vertices[vOffset + 16] = 0.0;
				vertices[vOffset + 17] = 0.0;
				vertices[vOffset + 18] = 0.0;
			}
		}

		return {
			vertices,
			indices,
			joints: joints || new Uint16Array(vertexCount * 4),
			weights: weights || new Float32Array(vertexCount * 4),
			name,
		};
	}

	private static extractAnimations(
		gltf: GLTF,
		_binaryData: ArrayBuffer | null,
	): AnimationClip[] {
		if (!gltf.animations) {
			return [];
		}

		// Simply copy animation data - we'll parse keyframes at runtime
		return gltf.animations.map((anim) => ({
			name: anim.name,
			samplers: anim.samplers,
			channels: anim.channels,
		}));
	}

	private static extractSkins(
		gltf: GLTF,
		_binaryData: ArrayBuffer | null,
	): Skin[] {
		if (!gltf.skins) {
			return [];
		}

		return gltf.skins.map((skin) => ({
			name: skin.name,
			joints: skin.joints,
			inverseBindMatrices: skin.inverseBindMatrices,
			skeleton: skin.skeleton,
		}));
	}

	private static extractNodes(gltf: GLTF): Node[] {
		if (!gltf.nodes) {
			return [];
		}

		return gltf.nodes.map((node) => ({
			name: node.name,
			children: node.children,
			translation: node.translation,
			rotation: node.rotation,
			scale: node.scale,
			matrix: node.matrix,
			mesh: node.mesh,
			skin: node.skin,
		}));
	}

	private static getAccessorData(
		accessorIndex: number,
		gltf: GLTF,
		binaryData: ArrayBuffer,
	): Float32Array {
		if (!gltf.accessors || !gltf.bufferViews) {
			throw new Error("Missing accessors or bufferViews");
		}

		const accessor = gltf.accessors[accessorIndex];
		const bufferView = gltf.bufferViews[accessor.bufferView ?? 0];

		const offset = (bufferView.byteOffset ?? 0) + (accessor.byteOffset ?? 0);
		const componentCount = GLBLoader.getComponentCount(accessor.type);
		const elementSize = GLBLoader.getComponentSize(accessor.componentType);
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
