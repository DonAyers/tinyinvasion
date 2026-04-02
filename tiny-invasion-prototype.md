# Tiny Invasion: Prototype Core Loop

## Objective
Build a minimum viable prototype (MVP) of a 2D web-based game featuring a 3-stage gameplay loop: Gather, Prep, and Battle. 

## Tech Stack
* React (for UI and state management)
* Phaser 3 (for the game canvas rendering the Battle phase)
* TypeScript
* Vite
* CSS Modules or Tailwind (keep styling minimal)

## Visuals
Use primitive shapes and basic colors. NO external assets or sprites.
* Player/Base: Blue Square
* Aliens: Small Red Circles
* Walls: Brown Rectangles
* Turrets: Green Triangles

## Global State Management
Use a simple React context or a lightweight store (Zustand) to track:
* Resources: `scrap` (number)
* Current Phase: `gather` | `prep` | `battle`
* Base Health: `100`

## Phase 1: Gather (React UI)
* Render a simple dashboard interface over the game canvas.
* Provide two buttons:
    1.  **"Scavenge Safe"**: Adds 10 scrap instantly.
    2.  **"Steal Tech"**: 50% chance to gain 50 scrap, 50% chance to gain 0.
* Include a "Return to Shed (Prep)" button to transition phases.

## Phase 2: Prep (React UI + Canvas Interaction)
* Render a build menu.
* Items available:
    * **Wood Wall**: Costs 20 scrap.
    * **Nail Turret**: Costs 50 scrap.
* Interaction: When the user selects an item, allow them to click on the Phaser canvas to place the entity. Deduct the cost from the global state.
* Include a "Start Wave (Battle)" button.

## Phase 3: Battle (Phaser Canvas)
* Hide the React build menus. Show a simple UI with Base Health and a "Skip to Next Day" button (only visible when wave ends).
* **The Base**: Located at the center of the canvas.
* **The Swarm**: Spawn 20 small red circles at the edges of the screen moving toward the Base.
* **Mechanics**:
    * Turrets automatically fire small yellow lines (projectiles) at the closest red circle.
    * If an alien hits a Wall, the wall takes damage until destroyed, stalling the alien.
    * If an alien hits the Base, Base Health decreases.
* **Wave End**: When all aliens are destroyed, show the "Skip to Next Day" button, which transitions back to the Gather phase.

## Agent Instructions
1. Initialize the Vite React-TS project.
2. Install Phaser and necessary types.
3. Scaffold the global state.
4. Implement the phase-switching logic.
5. Build the React UI for Gather/Prep.
6. Build the Phaser scene for the Battle phase, ensuring the React state can pass down placed structures to the Phaser scene.