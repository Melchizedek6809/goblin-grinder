/// <reference types="vite/client" />

// Declare module types for asset imports
declare module "*.glb" {
	const url: string;
	export default url;
}

declare module "*.glb?url" {
	const url: string;
	export default url;
}

declare module "*.png" {
	const url: string;
	export default url;
}

declare module "*.jpg" {
	const url: string;
	export default url;
}

declare module "*.jpeg" {
	const url: string;
	export default url;
}
