import type { MeshAtlas } from "../assets/MeshAtlas.ts";
import type { StaticObject } from "../objects/StaticObject.ts";
import { createSphereCollider } from "../physics/Collider.ts";
import type { Physics } from "../physics/Physics.ts";
import type { Player } from "../objects/Player.ts";
import type { Renderable } from "../rendering/Renderable.ts";
import { Enemy } from "./Enemy.ts";
import {
	ENEMY_SPAWN_BORDER_PADDING,
	SCENERY_BORDER_PADDING,
	clampWorldAxis,
	getPlayableRadius,
} from "../systems/WorldBounds.ts";

/**
 * Manages spawning of enemies and static objects
 */
export class SpawnManager {
	private physics: Physics;
	private gl: WebGL2RenderingContext;

	// Enemy spawning configuration
	private enemySpawnTimer: number = 0;
	private enemySpawnInterval: number = 3.0; // Spawn every 3 seconds
	private maxEnemies: number = 10;
	private spawnMinDistance: number = 6.0;
	private spawnMaxDistance: number = 8.0;
	private despawnDistance: number = 30.0;

	constructor(physics: Physics, gl: WebGL2RenderingContext) {
		this.physics = physics;
		this.gl = gl;
	}

	/**
	 * Update enemy spawn timer and spawn new enemies if needed
	 */
	updateEnemySpawning(
		deltaTime: number,
		atlas: MeshAtlas | null,
		player: Player | null,
		entities: Renderable[],
		enemies: Enemy[],
	): void {
		if (!atlas || !player) return;

		// Remove enemies that drifted too far away to keep the action near the player
		this.despawnDistantEnemies(player, entities, enemies);

		this.enemySpawnTimer += deltaTime;

		if (
			this.enemySpawnTimer >= this.enemySpawnInterval &&
			enemies.length < this.maxEnemies
		) {
			this.enemySpawnTimer = 0;

			// Determine group size (1-3 enemies)
			const groupSize = Math.min(
				1 + Math.floor(Math.random() * 3),
				this.maxEnemies - enemies.length,
			);

			// Spawn at a random position just outside the player's reach
			const playerPos = player.getPosition();
			const angle = Math.random() * Math.PI * 2;
			const distance =
				this.spawnMinDistance +
				Math.random() * (this.spawnMaxDistance - this.spawnMinDistance);
			const spawnX = playerPos[0] + Math.cos(angle) * distance;
			const spawnZ = playerPos[2] + Math.sin(angle) * distance;
			const safeSpawnX = clampWorldAxis(spawnX, ENEMY_SPAWN_BORDER_PADDING);
			const safeSpawnZ = clampWorldAxis(spawnZ, ENEMY_SPAWN_BORDER_PADDING);

			this.spawnEnemyGroup(
				atlas,
				safeSpawnX,
				safeSpawnZ,
				groupSize,
				entities,
				enemies,
			);
		}
	}

	/**
	 * Spawn a single enemy at the specified position
	 */
	spawnEnemy(
		atlas: MeshAtlas,
		x: number,
		y: number,
		z: number,
		entities: Renderable[],
		enemies: Enemy[],
	): void {
		const enemyInstance = atlas.createSkeletonEnemyInstance(this.gl);
		const enemy = new Enemy(enemyInstance);
		enemy.setPosition(x, y, z);

		// Face toward center (0, 0)
		const dx = -x;
		const dz = -z;
		enemy.setRotation(Math.atan2(dx, dz));

		entities.push(...enemy.entities);
		enemies.push(enemy);

		// Add collider (layer 1 = enemy, collide with everything including other enemies)
		if (enemy.entities.length > 0) {
			const collider = createSphereCollider(
				enemy.position,
				0.25, // radius
				1, // layer 1 = enemy
				0xffffffff, // collide with all layers
			);
			enemy.entities[0].collider = collider;
			this.physics.addCollider(collider);
		}
	}

	/**
	 * Spawn a group of enemies around a central point
	 */
	spawnEnemyGroup(
		atlas: MeshAtlas,
		centerX: number,
		centerZ: number,
		count: number,
		entities: Renderable[],
		enemies: Enemy[],
	): void {
		for (let i = 0; i < count; i++) {
			// Spread enemies in a small circle
			const angle = (Math.PI * 2 * i) / count;
			const radius = 1.0 + Math.random() * 1.0; // 1-2 units apart
			const x = clampWorldAxis(
				centerX + Math.cos(angle) * radius,
				ENEMY_SPAWN_BORDER_PADDING,
			);
			const z = clampWorldAxis(
				centerZ + Math.sin(angle) * radius,
				ENEMY_SPAWN_BORDER_PADDING,
			);
			this.spawnEnemy(atlas, x, -0.5, z, entities, enemies);
		}
	}

	/**
	 * Despawn enemies that are too far from the player (keeps action nearby)
	 */
	private despawnDistantEnemies(
		player: Player,
		entities: Renderable[],
		enemies: Enemy[],
	): void {
		const playerPos = player.getPosition();
		const maxDistanceSq = this.despawnDistance * this.despawnDistance;

		for (let i = enemies.length - 1; i >= 0; i--) {
			const enemy = enemies[i];
			const enemyPos = enemy.getPosition();
			const dx = enemyPos[0] - playerPos[0];
			const dz = enemyPos[2] - playerPos[2];
			const distSq = dx * dx + dz * dz;

			if (distSq > maxDistanceSq) {
				// Remove colliders from physics before dropping entities
				for (const entity of enemy.entities) {
					if (entity.collider) {
						this.physics.removeCollider(entity.collider);
					}
					const idx = entities.indexOf(entity);
					if (idx !== -1) {
						entities.splice(idx, 1);
					}
				}
				enemies.splice(i, 1);
			}
		}
	}

	/**
	 * Helper to spawn multiple static objects with randomized placement
	 */
	spawnStaticObjects<T extends StaticObject>(
		factory: () => T,
		count: number,
		config: {
			yOffset: number;
			minDistance: number;
			maxDistance: number;
			minScale: number;
			maxScale: number;
			colliderRadius?: number; // Optional collider
		},
		entities: Renderable[],
	): void {
		for (let i = 0; i < count; i++) {
			const obj = factory();

			// Random position on the ground plane (avoiding the center)
			const angle = Math.random() * Math.PI * 2;
			const playableRadius = getPlayableRadius(SCENERY_BORDER_PADDING);
			const maxDistance = Math.min(config.maxDistance, playableRadius);
			const minDistance = Math.min(config.minDistance, maxDistance);
			const distance =
				minDistance + Math.random() * Math.max(0, maxDistance - minDistance);
			const x = clampWorldAxis(
				Math.cos(angle) * distance,
				SCENERY_BORDER_PADDING,
			);
			const z = clampWorldAxis(
				Math.sin(angle) * distance,
				SCENERY_BORDER_PADDING,
			);

			obj.setPosition(x, config.yOffset, z);
			obj.setRotationFromEuler(0, Math.random() * 360, 0);

			const scale =
				config.minScale + Math.random() * (config.maxScale - config.minScale);
			obj.setUniformScale(scale);

			// Add collider if specified (layer 2 = environment, collide with all)
			if (config.colliderRadius !== undefined) {
				const collider = createSphereCollider(
					obj.position,
					config.colliderRadius * scale, // Scale collider with object
					2, // layer 2 = environment
					0xffffffff, // collide with all layers
				);
				obj.collider = collider;
				this.physics.addCollider(collider);
			}

			entities.push(obj);
		}
	}

	/**
	 * Reset spawn timer
	 */
	reset(): void {
		this.enemySpawnTimer = 0;
	}
}
