import Phaser from 'phaser'
import {
  baseDefinition,
  canAffordBuildItem,
  getBuildItemDefinition,
  isStructureDestroyed,
  usePrototypeStore,
  type BuildItem,
  type PlacedStructure,
  type PrototypeState,
  type StructurePlacement,
  type TurretDefinition,
  type WallDefinition,
} from '../../state/usePrototypeStore'

const PANEL_MARGIN = 28
const GRID_SIZE = 56
const ALIEN_TOTAL = 20
const ALIEN_RADIUS = 8
const ALIEN_HEALTH = 20
const ALIEN_MIN_SPEED = 40
const ALIEN_MAX_SPEED = 62
const ALIEN_WALL_DPS = 16
const ALIEN_BASE_DPS = 10
const PROJECTILE_LENGTH = 12
const PROJECTILE_LIFETIME_MS = 1400
const STRUCTURE_SPACING = 14
const BASE_CLEARANCE = 22
const BASE_CONTACT_RADIUS = Math.max(baseDefinition.footprint.width, baseDefinition.footprint.height) / 2
const BASE_HALF_WIDTH = baseDefinition.footprint.width / 2
const BASE_HALF_HEIGHT = baseDefinition.footprint.height / 2

type PlacementPreview = StructurePlacement & {
  kind: BuildItem
  valid: boolean
  reason: string | null
  rotation: number
}

type AlienActor = {
  attackTargetId: string | null
  health: number
  id: number
  alive: boolean
  position: Phaser.Math.Vector2
  speed: number
}

type ProjectileActor = {
  damage: number
  id: number
  lifeMs: number
  position: Phaser.Math.Vector2
  speed: number
  targetId: number | null
  velocity: Phaser.Math.Vector2
}

const clampAtLeastZero = (value: number) => Math.max(0, value)

const getStructureRadius = (structure: PlacedStructure) => {
  const definition = getBuildItemDefinition(structure.kind)

  if (structure.kind === 'wall') {
    return (definition as WallDefinition).blockRadius
  }

  return Math.max(definition.footprint.width, definition.footprint.height) / 2
}

const getDefinitionRadius = (kind: BuildItem) => {
  const definition = getBuildItemDefinition(kind)

  if (kind === 'wall') {
    return (definition as WallDefinition).blockRadius
  }

  return Math.max(definition.footprint.width, definition.footprint.height) / 2
}

export class BattleScene extends Phaser.Scene {
  private arenaBounds = new Phaser.Geom.Rectangle()
  private backgroundGraphics!: Phaser.GameObjects.Graphics
  private worldGraphics!: Phaser.GameObjects.Graphics
  private baseCenter = new Phaser.Math.Vector2()
  private statusText!: Phaser.GameObjects.Text
  private detailText!: Phaser.GameObjects.Text
  private storeSnapshot: PrototypeState = usePrototypeStore.getState()
  private unsubscribeStore?: () => void
  private pointerWorld = new Phaser.Math.Vector2()
  private preview: PlacementPreview | null = null
  private aliens: AlienActor[] = []
  private projectiles: ProjectileActor[] = []
  private turretCooldowns = new Map<string, number>()
  private alienIdSequence = 0
  private projectileIdSequence = 0
  private spawnedAlienCount = 0
  private activeWaveDay: number | null = null
  private spawnEvent?: Phaser.Time.TimerEvent

  constructor() {
    super('battle-scene')
  }

  create() {
    const { width, height } = this.scale

    this.arenaBounds = new Phaser.Geom.Rectangle(
      PANEL_MARGIN,
      PANEL_MARGIN,
      width - PANEL_MARGIN * 2,
      height - PANEL_MARGIN * 2,
    )
    this.baseCenter.set(width / 2, height / 2)

    this.cameras.main.setBackgroundColor('#020617')

    this.backgroundGraphics = this.add.graphics()
    this.worldGraphics = this.add.graphics()

    this.statusText = this.add.text(PANEL_MARGIN + 16, PANEL_MARGIN + 14, '', {
      color: '#f8fafc',
      fontFamily: 'Inter, Segoe UI, sans-serif',
      fontSize: '16px',
      fontStyle: '700',
    })
    this.detailText = this.add.text(PANEL_MARGIN + 16, height - PANEL_MARGIN - 44, '', {
      color: '#cbd5e1',
      fontFamily: 'Inter, Segoe UI, sans-serif',
      fontSize: '14px',
    })

    this.drawBoard()
    this.refreshPreview()
    this.syncStore(usePrototypeStore.getState(), usePrototypeStore.getState())

    this.input.on('pointermove', this.handlePointerMove, this)
    this.input.on('pointerdown', this.handlePointerDown, this)

    this.unsubscribeStore = usePrototypeStore.subscribe((state, previousState) => {
      this.syncStore(state, previousState)
    })

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.handleShutdown, this)
    this.events.once(Phaser.Scenes.Events.DESTROY, this.handleShutdown, this)
  }

  update(_time: number, delta: number) {
    const deltaSeconds = delta / 1000

    if (this.shouldSimulateBattle()) {
      this.updateTurrets(delta)
      this.updateProjectiles(deltaSeconds, delta)
      this.updateAliens(deltaSeconds)
      this.finishWaveIfCleared()
    }

    this.drawWorld()
    this.updateHud()
  }

  private handlePointerMove(pointer: Phaser.Input.Pointer) {
    this.pointerWorld.set(pointer.x, pointer.y)
    this.refreshPreview()
  }

  private handlePointerDown(pointer: Phaser.Input.Pointer) {
    this.pointerWorld.set(pointer.x, pointer.y)
    this.refreshPreview()

    if (!this.preview?.valid) {
      return
    }

    usePrototypeStore.getState().placeStructure({
      x: this.preview.x,
      y: this.preview.y,
      rotation: this.preview.rotation,
    })
  }

  private handleShutdown() {
    this.spawnEvent?.remove(false)
    this.spawnEvent = undefined
    this.unsubscribeStore?.()
    this.unsubscribeStore = undefined
    this.input.off('pointermove', this.handlePointerMove, this)
    this.input.off('pointerdown', this.handlePointerDown, this)
  }

  private syncStore(state: PrototypeState, previousState: PrototypeState) {
    this.storeSnapshot = state

    if (state.phase !== 'battle') {
      this.clearWaveActors(true)
    } else if (state.wave.active) {
      const shouldStartWave =
        this.activeWaveDay !== state.wave.day ||
        previousState.phase !== 'battle' ||
        !previousState.wave.active

      if (shouldStartWave) {
        this.startWave(state.wave.day)
      }
    } else {
      this.clearWaveActors(false)
    }

    this.refreshPreview()
  }

  private startWave(day: number) {
    this.clearWaveActors(false)
    this.activeWaveDay = day
    this.spawnAlien()

    this.spawnEvent = this.time.addEvent({
      callback: () => this.spawnAlien(),
      callbackScope: this,
      delay: 320,
      repeat: ALIEN_TOTAL - 2,
    })
  }

  private clearWaveActors(resetWaveDay: boolean) {
    this.spawnEvent?.remove(false)
    this.spawnEvent = undefined
    this.aliens = []
    this.projectiles = []
    this.spawnedAlienCount = 0
    this.turretCooldowns.clear()

    if (resetWaveDay) {
      this.activeWaveDay = null
    }
  }

  private shouldSimulateBattle() {
    return this.storeSnapshot.phase === 'battle' && this.storeSnapshot.wave.active
  }

  private spawnAlien() {
    if (this.spawnedAlienCount >= ALIEN_TOTAL) {
      return
    }

    const edgeRoll = Phaser.Math.Between(0, 3)
    const left = this.arenaBounds.left + ALIEN_RADIUS
    const right = this.arenaBounds.right - ALIEN_RADIUS
    const top = this.arenaBounds.top + ALIEN_RADIUS
    const bottom = this.arenaBounds.bottom - ALIEN_RADIUS
    let x = left
    let y = top

    if (edgeRoll === 0) {
      x = Phaser.Math.Between(left, right)
      y = top
    } else if (edgeRoll === 1) {
      x = right
      y = Phaser.Math.Between(top, bottom)
    } else if (edgeRoll === 2) {
      x = Phaser.Math.Between(left, right)
      y = bottom
    } else {
      x = left
      y = Phaser.Math.Between(top, bottom)
    }

    this.alienIdSequence += 1
    this.spawnedAlienCount += 1
    this.aliens.push({
      attackTargetId: null,
      health: ALIEN_HEALTH,
      id: this.alienIdSequence,
      alive: true,
      position: new Phaser.Math.Vector2(x, y),
      speed: Phaser.Math.Between(ALIEN_MIN_SPEED, ALIEN_MAX_SPEED),
    })
  }

  private updateTurrets(deltaMs: number) {
    const aliveAliens = this.aliens.filter((alien) => alien.alive)
    const turretStructures = this.storeSnapshot.placedStructures.filter(
      (structure): structure is Extract<PlacedStructure, { kind: 'turret' }> =>
        structure.kind === 'turret' && !isStructureDestroyed(structure),
    )
    const activeIds = new Set(turretStructures.map((turret) => turret.id))

    for (const turretId of this.turretCooldowns.keys()) {
      if (!activeIds.has(turretId)) {
        this.turretCooldowns.delete(turretId)
      }
    }

    for (const turret of turretStructures) {
      const definition = getBuildItemDefinition(turret.kind) as TurretDefinition
      const nextCooldown = clampAtLeastZero((this.turretCooldowns.get(turret.id) ?? 0) - deltaMs)

      if (nextCooldown > 0) {
        this.turretCooldowns.set(turret.id, nextCooldown)
        continue
      }

      const target = this.findClosestAlienInRange(
        turret.position.x,
        turret.position.y,
        definition.attackRange,
        aliveAliens,
      )

      if (!target) {
        this.turretCooldowns.set(turret.id, 0)
        continue
      }

      this.fireProjectile(turret, definition, target)
      this.turretCooldowns.set(turret.id, definition.cooldownMs)
    }
  }

  private findClosestAlienInRange(
    x: number,
    y: number,
    range: number,
    aliens: AlienActor[],
  ) {
    let closestAlien: AlienActor | null = null
    let closestDistance = Number.POSITIVE_INFINITY

    for (const alien of aliens) {
      if (!alien.alive) {
        continue
      }

      const distance = Phaser.Math.Distance.Between(x, y, alien.position.x, alien.position.y)

      if (distance <= range && distance < closestDistance) {
        closestAlien = alien
        closestDistance = distance
      }
    }

    return closestAlien
  }

  private fireProjectile(
    turret: Extract<PlacedStructure, { kind: 'turret' }>,
    definition: TurretDefinition,
    target: AlienActor,
  ) {
    const direction = new Phaser.Math.Vector2(
      target.position.x - turret.position.x,
      target.position.y - turret.position.y,
    ).normalize()

    this.projectileIdSequence += 1
    this.projectiles.push({
      damage: definition.projectileDamage,
      id: this.projectileIdSequence,
      lifeMs: PROJECTILE_LIFETIME_MS,
      position: new Phaser.Math.Vector2(turret.position.x, turret.position.y),
      speed: definition.projectileSpeed,
      targetId: target.id,
      velocity: direction.scale(definition.projectileSpeed),
    })
  }

  private updateProjectiles(deltaSeconds: number, deltaMs: number) {
    for (let index = this.projectiles.length - 1; index >= 0; index -= 1) {
      const projectile = this.projectiles[index]
      projectile.lifeMs -= deltaMs

      if (projectile.lifeMs <= 0) {
        this.projectiles.splice(index, 1)
        continue
      }

      const target = this.aliens.find(
        (alien) => alien.id === projectile.targetId && alien.alive,
      )

      if (target) {
        projectile.velocity
          .set(target.position.x - projectile.position.x, target.position.y - projectile.position.y)
          .normalize()
          .scale(projectile.speed)
      }

      projectile.position.add(projectile.velocity.clone().scale(deltaSeconds))

      const hitAlien = this.aliens.find(
        (alien) =>
          alien.alive &&
          Phaser.Math.Distance.Between(
            projectile.position.x,
            projectile.position.y,
            alien.position.x,
            alien.position.y,
          ) <= ALIEN_RADIUS + PROJECTILE_LENGTH * 0.35,
      )

      if (!hitAlien) {
        continue
      }

      hitAlien.health = clampAtLeastZero(hitAlien.health - projectile.damage)
      if (hitAlien.health <= 0) {
        hitAlien.alive = false
      }

      this.projectiles.splice(index, 1)
    }
  }

  private updateAliens(deltaSeconds: number) {
    const aliveWalls = this.storeSnapshot.placedStructures.filter(
      (structure): structure is Extract<PlacedStructure, { kind: 'wall' }> =>
        structure.kind === 'wall' && !isStructureDestroyed(structure),
    )
    const wallDamage = new Map<string, number>()
    let baseDamage = 0

    for (const alien of this.aliens) {
      if (!alien.alive) {
        continue
      }

      const engagedWall =
        this.findWallById(alien.attackTargetId, alien, aliveWalls) ??
        this.findBlockingWall(alien, aliveWalls)

      if (engagedWall) {
        alien.attackTargetId = engagedWall.id
        wallDamage.set(
          engagedWall.id,
          (wallDamage.get(engagedWall.id) ?? 0) + ALIEN_WALL_DPS * deltaSeconds,
        )
        continue
      }

      alien.attackTargetId = null

      const baseDistance = Phaser.Math.Distance.Between(
        alien.position.x,
        alien.position.y,
        this.baseCenter.x,
        this.baseCenter.y,
      )

      if (baseDistance <= BASE_CONTACT_RADIUS + ALIEN_RADIUS) {
        baseDamage += ALIEN_BASE_DPS * deltaSeconds
        continue
      }

      const direction = new Phaser.Math.Vector2(
        this.baseCenter.x - alien.position.x,
        this.baseCenter.y - alien.position.y,
      ).normalize()

      alien.position.add(direction.scale(alien.speed * deltaSeconds))
    }

    const store = usePrototypeStore.getState()

    for (const [wallId, damage] of wallDamage) {
      store.damageStructure(wallId, damage)
    }

    if (baseDamage > 0) {
      store.damageBase(baseDamage)
    }
  }

  private findWallById(
    wallId: string | null,
    alien: AlienActor,
    walls: Array<Extract<PlacedStructure, { kind: 'wall' }>>,
  ) {
    if (!wallId) {
      return null
    }

    const wall = walls.find((candidate) => candidate.id === wallId)

    if (!wall) {
      return null
    }

    const definition = getBuildItemDefinition(wall.kind) as WallDefinition
    const distance = Phaser.Math.Distance.Between(
      alien.position.x,
      alien.position.y,
      wall.position.x,
      wall.position.y,
    )

    return distance <= definition.blockRadius + ALIEN_RADIUS ? wall : null
  }

  private findBlockingWall(
    alien: AlienActor,
    walls: Array<Extract<PlacedStructure, { kind: 'wall' }>>,
  ) {
    let bestWall: Extract<PlacedStructure, { kind: 'wall' }> | null = null
    let closestDistance = Number.POSITIVE_INFINITY

    for (const wall of walls) {
      const definition = getBuildItemDefinition(wall.kind) as WallDefinition
      const distance = Phaser.Math.Distance.Between(
        alien.position.x,
        alien.position.y,
        wall.position.x,
        wall.position.y,
      )

      if (distance > definition.blockRadius + ALIEN_RADIUS) {
        continue
      }

      if (distance < closestDistance) {
        bestWall = wall
        closestDistance = distance
      }
    }

    return bestWall
  }

  private finishWaveIfCleared() {
    if (
      this.spawnedAlienCount < ALIEN_TOTAL ||
      this.aliens.some((alien) => alien.alive) ||
      !this.storeSnapshot.wave.active
    ) {
      return
    }

    this.spawnEvent?.remove(false)
    this.spawnEvent = undefined
    usePrototypeStore.getState().finishWave()
  }

  private refreshPreview() {
    if (
      this.storeSnapshot.phase !== 'prep' ||
      !this.storeSnapshot.selectedBuildItem
    ) {
      this.preview = null
      return
    }

    this.preview = this.createPlacementPreview(
      this.pointerWorld.x || this.baseCenter.x,
      this.pointerWorld.y || this.baseCenter.y,
      this.storeSnapshot.selectedBuildItem,
    )
  }

  private createPlacementPreview(x: number, y: number, kind: BuildItem): PlacementPreview {
    const definition = getBuildItemDefinition(kind)
    const padding = Math.max(definition.footprint.width, definition.footprint.height) / 2 + 8
    const clampedX = Phaser.Math.Clamp(
      x,
      this.arenaBounds.left + padding,
      this.arenaBounds.right - padding,
    )
    const clampedY = Phaser.Math.Clamp(
      y,
      this.arenaBounds.top + padding,
      this.arenaBounds.bottom - padding,
    )
    const placement: PlacementPreview = {
      kind,
      reason: null,
      rotation:
        kind === 'wall'
          ? Phaser.Math.Angle.Between(this.baseCenter.x, this.baseCenter.y, clampedX, clampedY) +
            Math.PI / 2
          : 0,
      valid: true,
      x: clampedX,
      y: clampedY,
    }

    if (!canAffordBuildItem(this.storeSnapshot.resources.scrap, kind)) {
      placement.valid = false
      placement.reason = 'Not enough scrap'
      return placement
    }

    const placementRadius = getDefinitionRadius(kind)
    const distanceToBase = Phaser.Math.Distance.Between(
      placement.x,
      placement.y,
      this.baseCenter.x,
      this.baseCenter.y,
    )

    if (distanceToBase < BASE_CONTACT_RADIUS + placementRadius + BASE_CLEARANCE) {
      placement.valid = false
      placement.reason = 'Too close to the base'
      return placement
    }

    for (const structure of this.storeSnapshot.placedStructures) {
      if (isStructureDestroyed(structure)) {
        continue
      }

      const minimumSpacing = placementRadius + getStructureRadius(structure) + STRUCTURE_SPACING
      const distance = Phaser.Math.Distance.Between(
        placement.x,
        placement.y,
        structure.position.x,
        structure.position.y,
      )

      if (distance < minimumSpacing) {
        placement.valid = false
        placement.reason = 'Too close to another structure'
        return placement
      }
    }

    return placement
  }

  private drawBoard() {
    const graphics = this.backgroundGraphics
    const { left, right, top, bottom, width, height } = this.arenaBounds

    graphics.clear()
    graphics.fillStyle(0x0f172a, 1)
    graphics.fillRoundedRect(left, top, width, height, 20)
    graphics.lineStyle(2, 0x334155, 1)
    graphics.strokeRoundedRect(left, top, width, height, 20)
    graphics.lineStyle(1, 0x1e293b, 1)

    for (let x = left + GRID_SIZE; x < right; x += GRID_SIZE) {
      graphics.lineBetween(x, top, x, bottom)
    }

    for (let y = top + GRID_SIZE; y < bottom; y += GRID_SIZE) {
      graphics.lineBetween(left, y, right, y)
    }
  }

  private drawWorld() {
    const graphics = this.worldGraphics
    graphics.clear()

    graphics.fillStyle(0x0b1120, 0.45)
    graphics.fillEllipse(this.baseCenter.x, this.baseCenter.y + 18, 88, 28)

    this.drawBase(graphics)
    this.drawStructures(graphics)
    this.drawAliens(graphics)
    this.drawProjectiles(graphics)
    this.drawPreview(graphics)
  }

  private drawBase(graphics: Phaser.GameObjects.Graphics) {
    graphics.fillStyle(0x2563eb, 1)
    graphics.fillRect(
      this.baseCenter.x - BASE_HALF_WIDTH,
      this.baseCenter.y - BASE_HALF_HEIGHT,
      baseDefinition.footprint.width,
      baseDefinition.footprint.height,
    )
    graphics.lineStyle(2, 0x93c5fd, 1)
    graphics.strokeRect(
      this.baseCenter.x - BASE_HALF_WIDTH,
      this.baseCenter.y - BASE_HALF_HEIGHT,
      baseDefinition.footprint.width,
      baseDefinition.footprint.height,
    )
    this.drawHealthBar(
      graphics,
      this.baseCenter.x - 36,
      this.baseCenter.y - BASE_HALF_HEIGHT - 16,
      72,
      this.storeSnapshot.base.health / baseDefinition.maxHealth,
      0x60a5fa,
    )
  }

  private drawStructures(graphics: Phaser.GameObjects.Graphics) {
    for (const structure of this.storeSnapshot.placedStructures) {
      if (isStructureDestroyed(structure)) {
        continue
      }

      const definition = getBuildItemDefinition(structure.kind)

      if (structure.kind === 'wall') {
        this.drawRotatedRectangle(
          graphics,
          structure.position.x,
          structure.position.y,
          definition.footprint.width,
          definition.footprint.height,
          structure.rotation,
          0x92400e,
          0xfbbf24,
        )
      } else {
        this.drawRotatedTriangle(
          graphics,
          structure.position.x,
          structure.position.y,
          definition.footprint.width,
          definition.footprint.height,
          structure.rotation,
          0x16a34a,
          0x86efac,
        )
      }

      this.drawHealthBar(
        graphics,
        structure.position.x - 24,
        structure.position.y - Math.max(definition.footprint.height, definition.footprint.width) / 2 - 16,
        48,
        structure.health / getBuildItemDefinition(structure.kind).maxHealth,
        structure.kind === 'wall' ? 0xfbbf24 : 0x4ade80,
      )
    }
  }

  private drawAliens(graphics: Phaser.GameObjects.Graphics) {
    for (const alien of this.aliens) {
      if (!alien.alive) {
        continue
      }

      graphics.fillStyle(0x1f2937, 0.45)
      graphics.fillEllipse(alien.position.x, alien.position.y + 10, 18, 8)
      graphics.fillStyle(0xef4444, 1)
      graphics.fillCircle(alien.position.x, alien.position.y, ALIEN_RADIUS)
      graphics.lineStyle(2, 0xfca5a5, 1)
      graphics.strokeCircle(alien.position.x, alien.position.y, ALIEN_RADIUS)
      this.drawHealthBar(
        graphics,
        alien.position.x - 12,
        alien.position.y - ALIEN_RADIUS - 11,
        24,
        alien.health / ALIEN_HEALTH,
        0xfca5a5,
      )
    }
  }

  private drawProjectiles(graphics: Phaser.GameObjects.Graphics) {
    graphics.lineStyle(3, 0xfacc15, 1)

    for (const projectile of this.projectiles) {
      const direction = projectile.velocity.clone().normalize()
      const startX = projectile.position.x - direction.x * (PROJECTILE_LENGTH / 2)
      const startY = projectile.position.y - direction.y * (PROJECTILE_LENGTH / 2)
      const endX = projectile.position.x + direction.x * (PROJECTILE_LENGTH / 2)
      const endY = projectile.position.y + direction.y * (PROJECTILE_LENGTH / 2)

      graphics.lineBetween(startX, startY, endX, endY)
    }
  }

  private drawPreview(graphics: Phaser.GameObjects.Graphics) {
    if (!this.preview) {
      return
    }

    const definition = getBuildItemDefinition(this.preview.kind)
    const fillColor = this.preview.valid ? 0x22c55e : 0xef4444
    const strokeColor = this.preview.valid ? 0x86efac : 0xfca5a5

    if (this.preview.kind === 'wall') {
      this.drawRotatedRectangle(
        graphics,
        this.preview.x,
        this.preview.y,
        definition.footprint.width,
        definition.footprint.height,
        this.preview.rotation,
        fillColor,
        strokeColor,
        0.25,
      )
    } else {
      this.drawRotatedTriangle(
        graphics,
        this.preview.x,
        this.preview.y,
        definition.footprint.width,
        definition.footprint.height,
        this.preview.rotation,
        fillColor,
        strokeColor,
        0.25,
      )
    }
  }

  private drawRotatedRectangle(
    graphics: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    width: number,
    height: number,
    rotation: number,
    fillColor: number,
    strokeColor: number,
    alpha = 1,
  ) {
    const halfWidth = width / 2
    const halfHeight = height / 2
    const points = [
      this.rotatePoint(-halfWidth, -halfHeight, rotation, x, y),
      this.rotatePoint(halfWidth, -halfHeight, rotation, x, y),
      this.rotatePoint(halfWidth, halfHeight, rotation, x, y),
      this.rotatePoint(-halfWidth, halfHeight, rotation, x, y),
    ]

    graphics.fillStyle(fillColor, alpha)
    graphics.fillPoints(points, true)
    graphics.lineStyle(2, strokeColor, alpha)
    graphics.strokePoints(points, true, true)
  }

  private drawRotatedTriangle(
    graphics: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    width: number,
    height: number,
    rotation: number,
    fillColor: number,
    strokeColor: number,
    alpha = 1,
  ) {
    const points = [
      this.rotatePoint(0, -height / 2, rotation, x, y),
      this.rotatePoint(width / 2, height / 2, rotation, x, y),
      this.rotatePoint(-width / 2, height / 2, rotation, x, y),
    ]

    graphics.fillStyle(fillColor, alpha)
    graphics.fillPoints(points, true)
    graphics.lineStyle(2, strokeColor, alpha)
    graphics.strokePoints(points, true, true)
  }

  private rotatePoint(
    x: number,
    y: number,
    rotation: number,
    offsetX: number,
    offsetY: number,
  ) {
    const cos = Math.cos(rotation)
    const sin = Math.sin(rotation)

    return new Phaser.Geom.Point(
      offsetX + x * cos - y * sin,
      offsetY + x * sin + y * cos,
    )
  }

  private drawHealthBar(
    graphics: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    width: number,
    progress: number,
    fillColor: number,
  ) {
    graphics.fillStyle(0x020617, 0.9)
    graphics.fillRect(x, y, width, 5)
    graphics.fillStyle(fillColor, 1)
    graphics.fillRect(x, y, width * Phaser.Math.Clamp(progress, 0, 1), 5)
  }

  private updateHud() {
    const aliensRemaining = this.aliens.filter((alien) => alien.alive).length
    const waveStatus = this.storeSnapshot.wave.completed
      ? 'Wave cleared'
      : this.storeSnapshot.wave.active
        ? `Wave live · ${aliensRemaining} aliens left`
        : 'Awaiting battle'

    this.statusText.setText(
      `Day ${this.storeSnapshot.wave.day} · ${this.storeSnapshot.phase.toUpperCase()} · Base ${Math.ceil(
        this.storeSnapshot.base.health,
      )}/${baseDefinition.maxHealth} · Scrap ${this.storeSnapshot.resources.scrap}`,
    )

    if (this.storeSnapshot.phase === 'prep') {
      const selectionLabel = this.storeSnapshot.selectedBuildItem
        ? `Selected ${this.storeSnapshot.selectedBuildItem}. Click the field to place.`
        : 'Select a wall or turret in React, then click the field to place it.'
      const previewMessage = this.preview?.reason
        ? ` ${this.preview.reason}.`
        : ''

      this.detailText.setText(`${selectionLabel}${previewMessage}`)
      return
    }

    if (this.storeSnapshot.phase === 'battle') {
      this.detailText.setText(
        this.storeSnapshot.wave.completed
          ? 'Wave cleared. Use Skip to Next Day to return to Gather.'
          : `${waveStatus} · ${this.spawnedAlienCount}/${ALIEN_TOTAL} spawned`,
      )
      return
    }

    this.detailText.setText('Gather phase is handled by React. Defenses remain visible on the field.')
  }
}
