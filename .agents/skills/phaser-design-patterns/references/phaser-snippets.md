# Phaser + JavaScript Snippets (22 patterns)

## 1. Factory Method

```js
class EnemyFactory {
  create(scene, type, x, y) {
    if (type === 'slime') return new Slime(scene, x, y);
    if (type === 'bat') return new Bat(scene, x, y);
    throw new Error(`Unsupported type: ${type}`);
  }
}
```

## 2. Abstract Factory

```js
class ForestFactory { createEnemy(scene, x, y) { return new Slime(scene, x, y, 'slime_forest'); } }
class IceFactory { createEnemy(scene, x, y) { return new Slime(scene, x, y, 'slime_ice'); } }
const factory = biome === 'ice' ? new IceFactory() : new ForestFactory();
```

## 3. Builder

```js
class LevelBuilder {
  constructor(scene) { this.scene = scene; this.level = {}; }
  map(key) { this.level.map = this.scene.make.tilemap({ key }); return this; }
  build() { return this.level; }
}
```

## 4. Prototype

```js
const baseConfig = { hp: 100, speed: 70, damage: 10 };
const eliteConfig = structuredClone(baseConfig);
eliteConfig.hp = 200;
```

## 5. Singleton

```js
class AudioManager {
  static instance;
  static get(scene) { if (!AudioManager.instance) AudioManager.instance = new AudioManager(scene); return AudioManager.instance; }
}
```

## 6. Adapter

```js
class JoystickAdapter {
  constructor(plugin) { this.plugin = plugin; }
  axis() { return { x: this.plugin.forceX(), y: this.plugin.forceY() }; }
}
```

## 7. Bridge

```js
class Hitscan { shoot(scene, x, y) { scene.spawnRay(x, y); } }
class Projectile { shoot(scene, x, y) { scene.spawnBullet(x, y); } }
class Weapon { constructor(mode) { this.mode = mode; } fire(scene, x, y) { this.mode.shoot(scene, x, y); } }
```

## 8. Composite

```js
class HudGroup {
  constructor() { this.children = []; }
  add(child) { this.children.push(child); }
  update() { this.children.forEach((c) => c.update()); }
}
```

## 9. Decorator

```js
class DamageBoost {
  constructor(attack, bonus) { this.attack = attack; this.bonus = bonus; }
  execute(target) { this.attack.execute(target); target.takeDamage(this.bonus); }
}
```

## 10. Facade

```js
class GameServices {
  constructor(save, audio, ui) { this.save = save; this.audio = audio; this.ui = ui; }
  onWin(score) { this.save.storeScore(score); this.audio.playSfx('win'); this.ui.showToast('Level completed'); }
}
```

## 11. Flyweight

```js
const bullets = this.physics.add.group({ classType: Bullet, maxSize: 300 });
function spawnBullet(x, y) {
  const b = bullets.get(x, y, 'bullet');
  if (!b) return;
  b.setActive(true).setVisible(true);
}
```

## 12. Proxy

```js
class LeaderboardProxy {
  constructor(api) { this.api = api; this.cache = null; }
  async top10() { if (this.cache) return this.cache; this.cache = await this.api.fetchTop10(); return this.cache; }
}
```

## 13. Chain of Responsibility

```js
class Handler {
  setNext(next) { this.next = next; return next; }
  handle(evt) { if (this.next) this.next.handle(evt); }
}
```

## 14. Command

```js
class JumpCommand { execute(player) { if (player.body.blocked.down) player.setVelocityY(-320); } }
const commands = { Space: new JumpCommand() };
```

## 15. Iterator

```js
class ActiveEnemies {
  constructor(group) { this.group = group; }
  *[Symbol.iterator]() { for (const e of this.group.getChildren()) if (e.active) yield e; }
}
```

## 16. Mediator

```js
class GameMediator {
  constructor({ ui, audio }) { this.ui = ui; this.audio = audio; }
  notify(sender, event) { if (event === 'PLAYER_HIT') { this.ui.updateHealth(sender.hp); this.audio.playSfx('hit'); } }
}
```

## 17. Memento

```js
class Caretaker {
  save(player) { this.snap = player.getState(); }
  restore(player) { if (this.snap) player.setState(this.snap); }
}
```

## 18. Observer

```js
this.events.on('coin-collected', (value) => scoreText.setText(`Score: ${value}`));
this.events.emit('coin-collected', score + 10);
```

## 19. State

```js
class EnemyState {
  enter(ctx) {}
  update(ctx, time, delta) {}
  exit(ctx) {}
  onSensorOverlap(ctx, target) {}
  onCustomEvent(ctx, eventData) {}
}

class EnemyStateMachine {
  constructor(ctx) { this.ctx = ctx; this.currentState = null; }
  initialize(initialState) {
    this.currentState = initialState;
    this.currentState.enter(this.ctx);
  }
  transitionTo(nextState) {
    if (this.currentState) this.currentState.exit(this.ctx);
    this.currentState = nextState;
    this.currentState.enter(this.ctx);
  }
  update(time, delta) {
    if (this.currentState) this.currentState.update(this.ctx, time, delta);
  }
}
```

Full implementation with `EnemyExample`, `IdleState`, `MoveState`, and `ActionState` in `references/state-machine-pattern-phaser.md`.

## 20. Strategy

```js
class ZigZagMove { move(enemy, t) { enemy.x += Math.cos(t * 0.005) * 2; } }
enemy.moveStrategy = new ZigZagMove();
```

## 21. Template Method

```js
class BaseLevelScene extends Phaser.Scene {
  create() { this.createMap(); this.createPlayer(); this.createEnemies(); }
  createMap() { throw new Error('Implement createMap'); }
  createEnemies() { throw new Error('Implement createEnemies'); }
}
```

## 22. Visitor

```js
class DamageVisitor { visitEnemy(enemy) { enemy.takeDamage(10); } }
class Enemy { accept(visitor) { visitor.visitEnemy(this); } }
```

## Event Cleanup

```js
this.events.once('shutdown', () => {
  this.events.removeAllListeners();
});
```
