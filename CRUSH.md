# CRUSH.md

This file provides essential guidance for agents working in the Goblin Grinder repository.

## Project Overview

Goblin Grinder is a WebGL2-based 3D game built with TypeScript and Vite. It features a completely custom renderer with shadow mapping, GLB model loading, and spring physics for camera movement. The goal is to achieve a pixel art look with quality lighting through experimental render passes and shaders.

## Essential Commands

- **Development server**: `npm run dev` - Launch Vite dev server with HMR for shader and camera validation
- **Production build**: `npm run build` - Runs TypeScript compiler then Vite build (must pass before releases)
- **Preview build**: `npm run preview` - Serve production build to verify asset loading without dev tools
- **Type checking**: `npm run typecheck` - Strict TypeScript diagnostics (run before reviewing changes)
- **Linting**: `npm run lint` - Biome linter with auto-fix over `src/`
- **Formatting**: `npm run format` - Biome code formatter over `src/`

## Code Organization & Structure

### Core Architecture
- **Entry point**: `src/main.ts` contains `Game` class managing lifecycle, WebGL2 context, render loop
- **Rendering pipeline**: Multi-pass approach with shadow pass (Light.ts) then main pass (Camera.ts)
- **Assets**: `src/assets/models/` for GLB files, `src/shaders/` for GLSL (.vert/.frag)
- **Build output**: `dist/` (keep generated artifacts out of commits)

### Key Classes & Responsibilities
- **Mesh** (Mesh.ts): VAO/buffer management, vertex format position(3)+normal(3)+uv(2)+color(3)=11 floats
- **Entity** (Entity.ts): Transform (position, rotation quaternion, scale), generates model matrices
- **Player** (Player.ts): Character controller, WASD movement (3.0 units/sec), auto-rotation to face direction
- **Camera** (Camera.ts): Spring physics follow system, manages render passes and light/shadow uniforms
- **Light** (Light.ts): Directional lights with shadow maps, supports up to 4 lights, 2048x2048 depth textures
- **Shader** (Shader.ts): Compilation, uniform location caching, array uniform support
- **GLBLoader** (GLBLoader.ts): Custom GLB/glTF 2.0 parser, no external dependencies

## Coding Conventions & Style

### Code Style (Enforced by Biome)
- **Indentation**: Tabs (don't override manually)
- **Quotes**: Double quotes for strings
- **Naming**: 
  - Classes: `PascalCase`
  - Utilities: `camelCase`
  - Shaders: `.vert`/`.frag` suffixes matching material names
  - Assets: `lowercase-kebab` (e.g., `goblin-warrior.glb`)
- **Module organization**: Single-file classes, prefer new folders in `src/` over expanding files

### Shader Conventions
- **Uniform naming**: Consistent prefixes (`uView`, `uProjection`, `u_model`)
- **Vertex attributes**: `a_position`, `a_normal`, `a_uv`, `a_color`
- **Varying outputs**: `v_worldPosition`, `v_normal`, `v_uv`, `v_color`, `v_lightSpacePositions[4]`
- **Texture slots**: Shadow maps use 0-3, material textures use 4+
- **Import with**: `?raw` suffix for syntax highlighting

## Input & Camera System

### Controls
- **WASD**: Move player relative to camera angle (normalized for consistent diagonal speed)
- **Q/E**: Rotate camera 90° with spring physics
- **Input handling**: Uses Set for simultaneous key presses

### Camera Physics
- **Spring follow**: Separate springs for position and target with configurable stiffness/damping
- **Default settings**: Position stiffness 20.0, damping 0.7; Rotation stiffness 40.0, damping 0.6
- **Offset**: 5 units distance, 8 units height from player
- **Rotation**: 90° increments with smooth overshoot

## Testing & Quality

### Current Testing Approach
- No automated gameplay test suite yet
- Pair `npm run typecheck` with manual smoke-tests in dev server
- Future test location: `src/**/__tests__/*.spec.ts` for deterministic utilities

### Quality Gates
- Always run `npm run typecheck` before reviewing
- Keep code tree clean with `npm run lint` and `npm run format` before committing
- Document GPU-specific assumptions (resolution, precision) in code comments

## Asset & Shader Handling

### Model Loading
- **Format**: GLB preferred (single file)
- **Loading**: `Mesh.loadTexture(url)` for textures, multiple meshes per model supported
- **Caching**: Mesh and texture resources memoized in static Maps

### Shader Development
- **Rebuild**: Run `npm run build` after GLSL changes to catch compile-time regressions
- **Shadow mapping**: Uses depth.vert/depth.frag for shadow pass generation
- **Lighting**: basic.frag applies diffuse lighting with configurable ambient, unrolled light loop for GLSL sampler array limitations

## Configuration

### TypeScript (tsconfig.json)
- **Target**: ES2022, **Module**: ESNext with bundler resolution
- **Strict mode**: Enabled with additional linting rules
- **No emit**: TypeScript for type checking only, Vite handles transpilation
- **Experimental decorators**: Enabled (for Lit compatibility, currently unused)

### Build Tools
- **Vite**: Fast bundling and dev server
- **Biome**: Linting and formatting (configured in biome.json)
- **gl-matrix**: Vector and matrix math operations
- **lit**: UI framework (included but unused)

## Critical Gotchas

- **WebGL2 only**: No WebGL1 fallbacks
- **Custom renderer**: No game engine - all rendering is custom implementation
- **Shadow map limitations**: GLSL sampler arrays need constant indices, light loop is unrolled
- **Vertex format**: Strict 11-float interleaved format - don't deviate
- **Camera follows player**: Not hardcoded to specific coordinates
- **Spring physics**: Used for both camera follow and rotation for dynamic feel
- **No automated tests**: Manual verification required for gameplay changes

## Commit & Development Guidelines

- **Commit titles**: Short imperative, ≤72 characters (e.g., "Add spring camera damping")
- **PR descriptions**: Call out shader/asset changes explicitly, mention compatibility risks
- **Testing**: List commands executed, attach screenshots/GIFs for visual changes
- **Branch management**: Work on feature branches, main should always be buildable

## Future Development Patterns

When adding new systems:
- Prefer new folders inside `src/` (e.g., `src/systems/`) over expanding existing files
- Follow existing patterns: single responsibility classes, clear separation of concerns
- Document WebGL-specific assumptions in code comments
- Consider future testability when creating deterministic utilities