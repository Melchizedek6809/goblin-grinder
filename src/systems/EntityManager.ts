import type { Renderable } from "../rendering/Renderable.ts";

/**
 * Manages the lifecycle of renderable entities in the game
 * Centralizes entity tracking, adding, and removal
 */
export class EntityManager {
	private entities: Renderable[] = [];

	/**
	 * Add a single entity to the scene
	 */
	addEntity(entity: Renderable): void {
		this.entities.push(entity);
	}

	/**
	 * Add multiple entities to the scene
	 */
	addEntities(entities: Renderable[]): void {
		this.entities.push(...entities);
	}

	/**
	 * Remove a single entity from the scene
	 * @returns true if the entity was found and removed
	 */
	removeEntity(entity: Renderable): boolean {
		const idx = this.entities.indexOf(entity);
		if (idx >= 0) {
			this.entities.splice(idx, 1);
			return true;
		}
		return false;
	}

	/**
	 * Remove multiple entities from the scene
	 */
	removeEntities(entitiesToRemove: Renderable[]): void {
		for (const entity of entitiesToRemove) {
			this.removeEntity(entity);
		}
	}

	/**
	 * Clear all entities from the scene
	 */
	clear(): void {
		this.entities = [];
	}

	/**
	 * Get all entities (read-only access)
	 */
	getEntities(): ReadonlyArray<Renderable> {
		return this.entities;
	}

	/**
	 * Get mutable entities array (for legacy compatibility)
	 * @deprecated Use addEntities() instead
	 */
	getMutableEntities(): Renderable[] {
		return this.entities;
	}

	/**
	 * Get the number of entities in the scene
	 */
	getCount(): number {
		return this.entities.length;
	}
}
