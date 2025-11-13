import { mat4, quat, vec3 } from "gl-matrix";
import type { Mesh } from "./Mesh.ts";
import type { Collider } from "./physics/Collider.ts";
import type { Renderable } from "./Renderable.ts";

export class Entity implements Renderable {
	public position: vec3;
	public rotation: quat;
	public scale: vec3;
	public mesh: Mesh;
	public collider?: Collider;

	private modelMatrix: mat4;

	constructor(mesh: Mesh) {
		this.mesh = mesh;
		this.position = vec3.create();
		this.rotation = quat.create();
		this.scale = vec3.fromValues(1, 1, 1);
		this.modelMatrix = mat4.create();
	}

	getModelMatrix(): mat4 {
		mat4.fromRotationTranslationScale(
			this.modelMatrix,
			this.rotation,
			this.position,
			this.scale,
		);
		return this.modelMatrix;
	}

	setPosition(x: number, y: number, z: number): void {
		vec3.set(this.position, x, y, z);
	}

	setRotation(x: number, y: number, z: number, w: number): void {
		quat.set(this.rotation, x, y, z, w);
	}

	setRotationFromEuler(x: number, y: number, z: number): void {
		quat.fromEuler(this.rotation, x, y, z);
	}

	setScale(x: number, y: number, z: number): void {
		vec3.set(this.scale, x, y, z);
	}

	setUniformScale(s: number): void {
		vec3.set(this.scale, s, s, s);
	}
}
