import { useEffect, useRef } from 'react'
import { baseDefinition, buildItemCatalog, usePrototypeStore } from '../state/usePrototypeStore'

export function PhaserViewport() {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const phase = usePrototypeStore((state) => state.phase)
  const selectedBuildItem = usePrototypeStore((state) => state.selectedBuildItem)
  const baseHealth = usePrototypeStore((state) => state.base.health)
  const placedStructures = usePrototypeStore((state) => state.placedStructures)
  const wave = usePrototypeStore((state) => state.wave)

  useEffect(() => {
    if (!containerRef.current) {
      return undefined
    }

    let mounted = true
    let destroyGame: (() => void) | undefined

    containerRef.current.innerHTML = ''
    void import('../game/createGame').then(({ createGame }) => {
      if (!mounted || !containerRef.current) {
        return
      }

      const game = createGame(containerRef.current)
      destroyGame = () => game.destroy(true)
    })

    return () => {
      mounted = false
      destroyGame?.()
    }
  }, [])

  const overlayMessage =
    phase === 'prep'
      ? selectedBuildItem
        ? `Click the battlefield to place ${buildItemCatalog[selectedBuildItem].label}.`
        : 'Select a wall or turret in React, then click the battlefield to place it.'
      : phase === 'battle'
        ? wave.completed
          ? 'Wave cleared. Use Skip to Next Day to return to Gather.'
          : wave.active
            ? `Wave ${wave.day} is live. Turrets will auto-fire at the swarm.`
            : 'Battlefield is staged and waiting for the wave to begin.'
        : 'Gather UI lives in React while your defenses stay visible here.'

  return (
    <div className="viewport-frame">
      <div
        ref={containerRef}
        className="phaser-mount"
        aria-label="Tiny Invasion battle preview"
      />
      <div className="viewport-overlay">
        <span>{overlayMessage}</span>
        <strong>
          Phase: {phase} · Base {Math.ceil(baseHealth)}/{baseDefinition.maxHealth} · Structures{' '}
          {placedStructures.filter((structure) => structure.health > 0).length}
        </strong>
      </div>
    </div>
  )
}
