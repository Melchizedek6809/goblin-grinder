import { vec3 } from "gl-matrix";
import { Mesh } from "./assets/Mesh.ts";
import { MeshAtlas } from "./assets/MeshAtlas.ts";
import { NoiseTexture } from "./assets/NoiseTexture.ts";
import type { Enemy } from "./enemies/Enemy.ts";
import { SpawnManager } from "./enemies/SpawnManager.ts";
import { CompositeInput } from "./input/CompositeInput.ts";
import type { InputSource } from "./input/InputSource.ts";
import { KeyboardInput } from "./input/KeyboardInput.ts";
import { MouseInput } from "./input/MouseInput.ts";
import { TouchInput } from "./input/TouchInput.ts";
import { Entity } from "./objects/Entity.ts";
import { StaticBush } from "./objects/StaticBush.ts";
import { StaticGrass } from "./objects/StaticGrass.ts";
import { StaticRock } from "./objects/StaticRock.ts";
import { StaticTree } from "./objects/StaticTree.ts";
import { createSphereCollider } from "./physics/Collider.ts";
import { Physics } from "./physics/Physics.ts";
import { Player } from "./objects/Player.ts";
import { Camera } from "./rendering/Camera.ts";
import { DebugRenderer } from "./rendering/DebugRenderer.ts";
import { Light } from "./rendering/Light.ts";
import { Renderer } from "./rendering/Renderer.ts";
import { Shader } from "./rendering/Shader.ts";
import { CombatSystem } from "./systems/CombatSystem.ts";
import { EntityManager } from "./systems/EntityManager.ts";
import { ProjectileManager } from "./systems/ProjectileManager.ts";
import { RewardSystem } from "./systems/RewardSystem.ts";
import { GameState, UIManager } from "./systems/UIManager.ts";
import { UpgradeSystem, type Upgrade } from "./systems/UpgradeSystem.ts";
import { ParticleSystem } from "./vfx/ParticleSystem.ts";
import { FireballWeapon } from "./weapons/FireballWeapon.ts";
import fragmentShaderSource from "./shaders/basic.frag?raw";
import vertexShaderSource from "./shaders/basic.vert?raw";
import depthFragmentShaderSource from "./shaders/depth.frag?raw";
import depthVertexShaderSource from "./shaders/depth.vert?raw";
import depthSkinnedVertexShaderSource from "./shaders/depth-skinned.vert?raw";
import particleFragmentShaderSource from "./shaders/particle.frag?raw";
import particleVertexShaderSource from "./shaders/particle.vert?raw";
import skinnedFragmentShaderSource from "./shaders/skinned.frag?raw";
import skinnedVertexShaderSource from "./shaders/skinned.vert?raw";
import {
	SCENERY_BORDER_PADDING,
	WORLD_SIZE,
	getPlayableRadius,
} from "./systems/WorldBounds.ts";
import "./components/top-bar.ts";
import "./components/main-menu.ts";
import "./components/game-over-screen.ts";
import "./components/level-up-modal.ts";

export class Game {
	public readonly rootElement: HTMLElement;
	public readonly canvasElement: HTMLCanvasElement;
	public gl: WebGL2RenderingContext | null = null;
	public width = 0;
	public height = 0;

	// Core systems
	private entityManager: EntityManager = new EntityManager();
	private uiManager: UIManager = new UIManager();
	private projectileManager: ProjectileManager = new ProjectileManager();
	private combatSystem: CombatSystem = new CombatSystem();
	private rewardSystem: RewardSystem = new RewardSystem();

	// Rendering
	private shader: Shader | null = null;
	private skinnedShader: Shader | null = null;
	private depthShader: Shader | null = null;
	private depthSkinnedShader: Shader | null = null;
	private particleShader: Shader | null = null;
	private renderer: Renderer | null = null;
	private camera: Camera | null = null;
	private light: Light | null = null;
	private noiseTexture: NoiseTexture | null = null;
	private cloudOffset: number = 0;

	// Game objects
	public player: Player | null = null;
	private enemies: Enemy[] = [];
	public particleSystem: ParticleSystem | null = null;

	// Input and physics
	private inputSource: InputSource;
	private physics: Physics = new Physics();
	private spawnManager: SpawnManager | null = null;

	// Debug
	private debugRenderer: DebugRenderer | null = null;
	private debugMode: boolean = false;

	// Game loop
	private lastFrameTime: number = 0;
	private readonly fixedTimestep: number = 1 / 30; // 30 updates per second
	private accumulator: number = 0;

	// Game state
	private gameState: GameState = GameState.MENU;
	private paused: boolean = false;
	private isLoading: boolean = false;

	// Cache for loaded assets (to avoid reloading on restart)
	private cachedAtlas: MeshAtlas | null = null;

	// Background asset loading
	private assetsLoadingPromise: Promise<void> | null = null;

	// Public getters for systems (for compatibility with existing code)
	public get pickups() {
		return this.rewardSystem.getMutablePickups();
	}

	public get entities() {
		return this.entityManager.getMutableEntities();
	}

	public get coins() {
		return this.rewardSystem.getCoins();
	}

	public set coins(value: number) {
		// This is used by Coin.onCollect
		const current = this.rewardSystem.getCoins();
		if (value > current) {
			this.rewardSystem.addCoins(value - current);
		}
	}

	constructor(rootElement: HTMLElement) {
		this.rootElement = rootElement;
		const canvas = document.createElement("canvas");
		this.canvasElement = canvas;
		rootElement.append(canvas);

		// Initialize UI manager and set up event listeners
		this.uiManager.init().then(() => {
			this.uiManager.setupEventListeners(
				() => this.startGame(),
				() => this.restartGame(),
				() => this.backToMenu(),
			);

			// Listen for upgrade selection
			this.uiManager.setupUpgradeListener((upgrade) => {
				this.handleUpgradeSelected(upgrade);
			});

			// Check for skipMenu URL parameter
			const urlParams = new URLSearchParams(window.location.search);
			if (urlParams.get("skipMenu") === "1") {
				// Skip menu and start game immediately
				this.startGame();
			} else {
				// Initialize UI state (show menu)
				this.uiManager.updateVisibility(this.gameState);

				// Start loading assets in the background
				this.startBackgroundLoading();
			}
		});

		window.addEventListener("resize", this.resize.bind(this));
		this.resize();

		// Setup debug mode toggle (F3)
		window.addEventListener("keydown", (e) => {
			if (e.key === "F3") {
				e.preventDefault();
				this.debugMode = !this.debugMode;
			}
		});

		// Create composite input that supports keyboard, mouse, and touch
		this.inputSource = new CompositeInput([
			new KeyboardInput(),
			new MouseInput(),
			new TouchInput(),
		]);
		this.initContext();

		// Start render loop immediately (but game won't update until PLAYING state)
		this.draw();
	}

	private resize() {
		// Account for device pixel ratio (important for mobile/Retina displays)
		const dpr = window.devicePixelRatio || 1;
		this.width = this.canvasElement.clientWidth * dpr;
		this.height = this.canvasElement.clientHeight * dpr;
		this.canvasElement.width = this.width;
		this.canvasElement.height = this.height;
	}

	private initContext() {
		this.gl = this.canvasElement.getContext("webgl2", {
			alpha: false,
			antialias: false,
			powerPreference: "high-performance",
		});

		if (!this.gl) {
			console.error("WebGL2 not supported on this device");
			alert(
				"WebGL2 is not supported on this device. Please use a modern browser.",
			);
		}
	}

	/**
	 * Preload game assets in the background
	 */
	private async preloadAssets(): Promise<void> {
		if (!this.gl) {
			throw new Error("WebGL2 context not initialized");
		}

		// If assets are already cached, no need to load
		if (this.cachedAtlas) {
			return;
		}

		const gl = this.gl;
		const atlas = new MeshAtlas();
		await atlas.init(gl);
		this.cachedAtlas = atlas;
	}

	/**
	 * Start background loading and update UI state
	 */
	private startBackgroundLoading(): void {
		// Set loading state on main menu
		this.uiManager.setMainMenuLoading(true);

		// Start loading assets
		this.assetsLoadingPromise = this.preloadAssets()
			.then(() => {
				// Loading complete, update UI
				this.uiManager.setMainMenuLoading(false);
			})
			.catch((error) => {
				console.error("Failed to preload assets:", error);
				this.uiManager.setMainMenuLoading(false);
				// Don't show alert here - will handle error when user clicks Start Game
			});
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
		this.entityManager.clear();
		this.projectileManager.clear();
		this.combatSystem.clear();
		this.rewardSystem.reset();
		this.light = null;
		this.enemies = [];
		this.physics = new Physics();
		this.spawnManager = new SpawnManager(this.physics, gl);

		// Reset camera and shader state (only if not already initialized)
		if (!this.shader) {
			// Enable depth testing
			gl.enable(gl.DEPTH_TEST);
			gl.depthFunc(gl.LEQUAL);
			// Enable backface culling to skip rendering hidden triangles
			gl.enable(gl.CULL_FACE);
			gl.cullFace(gl.BACK);
			gl.frontFace(gl.CCW);

			// Create shaders
			this.shader = new Shader(gl, vertexShaderSource, fragmentShaderSource);
			this.skinnedShader = new Shader(
				gl,
				skinnedVertexShaderSource,
				skinnedFragmentShaderSource,
			);
			this.depthShader = new Shader(
				gl,
				depthVertexShaderSource,
				depthFragmentShaderSource,
			);
			this.depthSkinnedShader = new Shader(
				gl,
				depthSkinnedVertexShaderSource,
				depthFragmentShaderSource,
			);
			this.particleShader = new Shader(
				gl,
				particleVertexShaderSource,
				particleFragmentShaderSource,
			);

			// Create renderer
			this.renderer = new Renderer(gl, this.shader, this.skinnedShader);

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

		// Create camera (isometric-style view)
		this.camera = new Camera(gl);
		this.camera.setPosition(5, 8, 5);
		this.camera.setTarget(0, 0, 0);

		// Create light (rotated 30 degrees around Y axis)
		if (!this.depthShader) {
			throw new Error("Depth shader not initialized");
		}
		this.light = new Light(
			gl,
			this.depthShader,
			this.depthSkinnedShader,
			vec3.fromValues(2.93, 12, 10.93),
			vec3.fromValues(0, 0, 0),
			vec3.fromValues(1.0, 1.0, 0.95),
		);
		this.light.orthoSize = 18;

		// Create ground plane
		const planeMesh = Mesh.createPlane(gl);
		const ground = new Entity(planeMesh);
		ground.setPosition(0, -0.5, 0);
		ground.setScale(WORLD_SIZE, 1, WORLD_SIZE);
		this.entityManager.addEntity(ground);

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
		this.player = new Player(
			atlas.mage,
			atlas.mageAnimationController || undefined,
		);
		this.entityManager.addEntities(this.player.entities);

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
		this.spawnManager.spawnEnemy(
			atlas,
			5,
			-0.5,
			5,
			this.entityManager.getMutableEntities(),
			this.enemies,
		);
		this.spawnManager.spawnEnemy(
			atlas,
			-5,
			-0.5,
			-5,
			this.entityManager.getMutableEntities(),
			this.enemies,
		);

		// Spawn static objects
		this.spawnManager.spawnStaticObjects(
			() => new StaticTree(atlas.getRandomTree()),
			30,
			{
				yOffset: -0.6,
				minDistance: 5,
				maxDistance: getPlayableRadius(SCENERY_BORDER_PADDING),
				minScale: 0.8,
				maxScale: 1.2,
				colliderRadius: 0.5, // Trees have collision
			},
			this.entityManager.getMutableEntities(),
		);

		this.spawnManager.spawnStaticObjects(
			() => new StaticRock(atlas.getRandomRock()),
			20,
			{
				yOffset: -0.5,
				minDistance: 3,
				maxDistance: getPlayableRadius(SCENERY_BORDER_PADDING),
				minScale: 0.6,
				maxScale: 1.4,
				colliderRadius: 0.6, // Rocks have collision
			},
			this.entityManager.getMutableEntities(),
		);

		this.spawnManager.spawnStaticObjects(
			() => new StaticBush(atlas.getRandomBush()),
			25,
			{
				yOffset: -0.4,
				minDistance: 3,
				maxDistance: getPlayableRadius(SCENERY_BORDER_PADDING),
				minScale: 0.7,
				maxScale: 1.3,
				// No collider - bushes are passable
			},
			this.entityManager.getMutableEntities(),
		);

		this.spawnManager.spawnStaticObjects(
			() => new StaticGrass(atlas.getRandomGrass()),
			60,
			{
				yOffset: -0.5,
				minDistance: 2,
				maxDistance: getPlayableRadius(SCENERY_BORDER_PADDING),
				minScale: 0.8,
				maxScale: 1.3,
				// No collider - grass is fully walkable
			},
			this.entityManager.getMutableEntities(),
		);
	}

	/**
	 * Start a new game
	 */
	private async startGame() {
		// Prevent multiple simultaneous initialization
		if (this.isLoading) {
			return;
		}

		this.isLoading = true;
		this.uiManager.setMainMenuLoading(true);

		try {
			// If assets are still loading, wait for them
			if (this.assetsLoadingPromise) {
				this.uiManager.setMainMenuLoading(true);
				await this.assetsLoadingPromise;
				this.uiManager.setMainMenuLoading(false);
			}

			await this.initScene();
			this.setPaused(false);
			this.uiManager.hideLevelUpModal();
			this.gameState = GameState.PLAYING;
			this.uiManager.updateVisibility(this.gameState);
		} catch (error) {
			console.error("Failed to start game:", error);
			alert(
				`Failed to start game: ${error instanceof Error ? error.message : String(error)}`,
			);
			this.uiManager.setMainMenuLoading(false);
		} finally {
			this.isLoading = false;
		}
	}

	/**
	 * Restart the game from game over screen
	 */
	private async restartGame() {
		await this.initScene();
		this.setPaused(false);
		this.uiManager.hideLevelUpModal();
		this.gameState = GameState.PLAYING;
		this.uiManager.updateVisibility(this.gameState);
	}

	/**
	 * Return to main menu
	 */
	private backToMenu() {
		this.gameState = GameState.MENU;
		this.setPaused(false);
		this.uiManager.hideLevelUpModal();
		this.uiManager.setMainMenuLoading(false);
		this.uiManager.updateVisibility(this.gameState);
	}

	private updateCamera(deltaTime: number) {
		if (
			!this.camera ||
			!this.player ||
			this.gameState !== GameState.PLAYING ||
			this.paused
		)
			return;

		// Poll input state
		const input = this.inputSource.poll(this.camera.getAngle());

		// Handle camera rotation commands
		if (input.rotateLeft) {
			this.camera.rotateTo(this.camera.getTargetAngle() - Math.PI / 2);
		}
		if (input.rotateRight) {
			this.camera.rotateTo(this.camera.getTargetAngle() + Math.PI / 2);
		}

		// Handle smooth camera rotation (from mouse wheel or touch)
		if (input.rotationDelta !== 0) {
			this.camera.rotateBy(input.rotationDelta);
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

		// Update light to follow player
		if (this.player && this.light) {
			const playerPos = this.player.getPosition();
			// Keep the same relative offset (rotated 30 degrees around Y axis)
			this.light.followTarget(playerPos, 2.93, 12, 10.93);
		}

		// Draw the scene (pass time and noise texture for cloud shadows)
		if (this.renderer && this.noiseTexture) {
			this.renderer.render(
				this.entityManager.getEntities(),
				this.camera,
				this.light,
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
	 * Update UI elements (health, FPS, score, coins, etc.)
	 */
	private updateUI(deltaTime: number) {
		if (!this.player) return;

		// Update UI manager with current game stats
		this.uiManager.update(
			deltaTime,
			this.player.health,
			this.player.maxHealth,
			this.rewardSystem.getScore(),
			this.rewardSystem.getCoins(),
			this.player.getExperienceProgress(),
		);

		// Check for game over condition
		if (this.gameState === GameState.PLAYING && this.player.health <= 0) {
			this.gameState = GameState.GAME_OVER;
			this.uiManager.showGameOver(this.rewardSystem.getScore());
			this.uiManager.updateVisibility(this.gameState);
		}
	}

	/**
	 * Fixed timestep update - runs game logic at consistent 30fps
	 */
	private fixedUpdate() {
		if (!this.player || !this.particleSystem) return;
		if (this.paused) return;

		// Update player logic (only during gameplay)
		if (this.gameState === GameState.PLAYING) {
			// Update weapons
			for (const weapon of this.player.weapons) {
				weapon.update(
					this.player,
					this.enemies,
					(projectile) => this.projectileManager.spawn(projectile),
					this.particleSystem,
					(explosion) => this.combatSystem.addExplosion(explosion),
				);
			}

			// Update projectiles and check collisions
			this.projectileManager.update(
				this.fixedTimestep,
				this.enemies,
				this.physics,
			);

			// Process explosions
			this.combatSystem.processExplosions(this.enemies, this.particleSystem);

			// Update pickups and handle collection
			this.rewardSystem.updatePickups(
				this.fixedTimestep,
				this,
				this.entityManager,
			);

			// Remove despawned enemies
			const despawnedEnemies: Enemy[] = [];
			this.enemies = this.enemies.filter((enemy) => {
				if (enemy.shouldDespawn()) {
					despawnedEnemies.push(enemy);
					return false;
				}
				return true;
			});

			// Remove entities belonging to despawned enemies
			for (const enemy of despawnedEnemies) {
				this.entityManager.removeEntities(enemy.entities);
			}
		}

		// Update enemy AI (continues during game over)
		if (
			(this.gameState === GameState.PLAYING ||
				this.gameState === GameState.GAME_OVER) &&
			this.player
		) {
			for (const enemy of this.enemies) {
				enemy.update(this.player, this.fixedTimestep);
			}

			// Award points and drop coins for enemies that just entered death state
			this.rewardSystem.processEnemyRewards(
				this.enemies,
				this,
				this.cachedAtlas,
			);
		}

		this.checkLevelUpPending();
	}

	/**
	 * Apply movement interpolation - runs every render frame for smooth movement
	 */
	private applyMovement(deltaTime: number) {
		if (this.paused) {
			return;
		}

		// Update player animation/particles every frame using the most recent velocity
		if (this.gameState === GameState.PLAYING && this.player) {
			this.player.update(deltaTime, this.particleSystem ?? undefined);
		}

		// Apply enemy movement with physics (continues during game over)
		if (
			this.gameState === GameState.PLAYING ||
			this.gameState === GameState.GAME_OVER
		) {
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
			this.projectileManager.render(deltaTime);
		}

		// Enemy spawning (only during gameplay)
		if (this.gameState === GameState.PLAYING && this.spawnManager) {
			this.spawnManager.updateEnemySpawning(
				deltaTime,
				this.cachedAtlas,
				this.player,
				this.entityManager.getMutableEntities(),
				this.enemies,
			);
		}
	}

	private checkLevelUpPending(): void {
		if (!this.player || this.paused || this.gameState !== GameState.PLAYING) {
			return;
		}

		if (this.player.hasPendingLevelUp()) {
			this.openLevelUpModal();
		}
	}

	private openLevelUpModal(): void {
		if (!this.player) return;
		this.setPaused(true);

		// Get 3 random upgrades for the visible cards
		const visibleUpgrades = UpgradeSystem.getRandomUpgrades(3);

		// Get 1 mystery upgrade (potentially weighted toward rarity)
		const mysteryUpgrade = UpgradeSystem.getRandomUpgrade(
			visibleUpgrades.map((u) => u.id),
			true, // Weight toward higher rarity
		);

		// Show the modal with upgrades
		this.uiManager.showLevelUpModal(visibleUpgrades, mysteryUpgrade);
	}

	private handleUpgradeSelected(upgrade: Upgrade): void {
		if (!this.player) return;

		// Apply the upgrade effect
		upgrade.effect(this.player);

		// Level up the player
		this.player.levelUp();

		// Hide modal and unpause
		this.uiManager.hideLevelUpModal();
		this.setPaused(false);
	}

	private setPaused(value: boolean): void {
		this.paused = value;
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
