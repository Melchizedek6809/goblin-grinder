# Goblin Grinder

A Vampire Survivors clone for the web, meant to experiment with rendering techniques as well as practicing juicing a game properly.

The fantastic 3D Assets were made by [Kay Lousberg](https://kaylousberg.itch.io/) and are freely available.

[Play the game in your browser](https://melchizedek6809.github.io/goblin-grinder/)

## Features

- **Custom WebGL2 Renderer** - No game engine, built from scratch
- **Shadow Mapping** - Multi-pass rendering with real-time shadows (supports up to 4 lights)
- **GLB Model Loading** - Custom GLB/glTF 2.0 parser with texture support
- **Spring Physics Camera** - Smooth camera follow with overshoot for dynamic feel
- **Isometric View** - Classic ARPG-style camera angle
- **Player Controls** - WASD movement with automatic character rotation

## Getting Started

### Prerequisites

- Node.js (v18 or higher recommended)
- npm

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Open your browser to the URL shown in the terminal (typically `http://localhost:5173`)

### Build

```bash
npm run build
```

Production build outputs to `dist/` directory.

### Preview Production Build

```bash
npm run preview
```

## Controls

- **WASD** - Move character
- **Q/E** - Rotate camera 90° around character
- Camera automatically follows the player with smooth spring physics

## Project Structure

```
src/
├── assets/
│   └── models/          # 3D models and textures
├── shaders/             # GLSL shader files (.vert, .frag)
├── css/                 # Stylesheets
├── Camera.ts            # Camera with spring-based follow system
├── Entity.ts            # Game object with transform (position, rotation, scale)
├── GLBLoader.ts         # Custom GLB/glTF 2.0 parser
├── Light.ts             # Light source with shadow map generation
├── Mesh.ts              # Vertex buffer management and geometry
├── Player.ts            # Player character controller
├── Shader.ts            # Shader compilation and uniform management
└── main.ts              # Game loop and initialization
```

## Architecture

### Rendering Pipeline

1. **Shadow Pass** - Render scene from each light's perspective to shadow maps
2. **Main Pass** - Render scene from camera with shadows, lighting, and textures

### Vertex Format

Interleaved vertex data: `position(3) + normal(3) + uv(2) + color(3)` = 11 floats per vertex

### Camera System

- Isometric viewing angle
- Spring physics for smooth follow with configurable stiffness and damping
- Rotates in 90° increments around player
- Independent position and target tracking for parallax-like effect

### Lighting & Shadows

- Directional lights with orthographic shadow projection
- 2048x2048 shadow maps per light
- PCF-style shadow filtering with bias to prevent acne
- Supports up to 4 simultaneous light sources

## Technologies

- **TypeScript** - Type-safe development
- **Vite** - Fast build tooling and dev server
- **WebGL2** - Modern graphics API
- **gl-matrix** - High-performance vector/matrix math
- **Biome** - Fast linting and formatting

## Development Commands

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run typecheck` - Run TypeScript type checking
- `npm run lint` - Run Biome linter with auto-fix
- `npm run format` - Format code with Biome

## Future Plans

- Multiple enemy types
- Combat system
- Particle effects
- Post-processing effects (bloom, color grading)
- Procedural level generation
- Animation system
