import type { Camera } from "./Camera.ts";
import type { Light } from "./Light.ts";
import type { Renderable } from "./Renderable.ts";
import type { Shader } from "./Shader.ts";

/**
 * Handles the rendering pipeline
 * Orchestrates shadow pass and main pass rendering
 */
export class Renderer {
	private gl: WebGL2RenderingContext;
	private shader: Shader;

	constructor(gl: WebGL2RenderingContext, shader: Shader) {
		this.gl = gl;
		this.shader = shader;
	}

	/**
	 * Render the scene with shadow mapping
	 * @param entities All renderable entities in the scene
	 * @param camera Camera for view/projection matrices
	 * @param light Light for shadow mapping (optional)
	 * @param time Current time in seconds for animated shaders
	 * @param noiseTexture Noise texture for cloud shadows (optional)
	 */
	render(
		entities: ReadonlyArray<Renderable>,
		camera: Camera,
		light: Light | null = null,
		time: number = 0,
		noiseTexture: WebGLTexture | null = null,
	): void {
		// First pass: Render shadow map for the light
		if (light) {
			light.renderShadowMap(entities);
		}

		// Second pass: Render main scene
		this.renderMainPass(entities, camera, light, time, noiseTexture);
	}

	/**
	 * Render the main scene pass
	 */
	private renderMainPass(
		entities: ReadonlyArray<Renderable>,
		camera: Camera,
		light: Light | null,
		time: number,
		noiseTexture: WebGLTexture | null,
	): void {
		const gl = this.gl;

		// Reset viewport to canvas size
		gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

		// Use shader and set uniforms
		this.shader.use();

		// Set camera uniforms
		this.shader.setUniformMatrix4fv("u_view", camera.getViewMatrix());
		this.shader.setUniformMatrix4fv(
			"u_projection",
			camera.getProjectionMatrix(),
		);
		this.shader.setUniform1f("u_time", time);

		// Bind noise texture for cloud shadows (use texture slot 5)
		if (noiseTexture) {
			gl.activeTexture(gl.TEXTURE5);
			gl.bindTexture(gl.TEXTURE_2D, noiseTexture);
			this.shader.setUniform1i("u_noiseTexture", 5);
		}

		// Set light uniforms
		if (light) {
			this.shader.setUniformMatrix4fv(
				"u_lightSpaceMatrix",
				light.getLightSpaceMatrix(),
			);
			this.shader.setUniform3fv("u_lightPosition", light.position);
			this.shader.setUniform3fv("u_lightColor", light.color);

			// Bind shadow map texture
			gl.activeTexture(gl.TEXTURE0);
			gl.bindTexture(gl.TEXTURE_2D, light.shadowTexture);
			this.shader.setUniform1i("u_shadowMap", 0);
		}

		// Draw each entity
		for (const entity of entities) {
			// Skip entities without a mesh
			if (!entity.mesh) continue;

			// Frustum culling
			if (!this.isEntityVisible(entity, camera)) continue;

			this.renderEntity(entity);
		}
	}

	/**
	 * Check if an entity is visible in the camera's frustum
	 */
	private isEntityVisible(entity: Renderable, camera: Camera): boolean {
		// Calculate bounding radius from entity scale
		// Approximate bounding sphere radius (assumes mesh fits in a unit cube)
		const maxScale = Math.max(
			entity.scale[0],
			entity.scale[1],
			entity.scale[2],
		);
		const boundingRadius = maxScale * 1.0; // Base radius of 1.0 for unit-sized meshes

		return camera.isInFrustum(entity.position, boundingRadius);
	}

	/**
	 * Render a single entity
	 */
	private renderEntity(entity: Renderable): void {
		const gl = this.gl;

		const modelMatrix = entity.getModelMatrix();
		this.shader.setUniformMatrix4fv("u_model", modelMatrix);

		// Bind texture if available
		if (entity.mesh.texture) {
			gl.activeTexture(gl.TEXTURE4); // Use slot 4 (0-3 are for shadow maps)
			gl.bindTexture(gl.TEXTURE_2D, entity.mesh.texture);
			this.shader.setUniform1i("u_texture", 4);
			this.shader.setUniform1i("u_useTexture", 1);
		} else {
			this.shader.setUniform1i("u_useTexture", 0);
		}

		entity.mesh.bind();
		gl.drawElements(
			gl.TRIANGLES,
			entity.mesh.indexCount,
			gl.UNSIGNED_SHORT,
			0,
		);
		entity.mesh.unbind();
	}
}
