import { Entity } from "./Entity.ts";

/**
 * Abstract base class for static background objects (trees, rocks, etc.)
 * Static objects are rendered but don't have game logic or movement.
 * The mesh is shared across multiple instances for efficiency.
 */
export abstract class StaticObject extends Entity {}
