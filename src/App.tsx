import { useState, type ReactNode } from 'react'
import './App.css'
import { PhaserViewport } from './components/PhaserViewport'
import {
  baseDefinition,
  buildItems,
  canAffordBuildItem,
  getBuildItemDefinition,
  type BuildItem,
  type GatherOutcome,
  type PrototypePhase,
  usePrototypeStore,
} from './state/usePrototypeStore'

const phaseLabels: Record<PrototypePhase, string> = {
  gather: 'Gather',
  prep: 'Prep',
  battle: 'Battle',
}

type GatherFeedback = {
  tone: 'success' | 'warning'
  text: string
}

type PhaseCardProps = {
  title: string
  description: string
  children: ReactNode
}

type StatCardProps = {
  label: string
  value: string
  detail: string
}

const getGatherFeedback = (outcome: GatherOutcome): GatherFeedback => {
  if (outcome.type === 'safe-scavenge') {
    return {
      tone: 'success',
      text: `Scavenge Safe delivered ${outcome.scrapGained} scrap.`,
    }
  }

  if (outcome.success) {
    return {
      tone: 'success',
      text: `Steal Tech paid off. You hauled in ${outcome.scrapGained} scrap.`,
    }
  }

  return {
    tone: 'warning',
    text: 'Steal Tech came up empty. No scrap gained this run.',
  }
}

function StatCard({ label, value, detail }: StatCardProps) {
  return (
    <div className="stat-card">
      <span className="stat-label">{label}</span>
      <strong className="stat-value">{value}</strong>
      <span className="stat-detail">{detail}</span>
    </div>
  )
}

function PhaseCard({ title, description, children }: PhaseCardProps) {
  return (
    <section className="panel phase-panel">
      <div className="section-heading">
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      {children}
    </section>
  )
}

function App() {
  const phase = usePrototypeStore((state) => state.phase)
  const scrap = usePrototypeStore((state) => state.resources.scrap)
  const baseHealth = usePrototypeStore((state) => state.base.health)
  const wave = usePrototypeStore((state) => state.wave)
  const day = usePrototypeStore((state) => state.wave.day)
  const placedStructures = usePrototypeStore((state) => state.placedStructures)
  const selectedBuildItem = usePrototypeStore((state) => state.selectedBuildItem)
  const scavengeSafe = usePrototypeStore((state) => state.scavengeSafe)
  const stealTech = usePrototypeStore((state) => state.stealTech)
  const clearSelectedBuildItem = usePrototypeStore((state) => state.clearSelectedBuildItem)
  const selectBuildItem = usePrototypeStore((state) => state.selectBuildItem)
  const setPhase = usePrototypeStore((state) => state.setPhase)
  const skipToNextDay = usePrototypeStore((state) => state.skipToNextDay)
  const startWave = usePrototypeStore((state) => state.startWave)
  const [gatherFeedback, setGatherFeedback] = useState<GatherFeedback | null>(null)
  const activeStructures = placedStructures.filter((structure) => structure.health > 0).length

  const selectedBuildDefinition = selectedBuildItem
    ? getBuildItemDefinition(selectedBuildItem)
    : null
  const selectedBuildAffordable = selectedBuildItem
    ? canAffordBuildItem(scrap, selectedBuildItem)
    : false
  const selectedBuildShortfall = selectedBuildDefinition
    ? Math.max(selectedBuildDefinition.cost - scrap, 0)
    : 0

  const handleGatherAction = (outcome: GatherOutcome) => {
    setGatherFeedback(getGatherFeedback(outcome))
  }

  const handleBuildSelection = (buildItem: BuildItem) => {
    selectBuildItem(selectedBuildItem === buildItem ? null : buildItem)
  }

  const handleSkipToNextDay = () => {
    setGatherFeedback(null)
    skipToNextDay()
  }

  const renderGatherPhase = () => (
    <PhaseCard
      title="Gather phase"
      description="Make fast scrap runs, then head back to the shed before the wave starts."
    >
      <div className="button-stack">
        <button
          type="button"
          className="action-button"
          onClick={() => handleGatherAction(scavengeSafe())}
        >
          Scavenge Safe
        </button>
        <button
          type="button"
          className="action-button"
          onClick={() => handleGatherAction(stealTech())}
        >
          Steal Tech
        </button>
        <button
          type="button"
          className="action-button secondary"
          onClick={() => {
            setGatherFeedback(null)
            setPhase('prep')
          }}
        >
          Return to Shed (Prep)
        </button>
      </div>

      {gatherFeedback ? (
        <div className={`feedback-banner ${gatherFeedback.tone}`}>{gatherFeedback.text}</div>
      ) : (
        <div className="helper-copy">
          Safe runs are steady. Tech raids can spike your scrap if the 50/50 roll hits.
        </div>
      )}
    </PhaseCard>
  )

  const renderPrepPhase = () => (
    <PhaseCard
      title="Prep phase"
      description="Select a defense, then click the Phaser canvas to place it before the battle starts."
    >
      <div className="build-menu">
        {buildItems.map((buildItem) => {
          const definition = getBuildItemDefinition(buildItem)
          const isSelected = selectedBuildItem === buildItem
          const affordable = canAffordBuildItem(scrap, buildItem)
          const shortfall = Math.max(definition.cost - scrap, 0)

          return (
            <button
              key={buildItem}
              type="button"
              className={`build-card${isSelected ? ' selected' : ''}${affordable ? '' : ' unaffordable'}`}
              aria-pressed={isSelected}
              onClick={() => handleBuildSelection(buildItem)}
            >
              <div className="build-card-header">
                <strong>{definition.label}</strong>
                <span>{definition.cost} scrap</span>
              </div>
              <p>{definition.maxHealth} health placement.</p>
              <span className={`build-status ${affordable ? 'ready' : 'blocked'}`}>
                {affordable ? 'Affordable now' : `Need ${shortfall} more scrap`}
              </span>
            </button>
          )
        })}
      </div>

      <div className="button-row">
        <button type="button" className="action-button secondary" onClick={clearSelectedBuildItem}>
          Clear Selection
        </button>
        <button type="button" className="action-button" onClick={startWave}>
          Start Wave (Battle)
        </button>
      </div>
    </PhaseCard>
  )

  const renderBattlePhase = () => (
    <PhaseCard
      title="Battle phase"
      description="Combat runs in Phaser while React only shows battle status and the day-skip control."
    >
      <div className="battle-note">
        <strong>{wave.completed ? 'Wave cleared' : 'Wave in progress'}</strong>
        <p>
          {wave.completed
            ? 'The field is secure. Skip ahead to return to Gather and stock up for the next wave.'
            : `Base health is ${Math.ceil(baseHealth)}/${baseDefinition.maxHealth} with ${activeStructures} operational defenses on the field.`}
        </p>
        <span className="briefing-note">
          {wave.completed
            ? 'The build menu stays hidden until you advance to the next day.'
            : 'Build controls stay hidden until the wave ends.'}
        </span>
      </div>

      {wave.completed ? (
        <button type="button" className="action-button" onClick={handleSkipToNextDay}>
          Skip to Next Day
        </button>
      ) : null}
    </PhaseCard>
  )

  const activePhasePanel =
    phase === 'gather'
      ? renderGatherPhase()
      : phase === 'prep'
        ? renderPrepPhase()
        : renderBattlePhase()

  return (
    <div className="app-shell">
      <div className="app-layout">
        <aside className="app-sidebar">
          <header className="app-header">
            <div>
              <p className="eyebrow">Tiny Invasion prototype</p>
              <h1>Gather scrap, prep defenses, survive the wave.</h1>
              <p className="lede">
                React now handles the gather and prep loop while Phaser remains mounted for
                structure placement and battle work.
              </p>
            </div>
            <div className="status-badge">Current phase: {phaseLabels[phase]}</div>
          </header>

          <section className="stats-grid" aria-label="Run status">
            <StatCard label="Day" value={`Day ${day}`} detail="Current prototype run" />
            <StatCard label="Scrap" value={`${scrap}`} detail="Shared build currency" />
            <StatCard
              label="Base health"
              value={`${Math.ceil(baseHealth)}/${baseDefinition.maxHealth}`}
              detail="Keep the core standing"
            />
            <StatCard
              label="Structures"
              value={`${placedStructures.length}`}
              detail="Placed from the prep phase"
            />
          </section>

          <div className="sidebar-panels">
            {activePhasePanel}

            <section className="panel phase-panel">
              <div className="section-heading">
                <h2>Phase briefing</h2>
                <p>Use the store-backed status below to track what the current loop expects.</p>
              </div>

              {phase === 'gather' ? (
                <div className="briefing-card">
                  <strong>Gather goal</strong>
                  <p>Bank enough scrap to afford walls and turrets before returning to the shed.</p>
                  <span className="briefing-note">
                    Return to Shed (Prep) when you are ready to build.
                  </span>
                </div>
              ) : null}

              {phase === 'prep' ? (
                <div className="briefing-card">
                  <strong>
                    {selectedBuildDefinition ? selectedBuildDefinition.label : 'No structure selected'}
                  </strong>
                  <p>
                    {selectedBuildDefinition
                      ? selectedBuildAffordable
                        ? `Click the Phaser canvas to place ${selectedBuildDefinition.label.toLowerCase()} for ${selectedBuildDefinition.cost} scrap.`
                        : `${selectedBuildDefinition.label} is selected, but you need ${selectedBuildShortfall} more scrap before placement.`
                      : 'Select Wood Wall or Nail Turret, then click the Phaser canvas to place it.'}
                  </p>
                  <span className="briefing-note">
                    {selectedBuildDefinition
                      ? `Selection is stored globally${selectedBuildAffordable ? ' and ready to place.' : '.'}`
                      : 'Placement instructions stay visible here while you prep.'}
                  </span>
                </div>
              ) : null}

              {phase === 'battle' ? (
                <div className="briefing-card">
                  <strong>Battle status</strong>
                  <p>
                    {wave.completed
                      ? 'The swarm has been cleared. Use Skip to Next Day to loop back to Gather.'
                      : `The viewport owns combat while the base holds at ${Math.ceil(baseHealth)}/${baseDefinition.maxHealth}.`}
                  </p>
                  <span className="briefing-note">
                    {wave.completed
                      ? 'The next gather run starts once you advance the day.'
                      : 'No React build controls are available during combat.'}
                  </span>
                </div>
              ) : null}
            </section>
          </div>
        </aside>

        <main className="app-main">
          <section className="panel viewport-panel">
            <div className="panel-heading">
              <div>
                <h2>Phaser viewport</h2>
                <p>
                  Battle rendering stays mounted here so prep selections can flow into the
                  canvas interaction track.
                </p>
              </div>
            </div>
            <PhaserViewport />
          </section>
        </main>
      </div>
    </div>
  )
}

export default App
