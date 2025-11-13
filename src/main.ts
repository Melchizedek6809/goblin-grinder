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
import { StaticBush } from "./StaticBush.ts";
import type { StaticObject } from "./StaticObject.ts";
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

export class Game {
	public readonly rootElement: HTMLElement;
	public readonly canvasElement: HTMLCanvasElement;
	public gl: WebGL2RenderingContext | null = null;
	public width = 0;
	public height = 0;

	private shader: Shader | null = null;
	private depthShader: Shader | null = null;
	private camera: Camera | null = null;
	private noiseTexture: NoiseTexture | null = null;
	private cloudOffset: number = 0;
	private entities: Renderable[] = [];
	private lights: Light[] = [];
	private player: Player | null = null;
	private enemies: Enemy[] = [];

	private inputSource: InputSource;
	private physics: Physics = new Physics();
	private debugRenderer: DebugRenderer | null = null;
	private debugMode: boolean = false;
	private lastFrameTime: number = 0;

	// Fixed timestep for game logic updates
	private readonly fixedTimestep: number = 1 / 30; // 30 updates per second
	private accumulator: number = 0;

	constructor(rootElement: HTMLElement) {
		this.rootElement = rootElement;
		const canvas = document.createElement("canvas");
		this.canvasElement = canvas;
		rootElement.append(canvas);

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
		this.initScene().then(() => {
			this.draw();
		});
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
	 * Helper to spawn multiple static objects with randomized placement
	 */
	private spawnStaticObjects<T extends StaticObject>(
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
	): void {
		for (let i = 0; i < count; i++) {
			const obj = factory();

			// Random position on the ground plane (avoiding the center)
			const angle = Math.random() * Math.PI * 2;
			const distance =
				config.minDistance +
				Math.random() * (config.maxDistance - config.minDistance);
			const x = Math.cos(angle) * distance;
			const z = Math.sin(angle) * distance;

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

			this.entities.push(obj);
		}
	}

	private async initScene() {
		if (!this.gl) {
			throw new Error("WebGL2 not supported");
		}

		const gl = this.gl;

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

		// Create debug renderer
		this.debugRenderer = new DebugRenderer(gl);

		// Generate cloud noise texture (512x512)
		this.noiseTexture = new NoiseTexture(gl, 512);

		// Random starting offset for clouds to avoid always seeing the same pattern
		this.cloudOffset = Math.random() * 10000;

		// Create camera (isometric-style view)
		this.camera = new Camera(gl, this.shader);
		this.camera.setPosition(5, 8, 5);
		this.camera.setTarget(0, 0, 0);

		// Create light (rotated 30 degrees around Y axis)
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

		// Load all meshes from atlas
		const atlas = new MeshAtlas();
		await atlas.init(gl);

		// Create player from atlas
		this.player = new Player(atlas.mage);
		this.entities.push(...this.player.entities);

		// Add collider to player (layer 0 = player, collide with everything except player layer)
		if (this.player.entities.length > 0) {
			const playerCollider = createSphereCollider(
				this.player.position,
				0.4, // radius
				0, // layer 0 = player
				0xfffffffe, // collide with all layers except 0
			);
			this.player.entities[0].collider = playerCollider;
			this.physics.addCollider(playerCollider);
		}

		// Create enemies (skeletons)
		const enemy1 = new Enemy(atlas.skeleton);
		enemy1.setPosition(3, -0.5, 2);
		enemy1.setRotation(Math.PI / 4); // Face toward player area
		this.entities.push(...enemy1.entities);
		this.enemies.push(enemy1);

		// Add collider to enemy1 (layer 1 = enemy, collide with everything including other enemies)
		if (enemy1.entities.length > 0) {
			const enemy1Collider = createSphereCollider(
				enemy1.position,
				0.4, // radius
				1, // layer 1 = enemy
				0xffffffff, // collide with all layers (including other enemies)
			);
			enemy1.entities[0].collider = enemy1Collider;
			this.physics.addCollider(enemy1Collider);
		}

		const enemy2 = new Enemy(atlas.skeleton);
		enemy2.setPosition(-4, -0.5, -3);
		enemy2.setRotation(-Math.PI / 3); // Face toward player area
		this.entities.push(...enemy2.entities);
		this.enemies.push(enemy2);

		// Add collider to enemy2 (layer 1 = enemy, collide with everything including other enemies)
		if (enemy2.entities.length > 0) {
			const enemy2Collider = createSphereCollider(
				enemy2.position,
				0.4, // radius
				1, // layer 1 = enemy
				0xffffffff, // collide with all layers (including other enemies)
			);
			enemy2.entities[0].collider = enemy2Collider;
			this.physics.addCollider(enemy2Collider);
		}

		// Spawn static objects
		this.spawnStaticObjects(() => new StaticTree(atlas.getRandomTree()), 30, {
			yOffset: -0.6,
			minDistance: 5,
			maxDistance: 35,
			minScale: 0.8,
			maxScale: 1.2,
			colliderRadius: 0.5, // Trees have collision
		});

		this.spawnStaticObjects(() => new StaticRock(atlas.getRandomRock()), 20, {
			yOffset: -0.5,
			minDistance: 3,
			maxDistance: 33,
			minScale: 0.6,
			maxScale: 1.4,
			colliderRadius: 0.6, // Rocks have collision
		});

		this.spawnStaticObjects(() => new StaticBush(atlas.getRandomBush()), 25, {
			yOffset: -0.4,
			minDistance: 3,
			maxDistance: 33,
			minScale: 0.7,
			maxScale: 1.3,
			// No collider - bushes are passable
		});
	}

	private updateCamera(deltaTime: number) {
		if (!this.camera || !this.player) return;

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

		// Draw debug visualization if enabled
		if (this.debugMode && this.debugRenderer && this.camera) {
			this.debugRenderer.renderColliders(this.physics, this.camera);
		}
	}

	/**
	 * Fixed timestep update - runs game logic at consistent 30fps
	 */
	private fixedUpdate() {
		if (!this.player) return;

		// Update player logic
		this.player.update(this.fixedTimestep);

		// Update enemy AI
		const playerPos = this.player.getPosition();
		for (const enemy of this.enemies) {
			enemy.update(playerPos);
		}
	}

	/**
	 * Apply movement interpolation - runs every render frame for smooth movement
	 */
	private applyMovement(deltaTime: number) {
		// Apply enemy movement with physics
		for (const enemy of this.enemies) {
			enemy.applyMovement(deltaTime, this.physics);
		}
	}
}

document.querySelectorAll<HTMLElement>("div#main-game").forEach((e) => {
	new Game(e);
});
