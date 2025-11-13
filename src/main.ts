import { vec3 } from "gl-matrix";
import { Camera } from "./Camera.ts";
import { Entity } from "./Entity.ts";
import { Light } from "./Light.ts";
import { Mesh } from "./Mesh.ts";
import { MeshAtlas } from "./MeshAtlas.ts";
import { Player } from "./Player.ts";
import type { Renderable } from "./Renderable.ts";
import { Shader } from "./Shader.ts";
import { StaticBush } from "./StaticBush.ts";
import type { StaticObject } from "./StaticObject.ts";
import { StaticRock } from "./StaticRock.ts";
import { StaticTree } from "./StaticTree.ts";
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
	private entities: Renderable[] = [];
	private lights: Light[] = [];
	private player: Player | null = null;

	private pressedKeys: Set<string> = new Set();
	private lastFrameTime: number = 0;

	constructor(rootElement: HTMLElement) {
		this.rootElement = rootElement;
		const canvas = document.createElement("canvas");
		this.canvasElement = canvas;
		rootElement.append(canvas);

		window.addEventListener("resize", this.resize.bind(this));
		this.resize();

		this.setupInput();
		this.initContext();
		this.initScene().then(() => {
			this.draw();
		});
	}

	private setupInput() {
		window.addEventListener("keydown", (e) => {
			const key = e.key.toLowerCase();
			const wasPressed = this.pressedKeys.has(key);
			this.pressedKeys.add(key);

			// Handle rotation on key press (not continuous)
			if (!wasPressed && this.camera) {
				if (key === "q") {
					this.camera.rotateTo(this.camera.getAngle() - Math.PI / 2);
				} else if (key === "e") {
					this.camera.rotateTo(this.camera.getAngle() + Math.PI / 2);
				}
			}
		});

		window.addEventListener("keyup", (e) => {
			this.pressedKeys.delete(e.key.toLowerCase());
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

		// Spawn static objects
		this.spawnStaticObjects(() => new StaticTree(atlas.getRandomTree()), 30, {
			yOffset: -0.6,
			minDistance: 5,
			maxDistance: 35,
			minScale: 0.8,
			maxScale: 1.2,
		});

		this.spawnStaticObjects(() => new StaticRock(atlas.getRandomRock()), 20, {
			yOffset: -0.5,
			minDistance: 3,
			maxDistance: 33,
			minScale: 0.6,
			maxScale: 1.4,
		});

		this.spawnStaticObjects(() => new StaticBush(atlas.getRandomBush()), 25, {
			yOffset: -0.4,
			minDistance: 3,
			maxDistance: 33,
			minScale: 0.7,
			maxScale: 1.3,
		});
	}

	private updateCamera(deltaTime: number) {
		if (!this.camera || !this.player) return;

		// Get current camera angle for input processing
		const cameraAngle = this.camera.getAngle();

		// Calculate movement direction based on camera angle (fixed directions)
		let moveX = 0;
		let moveZ = 0;

		if (this.pressedKeys.has("s")) {
			// Move away from camera (up on screen)
			moveX += Math.cos(cameraAngle);
			moveZ += Math.sin(cameraAngle);
		}
		if (this.pressedKeys.has("w")) {
			// Move towards camera (down on screen)
			moveX += Math.cos(cameraAngle + Math.PI);
			moveZ += Math.sin(cameraAngle + Math.PI);
		}
		if (this.pressedKeys.has("a")) {
			// Move left on screen
			moveX += Math.cos(cameraAngle + Math.PI / 2);
			moveZ += Math.sin(cameraAngle + Math.PI / 2);
		}
		if (this.pressedKeys.has("d")) {
			// Move right on screen
			moveX += Math.cos(cameraAngle - Math.PI / 2);
			moveZ += Math.sin(cameraAngle - Math.PI / 2);
		}

		// Normalize movement
		const moveLength = Math.sqrt(moveX * moveX + moveZ * moveZ);
		if (moveLength > 0) {
			moveX = moveX / moveLength;
			moveZ = moveZ / moveLength;
		}

		// Move player
		this.player.move(moveX, moveZ, deltaTime);

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

		// Update camera controls
		this.updateCamera(deltaTime);

		// Clear
		gl.clearColor(0.1, 0.1, 0.15, 1);
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

		// Update player
		if (this.player) {
			this.player.update(deltaTime);
		}

		// Draw the scene
		this.camera.draw(this.entities, this.lights);
	}
}

document.querySelectorAll<HTMLElement>("div#main-game").forEach((e) => {
	new Game(e);
});
