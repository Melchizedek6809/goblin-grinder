import type { mat4, quat, vec3 } from "gl-matrix";
import type { Mesh } from "./Mesh.ts";

/**
 * Interface for objects that can be rendered in the scene
 * Both entities with game logic and static objects implement this
 */
export interface Renderable {
	position: vec3;
	rotation: quat;
	scale: vec3;
	mesh: Mesh;
	getModelMatrix(): mat4;
}
