# Pattern Mapping to Phaser

## Creational

- Factory Method: create enemies/projectiles by type without scattered `if/switch` statements.
- Abstract Factory: content families by biome/theme (ice, forest, lava).
- Builder: construct levels step by step (tilemap, layers, collision, spawn).
- Prototype: clone base configurations for enemies or weapons.
- Singleton: global services (audio, configuration, telemetry) with controlled access.

## Structural

- Adapter: adapt external plugins or SDKs to the game's internal contract.
- Bridge: separate high-level logic (weapon) from implementation (hitscan/projectile).
- Composite: manage HUD or node trees with a uniform interface.
- Decorator: add buffs/debuffs/effects without touching the base class.
- Facade: single API for subsystems (save, audio, UI feedback, analytics).
- Flyweight: share intrinsic state in massive objects + object pooling.
- Proxy: cache, lazy load, or access control for remote services.

## Behavioral

- Chain of Responsibility: input or validation pipeline.
- Command: encapsulate player actions for replay/undo/rebind.
- Iterator: specialized traversals over active collections.
- Mediator: coordinate components without direct dependencies.
- Memento: checkpoints and state rollback.
- Observer: decoupled gameplay events (`this.events`, EventEmitter).
- State: AI or control with explicit states (Idle, Patrol, Chase, Attack).
- Strategy: swap algorithms at runtime (movement, targeting, shooting).
- Template Method: base scene flow with overridable steps.
- Visitor: new operations over stable entity hierarchies.

## Selection Heuristic

- If **what gets created** changes, use a creational pattern.
- If **how pieces connect** changes, use a structural pattern.
- If **how things behave at runtime** changes, use a behavioral pattern.
