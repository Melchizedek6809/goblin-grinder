import { mat4, vec3 } from "gl-matrix";
import type { Renderable } from "./Renderable.ts";
import type { Shader } from "./Shader.ts";

export class Light {
	private gl: WebGL2RenderingContext;
	private depthShader: Shader;

	public position: vec3;
	public target: vec3;
	public color: vec3;

	// Shadow map properties
	public shadowMapSize: number = 1024;
	public shadowFramebuffer: WebGLFramebuffer;
	public shadowTexture: WebGLTexture;

	// Light projection properties
	public orthoSize: number = 10;
	public near: number = 0.1;
	public far: number = 50;

	private lightSpaceMatrix: mat4;
	private lightProjection: mat4;
	private lightView: mat4;

	constructor(
		gl: WebGL2RenderingContext,
		depthShader: Shader,
		position: vec3,
		target: vec3,
		color: vec3 = vec3.fromValues(1, 1, 1),
	) {
		this.gl = gl;
		this.depthShader = depthShader;
		this.position = position;
		this.target = target;
		this.color = color;

		this.lightSpaceMatrix = mat4.create();
		this.lightProjection = mat4.create();
		this.lightView = mat4.create();

		// Create shadow map framebuffer and texture
		const fb = gl.createFramebuffer();
		if (!fb) {
			throw new Error("Failed to create shadow framebuffer");
		}
		this.shadowFramebuffer = fb;

		const texture = gl.createTexture();
		if (!texture) {
			throw new Error("Failed to create shadow texture");
		}
		this.shadowTexture = texture;

		this.initShadowMap();
	}

	private initShadowMap(): void {
		const gl = this.gl;

		// Setup shadow texture
		gl.bindTexture(gl.TEXTURE_2D, this.shadowTexture);
		gl.texImage2D(
			gl.TEXTURE_2D,
			0,
			gl.DEPTH_COMPONENT32F,
			this.shadowMapSize,
			this.shadowMapSize,
			0,
			gl.DEPTH_COMPONENT,
			gl.FLOAT,
			null,
		);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

		// Attach texture to framebuffer
		gl.bindFramebuffer(gl.FRAMEBUFFER, this.shadowFramebuffer);
		gl.framebufferTexture2D(
			gl.FRAMEBUFFER,
			gl.DEPTH_ATTACHMENT,
			gl.TEXTURE_2D,
			this.shadowTexture,
			0,
		);

		// Check framebuffer status
		if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
			throw new Error("Shadow framebuffer is not complete");
		}

		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
		gl.bindTexture(gl.TEXTURE_2D, null);
	}

	updateMatrices(): void {
		// Orthographic projection for directional light shadows
		mat4.ortho(
			this.lightProjection,
			-this.orthoSize,
			this.orthoSize,
			-this.orthoSize,
			this.orthoSize,
			this.near,
			this.far,
		);

		// Look at target from light position
		const up = vec3.fromValues(0, 1, 0);
		mat4.lookAt(this.lightView, this.position, this.target, up);

		// Combine projection and view
		mat4.multiply(this.lightSpaceMatrix, this.lightProjection, this.lightView);
	}

	getLightSpaceMatrix(): mat4 {
		return this.lightSpaceMatrix;
	}

	renderShadowMap(entities: Renderable[]): void {
		const gl = this.gl;

		this.updateMatrices();

		// Bind shadow framebuffer
		gl.bindFramebuffer(gl.FRAMEBUFFER, this.shadowFramebuffer);
		gl.viewport(0, 0, this.shadowMapSize, this.shadowMapSize);
		gl.clear(gl.DEPTH_BUFFER_BIT);

		// Use depth shader
		this.depthShader.use();
		this.depthShader.setUniformMatrix4fv(
			"u_lightSpaceMatrix",
			this.lightSpaceMatrix,
		);

		// Render all entities to shadow map
		for (const entity of entities) {
			// Skip entities without a mesh
			if (!entity.mesh) continue;

			const modelMatrix = entity.getModelMatrix();
			this.depthShader.setUniformMatrix4fv("u_model", modelMatrix);

			entity.mesh.bind();
			gl.drawElements(
				gl.TRIANGLES,
				entity.mesh.indexCount,
				gl.UNSIGNED_SHORT,
				0,
			);
			entity.mesh.unbind();
		}

		// Unbind shadow framebuffer
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
	}

	setPosition(x: number, y: number, z: number): void {
		vec3.set(this.position, x, y, z);
	}

	setTarget(x: number, y: number, z: number): void {
		vec3.set(this.target, x, y, z);
	}

	/**
	 * Follow a target position (e.g., the player) while maintaining relative offset
	 */
	followTarget(
		targetPos: vec3,
		offsetX: number,
		offsetY: number,
		offsetZ: number,
	): void {
		// Set light target to the follow target
		vec3.copy(this.target, targetPos);

		// Position light relative to target
		vec3.set(
			this.position,
			targetPos[0] + offsetX,
			targetPos[1] + offsetY,
			targetPos[2] + offsetZ,
		);
	}
}
