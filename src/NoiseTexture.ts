export class NoiseTexture {
	public texture: WebGLTexture;
	private gl: WebGL2RenderingContext;

	constructor(gl: WebGL2RenderingContext, size: number = 512) {
		this.gl = gl;

		// Generate base noise data
		const baseData = this.generateSimplexNoise(size);

		// Mirror it to create seamless tiling (size -> size*2)
		const mirroredData = this.mirrorNoise(baseData, size);

		// Create texture
		const texture = gl.createTexture();
		if (!texture) throw new Error("Failed to create noise texture");
		this.texture = texture;

		gl.bindTexture(gl.TEXTURE_2D, this.texture);

		// Upload mirrored data (double size)
		gl.texImage2D(
			gl.TEXTURE_2D,
			0,
			gl.R8,
			size * 2,
			size * 2,
			0,
			gl.RED,
			gl.UNSIGNED_BYTE,
			mirroredData,
		);

		// Set texture parameters for seamless tiling and smooth sampling
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

		gl.bindTexture(gl.TEXTURE_2D, null);
	}

	/**
	 * Mirror noise texture to create seamless tiling
	 * Takes a size x size texture and creates a (size*2) x (size*2) mirrored version
	 */
	private mirrorNoise(data: Uint8Array, size: number): Uint8Array {
		const newSize = size * 2;
		const mirrored = new Uint8Array(newSize * newSize);

		for (let y = 0; y < newSize; y++) {
			for (let x = 0; x < newSize; x++) {
				// Determine source coordinates with mirroring
				const srcX = x < size ? x : size * 2 - x - 1; // Mirror horizontally
				const srcY = y < size ? y : size * 2 - y - 1; // Mirror vertically

				// Copy value from source
				mirrored[y * newSize + x] = data[srcY * size + srcX];
			}
		}

		return mirrored;
	}

	/**
	 * Generate simplex noise texture data
	 */
	private generateSimplexNoise(size: number): Uint8Array {
		const data = new Uint8Array(size * size);

		for (let y = 0; y < size; y++) {
			for (let x = 0; x < size; x++) {
				const u = x / size;
				const v = y / size;

				// Generate noise at multiple octaves
				let noise = 0;
				let amplitude = 1.0;
				let frequency = 1.0;
				let maxValue = 0;

				// 4 octaves for detail
				for (let octave = 0; octave < 4; octave++) {
					noise +=
						this.simplexNoise(u * frequency * 8, v * frequency * 8) * amplitude;
					maxValue += amplitude;
					amplitude *= 0.5;
					frequency *= 2.0;
				}

				// Normalize to 0-1 range
				noise = noise / maxValue;
				noise = noise * 0.5 + 0.5; // Map from [-1,1] to [0,1]

				// Convert to byte
				data[y * size + x] = Math.floor(noise * 255);
			}
		}

		return data;
	}

	/**
	 * 2D Simplex noise implementation
	 * Based on Stefan Gustavson's implementation
	 */
	private simplexNoise(xin: number, yin: number): number {
		const F2 = 0.5 * (Math.sqrt(3.0) - 1.0);
		const G2 = (3.0 - Math.sqrt(3.0)) / 6.0;

		// Skew the input space to determine which simplex cell we're in
		const s = (xin + yin) * F2;
		const i = Math.floor(xin + s);
		const j = Math.floor(yin + s);

		const t = (i + j) * G2;
		const X0 = i - t;
		const Y0 = j - t;
		const x0 = xin - X0;
		const y0 = yin - Y0;

		// Determine which simplex we are in
		let i1: number, j1: number;
		if (x0 > y0) {
			i1 = 1;
			j1 = 0;
		} else {
			i1 = 0;
			j1 = 1;
		}

		// Offsets for middle and last corners
		const x1 = x0 - i1 + G2;
		const y1 = y0 - j1 + G2;
		const x2 = x0 - 1.0 + 2.0 * G2;
		const y2 = y0 - 1.0 + 2.0 * G2;

		// Work out the hashed gradient indices
		const ii = i & 255;
		const jj = j & 255;
		const gi0 = this.perm[ii + this.perm[jj]] % 12;
		const gi1 = this.perm[ii + i1 + this.perm[jj + j1]] % 12;
		const gi2 = this.perm[ii + 1 + this.perm[jj + 1]] % 12;

		// Calculate contribution from three corners
		let t0 = 0.5 - x0 * x0 - y0 * y0;
		let n0 = 0;
		if (t0 >= 0) {
			t0 *= t0;
			n0 = t0 * t0 * this.dot(this.grad3[gi0], x0, y0);
		}

		let t1 = 0.5 - x1 * x1 - y1 * y1;
		let n1 = 0;
		if (t1 >= 0) {
			t1 *= t1;
			n1 = t1 * t1 * this.dot(this.grad3[gi1], x1, y1);
		}

		let t2 = 0.5 - x2 * x2 - y2 * y2;
		let n2 = 0;
		if (t2 >= 0) {
			t2 *= t2;
			n2 = t2 * t2 * this.dot(this.grad3[gi2], x2, y2);
		}

		// Add contributions from each corner and scale to [-1,1]
		return 70.0 * (n0 + n1 + n2);
	}

	private dot(g: number[], x: number, y: number): number {
		return g[0] * x + g[1] * y;
	}

	// Permutation table for noise
	private perm = [
		151, 160, 137, 91, 90, 15, 131, 13, 201, 95, 96, 53, 194, 233, 7, 225, 140,
		36, 103, 30, 69, 142, 8, 99, 37, 240, 21, 10, 23, 190, 6, 148, 247, 120,
		234, 75, 0, 26, 197, 62, 94, 252, 219, 203, 117, 35, 11, 32, 57, 177, 33,
		88, 237, 149, 56, 87, 174, 20, 125, 136, 171, 168, 68, 175, 74, 165, 71,
		134, 139, 48, 27, 166, 77, 146, 158, 231, 83, 111, 229, 122, 60, 211, 133,
		230, 220, 105, 92, 41, 55, 46, 245, 40, 244, 102, 143, 54, 65, 25, 63, 161,
		1, 216, 80, 73, 209, 76, 132, 187, 208, 89, 18, 169, 200, 196, 135, 130,
		116, 188, 159, 86, 164, 100, 109, 198, 173, 186, 3, 64, 52, 217, 226, 250,
		124, 123, 5, 202, 38, 147, 118, 126, 255, 82, 85, 212, 207, 206, 59, 227,
		47, 16, 58, 17, 182, 189, 28, 42, 223, 183, 170, 213, 119, 248, 152, 2, 44,
		154, 163, 70, 221, 153, 101, 155, 167, 43, 172, 9, 129, 22, 39, 253, 19, 98,
		108, 110, 79, 113, 224, 232, 178, 185, 112, 104, 218, 246, 97, 228, 251, 34,
		242, 193, 238, 210, 144, 12, 191, 179, 162, 241, 81, 51, 145, 235, 249, 14,
		239, 107, 49, 192, 214, 31, 181, 199, 106, 157, 184, 84, 204, 176, 115, 121,
		50, 45, 127, 4, 150, 254, 138, 236, 205, 93, 222, 114, 67, 29, 24, 72, 243,
		141, 128, 195, 78, 66, 215, 61, 156, 180,
		// Repeat for wrapping
		151, 160, 137, 91, 90, 15, 131, 13, 201, 95, 96, 53, 194, 233, 7, 225, 140,
		36, 103, 30, 69, 142, 8, 99, 37, 240, 21, 10, 23, 190, 6, 148, 247, 120,
		234, 75, 0, 26, 197, 62, 94, 252, 219, 203, 117, 35, 11, 32, 57, 177, 33,
		88, 237, 149, 56, 87, 174, 20, 125, 136, 171, 168, 68, 175, 74, 165, 71,
		134, 139, 48, 27, 166, 77, 146, 158, 231, 83, 111, 229, 122, 60, 211, 133,
		230, 220, 105, 92, 41, 55, 46, 245, 40, 244, 102, 143, 54, 65, 25, 63, 161,
		1, 216, 80, 73, 209, 76, 132, 187, 208, 89, 18, 169, 200, 196, 135, 130,
		116, 188, 159, 86, 164, 100, 109, 198, 173, 186, 3, 64, 52, 217, 226, 250,
		124, 123, 5, 202, 38, 147, 118, 126, 255, 82, 85, 212, 207, 206, 59, 227,
		47, 16, 58, 17, 182, 189, 28, 42, 223, 183, 170, 213, 119, 248, 152, 2, 44,
		154, 163, 70, 221, 153, 101, 155, 167, 43, 172, 9, 129, 22, 39, 253, 19, 98,
		108, 110, 79, 113, 224, 232, 178, 185, 112, 104, 218, 246, 97, 228, 251, 34,
		242, 193, 238, 210, 144, 12, 191, 179, 162, 241, 81, 51, 145, 235, 249, 14,
		239, 107, 49, 192, 214, 31, 181, 199, 106, 157, 184, 84, 204, 176, 115, 121,
		50, 45, 127, 4, 150, 254, 138, 236, 205, 93, 222, 114, 67, 29, 24, 72, 243,
		141, 128, 195, 78, 66, 215, 61, 156, 180,
	];

	// Gradient vectors for 2D
	private grad3 = [
		[1, 1],
		[-1, 1],
		[1, -1],
		[-1, -1],
		[1, 0],
		[-1, 0],
		[1, 0],
		[-1, 0],
		[0, 1],
		[0, -1],
		[0, 1],
		[0, -1],
	];

	destroy(): void {
		this.gl.deleteTexture(this.texture);
	}
}
