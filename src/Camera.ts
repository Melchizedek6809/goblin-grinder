import { mat4, vec3 } from "gl-matrix";
import type { Light } from "./Light.ts";
import type { Renderable } from "./Renderable.ts";
import type { Shader } from "./Shader.ts";
import { applySpring } from "./Spring.ts";

export class Camera {
	private gl: WebGL2RenderingContext;
	private shader: Shader;

	public position: vec3;
	public target: vec3;
	public up: vec3;

	public fov: number = 60;
	public near: number = 0.1;
	public far: number = 100.0;

	private viewMatrix: mat4;
	private projectionMatrix: mat4;

	// Camera follow physics
	private targetPosition: vec3;
	private positionVelocity: vec3;
	private targetTargetPosition: vec3;
	private targetVelocity: vec3;
	public followStiffness: number = 25.0;
	public followDamping: number = 0.9;

	// Camera rotation (angle around target)
	private angle: number = Math.PI / 4; // 45 degrees
	private targetAngle: number = Math.PI / 4;
	private angleVelocity: number = 0;
	private angleStiffness: number = 80.0;
	private angleDamping: number = 0.75;
	public baseDistance: number = 5; // Base distance from target
	public distance: number = 5; // Actual distance (adjusted for aspect ratio)
	public baseHeight: number = 6; // Base height above target
	public height: number = 6; // Actual height (adjusted for aspect ratio)

	constructor(gl: WebGL2RenderingContext, shader: Shader) {
		this.gl = gl;
		this.shader = shader;

		this.position = vec3.fromValues(0, 0, 5);
		this.target = vec3.fromValues(0, 0, 0);
		this.up = vec3.fromValues(0, 1, 0);

		this.viewMatrix = mat4.create();
		this.projectionMatrix = mat4.create();

		// Initialize follow physics
		this.targetPosition = vec3.clone(this.position);
		this.positionVelocity = vec3.create();
		this.targetTargetPosition = vec3.clone(this.target);
		this.targetVelocity = vec3.create();
	}

	setPosition(x: number, y: number, z: number) {
		vec3.set(this.position, x, y, z);
		vec3.set(this.targetPosition, x, y, z);
	}

	setTarget(x: number, y: number, z: number) {
		vec3.set(this.target, x, y, z);
		vec3.set(this.targetTargetPosition, x, y, z);
	}

	/**
	 * Get the current camera angle (actual, animating angle)
	 */
	getAngle(): number {
		return this.angle;
	}

	/**
	 * Get the target camera angle (where it's rotating to)
	 */
	getTargetAngle(): number {
		return this.targetAngle;
	}

	/**
	 * Get the view matrix for rendering
	 */
	getViewMatrix(): mat4 {
		return this.viewMatrix;
	}

	/**
	 * Get the projection matrix for rendering
	 */
	getProjectionMatrix(): mat4 {
		return this.projectionMatrix;
	}

	/**
	 * Rotate the camera to a new angle with smooth spring physics
	 */
	rotateTo(angle: number): void {
		this.targetAngle = angle;
	}

	/**
	 * Rotate the camera by a delta angle (for smooth continuous rotation)
	 * @param deltaAngle - Angle to rotate by in radians (positive = right, negative = left)
	 */
	rotateBy(deltaAngle: number): void {
		this.targetAngle += deltaAngle;
	}

	/**
	 * Set the follow target (usually the player position)
	 * Camera will orbit around this position at current angle
	 */
	setFollowTarget(targetPos: vec3): void {
		// Set where the camera should look (the target position - usually player)
		vec3.copy(this.targetTargetPosition, targetPos);

		// Calculate aspect ratio and adjust zoom for mobile/portrait mode
		const aspectRatio = this.gl.canvas.width / this.gl.canvas.height;

		// For portrait mode (aspectRatio < 1), zoom out more to see more horizontally
		// Scale both distance and height to maintain the same view angle
		let zoomScale = 1.0;
		if (aspectRatio < 1) {
			// Zoom out more in portrait mode (e.g., 0.5 aspect = 1.75x zoom)
			zoomScale = 1 + (1 - aspectRatio) * 1.5;
		}

		this.distance = this.baseDistance * zoomScale;
		this.height = this.baseHeight * zoomScale;

		// Calculate camera position based on current angle
		const cameraOffset = vec3.fromValues(
			Math.cos(this.angle) * this.distance,
			this.height,
			Math.sin(this.angle) * this.distance,
		);

		// Set where the camera should be positioned (offset from target)
		vec3.add(this.targetPosition, targetPos, cameraOffset);
	}

	updateFollow(deltaTime: number) {
		// Spring physics for camera angle rotation
		const angleDiff = this.targetAngle - this.angle;
		this.angleVelocity += angleDiff * this.angleStiffness * deltaTime;
		this.angleVelocity *= this.angleDamping;
		this.angle += this.angleVelocity * deltaTime;

		// Spring physics for camera position
		applySpring(
			this.position,
			this.targetPosition,
			this.positionVelocity,
			this.followStiffness,
			this.followDamping,
			deltaTime,
		);

		// Spring physics for camera target
		applySpring(
			this.target,
			this.targetTargetPosition,
			this.targetVelocity,
			this.followStiffness,
			this.followDamping,
			deltaTime,
		);
	}

	/**
	 * Frustum culling - check if entity is within visible range
	 * Uses distance from camera position with per-entity bounding sphere
	 * @param entityPosition - Position of the entity in world space
	 * @param boundingRadius - Bounding sphere radius of the entity (defaults to 1.0)
	 */
	isInFrustum(entityPosition: vec3, boundingRadius: number = 1.0): boolean {
		// Calculate 3D distance from camera position
		const dx = entityPosition[0] - this.position[0];
		const dy = entityPosition[1] - this.position[1];
		const dz = entityPosition[2] - this.position[2];
		const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

		// Base culling radius (visible area from camera)
		const baseCullRadius = 30;

		// Account for entity's bounding sphere - an entity is visible if any part of it
		// could be within the view frustum
		return distance < baseCullRadius + boundingRadius;
	}

	updateMatrices(aspectRatio: number) {
		mat4.perspective(
			this.projectionMatrix,
			(this.fov * Math.PI) / 180,
			aspectRatio,
			this.near,
			this.far,
		);

		mat4.lookAt(this.viewMatrix, this.position, this.target, this.up);
	}

	draw(
		entities: Renderable[],
		light: Light | null = null,
		time: number = 0,
		noiseTexture: WebGLTexture | null = null,
	) {
		const gl = this.gl;
		const aspectRatio = gl.canvas.width / gl.canvas.height;

		// First pass: Render shadow map for the light
		if (light) {
			light.renderShadowMap(entities);
		}

		// Second pass: Render main scene
		// Reset viewport to canvas size
		gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
		this.updateMatrices(aspectRatio);

		this.shader.use();

		// Set camera uniforms
		this.shader.setUniformMatrix4fv("u_view", this.viewMatrix);
		this.shader.setUniformMatrix4fv("u_projection", this.projectionMatrix);
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

			// Frustum culling - calculate bounding radius from entity scale
			// Approximate bounding sphere radius (assumes mesh fits in a unit cube)
			const maxScale = Math.max(
				entity.scale[0],
				entity.scale[1],
				entity.scale[2],
			);
			const boundingRadius = maxScale * 1.0; // Base radius of 1.0 for unit-sized meshes

			// Skip entities outside visible area
			if (!this.isInFrustum(entity.position, boundingRadius)) continue;

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
}
