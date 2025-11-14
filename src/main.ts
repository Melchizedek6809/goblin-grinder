import { vec3 } from "gl-matrix";
import { Camera } from "./Camera.ts";
import { DebugRenderer } from "./DebugRenderer.ts";
import { Enemy } from "./Enemy.ts";
import { Entity } from "./Entity.ts";
import { Light } from "./Light.ts";
import { Mesh } from "./Mesh.ts";
import { MeshAtlas } from "./MeshAtlas.ts";
import { NoiseTexture } from "./NoiseTexture.ts";
import { Player } from "./Player.ts";
import type { Renderable } from "./Renderable.ts";
import { Shader } from "./Shader.ts";
import { SpawnManager } from "./SpawnManager.ts";
import { StaticBush } from "./StaticBush.ts";
import { StaticRock } from "./StaticRock.ts";
import { StaticTree } from "./StaticTree.ts";
import { KeyboardInput } from "./input/KeyboardInput.ts";
import type { InputSource } from "./input/InputSource.ts";
import { createSphereCollider } from "./physics/Collider.ts";
import { Physics } from "./physics/Physics.ts";
import fragmentShaderSource from "./shaders/basic.frag?raw";
import vertexShaderSource from "./shaders/basic.vert?raw";
import depthFragmentShaderSource from "./shaders/depth.frag?raw";
import depthVertexShaderSource from "./shaders/depth.vert?raw";
import particleVertexShaderSource from "./shaders/particle.vert?raw";
import particleFragmentShaderSource from "./shaders/particle.frag?raw";
import { ParticleSystem } from "./ParticleSystem.ts";
import type { Projectile } from "./Projectile.ts";
import type { Explosion } from "./Explosion.ts";
import { FireballWeapon } from "./weapons/FireballWeapon.ts";

// Import UI components
import type { HealthDisplay } from "./components/health-display.ts";
import type { FpsDisplay } from "./components/fps-display.ts";
import type { ScoreDisplay } from "./components/score-display.ts";
import type { MainMenu } from "./components/main-menu.ts";
import type { GameOverScreen } from "./components/game-over-screen.ts";
import "./components/health-display.ts";
import "./components/fps-display.ts";
import "./components/score-display.ts";
import "./components/main-menu.ts";
import "./components/game-over-screen.ts";

const GameState = {
	MENU: 0,
	PLAYING: 1,
	GAME_OVER: 2,
} as const;

type GameState = (typeof GameState)[keyof typeof GameState];

export class Game {
	public readonly rootElement: HTMLElement;
	public readonly canvasElement: HTMLCanvasElement;
	public gl: WebGL2RenderingContext | null = null;
	public width = 0;
	public height = 0;

	private shader: Shader | null = null;
	private depthShader: Shader | null = null;
	private particleShader: Shader | null = null;
	private camera: Camera | null = null;
	private noiseTexture: NoiseTexture | null = null;
	private cloudOffset: number = 0;
	private entities: Renderable[] = [];
	private lights: Light[] = [];
	private player: Player | null = null;
	private enemies: Enemy[] = [];
	private particleSystem: ParticleSystem | null = null;
	private projectiles: Projectile[] = [];
	private explosions: Explosion[] = [];

	private inputSource: InputSource;
	private physics: Physics = new Physics();
	private spawnManager: SpawnManager | null = null;
	private debugRenderer: DebugRenderer | null = null;
	private debugMode: boolean = false;
	private lastFrameTime: number = 0;

	// Fixed timestep for game logic updates
	private readonly fixedTimestep: number = 1 / 30; // 30 updates per second
	private accumulator: number = 0;

	// UI elements
	private healthDisplay: HealthDisplay | null = null;
	private fpsDisplay: FpsDisplay | null = null;
	private scoreDisplay: ScoreDisplay | null = null;
	private mainMenu: MainMenu | null = null;
	private gameOverScreen: GameOverScreen | null = null;

	// FPS tracking
	private fpsFrameTimes: number[] = [];
	private fpsUpdateCounter: number = 0;

	// Game state
	private gameState: GameState = GameState.MENU;
	private score: number = 0;

	// Cache for loaded assets (to avoid reloading on restart)
	private cachedAtlas: MeshAtlas | null = null;

	constructor(rootElement: HTMLElement) {
		this.rootElement = rootElement;
		const canvas = document.createElement("canvas");
		this.canvasElement = canvas;
		rootElement.append(canvas);

		// Get UI elements after custom elements are defined
		Promise.all([
			customElements.whenDefined("health-display"),
			customElements.whenDefined("fps-display"),
			customElements.whenDefined("score-display"),
			customElements.whenDefined("main-menu"),
			customElements.whenDefined("game-over-screen"),
		]).then(() => {
			this.healthDisplay = document.querySelector("health-display");
			this.fpsDisplay = document.querySelector("fps-display");
			this.scoreDisplay = document.querySelector("score-display");
			this.mainMenu = document.querySelector("main-menu");
			this.gameOverScreen = document.querySelector("game-over-screen");

			// Set up menu event listeners
			this.mainMenu?.addEventListener("start-game", () => this.startGame());
			this.gameOverScreen?.addEventListener("restart-game", () => this.restartGame());
			this.gameOverScreen?.addEventListener("back-to-menu", () => this.backToMenu());

			// Check for skipMenu URL parameter
			const urlParams = new URLSearchParams(window.location.search);
			if (urlParams.get("skipMenu") === "1") {
				// Skip menu and start game immediately
				this.startGame();
			} else {
				// Initialize UI state (show menu)
				this.updateUIVisibility();
			}
		});

		window.addEventListener("resize", this.resize.bind(this));
		this.resize();

		// Setup debug mode toggle (F3)
		window.addEventListener("keydown", (e) => {
			if (e.key === "F3") {
				e.preventDefault();
				this.debugMode = !this.debugMode;
				console.log(`Debug mode: ${this.debugMode ? "ON" : "OFF"}`);
			}
		});

		this.inputSource = new KeyboardInput();
		this.initContext();

		// Start render loop immediately (but game won't update until PLAYING state)
		this.draw();
	}

	private resize() {
		this.width = this.canvasElement.clientWidth;
		this.height = this.canvasElement.clientHeight;
		this.canvasElement.width = this.width;
		this.canvasElement.height = this.height;
	}

	private initContext() {
		this.gl = this.canvasElement.getContext("webgl2");
	}

	/**
	 * Initialize or reset the game scene
	 */
	private async initScene() {
		if (!this.gl) {
			throw new Error("WebGL2 not supported");
		}

		const gl = this.gl;

		// Clear existing game state
		this.entities = [];
		this.lights = [];
		this.enemies = [];
		this.projectiles = [];
		this.explosions = [];
		this.physics = new Physics();
		this.spawnManager = new SpawnManager(this.physics);
		this.score = 0;

		// Reset camera and shader state (only if not already initialized)
		if (!this.shader) {
			// Enable depth testing
			gl.enable(gl.DEPTH_TEST);
			gl.depthFunc(gl.LEQUAL);

			// Create shaders
			this.shader = new Shader(gl, vertexShaderSource, fragmentShaderSource);
			this.depthShader = new Shader(
				gl,
				depthVertexShaderSource,
				depthFragmentShaderSource,
			);
			this.particleShader = new Shader(
				gl,
				particleVertexShaderSource,
				particleFragmentShaderSource,
			);

			// Create debug renderer
			this.debugRenderer = new DebugRenderer(gl);

			// Generate cloud noise texture (512x512)
			this.noiseTexture = new NoiseTexture(gl, 512);

			// Random starting offset for clouds to avoid always seeing the same pattern
			this.cloudOffset = Math.random() * 10000;
		}

		// Create or reset particle system
		if (!this.particleShader) {
			throw new Error("Particle shader not initialized");
		}
		this.particleSystem = new ParticleSystem(gl, this.particleShader, 2000);

		// Create camera (isometric-style view) - shader is guaranteed to exist here
		if (!this.shader) {
			throw new Error("Shader not initialized");
		}
		this.camera = new Camera(gl, this.shader);
		this.camera.setPosition(5, 8, 5);
		this.camera.setTarget(0, 0, 0);

		// Create light (rotated 30 degrees around Y axis)
		if (!this.depthShader) {
			throw new Error("Depth shader not initialized");
		}
		const mainLight = new Light(
			gl,
			this.depthShader,
			vec3.fromValues(2.93, 12, 10.93),
			vec3.fromValues(0, 0, 0),
			vec3.fromValues(1.0, 1.0, 0.95),
		);
		mainLight.orthoSize = 15;
		this.lights.push(mainLight);

		// Create ground plane
		const planeMesh = Mesh.createPlane(gl);
		const ground = new Entity(planeMesh);
		ground.setPosition(0, -0.5, 0);
		ground.setScale(64, 1, 64);
		this.entities.push(ground);

		// Load or reuse cached atlas
		let atlas: MeshAtlas;
		if (this.cachedAtlas) {
			atlas = this.cachedAtlas;
		} else {
			atlas = new MeshAtlas();
			await atlas.init(gl);
			this.cachedAtlas = atlas;
		}

		// Create player from atlas
		this.player = new Player(atlas.mage);
		this.entities.push(...this.player.entities);

		// Add collider to player (layer 0 = player, collide with everything except player layer)
		if (this.player.entities.length > 0) {
			const playerCollider = createSphereCollider(
				this.player.position,
				0.35, // radius
				0, // layer 0 = player
				0xfffffffe, // collide with all layers except 0
			);
			this.player.entities[0].collider = playerCollider;
			this.physics.addCollider(playerCollider);
		}

		// Give player weapons
		this.player.weapons.push(new FireballWeapon());

		// Spawn initial enemies
		this.spawnManager.spawnEnemy(atlas, 5, -0.5, 5, this.entities, this.enemies);
		this.spawnManager.spawnEnemy(atlas, -5, -0.5, -5, this.entities, this.enemies);

		// Spawn static objects
		this.spawnManager.spawnStaticObjects(() => new StaticTree(atlas.getRandomTree()), 30, {
			yOffset: -0.6,
			minDistance: 5,
			maxDistance: 35,
			minScale: 0.8,
			maxScale: 1.2,
			colliderRadius: 0.5, // Trees have collision
		}, this.entities);

		this.spawnManager.spawnStaticObjects(() => new StaticRock(atlas.getRandomRock()), 20, {
			yOffset: -0.5,
			minDistance: 3,
			maxDistance: 33,
			minScale: 0.6,
			maxScale: 1.4,
			colliderRadius: 0.6, // Rocks have collision
		}, this.entities);

		this.spawnManager.spawnStaticObjects(() => new StaticBush(atlas.getRandomBush()), 25, {
			yOffset: -0.4,
			minDistance: 3,
			maxDistance: 33,
			minScale: 0.7,
			maxScale: 1.3,
			// No collider - bushes are passable
		}, this.entities);
	}

	/**
	 * Start a new game
	 */
	private async startGame() {
		await this.initScene();
		this.gameState = GameState.PLAYING;
		this.updateUIVisibility();
	}

	/**
	 * Restart the game from game over screen
	 */
	private async restartGame() {
		await this.initScene();
		this.gameState = GameState.PLAYING;
		this.updateUIVisibility();
	}

	/**
	 * Return to main menu
	 */
	private backToMenu() {
		this.gameState = GameState.MENU;
		this.updateUIVisibility();
	}

	/**
	 * Update UI element visibility based on game state
	 */
	private updateUIVisibility() {
		if (!this.mainMenu || !this.gameOverScreen || !this.healthDisplay || !this.scoreDisplay) {
			return;
		}

		switch (this.gameState) {
			case GameState.MENU:
				this.mainMenu.visible = true;
				this.gameOverScreen.visible = false;
				this.healthDisplay.style.display = "none";
				this.scoreDisplay.visible = false;
				break;
			case GameState.PLAYING:
				this.mainMenu.visible = false;
				this.gameOverScreen.visible = false;
				this.healthDisplay.style.display = "block";
				this.scoreDisplay.visible = true;
				break;
			case GameState.GAME_OVER:
				this.mainMenu.visible = false;
				this.gameOverScreen.visible = true;
				this.gameOverScreen.score = this.score;
				this.healthDisplay.style.display = "none";
				this.scoreDisplay.visible = false;
				break;
		}
	}

	private updateCamera(deltaTime: number) {
		if (!this.camera || !this.player || this.gameState !== GameState.PLAYING) return;

		// Poll input state
		const input = this.inputSource.poll(this.camera.getAngle());

		// Handle camera rotation commands
		if (input.rotateLeft) {
			this.camera.rotateTo(this.camera.getTargetAngle() - Math.PI / 2);
		}
		if (input.rotateRight) {
			this.camera.rotateTo(this.camera.getTargetAngle() + Math.PI / 2);
		}

		// Move player (with physics collision)
		this.player.move(input.moveX, input.moveZ, deltaTime, this.physics);

		// Update camera to follow player
		this.camera.setFollowTarget(this.player.getPosition());
		this.camera.updateFollow(deltaTime);
	}

	private draw(timestamp: number = 0) {
		requestAnimationFrame(this.draw.bind(this));

		if (!this.gl || !this.camera) {
			return;
		}

		const gl = this.gl;

		// Calculate delta time (convert from milliseconds to seconds)
		const deltaTime =
			this.lastFrameTime === 0
				? 1 / 60 // First frame fallback
				: Math.min((timestamp - this.lastFrameTime) / 1000, 0.1); // Cap at 100ms
		this.lastFrameTime = timestamp;

		// Add to accumulator for fixed timestep updates
		this.accumulator += deltaTime;

		// Run fixed timestep updates (game logic at 30fps)
		while (this.accumulator >= this.fixedTimestep) {
			this.fixedUpdate();
			this.accumulator -= this.fixedTimestep;
		}

		// Update camera controls (every frame for responsive input)
		this.updateCamera(deltaTime);

		// Apply movement interpolation for smooth rendering (every frame)
		this.applyMovement(deltaTime);

		// Clear
		gl.clearColor(0.1, 0.1, 0.15, 1);
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

		// Update lights to follow player
		if (this.player && this.lights.length > 0) {
			const playerPos = this.player.getPosition();
			// Keep the same relative offset (rotated 30 degrees around Y axis)
			this.lights[0].followTarget(playerPos, 2.93, 12, 10.93);
		}

		// Draw the scene (pass time and noise texture for cloud shadows)
		if (this.noiseTexture) {
			this.camera.draw(
				this.entities,
				this.lights,
				timestamp / 1000 + this.cloudOffset,
				this.noiseTexture.texture,
			);
		}

		// Draw particles (with alpha blending)
		if (this.particleSystem && this.camera) {
			// Enable blending for particles
			gl.enable(gl.BLEND);
			gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
			gl.depthMask(false); // Don't write to depth buffer

			this.particleSystem.render(
				this.camera.getViewMatrix(),
				this.camera.getProjectionMatrix(),
			);

			// Restore state
			gl.depthMask(true);
			gl.disable(gl.BLEND);
		}

		// Draw debug visualization if enabled
		if (this.debugMode && this.debugRenderer && this.camera) {
			this.debugRenderer.renderColliders(this.physics, this.camera);
		}

		// Update UI
		this.updateUI(deltaTime);
	}

	/**
	 * Update UI elements (health, FPS, score, etc.)
	 */
	private updateUI(deltaTime: number) {
		// Update health display
		if (this.healthDisplay && this.player) {
			this.healthDisplay.health = this.player.health;
			this.healthDisplay.maxHealth = this.player.maxHealth;
		}

		// Update score display
		if (this.scoreDisplay) {
			this.scoreDisplay.score = this.score;
		}

		// Calculate FPS (rolling average over last 60 frames)
		if (deltaTime > 0) {
			this.fpsFrameTimes.push(1 / deltaTime);
			if (this.fpsFrameTimes.length > 60) {
				this.fpsFrameTimes.shift();
			}
		}

		// Update FPS display (only every 10 frames to reduce jitter)
		this.fpsUpdateCounter++;
		if (this.fpsUpdateCounter >= 10 && this.fpsDisplay) {
			const avgFps =
				this.fpsFrameTimes.reduce((a, b) => a + b, 0) /
				this.fpsFrameTimes.length;
			this.fpsDisplay.fps = avgFps;
			this.fpsDisplay.visible = this.debugMode;
			this.fpsUpdateCounter = 0;
		}

		// Check for game over condition
		if (this.gameState === GameState.PLAYING && this.player && this.player.health <= 0) {
			this.gameState = GameState.GAME_OVER;
			this.updateUIVisibility();
		}
	}

	/**
	 * Fixed timestep update - runs game logic at consistent 30fps
	 */
	private fixedUpdate() {
		if (!this.player) return;

		// Update player logic (only during gameplay)
		if (this.gameState === GameState.PLAYING) {
			this.player.update(this.fixedTimestep);

			// Update weapons
			if (this.particleSystem) {
				for (const weapon of this.player.weapons) {
					weapon.update(
						this.player,
						this.enemies,
						(projectile) => {
							this.projectiles.push(projectile);
						},
						this.particleSystem,
						(explosion) => {
							this.explosions.push(explosion);
						},
					);
				}
			}

			// Update projectiles
			for (const projectile of this.projectiles) {
				projectile.update(this.fixedTimestep);

				// Check collision with static objects (trees, rocks) - XZ plane only
				const hitObstacle = this.physics.overlapSphere(
					vec3.fromValues(projectile.position[0], -0.5, projectile.position[2]),
					0.2, // smaller projectile collision radius
					3, // projectile layer
					0x00000004, // only collide with layer 2 (environment)
				);

				if (hitObstacle) {
					const shouldDestroy = projectile.onHitObstacle();
					if (shouldDestroy) {
						projectile.destroy();
						continue; // Skip enemy check if destroyed
					}
				}

				// Check collision with enemies - XZ plane only
				for (const enemy of this.enemies) {
					if (enemy.getState() === "death") continue; // Skip dead enemies

					// Calculate XZ distance only
					const dx = projectile.position[0] - enemy.getPosition()[0];
					const dz = projectile.position[2] - enemy.getPosition()[2];
					const distXZ = Math.sqrt(dx * dx + dz * dz);

					// Smaller collision radius: enemy (0.25) + projectile (0.2) = 0.45
					if (distXZ < 0.5) {
						console.log(`Projectile hit enemy at distance ${distXZ.toFixed(2)}`);
						const shouldDestroy = projectile.onHit(enemy);
						if (shouldDestroy) {
							projectile.destroy();
						}
						break; // Only hit one enemy
					}
				}
			}

			// Handle explosions (deal damage immediately)
			if (this.particleSystem) {
				for (const explosion of this.explosions) {
					explosion.dealDamage(this.enemies);
					explosion.spawnParticles(this.particleSystem);
				}
			}
			this.explosions = []; // Clear explosions after processing

			// Remove dead projectiles
			this.projectiles = this.projectiles.filter((p) => p.isAlive);

			// Remove despawned enemies and update score
			const despawnedEnemies: Enemy[] = [];
			this.enemies = this.enemies.filter((enemy) => {
				if (enemy.shouldDespawn()) {
					despawnedEnemies.push(enemy);
					return false;
				}
				return true;
			});

			// Update score for killed enemies
			if (despawnedEnemies.length > 0) {
				this.score += despawnedEnemies.length * 100; // 100 points per kill

				// Remove entities belonging to despawned enemies
				for (const enemy of despawnedEnemies) {
					for (const entity of enemy.entities) {
						const idx = this.entities.indexOf(entity);
						if (idx >= 0) {
							this.entities.splice(idx, 1);
						}
					}
				}
			}
		}

		// Update enemy AI (continues during game over)
		if ((this.gameState === GameState.PLAYING || this.gameState === GameState.GAME_OVER) && this.player) {
			for (const enemy of this.enemies) {
				enemy.update(this.player);
			}
		}
	}

	/**
	 * Apply movement interpolation - runs every render frame for smooth movement
	 */
	private applyMovement(deltaTime: number) {
		// Apply enemy movement with physics (continues during game over)
		if (this.gameState === GameState.PLAYING || this.gameState === GameState.GAME_OVER) {
			for (const enemy of this.enemies) {
				enemy.applyMovement(deltaTime, this.physics);
			}
		}

		// Update particle system (every frame for smooth animation)
		if (this.particleSystem) {
			this.particleSystem.update(deltaTime);
		}

		// Render projectiles (update their particle effects)
		if (this.gameState === GameState.PLAYING) {
			for (const projectile of this.projectiles) {
				projectile.render(deltaTime);
			}
		}

		// Enemy spawning (only during gameplay)
		if (this.gameState === GameState.PLAYING && this.spawnManager) {
			this.spawnManager.updateEnemySpawning(
				deltaTime,
				this.cachedAtlas,
				this.player,
				this.entities,
				this.enemies,
			);
		}
	}

	/**
	 * Clean up resources when the game is destroyed
	 */
	destroy(): void {
		// Clean up input event listeners
		this.inputSource.destroy();

		// Clean up window resize listener
		window.removeEventListener("resize", this.resize.bind(this));

		// Note: Physics colliders are automatically cleared when creating a new Physics instance in initScene
		// WebGL resources (shaders, buffers, textures) are tied to the GL context and will be cleaned up
		// when the context is lost or the canvas is removed
	}
}

document.querySelectorAll<HTMLElement>("div#main-game").forEach((e) => {
	new Game(e);
});
