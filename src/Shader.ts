import type { mat4, vec3 } from "gl-matrix";

export class Shader {
	public program: WebGLProgram;
	private gl: WebGL2RenderingContext;
	private uniformLocations: Map<string, WebGLUniformLocation | null> = new Map();
	private attributeLocations: Map<string, number> = new Map();

	constructor(
		gl: WebGL2RenderingContext,
		vertexSource: string,
		fragmentSource: string,
	) {
		this.gl = gl;
		this.program = this.createProgram(vertexSource, fragmentSource);
	}

	private createShader(type: number, source: string): WebGLShader {
		const shader = this.gl.createShader(type);
		if (!shader) {
			throw new Error("Failed to create shader");
		}

		this.gl.shaderSource(shader, source);
		this.gl.compileShader(shader);

		if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
			const info = this.gl.getShaderInfoLog(shader);
			this.gl.deleteShader(shader);
			throw new Error(`Shader compilation failed: ${info}`);
		}

		return shader;
	}

	private createProgram(
		vertexSource: string,
		fragmentSource: string,
	): WebGLProgram {
		const vertexShader = this.createShader(this.gl.VERTEX_SHADER, vertexSource);
		const fragmentShader = this.createShader(
			this.gl.FRAGMENT_SHADER,
			fragmentSource,
		);

		const program = this.gl.createProgram();
		if (!program) {
			throw new Error("Failed to create program");
		}

		this.gl.attachShader(program, vertexShader);
		this.gl.attachShader(program, fragmentShader);
		this.gl.linkProgram(program);

		if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
			const info = this.gl.getProgramInfoLog(program);
			this.gl.deleteProgram(program);
			throw new Error(`Program linking failed: ${info}`);
		}

		this.gl.deleteShader(vertexShader);
		this.gl.deleteShader(fragmentShader);

		return program;
	}

	use(): void {
		this.gl.useProgram(this.program);
	}

	getUniformLocation(name: string): WebGLUniformLocation | null {
		if (!this.uniformLocations.has(name)) {
			const location = this.gl.getUniformLocation(this.program, name);
			if (location === null) {
				// Store null to avoid repeated lookups
				this.uniformLocations.set(name, location);
				return null;
			}
			this.uniformLocations.set(name, location);
			return location;
		}
		const location = this.uniformLocations.get(name);
		return location || null;
	}

	getAttributeLocation(name: string): number {
		if (!this.attributeLocations.has(name)) {
			const location = this.gl.getAttribLocation(this.program, name);
			if (location === -1) {
				throw new Error(`Attribute ${name} not found in shader`);
			}
			this.attributeLocations.set(name, location);
			return location;
		}
		const location = this.attributeLocations.get(name);
		if (location === undefined) {
			throw new Error(`Attribute ${name} not found in cache`);
		}
		return location;
	}

	setUniformMatrix4fv(name: string, value: mat4): void {
		const location = this.getUniformLocation(name);
		if (location === null) return;
		this.gl.uniformMatrix4fv(location, false, value as Float32Array);
	}

	setUniform3fv(name: string, value: vec3 | number[]): void {
		const location = this.getUniformLocation(name);
		if (location === null) return;
		this.gl.uniform3fv(location, value as Float32Array);
	}

	setUniform1f(name: string, value: number): void {
		const location = this.getUniformLocation(name);
		if (location === null) return;
		this.gl.uniform1f(location, value);
	}

	setUniform2f(name: string, x: number, y: number): void {
		const location = this.getUniformLocation(name);
		if (location === null) return;
		this.gl.uniform2f(location, x, y);
	}

	setUniform1i(name: string, value: number): void {
		const location = this.getUniformLocation(name);
		if (location === null) return;
		this.gl.uniform1i(location, value);
	}

	setUniformMatrix4fvArray(name: string, values: mat4[]): void {
		// Cache each array element location using the existing caching mechanism
		for (let i = 0; i < values.length; i++) {
			const location = this.getUniformLocation(`${name}[${i}]`);
			if (location) {
				this.gl.uniformMatrix4fv(location, false, values[i] as Float32Array);
			}
		}
	}

	setUniform3fvArray(name: string, values: vec3[]): void {
		// Cache each array element location using the existing caching mechanism
		for (let i = 0; i < values.length; i++) {
			const location = this.getUniformLocation(`${name}[${i}]`);
			if (location) {
				this.gl.uniform3fv(location, values[i] as Float32Array);
			}
		}
	}
}
