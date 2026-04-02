import { create } from 'zustand'

export const prototypePhases = ['gather', 'prep', 'battle'] as const
export const buildItems = ['wall', 'turret'] as const

export type PrototypePhase = (typeof prototypePhases)[number]
export type BuildItem = (typeof buildItems)[number]

export type Point = {
  x: number
  y: number
}

export type Size = {
  width: number
  height: number
}

export type StructureRenderShape = 'rectangle' | 'triangle'

export type StructureRenderSpec = {
  color: string
  shape: StructureRenderShape
}

type BuildItemDefinitionBase<TKind extends BuildItem> = {
  kind: TKind
  label: string
  cost: number
  maxHealth: number
  footprint: Size
  render: StructureRenderSpec
}

export type WallDefinition = BuildItemDefinitionBase<'wall'> & {
  blockRadius: number
}

export type TurretDefinition = BuildItemDefinitionBase<'turret'> & {
  attackRange: number
  cooldownMs: number
  projectileDamage: number
  projectileSpeed: number
}

export type BuildItemDefinition = WallDefinition | TurretDefinition

export const buildItemCatalog = {
  wall: {
    kind: 'wall',
    label: 'Wood Wall',
    cost: 20,
    maxHealth: 80,
    footprint: { width: 72, height: 20 },
    render: {
      color: '#92400e',
      shape: 'rectangle',
    },
    blockRadius: 36,
  },
  turret: {
    kind: 'turret',
    label: 'Nail Turret',
    cost: 50,
    maxHealth: 60,
    footprint: { width: 30, height: 30 },
    render: {
      color: '#16a34a',
      shape: 'triangle',
    },
    attackRange: 180,
    cooldownMs: 700,
    projectileDamage: 10,
    projectileSpeed: 420,
  },
} satisfies Record<BuildItem, BuildItemDefinition>

export type BaseDefinition = {
  maxHealth: number
  footprint: Size
  render: {
    color: string
    shape: 'rectangle'
  }
}

export const baseDefinition: BaseDefinition = {
  maxHealth: 100,
  footprint: { width: 48, height: 48 },
  render: {
    color: '#2563eb',
    shape: 'rectangle',
  },
}

type PlacedStructureBase<TKind extends BuildItem> = {
  id: string
  kind: TKind
  health: number
  position: Point
  rotation: number
}

export type PlacedWall = PlacedStructureBase<'wall'>
export type PlacedTurret = PlacedStructureBase<'turret'>
export type PlacedStructure = PlacedWall | PlacedTurret

export type StructurePlacement = Point & {
  rotation?: number
}

export type PrototypeResources = {
  scrap: number
}

export type PrototypeBaseState = {
  health: number
}

export type PrototypeWaveState = {
  active: boolean
  completed: boolean
  day: number
}

export type GatherOutcomeType = 'safe-scavenge' | 'steal-tech'

export type GatherOutcome = {
  scrapGained: number
  success: boolean
  type: GatherOutcomeType
}

export type PrototypeState = {
  base: PrototypeBaseState
  phase: PrototypePhase
  placedStructures: PlacedStructure[]
  resources: PrototypeResources
  selectedBuildItem: BuildItem | null
  wave: PrototypeWaveState
  addScrap: (amount: number) => void
  clearSelectedBuildItem: () => void
  damageBase: (amount: number) => void
  damageStructure: (structureId: string, amount: number) => void
  finishWave: () => void
  placeStructure: (placement: StructurePlacement) => PlacedStructure | null
  resetBaseHealth: () => void
  resetStructures: () => void
  scavengeSafe: () => GatherOutcome
  selectBuildItem: (buildItem: BuildItem | null) => void
  setPhase: (phase: PrototypePhase) => void
  skipToNextDay: () => void
  startWave: () => void
  stealTech: (roll?: number) => GatherOutcome
}

const SAFE_SCAVENGE_REWARD = 10
const STEAL_TECH_REWARD = 50
const INITIAL_SCRAP = 0
const INITIAL_DAY = 1

let structureIdSequence = 0

const clampAtLeastZero = (value: number) => Math.max(0, value)

export const getBuildItemDefinition = <TKind extends BuildItem>(kind: TKind) =>
  buildItemCatalog[kind]

export const canAffordBuildItem = (scrap: number, kind: BuildItem) =>
  scrap >= getBuildItemDefinition(kind).cost

export const isStructureDestroyed = (structure: PlacedStructure) => structure.health <= 0

const nextStructureId = () => {
  structureIdSequence += 1
  return `structure-${structureIdSequence}`
}

const createPlacedStructure = (
  kind: BuildItem,
  placement: StructurePlacement,
): PlacedStructure => ({
  id: nextStructureId(),
  kind,
  health: getBuildItemDefinition(kind).maxHealth,
  position: {
    x: placement.x,
    y: placement.y,
  },
  rotation: placement.rotation ?? 0,
})

const resetStructureHealth = (structure: PlacedStructure): PlacedStructure => ({
  ...structure,
  health: getBuildItemDefinition(structure.kind).maxHealth,
})

const applyStructureDamage = (
  structure: PlacedStructure,
  amount: number,
): PlacedStructure => ({
  ...structure,
  health: clampAtLeastZero(structure.health - clampAtLeastZero(amount)),
})

export const usePrototypeStore = create<PrototypeState>((set, get) => ({
  base: {
    health: baseDefinition.maxHealth,
  },
  phase: 'gather',
  placedStructures: [],
  resources: {
    scrap: INITIAL_SCRAP,
  },
  selectedBuildItem: null,
  wave: {
    active: false,
    completed: false,
    day: INITIAL_DAY,
  },
  addScrap: (amount) =>
    set((state) => ({
      resources: {
        scrap: clampAtLeastZero(state.resources.scrap + amount),
      },
    })),
  clearSelectedBuildItem: () => set({ selectedBuildItem: null }),
  damageBase: (amount) =>
    set((state) => ({
      base: {
        health: clampAtLeastZero(state.base.health - clampAtLeastZero(amount)),
      },
    })),
  damageStructure: (structureId, amount) =>
    set((state) => ({
      placedStructures: state.placedStructures.map((structure) =>
        structure.id === structureId ? applyStructureDamage(structure, amount) : structure,
      ),
    })),
  finishWave: () =>
    set((state) => ({
      wave: {
        ...state.wave,
        active: false,
        completed: true,
      },
    })),
  placeStructure: (placement) => {
    const { phase, placedStructures, resources, selectedBuildItem } = get()

    if (
      phase !== 'prep' ||
      !selectedBuildItem ||
      !canAffordBuildItem(resources.scrap, selectedBuildItem)
    ) {
      return null
    }

    const definition = getBuildItemDefinition(selectedBuildItem)
    const placedStructure = createPlacedStructure(selectedBuildItem, placement)

    set({
      placedStructures: [...placedStructures, placedStructure],
      resources: {
        scrap: resources.scrap - definition.cost,
      },
    })

    return placedStructure
  },
  resetBaseHealth: () =>
    set({
      base: {
        health: baseDefinition.maxHealth,
      },
    }),
  resetStructures: () =>
    set((state) => ({
      placedStructures: state.placedStructures.map(resetStructureHealth),
    })),
  scavengeSafe: () => {
    const outcome: GatherOutcome = {
      scrapGained: SAFE_SCAVENGE_REWARD,
      success: true,
      type: 'safe-scavenge',
    }

    get().addScrap(outcome.scrapGained)

    return outcome
  },
  selectBuildItem: (buildItem) => set({ selectedBuildItem: buildItem }),
  setPhase: (phase) =>
    set((state) => ({
      phase,
      selectedBuildItem: phase === 'prep' ? state.selectedBuildItem : null,
    })),
  skipToNextDay: () =>
    set((state) => {
      if (state.phase !== 'battle' || !state.wave.completed) {
        return state
      }

      return {
        base: {
          health: baseDefinition.maxHealth,
        },
        phase: 'gather',
        placedStructures: state.placedStructures.map(resetStructureHealth),
        selectedBuildItem: null,
        wave: {
          active: false,
          completed: false,
          day: state.wave.day + 1,
        },
      }
    }),
  startWave: () =>
    set((state) => {
      if (state.phase !== 'prep') {
        return state
      }

      return {
        phase: 'battle',
        selectedBuildItem: null,
        wave: {
          ...state.wave,
          active: true,
          completed: false,
        },
      }
    }),
  stealTech: (roll = Math.random()) => {
    const success = roll >= 0.5
    const outcome: GatherOutcome = {
      scrapGained: success ? STEAL_TECH_REWARD : 0,
      success,
      type: 'steal-tech',
    }

    if (outcome.scrapGained > 0) {
      get().addScrap(outcome.scrapGained)
    }

    return outcome
  },
}))
