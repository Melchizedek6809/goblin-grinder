import { mat4, vec3 } from "gl-matrix";
import type { Camera } from "./Camera.ts";
import type { SphereCollider } from "./physics/Collider.ts";
import type { Physics } from "./physics/Physics.ts";
import { Shader } from "./Shader.ts";
import debugFragmentShaderSource from "./shaders/debug.frag?raw";
import debugVertexShaderSource from "./shaders/debug.vert?raw";

/**
 * Debug renderer for visualizing colliders and other debug information
 * Draws wireframe representations of physics colliders
 */
export class DebugRenderer {
	private gl: WebGL2RenderingContext;
	private shader: Shader;
	private sphereVAO: WebGLVertexArrayObject;
	private sphereVertexCount: number;

	constructor(gl: WebGL2RenderingContext) {
		this.gl = gl;
		this.shader = new Shader(
			gl,
			debugVertexShaderSource,
			debugFragmentShaderSource,
		);

		// Create wireframe sphere mesh
		const sphereData = this.createWireframeSphere(1.0, 16, 8);
		this.sphereVertexCount = sphereData.vertexCount;

		// Create VAO for sphere
		const vao = gl.createVertexArray();
		if (!vao) {
			throw new Error("Failed to create debug VAO");
		}
		this.sphereVAO = vao;

		// Setup vertex buffer
		const vertexBuffer = gl.createBuffer();
		if (!vertexBuffer) {
			throw new Error("Failed to create debug vertex buffer");
		}

		gl.bindVertexArray(this.sphereVAO);
		gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, sphereData.vertices, gl.STATIC_DRAW);

		// Position attribute (3 floats)
		gl.enableVertexAttribArray(0);
		gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);

		gl.bindVertexArray(null);
	}

	/**
	 * Create a wireframe sphere using lines
	 * Returns vertices for rendering with gl.LINES
	 */
	private createWireframeSphere(
		radius: number,
		segments: number,
		rings: number,
	): { vertices: Float32Array; vertexCount: number } {
		const vertices: number[] = [];

		// Latitude lines (horizontal circles)
		for (let ring = 0; ring <= rings; ring++) {
			const theta = (ring * Math.PI) / rings;
			const sinTheta = Math.sin(theta);
			const cosTheta = Math.cos(theta);

			for (let seg = 0; seg < segments; seg++) {
				const phi1 = (seg * 2 * Math.PI) / segments;
				const phi2 = ((seg + 1) * 2 * Math.PI) / segments;

				const x1 = radius * Math.cos(phi1) * sinTheta;
				const y1 = radius * cosTheta;
				const z1 = radius * Math.sin(phi1) * sinTheta;

				const x2 = radius * Math.cos(phi2) * sinTheta;
				const y2 = radius * cosTheta;
				const z2 = radius * Math.sin(phi2) * sinTheta;

				vertices.push(x1, y1, z1, x2, y2, z2);
			}
		}

		// Longitude lines (vertical circles)
		for (let seg = 0; seg < segments; seg++) {
			const phi = (seg * 2 * Math.PI) / segments;
			const sinPhi = Math.sin(phi);
			const cosPhi = Math.cos(phi);

			for (let ring = 0; ring < rings; ring++) {
				const theta1 = (ring * Math.PI) / rings;
				const theta2 = ((ring + 1) * Math.PI) / rings;

				const x1 = radius * cosPhi * Math.sin(theta1);
				const y1 = radius * Math.cos(theta1);
				const z1 = radius * sinPhi * Math.sin(theta1);

				const x2 = radius * cosPhi * Math.sin(theta2);
				const y2 = radius * Math.cos(theta2);
				const z2 = radius * sinPhi * Math.sin(theta2);

				vertices.push(x1, y1, z1, x2, y2, z2);
			}
		}

		return {
			vertices: new Float32Array(vertices),
			vertexCount: vertices.length / 3,
		};
	}

	/**
	 * Render a single sphere collider as wireframe
	 */
	private renderSphereCollider(collider: SphereCollider, color: vec3): void {
		const gl = this.gl;

		// Create model matrix (translate + scale)
		const modelMatrix = mat4.create();
		mat4.fromTranslation(modelMatrix, collider.center);
		mat4.scale(modelMatrix, modelMatrix, [
			collider.radius,
			collider.radius,
			collider.radius,
		]);

		// Set uniforms
		this.shader.setUniformMatrix4fv("u_model", modelMatrix);
		this.shader.setUniform3fv("u_color", color);

		// Draw wireframe sphere
		gl.bindVertexArray(this.sphereVAO);
		gl.drawArrays(gl.LINES, 0, this.sphereVertexCount);
		gl.bindVertexArray(null);
	}

	/**
	 * Render all colliders in the physics system
	 */
	renderColliders(physics: Physics, camera: Camera): void {
		const gl = this.gl;

		// Enable blending for semi-transparent wireframes
		gl.enable(gl.BLEND);
		gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

		// Disable depth writing (but keep depth testing)
		gl.depthMask(false);

		// Use debug shader
		this.shader.use();

		// Set camera matrices
		const aspectRatio = gl.canvas.width / gl.canvas.height;
		camera.updateMatrices(aspectRatio);
		this.shader.setUniformMatrix4fv("u_view", camera["viewMatrix"]);
		this.shader.setUniformMatrix4fv("u_projection", camera["projectionMatrix"]);

		// Get all colliders from physics system
		const colliders = physics.getAllColliders();

		// Render each collider with a color based on its layer
		for (const collider of colliders) {
			if (!collider.enabled) continue;

			// Color based on layer: player=green, enemy=red, environment=blue, other=yellow
			let color: vec3;
			switch (collider.layer) {
				case 0:
					color = vec3.fromValues(0.0, 1.0, 0.0); // Green - player
					break;
				case 1:
					color = vec3.fromValues(1.0, 0.0, 0.0); // Red - enemy
					break;
				case 2:
					color = vec3.fromValues(0.3, 0.6, 1.0); // Blue - environment
					break;
				default:
					color = vec3.fromValues(1.0, 1.0, 0.0); // Yellow - other
					break;
			}

			// Render based on collider type
			if (collider.type === "sphere") {
				this.renderSphereCollider(collider as SphereCollider, color);
			}
			// Future: add capsule and box rendering
		}

		// Restore GL state
		gl.depthMask(true);
		gl.disable(gl.BLEND);
	}
}
