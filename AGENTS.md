# Repository Guidelines

## Project Structure & Module Organization
Goblin Grinder is a TypeScript WebGL2 game served via Vite. Source lives in `src/` with domain folders such as `rendering`, `systems`, `objects`, and `vfx`. Shaders are stored in `src/shaders/*.vert|.frag`, while reusable meshes and loaders sit under `src/assets/`. Web components for menus live in `src/components/`, and the main entry point plus bootstrap logic is in `src/main.ts`. Static files that must be copied verbatim (textures, fonts, HTML shell) belong in `public/`, and production bundles are emitted to `dist/`. Keep new runtime data either in `public/` or under `src/assets/models` so Vite can import it without extra configuration.

## Build, Test, and Development Commands
- `npm run dev` launches the Vite dev server with hot reload for rapid gameplay iteration.
- `npm run build` runs `tsc` followed by `vite build` to produce an optimized bundle for GitHub Pages.
- `npm run preview` serves the contents of `dist/` so you can validate the exact production output.
- `npm run typecheck` executes `tsc --noEmit` to catch structural and typing regressions quickly.
- `npm run lint` / `npm run format` invoke Biome; run lint before committing and format if Biome suggests layout changes.

## Coding Style & Naming Conventions
Biome (see `biome.json`) enforces tab indentation, double quotes, trailing commas, and organized imports. Use PascalCase for classes/components (`Player`, `FireballWeapon`), camelCase for functions and fields, and kebab-case for asset filenames (`static-tree.glb`). Keep shader names descriptive of their pass (`depth.vert`, `particle.frag`) and mirror import names in TypeScript. Prefer small, focused modules and colocate helper types next to their usage to align with existing patterns.

## Testing Guidelines
There is no automated gameplay suite yet, so rely on `npm run typecheck`, `npm run lint`, and manual playtesting in both dev and preview builds. If you add Vitest/Playwright coverage, place specs beside their modules (`SpawnManager.spec.ts`) and cover spawning, physics, or rendering math rather than GPU output. Before submitting changes, play a full round with the console open, verify shaders on low-end hardware when touching rendering, and document any edge cases not handled.

## Commit & Pull Request Guidelines
Git history favors concise imperative subjects (“Improve main menu”, “Code cleanup”); follow that tone and keep each commit scoped to one concern. Reference issues or tasks in the body (`Fixes #42`) and describe asset additions, especially when crediting Kay Lousberg’s models. Pull requests should include: summary of gameplay/UI impact, screenshots or clips for visible changes, instructions to reproduce bugs or verify fixes, and notes about new configs or feature flags. Mention any manual verification performed (e.g., “tested npm run preview in Chrome + Firefox”) so reviewers can trust the coverage.
