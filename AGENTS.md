# Repository Guidelines

## Project Structure & Module Organization
Source TypeScript lives in `src/`, with gameplay logic split across single-file classes (e.g., `Player.ts`, `Camera.ts`). Rendering assets and GLSL live under `src/assets` and `src/shaders`, while static HTML/CSS sits in `public/`. Builds land in `dist/`; keep generated artifacts out of commits. When introducing subsystems, prefer new folders inside `src/` (e.g., `src/systems/`) over sprawling files.

## Build, Test, and Development Commands
- `npm run dev` – Launch Vite dev server with HMR; quickest way to validate shaders and camera tuning.
- `npm run build` – Run `tsc` then Vite for a production bundle; ensure it passes before tagging releases.
- `npm run preview` – Serve the last build to verify asset loading without dev tooling.
- `npm run typecheck` – Strict TypeScript diagnostics; run before reviewing.
- `npm run lint` / `npm run format` – Biome-powered linting/formatting over `src/`; keep the tree clean before committing.

## Coding Style & Naming Conventions
Biome enforces tab indentation and double quotes; avoid manual overrides. Exported classes stay in `PascalCase`, utilities in `camelCase`, shaders keep `.vert`/`.frag` suffixes mirroring their material names, and assets use lowercase-kebab (e.g., `goblin-warrior.glb`). Keep modules focused; favor composition over expanding `main.ts`.

## Testing & Quality Gates
There is no automated gameplay test suite yet, so pair `npm run typecheck` with manual smoke-tests in the dev server. When adding deterministic utilities (math, loading), colocate future specs in `src/**/__tests__` with `.spec.ts` suffix so Vitest or similar can drop in later. Document GPU-specific assumptions (resolution, precision) in code comments to aid reviewers.

## Commit & Pull Request Guidelines
History so far uses short imperative titles (`Init`), so continue with ≤72-character subject lines that describe the change ("Add spring camera damping"). Reference GitHub issues in the body, list test commands executed, and attach GIFs or screenshots for visual tweaks. PR descriptions should call out shader or asset changes explicitly and mention any compatibility risks (e.g., requiring WebGL extensions).

## Asset & Shader Handling
Store source textures/models under `src/assets/` and keep optimized outputs alongside originals with clear suffixes (`-lowpoly`, `-albedo`). Name uniforms consistently (`uView`, `uProjection`) and document required attributes in the file header. When editing GLSL, re-run `npm run build` to catch compile-time regressions that dev-mode may gloss over.
