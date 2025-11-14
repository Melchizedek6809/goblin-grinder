// Generic mesh data structure (format-agnostic)
export interface MeshData {
	vertices: Float32Array; // Interleaved: position(3) + normal(3) + uv(2) + color(3)
	indices: Uint16Array;
	name?: string;
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
	};
	indices?: number;
	mode?: number;
}

interface GLTFMesh {
	name?: string;
	primitives: GLTFPrimitive[];
}

interface GLTF {
	accessors?: GLTFAccessor[];
	bufferViews?: GLTFBufferView[];
	meshes?: GLTFMesh[];
	buffers?: { byteLength: number }[];
}

export class GLBLoader {
	/**
	 * Load a GLB file and extract mesh data
	 */
	static async load(url: string): Promise<MeshData[]> {
		const response = await fetch(url);
		const arrayBuffer = await response.arrayBuffer();
		return GLBLoader.parse(arrayBuffer);
	}

	/**
	 * Parse GLB binary data
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
