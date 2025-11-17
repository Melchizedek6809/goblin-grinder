import type { SkinnedMeshData } from "../assets/GLBLoader.ts";
import { Skeleton } from "./Skeleton.ts";
import { AnimationController } from "./AnimationController.ts";

export class SkinnedMesh {
	private gl: WebGL2RenderingContext;
	private vao: WebGLVertexArrayObject;
	private vertexBuffer: WebGLBuffer;
	private indexBuffer: WebGLBuffer;
	public indexCount: number;
	public texture: WebGLTexture | null = null;
	public skeleton: Skeleton;
	public animationController: AnimationController | null = null;

	constructor(
		gl: WebGL2RenderingContext,
		meshData: SkinnedMeshData,
		skeleton: Skeleton,
	) {
		this.gl = gl;
		this.indexCount = meshData.indices.length;
		this.skeleton = skeleton;

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
		gl.bufferData(gl.ARRAY_BUFFER, meshData.vertices, gl.STATIC_DRAW);

		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
		gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, meshData.indices, gl.STATIC_DRAW);

		// Vertex format: position(3) + normal(3) + uv(2) + color(3) + joints(4) + weights(4) = 19 floats
		const stride = 19 * 4;

		// Position attribute (location 0)
		gl.enableVertexAttribArray(0);
		gl.vertexAttribPointer(0, 3, gl.FLOAT, false, stride, 0);

		// Normal attribute (location 1)
		gl.enableVertexAttribArray(1);
		gl.vertexAttribPointer(1, 3, gl.FLOAT, false, stride, 3 * 4);

		// UV attribute (location 2)
		gl.enableVertexAttribArray(2);
		gl.vertexAttribPointer(2, 2, gl.FLOAT, false, stride, 6 * 4);

		// Color attribute (location 3)
		gl.enableVertexAttribArray(3);
		gl.vertexAttribPointer(3, 3, gl.FLOAT, false, stride, 8 * 4);

		// Joints attribute (location 4)
		gl.enableVertexAttribArray(4);
		gl.vertexAttribPointer(4, 4, gl.FLOAT, false, stride, 11 * 4);

		// Weights attribute (location 5)
		gl.enableVertexAttribArray(5);
		gl.vertexAttribPointer(5, 4, gl.FLOAT, false, stride, 15 * 4);

		gl.bindVertexArray(null);
	}

	bind(): void {
		this.gl.bindVertexArray(this.vao);
	}

	unbind(): void {
		this.gl.bindVertexArray(null);
	}

	/**
	 * Load a texture for this mesh instance.
	 */
	async loadTexture(url: string): Promise<void> {
		const texture = this.gl.createTexture();
		if (!texture) {
			throw new Error("Failed to create texture");
		}

		// Create a 1x1 white pixel as placeholder
		this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
		const pixel = new Uint8Array([255, 255, 255, 255]);
		this.gl.texImage2D(
			this.gl.TEXTURE_2D,
			0,
			this.gl.RGBA,
			1,
			1,
			0,
			this.gl.RGBA,
			this.gl.UNSIGNED_BYTE,
			pixel,
		);

		// Load the actual image
		const image = new Image();
		image.src = url;

		await new Promise<void>((resolve, reject) => {
			image.onload = () => {
				this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
				this.gl.texImage2D(
					this.gl.TEXTURE_2D,
					0,
					this.gl.RGBA,
					this.gl.RGBA,
					this.gl.UNSIGNED_BYTE,
					image,
				);

				// Set texture parameters
				this.gl.texParameteri(
					this.gl.TEXTURE_2D,
					this.gl.TEXTURE_WRAP_S,
					this.gl.REPEAT,
				);
				this.gl.texParameteri(
					this.gl.TEXTURE_2D,
					this.gl.TEXTURE_WRAP_T,
					this.gl.REPEAT,
				);
				this.gl.texParameteri(
					this.gl.TEXTURE_2D,
					this.gl.TEXTURE_MIN_FILTER,
					this.gl.LINEAR,
				);
				this.gl.texParameteri(
					this.gl.TEXTURE_2D,
					this.gl.TEXTURE_MAG_FILTER,
					this.gl.NEAREST,
				);

				resolve();
			};

			image.onerror = () => {
				reject(new Error(`Failed to load texture: ${url}`));
			};
		});

		this.texture = texture;
	}

	/**
	 * Update animation (should be called each frame)
	 */
	update(_deltaTime: number): void {
		// No-op: animation controller is advanced by the owning entity
	}
}
