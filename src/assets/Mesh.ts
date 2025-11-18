import { GLBLoader, type MeshData } from "./GLBLoader.ts";

export class Mesh {
	// Resource caches for memoization
	private static meshCache = new Map<string, Mesh>();
	private static textureCache = new Map<string, WebGLTexture>();

	private gl: WebGL2RenderingContext;
	private vao: WebGLVertexArrayObject;
	private vertexBuffer: WebGLBuffer;
	private indexBuffer: WebGLBuffer;
	public indexCount: number;
	public texture: WebGLTexture | null = null;

	constructor(
		gl: WebGL2RenderingContext,
		vertices: Float32Array,
		indices: Uint16Array,
	) {
		this.gl = gl;
		this.indexCount = indices.length;

		// Create VAO
		const vao = gl.createVertexArray();
		if (!vao) {
			throw new Error("Failed to create VAO");
		}
		this.vao = vao;

		// Create and bind vertex buffer
		const vertexBuffer = gl.createBuffer();
		if (!vertexBuffer) {
			throw new Error("Failed to create vertex buffer");
		}
		this.vertexBuffer = vertexBuffer;

		// Create and bind index buffer
		const indexBuffer = gl.createBuffer();
		if (!indexBuffer) {
			throw new Error("Failed to create index buffer");
		}
		this.indexBuffer = indexBuffer;

		gl.bindVertexArray(this.vao);

		gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
		gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

		// Vertex format: position(3) + normal(3) + uv(2) + color(3) = 11 floats
		const stride = 11 * 4;

		// Position attribute (3 floats)
		gl.enableVertexAttribArray(0);
		gl.vertexAttribPointer(0, 3, gl.FLOAT, false, stride, 0);

		// Normal attribute (3 floats)
		gl.enableVertexAttribArray(1);
		gl.vertexAttribPointer(1, 3, gl.FLOAT, false, stride, 3 * 4);

		// UV attribute (2 floats)
		gl.enableVertexAttribArray(2);
		gl.vertexAttribPointer(2, 2, gl.FLOAT, false, stride, 6 * 4);

		// Color attribute (3 floats)
		gl.enableVertexAttribArray(3);
		gl.vertexAttribPointer(3, 3, gl.FLOAT, false, stride, 8 * 4);

		gl.bindVertexArray(null);
	}

	bind(): void {
		this.gl.bindVertexArray(this.vao);
	}

	unbind(): void {
		this.gl.bindVertexArray(null);
	}

	static createCube(gl: WebGL2RenderingContext): Mesh {
		// Cube vertices: position (3), normal (3), color (3)
		const vertices = new Float32Array([
			// Front face (red-ish)
			-0.5, -0.5, 0.5, 0.0, 0.0, 1.0, 0.8, 0.3, 0.3, 0.5, -0.5, 0.5, 0.0, 0.0,
			1.0, 0.8, 0.3, 0.3, 0.5, 0.5, 0.5, 0.0, 0.0, 1.0, 0.8, 0.3, 0.3, -0.5,
			0.5, 0.5, 0.0, 0.0, 1.0, 0.8, 0.3, 0.3,

			// Back face (green-ish)
			-0.5, -0.5, -0.5, 0.0, 0.0, -1.0, 0.3, 0.8, 0.3, 0.5, -0.5, -0.5, 0.0,
			0.0, -1.0, 0.3, 0.8, 0.3, 0.5, 0.5, -0.5, 0.0, 0.0, -1.0, 0.3, 0.8, 0.3,
			-0.5, 0.5, -0.5, 0.0, 0.0, -1.0, 0.3, 0.8, 0.3,

			// Top face (blue-ish)
			-0.5, 0.5, -0.5, 0.0, 1.0, 0.0, 0.3, 0.3, 0.8, 0.5, 0.5, -0.5, 0.0, 1.0,
			0.0, 0.3, 0.3, 0.8, 0.5, 0.5, 0.5, 0.0, 1.0, 0.0, 0.3, 0.3, 0.8, -0.5,
			0.5, 0.5, 0.0, 1.0, 0.0, 0.3, 0.3, 0.8,

			// Bottom face (yellow-ish)
			-0.5, -0.5, -0.5, 0.0, -1.0, 0.0, 0.8, 0.8, 0.3, 0.5, -0.5, -0.5, 0.0,
			-1.0, 0.0, 0.8, 0.8, 0.3, 0.5, -0.5, 0.5, 0.0, -1.0, 0.0, 0.8, 0.8, 0.3,
			-0.5, -0.5, 0.5, 0.0, -1.0, 0.0, 0.8, 0.8, 0.3,

			// Right face (magenta-ish)
			0.5, -0.5, -0.5, 1.0, 0.0, 0.0, 0.8, 0.3, 0.8, 0.5, -0.5, 0.5, 1.0, 0.0,
			0.0, 0.8, 0.3, 0.8, 0.5, 0.5, 0.5, 1.0, 0.0, 0.0, 0.8, 0.3, 0.8, 0.5, 0.5,
			-0.5, 1.0, 0.0, 0.0, 0.8, 0.3, 0.8,

			// Left face (cyan-ish)
			-0.5, -0.5, -0.5, -1.0, 0.0, 0.0, 0.3, 0.8, 0.8, -0.5, -0.5, 0.5, -1.0,
			0.0, 0.0, 0.3, 0.8, 0.8, -0.5, 0.5, 0.5, -1.0, 0.0, 0.0, 0.3, 0.8, 0.8,
			-0.5, 0.5, -0.5, -1.0, 0.0, 0.0, 0.3, 0.8, 0.8,
		]);

		const indices = new Uint16Array([
			0,
			1,
			2,
			0,
			2,
			3, // Front
			4,
			6,
			5,
			4,
			7,
			6, // Back
			8,
			9,
			10,
			8,
			10,
			11, // Top
			12,
			14,
			13,
			12,
			15,
			14, // Bottom
			16,
			17,
			18,
			16,
			18,
			19, // Right
			20,
			22,
			21,
			20,
			23,
			22, // Left
		]);

		return new Mesh(gl, vertices, indices);
	}

	static createPlane(gl: WebGL2RenderingContext): Mesh {
		// Plane vertices in XZ plane: position (3), normal (3), uv (2), color (3)
		// Subdivided to avoid a single giant quad (better lighting and deforms)
		const segments = 64;
		const vertsPerSide = segments + 1;
		const vertexCount = vertsPerSide * vertsPerSide;
		const indicesPerQuad = 6;
		const quadCount = segments * segments;

		const vertices = new Float32Array(vertexCount * 11);
		const indices = new Uint16Array(quadCount * indicesPerQuad);

		const halfSize = 0.5;
		let vIndex = 0;
		for (let z = 0; z < vertsPerSide; z++) {
			for (let x = 0; x < vertsPerSide; x++) {
				const u = x / segments;
				const v = z / segments;
				const posX = -halfSize + u;
				const posZ = -halfSize + v;

				vertices.set(
					[
						posX,
						0.0,
						posZ, // position
						0.0,
						1.0,
						0.0, // normal
						u,
						v, // uv
						0.3,
						0.6,
						0.3, // color (greenish)
					],
					vIndex * 11,
				);
				vIndex++;
			}
		}

		let iIndex = 0;
		for (let z = 0; z < segments; z++) {
			for (let x = 0; x < segments; x++) {
				const topLeft = z * vertsPerSide + x;
				const topRight = topLeft + 1;
				const bottomLeft = topLeft + vertsPerSide;
				const bottomRight = bottomLeft + 1;

				indices.set(
					[topLeft, bottomLeft, topRight, topRight, bottomLeft, bottomRight],
					iIndex,
				);
				iIndex += indicesPerQuad;
			}
		}

		return new Mesh(gl, vertices, indices);
	}

	static fromMeshData(gl: WebGL2RenderingContext, meshData: MeshData): Mesh {
		return new Mesh(gl, meshData.vertices, meshData.indices);
	}

	/**
	 * Load a texture from a URL with memoization.
	 * Returns the same texture instance if the URL has been loaded before.
	 */
	private static async loadTextureFromUrl(
		gl: WebGL2RenderingContext,
		url: string,
	): Promise<WebGLTexture> {
		// Check cache first
		if (Mesh.textureCache.has(url)) {
			return Mesh.textureCache.get(url)!;
		}

		const texture = gl.createTexture();
		if (!texture) {
			throw new Error("Failed to create texture");
		}

		// Create a 1x1 white pixel as placeholder
		gl.bindTexture(gl.TEXTURE_2D, texture);
		const pixel = new Uint8Array([255, 255, 255, 255]);
		gl.texImage2D(
			gl.TEXTURE_2D,
			0,
			gl.RGBA,
			1,
			1,
			0,
			gl.RGBA,
			gl.UNSIGNED_BYTE,
			pixel,
		);

		// Load the actual image
		const image = new Image();
		image.src = url;

		await new Promise<void>((resolve, reject) => {
			image.onload = () => {
				gl.bindTexture(gl.TEXTURE_2D, texture);
				gl.texImage2D(
					gl.TEXTURE_2D,
					0,
					gl.RGBA,
					gl.RGBA,
					gl.UNSIGNED_BYTE,
					image,
				);

				// Set texture parameters
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

				resolve();
			};

			image.onerror = () => {
				reject(new Error(`Failed to load texture: ${url}`));
			};
		});

		// Cache the loaded texture
		Mesh.textureCache.set(url, texture);
		return texture;
	}

	/**
	 * Load a mesh from a GLB URL with optional texture, using memoization.
	 * Returns the same mesh instance if the same URLs have been loaded before.
	 * Only loads the first mesh from the GLB file.
	 *
	 * @param gl - WebGL2 rendering context
	 * @param glbUrl - URL to the GLB model file
	 * @param textureUrl - Optional URL to the texture image file
	 * @returns A fully loaded mesh with texture applied if provided
	 */
	static async fromUrl(
		gl: WebGL2RenderingContext,
		glbUrl: string,
		textureUrl?: string,
	): Promise<Mesh> {
		// Create cache key from both URLs
		const cacheKey = textureUrl ? `${glbUrl}:${textureUrl}` : glbUrl;

		// Check if we've already loaded this mesh+texture combination
		if (Mesh.meshCache.has(cacheKey)) {
			return Mesh.meshCache.get(cacheKey)!;
		}

		// Load the GLB file
		const meshDataArray = await GLBLoader.load(glbUrl);
		if (meshDataArray.length === 0) {
			throw new Error(`No meshes found in ${glbUrl}`);
		}

		// Create mesh from the first mesh data
		const mesh = Mesh.fromMeshData(gl, meshDataArray[0]);

		// Load texture if provided
		if (textureUrl) {
			const texture = await Mesh.loadTextureFromUrl(gl, textureUrl);
			mesh.texture = texture;
		}

		// Cache the mesh
		Mesh.meshCache.set(cacheKey, mesh);

		return mesh;
	}

	/**
	 * Load all meshes from a GLB URL with optional texture, using memoization.
	 * Returns the same mesh instances if the same URLs have been loaded before.
	 * Useful for models with multiple parts (e.g., character with separate body parts).
	 *
	 * @param gl - WebGL2 rendering context
	 * @param glbUrl - URL to the GLB model file
	 * @param textureUrl - Optional URL to the texture image file (applied to all meshes)
	 * @returns Array of fully loaded meshes with texture applied if provided
	 */
	static async allFromUrl(
		gl: WebGL2RenderingContext,
		glbUrl: string,
		textureUrl?: string,
	): Promise<Mesh[]> {
		// Create cache key from both URLs with 'all:' prefix to distinguish from single mesh
		const cacheKey = textureUrl
			? `all:${glbUrl}:${textureUrl}`
			: `all:${glbUrl}`;

		// Check if we've already loaded this mesh array
		if (Mesh.meshCache.has(cacheKey)) {
			// The cached value is the first mesh, but we store a reference to all meshes
			// We need a separate cache for arrays
			const cached = Mesh.meshCache.get(cacheKey);
			if (cached && (cached as any).__meshArray) {
				return (cached as any).__meshArray as Mesh[];
			}
		}

		// Load the GLB file
		const meshDataArray = await GLBLoader.load(glbUrl);
		if (meshDataArray.length === 0) {
			throw new Error(`No meshes found in ${glbUrl}`);
		}

		// Create all meshes from the mesh data array
		const meshes = meshDataArray.map((data) => Mesh.fromMeshData(gl, data));

		// Load texture and apply to all meshes if provided
		if (textureUrl) {
			const texture = await Mesh.loadTextureFromUrl(gl, textureUrl);
			for (const mesh of meshes) {
				mesh.texture = texture;
			}
		}

		// Cache the mesh array (store reference on first mesh)
		if (meshes.length > 0) {
			(meshes[0] as any).__meshArray = meshes;
			Mesh.meshCache.set(cacheKey, meshes[0]);
		}

		return meshes;
	}

	/**
	 * Load a texture for this mesh instance.
	 * Uses the cached texture if available.
	 */
	async loadTexture(url: string): Promise<void> {
		this.texture = await Mesh.loadTextureFromUrl(this.gl, url);
	}
}
