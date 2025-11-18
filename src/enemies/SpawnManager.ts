import type { MeshAtlas } from "../assets/MeshAtlas.ts";
import type { StaticObject } from "../objects/StaticObject.ts";
import { createSphereCollider } from "../physics/Collider.ts";
import type { Physics } from "../physics/Physics.ts";
import type { Player } from "../objects/Player.ts";
import { StaticBush } from "../objects/StaticBush.ts";
import { StaticRock } from "../objects/StaticRock.ts";
import { StaticTree } from "../objects/StaticTree.ts";
import type { Renderable } from "../rendering/Renderable.ts";
import { Enemy } from "./Enemy.ts";
import {
	ENEMY_SPAWN_BORDER_PADDING,
	SCENERY_BORDER_PADDING,
	clampWorldAxis,
	getPlayableRadius,
} from "../systems/WorldBounds.ts";
import { FractalNoise2D } from "../systems/Noise.ts";

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

	/**
	 * Scatter static scenery using noise maps to create natural clumps of vegetation
	 * and sparse clearings. Uses two noise fields: one for density and one to bias
	 * bushes vs trees. A third field shapes where rocks show up (preferring low
	 * vegetation areas).
	 */
	spawnNaturalScenery(atlas: MeshAtlas, entities: Renderable[]): void {
		const playableRadius = getPlayableRadius(SCENERY_BORDER_PADDING);
		const minDistanceFromOrigin = 3.5; // Keep a small clearing around the player spawn

		// Noise fields controlling macro layout
		const densityNoise = new FractalNoise2D(
			Math.floor(Math.random() * 100000),
			{ baseFrequency: 0.018, octaves: 5, gain: 0.55 },
		);
		const typeNoise = new FractalNoise2D(Math.floor(Math.random() * 100000), {
			baseFrequency: 0.032,
			octaves: 3,
			gain: 0.5,
		});
		const rockNoise = new FractalNoise2D(Math.floor(Math.random() * 100000), {
			baseFrequency: 0.025,
			octaves: 4,
			gain: 0.6,
		});

		type Placement = { x: number; z: number; radius: number };
		const placements: Placement[] = [];

		const attemptCount = 520;
		for (let i = 0; i < attemptCount; i++) {
			// Sample a candidate position across the playable ring
			const angle = Math.random() * Math.PI * 2;
			const distance =
				minDistanceFromOrigin +
				Math.random() * Math.max(0, playableRadius - minDistanceFromOrigin);
			const x = clampWorldAxis(
				Math.cos(angle) * distance,
				SCENERY_BORDER_PADDING,
			);
			const z = clampWorldAxis(
				Math.sin(angle) * distance,
				SCENERY_BORDER_PADDING,
			);

			const density = densityNoise.sample(x, z); // 0 -> barren, 1 -> dense forest
			const typeBias = typeNoise.sample(x + 100, z + 100);
			const rockBias = rockNoise.sample(x - 50, z + 25);

			const vegetationTier = this.getVegetationTier(density);
			if (Math.random() > this.getCoverageChance(vegetationTier, density)) {
				continue;
			}

			const spawnType = this.chooseVegetationType(
				vegetationTier,
				density,
				typeBias,
				rockBias,
			);

			if (!spawnType) continue;

			switch (spawnType) {
				case "bush": {
					const bush = new StaticBush(atlas.getRandomBush());
					this.placeStaticObject(
						bush,
						x,
						z,
						{
							yOffset: -0.4,
							scaleRange: [0.8, 1.25],
							spacingRadius: 0.6,
						},
						placements,
						entities,
					);
					break;
				}
				case "tree": {
					const tree = new StaticTree(atlas.getRandomTree());
					// Taller, tighter trees in dense regions for a canopy feel
					const scaleBoost = this.remap(density, 0.2, 1, 0.9, 1.25);
					this.placeStaticObject(
						tree,
						x,
						z,
						{
							yOffset: -0.6,
							scaleRange: [0.8 * scaleBoost, 1.25 * scaleBoost],
							colliderRadius: 0.5,
							spacingRadius: 1.1,
						},
						placements,
						entities,
					);
					break;
				}
				case "rock": {
					const rock = new StaticRock(atlas.getRandomRock());
					this.placeStaticObject(
						rock,
						x,
						z,
						{
							yOffset: -0.5,
							scaleRange: [0.7, 1.35],
							colliderRadius: 0.6,
							spacingRadius: 0.95,
						},
						placements,
						entities,
					);
					break;
				}
			}
		}
	}

	private getVegetationTier(
		density: number,
	): "clear" | "light" | "mixed" | "dense" {
		if (density < 0.2) return "clear";
		if (density < 0.45) return "light";
		if (density < 0.7) return "mixed";
		return "dense";
	}

	private getCoverageChance(
		tier: "clear" | "light" | "mixed" | "dense",
		density: number,
	): number {
		switch (tier) {
			case "clear":
				return 0.22 * (0.6 + density * 0.8);
			case "light":
				return 0.5 + density * 0.25;
			case "mixed":
				return 0.75 + density * 0.2;
			case "dense":
				return 0.9 + density * 0.08;
		}
	}

	private remap(
		value: number,
		inMin: number,
		inMax: number,
		outMin: number,
		outMax: number,
	): number {
		const clamped = Math.min(Math.max(value, inMin), inMax);
		const t = (clamped - inMin) / (inMax - inMin);
		return outMin + t * (outMax - outMin);
	}

	private chooseVegetationType(
		tier: "clear" | "light" | "mixed" | "dense",
		density: number,
		typeBias: number,
		rockBias: number,
	): "bush" | "tree" | "rock" | null {
		const weights = {
			bush: 0,
			tree: 0,
			rock: 0,
		};

			switch (tier) {
				case "clear":
					weights.rock = 0.65;
					weights.bush = 0.06;
					weights.tree = 0.1;
					break;
				case "light":
					weights.bush = 0.35;
					weights.tree = 0.45;
					weights.rock = 0.5;
					break;
				case "mixed":
					weights.bush = 0.3;
					weights.tree = 0.55;
					weights.rock = 0.3;
					break;
				case "dense":
					weights.bush = 0.15;
					weights.tree = 0.75;
					weights.rock = 0.12;
					break;
			}

		// Tilt tree vs bush composition by noise for regional differences
		const treeBias = 0.8 + typeBias * 0.6;
		weights.tree *= treeBias;
		weights.bush *= 1.1 - typeBias * 0.4;

		// Rocks show up more when vegetation density is low
		const rockFactor = (1 - density) * (0.6 + rockBias * 0.6);
		weights.rock *= rockFactor;

		const total = weights.bush + weights.tree + weights.rock;

		if (total <= 0.0001) return null;

		const roll = Math.random() * total;
		if (roll < weights.bush) return "bush";
		if (roll < weights.bush + weights.tree) return "tree";
		return "rock";
	}

	private placeStaticObject<T extends StaticObject>(
		obj: T,
		x: number,
		z: number,
		config: {
			yOffset: number;
			scaleRange: [number, number];
			colliderRadius?: number;
			spacingRadius?: number;
		},
		placements: { x: number; z: number; radius: number }[],
		entities: Renderable[],
	): void {
		const scale =
			config.scaleRange[0] +
			Math.random() * (config.scaleRange[1] - config.scaleRange[0]);
		const spacingRadius = (config.spacingRadius ?? 0) * scale;

		if (
			spacingRadius > 0 &&
			!this.registerPlacement(x, z, spacingRadius, placements)
		) {
			return;
		}

		obj.setPosition(x, config.yOffset, z);
		obj.setRotationFromEuler(0, Math.random() * 360, 0);
		obj.setUniformScale(scale);

		if (config.colliderRadius !== undefined) {
			const collider = createSphereCollider(
				obj.position,
				config.colliderRadius * scale,
				2,
				0xffffffff,
			);
			obj.collider = collider;
			this.physics.addCollider(collider);
		}

		if (spacingRadius > 0) {
			placements.push({ x, z, radius: spacingRadius });
		}

		entities.push(obj);
	}

	private registerPlacement(
		x: number,
		z: number,
		radius: number,
		placements: { x: number; z: number; radius: number }[],
	): boolean {
		for (const placement of placements) {
			const dx = placement.x - x;
			const dz = placement.z - z;
			const minDist = placement.radius + radius;
			if (dx * dx + dz * dz < minDist * minDist) {
				return false;
			}
		}

		return true;
	}
}
