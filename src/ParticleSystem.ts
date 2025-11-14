import { type mat4, vec3 } from "gl-matrix";
import { Particle } from "./Particle";
import type { Shader } from "./Shader";

export class ParticleSystem {
	private particles: Particle[] = [];
	private maxParticles: number;
	private vao: WebGLVertexArrayObject;
	private positionBuffer: WebGLBuffer;
	private colorBuffer: WebGLBuffer;
	private sizeBuffer: WebGLBuffer;
	private shader: Shader;
	private gl: WebGL2RenderingContext;

	// Buffers for instanced rendering
	private positions: Float32Array;
	private colors: Float32Array;
	private sizes: Float32Array;

	constructor(gl: WebGL2RenderingContext, shader: Shader, maxParticles = 1000) {
		this.gl = gl;
		this.shader = shader;
		this.maxParticles = maxParticles;

		// Create buffers
		this.positions = new Float32Array(maxParticles * 3);
		this.colors = new Float32Array(maxParticles * 4); // RGBA
		this.sizes = new Float32Array(maxParticles);

		// Create VAO and buffers
		const vao = gl.createVertexArray();
		if (!vao) throw new Error("Failed to create VAO");
		this.vao = vao;

		const positionBuffer = gl.createBuffer();
		const colorBuffer = gl.createBuffer();
		const sizeBuffer = gl.createBuffer();
		if (!positionBuffer || !colorBuffer || !sizeBuffer) {
			throw new Error("Failed to create particle buffers");
		}
		this.positionBuffer = positionBuffer;
		this.colorBuffer = colorBuffer;
		this.sizeBuffer = sizeBuffer;

		// Set up VAO
		gl.bindVertexArray(this.vao);

		// Position attribute (per-instance)
		gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, this.positions, gl.DYNAMIC_DRAW);
		gl.enableVertexAttribArray(0);
		gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
		gl.vertexAttribDivisor(0, 1); // One position per instance

		// Color attribute (per-instance)
		gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, this.colors, gl.DYNAMIC_DRAW);
		gl.enableVertexAttribArray(1);
		gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 0, 0);
		gl.vertexAttribDivisor(1, 1); // One color per instance

		// Size attribute (per-instance)
		gl.bindBuffer(gl.ARRAY_BUFFER, this.sizeBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, this.sizes, gl.DYNAMIC_DRAW);
		gl.enableVertexAttribArray(2);
		gl.vertexAttribPointer(2, 1, gl.FLOAT, false, 0, 0);
		gl.vertexAttribDivisor(2, 1); // One size per instance

		gl.bindVertexArray(null);
	}

	spawn(particle: Particle): void {
		if (this.particles.length < this.maxParticles) {
			this.particles.push(particle);
		}
	}

	spawnBurst(
		position: vec3,
		count: number,
		speedRange: [number, number],
		sizeRange: [number, number],
		lifetimeRange: [number, number],
		colors: vec3[],
		gravity = 0.0,
		blendMode: "alpha" | "additive" = "alpha",
	): void {
		for (let i = 0; i < count; i++) {
			const color = colors[Math.floor(Math.random() * colors.length)];
			// Random direction
			const theta = Math.random() * Math.PI * 2;
			const phi = Math.random() * Math.PI;
			const speed =
				speedRange[0] + Math.random() * (speedRange[1] - speedRange[0]);

			const velocity = vec3.fromValues(
				Math.sin(phi) * Math.cos(theta) * speed,
				Math.sin(phi) * Math.sin(theta) * speed,
				Math.cos(phi) * speed,
			);

			const size = sizeRange[0] + Math.random() * (sizeRange[1] - sizeRange[0]);
			const lifetime =
				lifetimeRange[0] +
				Math.random() * (lifetimeRange[1] - lifetimeRange[0]);

			this.spawn(
				new Particle(
					position,
					velocity,
					color,
					size,
					lifetime,
					gravity,
					undefined,
					undefined,
					blendMode,
				),
			);
		}
	}

	update(deltaTime: number): void {
		// Update all particles and remove dead ones
		this.particles = this.particles.filter((particle) =>
			particle.update(deltaTime),
		);
	}

	render(viewMatrix: mat4, projectionMatrix: mat4): void {
		if (this.particles.length === 0) return;

		const gl = this.gl;

		// Separate particles by blend mode
		const alphaParticles: Particle[] = [];
		const additiveParticles: Particle[] = [];

		for (const particle of this.particles) {
			if (particle.blendMode === "additive") {
				additiveParticles.push(particle);
			} else {
				alphaParticles.push(particle);
			}
		}

		// Set up shader uniforms (shared for both batches)
		this.shader.use();
		this.shader.setUniformMatrix4fv("u_view", viewMatrix);
		this.shader.setUniformMatrix4fv("u_projection", projectionMatrix);
		gl.bindVertexArray(this.vao);

		// Render alpha-blended particles first
		if (alphaParticles.length > 0) {
			gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
			this.renderBatch(alphaParticles);
		}

		// Render additive particles second (brighter on top)
		if (additiveParticles.length > 0) {
			gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
			this.renderBatch(additiveParticles);
		}

		gl.bindVertexArray(null);
	}

	private renderBatch(particles: Particle[]): void {
		const gl = this.gl;

		// Update buffers with particle data
		for (let i = 0; i < particles.length; i++) {
			const particle = particles[i];
			const posIdx = i * 3;
			const colorIdx = i * 4;

			this.positions[posIdx] = particle.position[0];
			this.positions[posIdx + 1] = particle.position[1];
			this.positions[posIdx + 2] = particle.position[2];

			this.colors[colorIdx] = particle.color[0];
			this.colors[colorIdx + 1] = particle.color[1];
			this.colors[colorIdx + 2] = particle.color[2];
			this.colors[colorIdx + 3] = particle.getAlpha();

			this.sizes[i] = particle.size;
		}

		// Upload to GPU
		gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
		gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.positions);

		gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuffer);
		gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.colors);

		gl.bindBuffer(gl.ARRAY_BUFFER, this.sizeBuffer);
		gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.sizes);

		// Draw this batch
		gl.drawArraysInstanced(gl.POINTS, 0, 1, particles.length);
	}

	clear(): void {
		this.particles = [];
	}

	getParticleCount(): number {
		return this.particles.length;
	}
}
