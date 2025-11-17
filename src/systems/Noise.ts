// Simple 2D Perlin noise with fractal (octave) sampling to build larger features.
// Returned samples are normalized to [0, 1] for convenience.

const gradients: Array<[number, number]> = [
	[1, 1],
	[-1, 1],
	[1, -1],
	[-1, -1],
	[1, 0],
	[-1, 0],
	[0, 1],
	[0, -1],
];

function fade(t: number): number {
	return t * t * t * (t * (t * 6 - 15) + 10);
}

function lerp(a: number, b: number, t: number): number {
	return a + t * (b - a);
}

function mulberry32(seed: number): () => number {
	return () => {
		let t = (seed += 0x6d2b79f5);
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

export class PerlinNoise2D {
	private permutation: Uint8Array;

	constructor(seed: number) {
		const random = mulberry32(seed);
		const p = new Uint8Array(256);

		for (let i = 0; i < 256; i++) {
			p[i] = i;
		}

		// Fisher-Yates shuffle
		for (let i = p.length - 1; i > 0; i--) {
			const j = Math.floor(random() * (i + 1));
			const tmp = p[i];
			p[i] = p[j];
			p[j] = tmp;
		}

		this.permutation = new Uint8Array(512);
		for (let i = 0; i < 512; i++) {
			this.permutation[i] = p[i & 255];
		}
	}

	sample(x: number, y: number): number {
		// Compute lattice coordinates
		const xi = Math.floor(x) & 255;
		const yi = Math.floor(y) & 255;

		// Relative position in cell
		const xf = x - Math.floor(x);
		const yf = y - Math.floor(y);

		// Hash coordinates to gradients
		const g00 = gradients[this.permutation[xi + this.permutation[yi]] % 8];
		const g10 = gradients[this.permutation[xi + 1 + this.permutation[yi]] % 8];
		const g01 = gradients[this.permutation[xi + this.permutation[yi + 1]] % 8];
		const g11 =
			gradients[this.permutation[xi + 1 + this.permutation[yi + 1]] % 8];

		// Compute dot products
		const dot00 = g00[0] * xf + g00[1] * yf;
		const dot10 = g10[0] * (xf - 1) + g10[1] * yf;
		const dot01 = g01[0] * xf + g01[1] * (yf - 1);
		const dot11 = g11[0] * (xf - 1) + g11[1] * (yf - 1);

		const u = fade(xf);
		const v = fade(yf);

		const nx0 = lerp(dot00, dot10, u);
		const nx1 = lerp(dot01, dot11, u);
		const nxy = lerp(nx0, nx1, v);

		// Normalize from [-1,1] to [0,1]
		return nxy * 0.5 + 0.5;
	}
}

export class FractalNoise2D {
	private noise: PerlinNoise2D;
	private octaves: number;
	private lacunarity: number;
	private gain: number;
	private baseFrequency: number;

	constructor(
		seed: number,
		options?: {
			octaves?: number;
			lacunarity?: number;
			gain?: number;
			baseFrequency?: number;
		},
	) {
		this.noise = new PerlinNoise2D(seed);
		this.octaves = options?.octaves ?? 4;
		this.lacunarity = options?.lacunarity ?? 2.0;
		this.gain = options?.gain ?? 0.5;
		this.baseFrequency = options?.baseFrequency ?? 0.05;
	}

	sample(x: number, y: number): number {
		let frequency = this.baseFrequency;
		let amplitude = 1.0;
		let sum = 0;
		let normalization = 0;

		for (let i = 0; i < this.octaves; i++) {
			sum += amplitude * this.noise.sample(x * frequency, y * frequency);
			normalization += amplitude;
			frequency *= this.lacunarity;
			amplitude *= this.gain;
		}

		return normalization > 0 ? sum / normalization : 0.5;
	}
}
