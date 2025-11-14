import { vec3 } from "gl-matrix";
import type { Mesh } from "../assets/Mesh.ts";
import type { MeshAtlas } from "../assets/MeshAtlas.ts";
import type { Game } from "../main.ts";
import { Particle } from "../vfx/Particle.ts";
import { Pickup } from "./Pickup.ts";

export class ExperiencePickup extends Pickup {
	private amount: number;
	private particleTimer: number = 0;
	private particleSpawnRate: number = 0.15;

	private isSpawnAnimating: boolean = false;
	private spawnAnimationTime: number = 0;
	private spawnAnimationDuration: number = 0.8;
	private spawnJumpHeight: number = 1.0;
	private targetScaleX: number = 0.125;
	private targetScaleY: number = 0.25;
	private targetScaleZ: number = 0.125;
	private spawnStartX: number = 0;
	private spawnStartZ: number = 0;
	private spawnTargetX: number = 0;
	private spawnTargetZ: number = 0;
	private spawnRotationAngle: number = 0;
	private spawnRotationSpeed: number = 150;

	constructor(
		mesh: Mesh,
		amount: number,
		x: number,
		y: number,
		z: number,
		playSpawnAnimation: boolean = false,
	) {
		super(mesh, x, y, z);
		this.amount = amount;

		if (playSpawnAnimation) {
			this.isSpawnAnimating = true;
			this.applySpawnScale(0);
			this.configureSpawnArc(x, z);
		} else {
			this.applySpawnScale(1);
		}
	}

	private applySpawnScale(multiplier: number): void {
		this.setScale(
			this.targetScaleX * multiplier,
			this.targetScaleY * multiplier,
			this.targetScaleZ * multiplier,
		);
	}

	private configureSpawnArc(x: number, z: number): void {
		this.spawnStartX = x;
		this.spawnStartZ = z;
		const angle = Math.random() * Math.PI * 2;
		const radius = 0.6 + Math.random() * 0.9;
		this.spawnTargetX = x + Math.cos(angle) * radius;
		this.spawnTargetZ = z + Math.sin(angle) * radius;
		this.spawnRotationAngle = Math.random() * 360;
	}

	public update(deltaTime: number, game: Game): boolean {
		if (this.isSpawnAnimating) {
			this.spawnAnimationTime += deltaTime;
			const t = Math.min(
				this.spawnAnimationTime / this.spawnAnimationDuration,
				1.0,
			);
			const easeT = 1 - (1 - t) ** 3;
			this.applySpawnScale(easeT);

			const peak = this.spawnJumpHeight;
			const base = this.baseY;
			const a = -4 * (peak - 0.5 * base);
			const b = 4 * peak - base;
			const jumpY = a * t * t + b * t;
			this.position[1] = jumpY;

			this.position[0] =
				this.spawnStartX + (this.spawnTargetX - this.spawnStartX) * easeT;
			this.position[2] =
				this.spawnStartZ + (this.spawnTargetZ - this.spawnStartZ) * easeT;

			this.spawnRotationAngle += this.spawnRotationSpeed * deltaTime;
			const rotationRadians = (this.spawnRotationAngle * Math.PI) / 180;
			this.setRotationFromEuler(0, rotationRadians, 0);

			if (t >= 1.0) {
				this.isSpawnAnimating = false;
				this.applySpawnScale(1);
				this.position[0] = this.spawnTargetX;
				this.position[2] = this.spawnTargetZ;
				this.position[1] = this.baseY;
			}

			return false;
		}

		const shouldRemove = super.update(deltaTime, game);
		if (shouldRemove) {
			return true;
		}

		if (game.particleSystem) {
			this.particleTimer += deltaTime;
			if (this.particleTimer >= this.particleSpawnRate) {
				this.particleTimer = 0;
				const particleCount = Math.floor(Math.random() * 2) + 1;
				for (let i = 0; i < particleCount; i++) {
					const offsetX = (Math.random() - 0.5) * 0.35;
					const offsetZ = (Math.random() - 0.5) * 0.35;
					const offsetY = Math.random() * 0.4;

					const particlePos = vec3.fromValues(
						this.position[0] + offsetX,
						this.position[1] + offsetY,
						this.position[2] + offsetZ,
					);

					const velocity = vec3.fromValues(
						(Math.random() - 0.5) * 0.15,
						Math.random() * 0.5 + 0.2,
						(Math.random() - 0.5) * 0.15,
					);

					const color = vec3.fromValues(0.4 + Math.random() * 0.2, 0.75, 1.0);
					const endColor = vec3.fromValues(0.2, 0.5 + Math.random() * 0.3, 1.0);

					const particle = new Particle(
						particlePos,
						velocity,
						color,
						4.0 + Math.random() * 4.0,
						0.4,
						0.0,
						endColor,
						1.0,
						"additive",
					);

					game.particleSystem.spawn(particle);
				}
			}
		}

		return false;
	}

	protected onCollect(game: Game): void {
		if (game.player) {
			game.player.addExperience(this.amount);
		}

		if (game.particleSystem && game.player) {
			const particleCount = Math.min(this.amount * 2, 40);
			const playerPos = game.player.position;
			for (let i = 0; i < particleCount; i++) {
				const offsetX = (Math.random() - 0.5) * 0.4;
				const offsetY = Math.random() * 0.3;
				const offsetZ = (Math.random() - 0.5) * 0.4;

				const particlePos = vec3.fromValues(
					this.position[0] + offsetX,
					this.position[1] + offsetY,
					this.position[2] + offsetZ,
				);

				const dx = playerPos[0] - particlePos[0];
				const dy = playerPos[1] - particlePos[1];
				const dz = playerPos[2] - particlePos[2];
				const dist = Math.max(Math.sqrt(dx * dx + dy * dy + dz * dz), 0.001);
				const speed = 3.0 + Math.random() * 2.0;
				const velocity = vec3.fromValues(
					(dx / dist) * speed + (Math.random() - 0.5) * 0.4,
					(dy / dist) * speed + Math.random() * 0.5,
					(dz / dist) * speed + (Math.random() - 0.5) * 0.4,
				);

				const color = vec3.fromValues(0.3 + Math.random() * 0.2, 0.8, 1.0);
				const endColor = vec3.fromValues(0.2, 0.5 + Math.random() * 0.3, 1.0);

				const particle = new Particle(
					particlePos,
					velocity,
					color,
					6.0 + Math.random() * 6.0,
					0.5,
					0.0,
					endColor,
					2.0,
					"additive",
				);

				game.particleSystem.spawn(particle);
			}
		}
	}

	public static spawn(
		game: Game,
		atlas: MeshAtlas,
		amount: number,
		x: number,
		y: number,
		z: number,
		playSpawnAnimation: boolean = false,
	): ExperiencePickup | null {
		if (!atlas.shard) {
			console.warn("Shard mesh not loaded; cannot spawn experience pickup");
			return null;
		}

		const pickup = new ExperiencePickup(
			atlas.shard,
			amount,
			x,
			y,
			z,
			playSpawnAnimation,
		);
		game.pickups.push(pickup);
		game.entities.push(pickup);
		return pickup;
	}
}
