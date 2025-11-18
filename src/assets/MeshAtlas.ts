import bottleGlbUrl from "../assets/models/Bottle.glb?url";
import bush2DGlbUrl from "../assets/models/Bush2D.glb?url";
import bush2EGlbUrl from "../assets/models/Bush2E.glb?url";
import bush2FGlbUrl from "../assets/models/Bush2F.glb?url";
import chestGlbUrl from "../assets/models/Chest.glb?url";
import chestGoldGlbUrl from "../assets/models/ChestGold.glb?url";
import coinGlbUrl from "../assets/models/Coin.glb?url";
import coinStackLargeGlbUrl from "../assets/models/CoinStackLarge.glb?url";
import coinStackMediumGlbUrl from "../assets/models/CoinStackMedium.glb?url";
import coinStackSmallGlbUrl from "../assets/models/CoinStackSmall.glb?url";
import dungeonPngUrl from "../assets/models/Dungeon.png";
import shardGlbUrl from "../assets/models/Shard.glb?url";
// Static imports for Vite bundling
// Note: ?url suffix tells Vite to treat these as URL assets
import mageGlbUrl from "../assets/models/Mage.glb?url";
import magePngUrl from "../assets/models/Mage.png";
import playerGeneralAnimGlbUrl from "../assets/animations/PlayerGeneral.glb?url";
import playerMovementAnimGlbUrl from "../assets/animations/PlayerMovement.glb?url";
import skeletonGlbUrl from "../assets/models/Skeleton.glb?url";
import skeletonGeneralAnimGlbUrl from "../assets/animations/SkeletonGeneral.glb?url";
import skeletonMovementAnimGlbUrl from "../assets/animations/SkeletonMovement.glb?url";
import naturePngUrl from "../assets/models/Nature.png";
import rock1AGlbUrl from "../assets/models/Rock1A.glb?url";
import rock1DGlbUrl from "../assets/models/Rock1D.glb?url";
import rock1FGlbUrl from "../assets/models/Rock1F.glb?url";
import rock1GGlbUrl from "../assets/models/Rock1G.glb?url";
import skeletonPngUrl from "../assets/models/Skeleton.png";
import tree1AGlbUrl from "../assets/models/Tree1A.glb?url";
import tree1BGlbUrl from "../assets/models/Tree1B.glb?url";
import tree2AGlbUrl from "../assets/models/Tree2A.glb?url";
import tree2BGlbUrl from "../assets/models/Tree2B.glb?url";
import tree3AGlbUrl from "../assets/models/Tree3A.glb?url";
import tree3BGlbUrl from "../assets/models/Tree3B.glb?url";
import tree4AGlbUrl from "../assets/models/Tree4A.glb?url";
import tree4BGlbUrl from "../assets/models/Tree4B.glb?url";
import { Mesh } from "./Mesh.ts";
import { GLBLoader, type GLTFData, type SkinnedMeshData } from "./GLBLoader.ts";
import { SkinnedMesh } from "../animation/SkinnedMesh.ts";
import { AnimationLoader } from "../animation/AnimationLoader.ts";
import { AnimationController } from "../animation/AnimationController.ts";
import type { Animation } from "../animation/Animation.ts";

/**
 * Central asset manager that loads and caches all game meshes.
 * Uses static imports for proper Vite bundling.
 */
export class MeshAtlas {
	// Player meshes (multiple parts with animation)
	public mage: SkinnedMesh[] = [];
	public mageAnimationController: AnimationController | null = null;

	// Enemy meshes (multiple parts with animation)
	public skeleton: SkinnedMesh[] = [];
	public skeletonAnimationController: AnimationController | null = null;
	private skeletonMeshData: SkinnedMeshData[] | null = null;
	private skeletonAnimations: Animation[] | null = null;
	private skeletonModelData: GLTFData | null = null;
	private skeletonTexture: WebGLTexture | null = null;

	// Tree meshes (single mesh each)
	public tree1A: Mesh | null = null;
	public tree1B: Mesh | null = null;
	public tree2A: Mesh | null = null;
	public tree2B: Mesh | null = null;
	public tree3A: Mesh | null = null;
	public tree3B: Mesh | null = null;
	public tree4A: Mesh | null = null;
	public tree4B: Mesh | null = null;

	// Rock meshes (single mesh each)
	public rock1A: Mesh | null = null;
	public rock1D: Mesh | null = null;
	public rock1F: Mesh | null = null;
	public rock1G: Mesh | null = null;

	// Bush meshes (single mesh each)
	public bush2D: Mesh | null = null;
	public bush2E: Mesh | null = null;
	public bush2F: Mesh | null = null;

	// Pickup meshes (single mesh each)
	public chest: Mesh | null = null;
	public chestGold: Mesh | null = null;
	public coin: Mesh | null = null;
	public coinStackSmall: Mesh | null = null;
	public coinStackMedium: Mesh | null = null;
	public coinStackLarge: Mesh | null = null;
	public bottle: Mesh | null = null;
	public shard: Mesh | null = null;

	/**
	 * Load all meshes from the atlas.
	 * Call this once during initialization.
	 */
	async init(gl: WebGL2RenderingContext): Promise<void> {
		// Kick off all asset loads in parallel to minimize startup time
		const playerPromise = this.loadPlayerWithAnimations(gl);
		const skeletonPromise = this.loadSkeletonWithAnimations(gl);

		// Load tree, rock, and bush models (all share the same Nature.png texture)
		const naturePromise = Promise.all([
			Mesh.fromUrl(gl, tree1AGlbUrl, naturePngUrl),
			Mesh.fromUrl(gl, tree1BGlbUrl, naturePngUrl),
			Mesh.fromUrl(gl, tree2AGlbUrl, naturePngUrl),
			Mesh.fromUrl(gl, tree2BGlbUrl, naturePngUrl),
			Mesh.fromUrl(gl, tree3AGlbUrl, naturePngUrl),
			Mesh.fromUrl(gl, tree3BGlbUrl, naturePngUrl),
			Mesh.fromUrl(gl, tree4AGlbUrl, naturePngUrl),
			Mesh.fromUrl(gl, tree4BGlbUrl, naturePngUrl),
			Mesh.fromUrl(gl, rock1AGlbUrl, naturePngUrl),
			Mesh.fromUrl(gl, rock1DGlbUrl, naturePngUrl),
			Mesh.fromUrl(gl, rock1FGlbUrl, naturePngUrl),
			Mesh.fromUrl(gl, rock1GGlbUrl, naturePngUrl),
			Mesh.fromUrl(gl, bush2DGlbUrl, naturePngUrl),
			Mesh.fromUrl(gl, bush2EGlbUrl, naturePngUrl),
			Mesh.fromUrl(gl, bush2FGlbUrl, naturePngUrl),
		]).then(
			([
				tree1A,
				tree1B,
				tree2A,
				tree2B,
				tree3A,
				tree3B,
				tree4A,
				tree4B,
				rock1A,
				rock1D,
				rock1F,
				rock1G,
				bush2D,
				bush2E,
				bush2F,
			]) => {
				this.tree1A = tree1A;
				this.tree1B = tree1B;
				this.tree2A = tree2A;
				this.tree2B = tree2B;
				this.tree3A = tree3A;
				this.tree3B = tree3B;
				this.tree4A = tree4A;
				this.tree4B = tree4B;
				this.rock1A = rock1A;
				this.rock1D = rock1D;
				this.rock1F = rock1F;
				this.rock1G = rock1G;
				this.bush2D = bush2D;
				this.bush2E = bush2E;
				this.bush2F = bush2F;
			},
		);

		// Load pickup models (all share the same Dungeon.png texture)
		const pickupsPromise = Promise.all([
			Mesh.fromUrl(gl, chestGlbUrl, dungeonPngUrl),
			Mesh.fromUrl(gl, chestGoldGlbUrl, dungeonPngUrl),
			Mesh.fromUrl(gl, coinGlbUrl, dungeonPngUrl),
			Mesh.fromUrl(gl, coinStackSmallGlbUrl, dungeonPngUrl),
			Mesh.fromUrl(gl, coinStackMediumGlbUrl, dungeonPngUrl),
			Mesh.fromUrl(gl, coinStackLargeGlbUrl, dungeonPngUrl),
			Mesh.fromUrl(gl, bottleGlbUrl, dungeonPngUrl),
			Mesh.fromUrl(gl, shardGlbUrl, dungeonPngUrl),
		]).then(
			([
				chest,
				chestGold,
				coin,
				coinStackSmall,
				coinStackMedium,
				coinStackLarge,
				bottle,
				shard,
			]) => {
				this.chest = chest;
				this.chestGold = chestGold;
				this.coin = coin;
				this.coinStackSmall = coinStackSmall;
				this.coinStackMedium = coinStackMedium;
				this.coinStackLarge = coinStackLarge;
				this.bottle = bottle;
				this.shard = shard;
			},
		);

		await Promise.all([
			playerPromise,
			skeletonPromise,
			naturePromise,
			pickupsPromise,
		]);
	}

	/**
	 * Load player model with animations
	 */
	private async loadPlayerWithAnimations(
		gl: WebGL2RenderingContext,
	): Promise<void> {
		// Load the actual model file (for mesh geometry) AND animation data (for skeleton/animations)
		const [modelData, generalData, movementData] = await Promise.all([
			GLBLoader.loadWithAnimations(mageGlbUrl), // Load mesh geometry from actual model file
			GLBLoader.loadWithAnimations(playerGeneralAnimGlbUrl),
			GLBLoader.loadWithAnimations(playerMovementAnimGlbUrl),
		]);

		// Build skeleton from the real model so joint indices match the skinned mesh
		const modelSkin = modelData.skins[0];
		if (!modelSkin) {
			throw new Error("[MeshAtlas] Player model is missing skin data");
		}

		const skeleton = AnimationLoader.createSkeleton(
			modelData,
			0,
			modelData.getAccessorData,
		);
		const targetSkeleton = {
			nodes: modelData.nodes,
			joints: modelSkin.joints,
		};

		// Combine animations from both files
		const generalAnims = AnimationLoader.createAnimations(
			generalData,
			0,
			generalData.getAccessorData,
			targetSkeleton,
		);
		const movementAnims = AnimationLoader.createAnimations(
			movementData,
			0,
			movementData.getAccessorData,
			targetSkeleton,
		);
		const allAnimations = [...generalAnims, ...movementAnims];

		// Create animation controller with slower playback speed
		this.mageAnimationController = new AnimationController(
			skeleton,
			allAnimations,
		);
		this.mageAnimationController.setPlaybackSpeed(1.0); // Normal speed for snappier movement

		// Create skinned meshes from the model data
		const meshDataArray = modelData.meshes;
		this.mage = [];

		for (const meshData of meshDataArray) {
			const skinnedMesh = new SkinnedMesh(
				gl,
				meshData as any, // Cast as SkinnedMeshData
				skeleton,
			);

			// Load texture
			await skinnedMesh.loadTexture(magePngUrl);

			// Share the same animation controller
			skinnedMesh.animationController = this.mageAnimationController;

			this.mage.push(skinnedMesh);
		}

		console.log(
			`[MeshAtlas] Loaded player with ${allAnimations.length} animations:`,
			allAnimations.map((a) => a.name),
		);
	}

	/**
	 * Load skeleton enemy model with animations
	 */
	private async loadSkeletonWithAnimations(
		gl: WebGL2RenderingContext,
	): Promise<void> {
		// Load the actual model file (for mesh geometry) AND animation data (for skeleton/animations)
		const [modelData, generalData, movementData] = await Promise.all([
			GLBLoader.loadWithAnimations(skeletonGlbUrl), // Load mesh geometry from actual model file
			GLBLoader.loadWithAnimations(skeletonGeneralAnimGlbUrl),
			GLBLoader.loadWithAnimations(skeletonMovementAnimGlbUrl),
		]);
		this.skeletonModelData = modelData;

		// Build skeleton from the real model so joint indices match the skinned mesh
		const modelSkin = modelData.skins[0];
		if (!modelSkin) {
			throw new Error("[MeshAtlas] Skeleton model is missing skin data");
		}

		const skeleton = AnimationLoader.createSkeleton(
			modelData,
			0,
			modelData.getAccessorData,
		);
		const targetSkeleton = {
			nodes: modelData.nodes,
			joints: modelSkin.joints,
		};

		// Combine animations from both files
		const generalAnims = AnimationLoader.createAnimations(
			generalData,
			0,
			generalData.getAccessorData,
			targetSkeleton,
		);
		const movementAnims = AnimationLoader.createAnimations(
			movementData,
			0,
			movementData.getAccessorData,
			targetSkeleton,
		);
		const allAnimations = [...generalAnims, ...movementAnims];
		this.skeletonAnimations = allAnimations;
		this.skeletonMeshData = modelData.meshes as SkinnedMeshData[];

		// Create animation controller with slower playback speed
		this.skeletonAnimationController = new AnimationController(
			skeleton,
			allAnimations,
		);
		this.skeletonAnimationController.setPlaybackSpeed(0.75); // Slightly slower to match enemy pace

		// Create skinned meshes from the model data
		const meshDataArray = modelData.meshes;
		this.skeleton = [];

		for (const meshData of meshDataArray) {
			const skinnedMesh = new SkinnedMesh(
				gl,
				meshData as any, // Cast as SkinnedMeshData
				skeleton,
			);

			// Load texture
			await skinnedMesh.loadTexture(skeletonPngUrl);
			this.skeletonTexture = skinnedMesh.texture;

			// Share the same animation controller
			skinnedMesh.animationController = this.skeletonAnimationController;

			this.skeleton.push(skinnedMesh);
		}

		console.log(
			`[MeshAtlas] Loaded skeleton with ${allAnimations.length} animations:`,
			allAnimations.map((a) => a.name),
		);
	}

	/**
	 * Get a random tree mesh for variety
	 */
	getRandomTree(): Mesh {
		const trees = [
			this.tree1A,
			this.tree1B,
			this.tree2A,
			this.tree2B,
			this.tree3A,
			this.tree3B,
			this.tree4A,
			this.tree4B,
		].filter((t) => t !== null) as Mesh[];

		return trees[Math.floor(Math.random() * trees.length)];
	}

	/**
	 * Get a random rock mesh for variety
	 */
	getRandomRock(): Mesh {
		const rocks = [this.rock1A, this.rock1D, this.rock1F, this.rock1G].filter(
			(r) => r !== null,
		) as Mesh[];

		return rocks[Math.floor(Math.random() * rocks.length)];
	}

	/**
	 * Get a random bush mesh for variety
	 */
	getRandomBush(): Mesh {
		const bushes = [this.bush2D, this.bush2E, this.bush2F].filter(
			(b) => b !== null,
		) as Mesh[];

		return bushes[Math.floor(Math.random() * bushes.length)];
	}

	/**
	 * Create a new enemy instance (separate skeleton + controller) while sharing GPU buffers/texture.
	 */
	createSkeletonEnemyInstance(gl: WebGL2RenderingContext): {
		meshes: SkinnedMesh[];
		animationController: AnimationController;
	} {
		if (
			!this.skeletonModelData ||
			!this.skeletonMeshData ||
			!this.skeletonAnimations ||
			!this.skeletonTexture
		) {
			throw new Error("[MeshAtlas] Skeleton assets not initialized");
		}

		const skeleton = AnimationLoader.createSkeleton(
			this.skeletonModelData,
			0,
			this.skeletonModelData.getAccessorData,
		);

		const animationController = new AnimationController(
			skeleton,
			this.skeletonAnimations,
		);
		animationController.setPlaybackSpeed(0.75);

		const meshes: SkinnedMesh[] = [];
		for (const meshData of this.skeletonMeshData) {
			const skinnedMesh = new SkinnedMesh(gl, meshData as any, skeleton);
			skinnedMesh.texture = this.skeletonTexture;
			skinnedMesh.animationController = animationController;
			meshes.push(skinnedMesh);
		}

		return { meshes, animationController };
	}
}
