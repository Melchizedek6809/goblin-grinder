import bush2DGlbUrl from "./assets/models/Bush2D.glb?url";
import bush2EGlbUrl from "./assets/models/Bush2E.glb?url";
import bush2FGlbUrl from "./assets/models/Bush2F.glb?url";
// Static imports for Vite bundling
// Note: ?url suffix tells Vite to treat these as URL assets
import mageGlbUrl from "./assets/models/Mage.glb?url";
import magePngUrl from "./assets/models/Mage.png";
import naturePngUrl from "./assets/models/Nature.png";
import rock1AGlbUrl from "./assets/models/Rock1A.glb?url";
import rock1DGlbUrl from "./assets/models/Rock1D.glb?url";
import rock1FGlbUrl from "./assets/models/Rock1F.glb?url";
import rock1GGlbUrl from "./assets/models/Rock1G.glb?url";
import skeletonGlbUrl from "./assets/models/Skeleton.glb?url";
import skeletonPngUrl from "./assets/models/Skeleton.png";
import tree3AGlbUrl from "./assets/models/Tree3A.glb?url";
import tree3BGlbUrl from "./assets/models/Tree3B.glb?url";
import tree3CGlbUrl from "./assets/models/Tree3C.glb?url";
import tree4AGlbUrl from "./assets/models/Tree4A.glb?url";
import tree4BGlbUrl from "./assets/models/Tree4B.glb?url";
import tree4CGlbUrl from "./assets/models/Tree4C.glb?url";
import { Mesh } from "./Mesh.ts";

/**
 * Central asset manager that loads and caches all game meshes.
 * Uses static imports for proper Vite bundling.
 */
export class MeshAtlas {
	// Player meshes (multiple parts)
	public mage: Mesh[] = [];

	// Enemy meshes (multiple parts)
	public skeleton: Mesh[] = [];

	// Tree meshes (single mesh each)
	public tree3A: Mesh | null = null;
	public tree3B: Mesh | null = null;
	public tree3C: Mesh | null = null;
	public tree4A: Mesh | null = null;
	public tree4B: Mesh | null = null;
	public tree4C: Mesh | null = null;

	// Rock meshes (single mesh each)
	public rock1A: Mesh | null = null;
	public rock1D: Mesh | null = null;
	public rock1F: Mesh | null = null;
	public rock1G: Mesh | null = null;

	// Bush meshes (single mesh each)
	public bush2D: Mesh | null = null;
	public bush2E: Mesh | null = null;
	public bush2F: Mesh | null = null;

	/**
	 * Load all meshes from the atlas.
	 * Call this once during initialization.
	 */
	async init(gl: WebGL2RenderingContext): Promise<void> {
		// Load player model (multiple meshes)
		this.mage = await Mesh.allFromUrl(gl, mageGlbUrl, magePngUrl);

		// Load enemy models (multiple meshes)
		this.skeleton = await Mesh.allFromUrl(gl, skeletonGlbUrl, skeletonPngUrl);

		// Load tree, rock, and bush models (all share the same Nature.png texture)
		const [
			tree3A,
			tree3B,
			tree3C,
			tree4A,
			tree4B,
			tree4C,
			rock1A,
			rock1D,
			rock1F,
			rock1G,
			bush2D,
			bush2E,
			bush2F,
		] = await Promise.all([
			Mesh.fromUrl(gl, tree3AGlbUrl, naturePngUrl),
			Mesh.fromUrl(gl, tree3BGlbUrl, naturePngUrl),
			Mesh.fromUrl(gl, tree3CGlbUrl, naturePngUrl),
			Mesh.fromUrl(gl, tree4AGlbUrl, naturePngUrl),
			Mesh.fromUrl(gl, tree4BGlbUrl, naturePngUrl),
			Mesh.fromUrl(gl, tree4CGlbUrl, naturePngUrl),
			Mesh.fromUrl(gl, rock1AGlbUrl, naturePngUrl),
			Mesh.fromUrl(gl, rock1DGlbUrl, naturePngUrl),
			Mesh.fromUrl(gl, rock1FGlbUrl, naturePngUrl),
			Mesh.fromUrl(gl, rock1GGlbUrl, naturePngUrl),
			Mesh.fromUrl(gl, bush2DGlbUrl, naturePngUrl),
			Mesh.fromUrl(gl, bush2EGlbUrl, naturePngUrl),
			Mesh.fromUrl(gl, bush2FGlbUrl, naturePngUrl),
		]);

		this.tree3A = tree3A;
		this.tree3B = tree3B;
		this.tree3C = tree3C;
		this.tree4A = tree4A;
		this.tree4B = tree4B;
		this.tree4C = tree4C;
		this.rock1A = rock1A;
		this.rock1D = rock1D;
		this.rock1F = rock1F;
		this.rock1G = rock1G;
		this.bush2D = bush2D;
		this.bush2E = bush2E;
		this.bush2F = bush2F;
	}

	/**
	 * Get a random tree mesh for variety
	 */
	getRandomTree(): Mesh {
		const trees = [
			this.tree3A,
			this.tree3B,
			this.tree3C,
			this.tree4A,
			this.tree4B,
			this.tree4C,
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
}
