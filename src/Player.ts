import { quat, vec3 } from "gl-matrix";
import { Entity } from "./Entity.ts";
import type { Mesh } from "./Mesh.ts";

export class Player {
	public entities: Entity[];
	public position: vec3;
	public rotation: number = 0; // Y-axis rotation in radians
	public moveSpeed: number = 3.0;

	constructor(meshes: Mesh[]) {
		this.position = vec3.fromValues(0, -0.5, 0);
		this.entities = meshes.map((mesh) => {
			const entity = new Entity(mesh);
			entity.setPosition(0, 0, 0);
			entity.setUniformScale(0.5);
			return entity;
		});
	}

	move(x: number, z: number, deltaTime: number): void {
		// Update position
		this.position[0] += x * this.moveSpeed * deltaTime;
		this.position[2] += z * this.moveSpeed * deltaTime;

		// Update rotation to face movement direction
		if (x !== 0 || z !== 0) {
			this.rotation = Math.atan2(x, z);
		}

		// Apply to all entities
		this.updateEntities();
	}

	private updateEntities(): void {
		const rotation = quat.create();
		quat.fromEuler(rotation, 0, (this.rotation * 180) / Math.PI, 0);

		for (const entity of this.entities) {
			entity.setPosition(this.position[0], this.position[1], this.position[2]);
			entity.rotation = rotation;
		}
	}

	update(_deltaTime: number): void {
		// Future: animations, etc.
	}

	setPosition(x: number, y: number, z: number): void {
		vec3.set(this.position, x, y, z);
		this.updateEntities();
	}

	getPosition(): vec3 {
		return this.position;
	}
}
