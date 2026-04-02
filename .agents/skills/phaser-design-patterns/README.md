# Phaser Design Patterns Skill

Design patterns for **real Phaser 3 gameplay**, not textbook-only examples.

This skill helps you choose and implement the right pattern in JavaScript for scene architecture, entities, input, physics, and performance.

---

## Why this skill

- Maps classic GoF patterns directly to Phaser primitives (`Scene`, `GameObject`, `Group`, `Events`, `Physics`, `Time`, `Input`).
- Keeps architecture practical: less coupling, clearer responsibilities, and easier runtime debugging.
- Includes ready-to-adapt snippets and a full State Machine implementation.

## Pattern Categories

### 1) Creational Patterns

1. Factory Method
2. Abstract Factory
3. Builder
4. Prototype
5. Singleton

### 2) Structural Patterns

6. Adapter
7. Bridge
8. Composite
9. Decorator
10. Facade
11. Flyweight
12. Proxy

### 3) Behavioral Patterns

13. Chain of Responsibility
14. Command
15. Iterator
16. Mediator
17. Memento
18. Observer
19. State
20. Strategy
21. Template Method
22. Visitor

---

## Full Pattern List (22)

| # | Pattern | Category | Typical Phaser Use |
|---|---|---|---|
| 1 | Factory Method | Creational | Spawn enemies/projectiles by type without scattered conditionals |
| 2 | Abstract Factory | Creational | Generate theme/biome-specific content families |
| 3 | Builder | Creational | Build levels step by step (map, layers, collisions, spawns) |
| 4 | Prototype | Creational | Clone base enemy/weapon configs quickly |
| 5 | Singleton | Creational | Global services like audio/config/telemetry |
| 6 | Adapter | Structural | Wrap external plugins/SDKs behind internal interfaces |
| 7 | Bridge | Structural | Separate high-level weapon logic from fire mode implementation |
| 8 | Composite | Structural | Treat HUD/widgets node trees uniformly |
| 9 | Decorator | Structural | Add buffs/debuffs/effects without changing base classes |
| 10 | Facade | Structural | Expose one API for save/audio/UI/analytics subsystems |
| 11 | Flyweight | Structural | Share intrinsic data + pair with object pooling |
| 12 | Proxy | Structural | Add lazy load/cache/access control around services |
| 13 | Chain of Responsibility | Behavioral | Input/validation pipelines |
| 14 | Command | Behavioral | Rebindable actions, replay, undo |
| 15 | Iterator | Behavioral | Specialized iteration over active entities |
| 16 | Mediator | Behavioral | Coordinate systems without direct dependencies |
| 17 | Memento | Behavioral | Checkpoints and rollback |
| 18 | Observer | Behavioral | Event-driven decoupling using `EventEmitter` |
| 19 | State | Behavioral | Explicit AI/control states (Idle, Patrol, Chase, Attack) |
| 20 | Strategy | Behavioral | Swap movement/targeting/fire logic at runtime |
| 21 | Template Method | Behavioral | Base scene flow with overridable hooks |
| 22 | Visitor | Behavioral | New operations over stable entity hierarchies |

---

## Quick Selection Heuristic

- If **what gets created** changes often -> use a **Creational** pattern.
- If **how modules connect** is the problem -> use a **Structural** pattern.
- If **runtime behavior** changes by mode/state/context -> use a **Behavioral** pattern.

## Recommended Implementation Flow

1. Identify a concrete gameplay problem.
2. Pick the smallest pattern that removes coupling.
3. Map it to Phaser objects and scene lifecycle.
4. Implement in domain language (not generic `Foo/Bar` naming).
5. Validate in runtime and cleanup events on `shutdown`/`destroy`.

## Runtime Validation Checklist

- Scene loads with no lifecycle errors.
- Input remains responsive after state/scene changes.
- Physics collisions/overlaps still trigger correctly.
- No event listener leaks after restart/shutdown.
- Object-heavy systems (bullets/particles) keep stable performance.

## Anti-Patterns to Avoid

- Deep inheritance trees for gameplay behavior.
- Mutable singletons driving core game logic.
- Pattern-overengineering for simple one-off logic.
- Forgetting event unsubscription and pooling reset.

---

## Repository Structure

- `SKILL.md`: main instructions and expected deliverables.
- `references/patterns-map.md`: pattern-to-Phaser mapping.
- `references/phaser-snippets.md`: 22 practical snippets.
- `references/state-machine-pattern-phaser.md`: complete State + StateMachine example.

## Best Starting Points

- Need a fast pattern choice? Start at `references/patterns-map.md`.
- Need copy-ready code? Start at `references/phaser-snippets.md`.
- Need full architecture example? Start at `references/state-machine-pattern-phaser.md`.
