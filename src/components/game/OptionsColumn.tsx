import { useState, useEffect } from 'react'
import type { Effect, Card, Condition, ResourceKey } from '../../types'
import { EffectTags } from './EffectTags'
import { HintTooltip } from './HintTooltip'
import { useGameStore } from '../../state'
import { GOD_PATH_CHAINS } from '../../data'
import { RESOURCE_ICONS } from './ResourceIcons'
import { playSfx } from '../../engine/audio'
import { reqRedundant } from '../../engine/resources'

// ─── Resource condition hints ─────────────────────────────────────────────────

function extractResourceConditions(cond: Condition): Array<{ resource: string; op: '>=' | '<='; value: number }> {
  if (cond.type === 'resourceMin') return [{ resource: cond.resource, op: '>=', value: cond.min }]
  if (cond.type === 'resourceMax') return [{ resource: cond.resource, op: '<=', value: cond.max }]
  if (cond.type === 'and') return cond.conditions.flatMap(extractResourceConditions)
  if (cond.type === 'or') return cond.conditions.flatMap(extractResourceConditions)
  if (cond.type === 'not') return extractResourceConditions(cond.condition)
  return []
}

const COND_RESOURCE_LABELS: Record<string, string> = {
  gold: 'Gold', followers: 'Followers', influence: 'Influence',
  dread: 'Dread', relics: 'Relics', theChanged: 'Changed',
}

interface ResourceConditionHintsProps {
  condition: Condition | undefined
  effectiveEffects?: Effect[]
}

export function ResourceConditionHints({ condition }: ResourceConditionHintsProps) {
  if (!condition) return null
  const hints = extractResourceConditions(condition)
  if (hints.length === 0) return null

  // P22-13/P22-59: Dread-only — all other resource gates are already communicated
  // by the greyed cost tags in EffectTags. Non-dread ≥N pills are redundant and
  // clutter the option row. (P21-8 non-dread logic rolled back for UX clarity.)
  const filteredHints = hints.filter(h => h.resource === 'dread')

  if (filteredHints.length === 0) return null

  return (
    <div style={{ display: 'flex', gap: '0.2rem', flexWrap: 'wrap', marginTop: '0.1rem' }}>
      {filteredHints.map((h, i) => {
        const Icon = RESOURCE_ICONS[h.resource as keyof typeof RESOURCE_ICONS]
        const isDread = h.resource === 'dread'
        const tooltipText = h.op === '>='
          ? isDread ? `Unlocks at Dread ≥ ${h.value}` : `${COND_RESOURCE_LABELS[h.resource] ?? h.resource} ≥ ${h.value}`
          : isDread ? `Hidden when Dread > ${h.value}` : `${COND_RESOURCE_LABELS[h.resource] ?? h.resource} ≤ ${h.value}`
        const ariaLabel = h.op === '>='
          ? isDread ? `Unlocks at Dread ${h.value} or higher` : `Requires ${COND_RESOURCE_LABELS[h.resource] ?? h.resource} ${h.value} or higher`
          : isDread ? `Hidden above Dread ${h.value}` : `${COND_RESOURCE_LABELS[h.resource] ?? h.resource} ${h.value} or lower`

        const pillStyle: React.CSSProperties = {
          display: 'inline-flex', alignItems: 'center', gap: '2px',
          fontSize: isDread ? '0.78rem' : '0.72rem',
          color: isDread ? 'rgba(180,80,80,0.8)' : 'rgba(200,185,155,0.45)',
          padding: '0.05rem 0.3rem', borderRadius: '2px',
          border: isDread ? '1px solid rgba(180,80,80,0.3)' : '1px solid rgba(200,185,155,0.12)',
          fontStyle: isDread ? 'normal' : 'italic',
        }

        return (
          <HintTooltip key={`cond-${i}`} text={tooltipText} ariaLabel={ariaLabel}>
            <span style={pillStyle}>
              {Icon && <Icon />}{h.op === '>=' ? '≥' : '≤'}{h.value}
            </span>
          </HintTooltip>
        )
      })}
    </div>
  )
}

// ─── Visible option type (exported for GameScreen) ────────────────────────────

export type VisibleOpt = {
  idx: number
  option: { label: string; flavourText?: string; isWhisper?: boolean; condition?: Condition; succumbOption?: boolean; previewTag?: string }
  available: boolean
  effectiveEffects: Effect[]
  affordabilityShortfall?: Partial<Record<ResourceKey, number>>
  disabledReason?: string
  prepRequirement?: {
    tag: string
    label: string
    // carrierCardIds is populated by gameStore but intentionally unread here.
    // Retained for the NB-G1-03/P17-29 re-enable watchpoint: tap-to-preview
    // chain-card discovery will route through onPreviewCard when re-wired.
    carrierCardIds: string[]
  }
  isPrepGated?: boolean
}

// P20-L: per-god succumb labels for the final summon card. Lowercase by intent —
// rendered small-caps; each pairs with the god's existing succumb flavour line.
const SUCCUMB_GOD_LABELS: Record<string, string> = {
  yha_nthlei: 'go under',
  nyarlathotep: 'stop pretending',
  shub_niggurath: 'put down roots',
}

// ─── Options column (vertical, compact, dark tint) ────────────────────────────

export function OptionsColumn({ visibleOpts, allBlocked, succumbFlavour, onResolve, onSuccumb, onSpendRelic, relics, onPreviewCard, onPreviewCards, currentCard, isTutorial }: {
  visibleOpts: VisibleOpt[]
  allBlocked: boolean
  succumbFlavour: string
  onResolve: (idx: number) => void
  onSuccumb: () => void
  onSpendRelic: () => void
  relics: number
  onPreviewCard: (cardId: string, opts?: { showOptions?: boolean }) => void
  // P20-I: grouped/multi-card browse carousel (insert-group + live threat list)
  onPreviewCards?: (cards: Card[], tone: 'gold' | 'red') => void
  currentCard?: Card | null
  isTutorial?: boolean
}) {
  const runConfig    = useGameStore(s => s.runConfig)
  const chainTotal   = runConfig?.godPath ? GOD_PATH_CHAINS[runConfig.godPath].length : 6
  // P20-L: on the final summon card, the succumb option takes a god-specific,
  // evocative label (still red) — surrender at the threshold of summoning.
  const isFinalGodCard = currentCard?.tier === 'god_path' && currentCard?.chainStage === chainTotal
  const godSuccumbLabel = isFinalGodCard
    ? (SUCCUMB_GOD_LABELS[runConfig?.godPath ?? ''] ?? 'You succumb to the gods')
    : 'You succumb to the gods'
  const currentResources = useGameStore(s => s.resources)
  const deck             = useGameStore(s => s.deck)
  const [succumbArmed, setSuccumbArmed] = useState(false)
  // Reset the two-tap arm whenever the card changes so succumb is never pre-armed.
  useEffect(() => { setSuccumbArmed(false) }, [currentCard?.id])

  const btnBase: React.CSSProperties = {
    width: '100%', textAlign: 'left', cursor: 'pointer',
    background: 'rgba(4,2,1,0.82)',
    border: '1px solid var(--border)',
    color: 'var(--text)',
    padding: '0.4rem 0.7rem',
    display: 'flex', flexDirection: 'column', gap: '0.1rem',
    transition: 'border-color 0.18s, background 0.18s',
    fontFamily: 'var(--ui-font)',
  }

  function renderOptionRow({ idx, option, available: avail, effectiveEffects, affordabilityShortfall, disabledReason, prepRequirement, isPrepGated }: VisibleOpt) {
    const isSuccumb = !!option.succumbOption
    // P22-65 / P27-09: always use <div role="button"> — never <button> — so nested
    // HintTooltip <button> elements remain valid HTML and receive clicks on all
    // pointer types. Touch-capable laptop browsers (and some desktop Chrome versions)
    // silently drop clicks on a <button> nested inside another <button>.
    return (
      <div
        key={idx}
        {...(avail ? { onClick: () => { playSfx('click'); onResolve(idx) } } : {})}
        role="button"
        aria-disabled={!avail}
        tabIndex={avail ? 0 : -1}
        style={{
          ...btnBase,
          background: avail ? 'rgba(4,2,1,0.82)' : 'rgba(8,5,3,0.6)',
          cursor: avail ? 'pointer' : 'not-allowed',
          // P22-46: prep-gated options get a light-blue border (same hue as all ❖ indicators).
          // isPrepGated: option available because player holds the prep tag — full-opacity blue border.
          // prepRequirement: option unavailable (hidden) due to missing prep tag — lighter border.
          border: isSuccumb ? '1px solid rgba(180,40,40,0.45)' : (option.isWhisper ? '1px solid rgba(160,100,255,0.55)' : ((isPrepGated || prepRequirement) ? '1px solid rgba(95,184,200,0.55)' : '1px solid var(--border)')),
          boxShadow: option.isWhisper ? '0 0 8px rgba(160,100,255,0.15)' : (isPrepGated ? '0 0 8px rgba(95,184,200,0.18)' : (prepRequirement ? '0 0 6px rgba(95,184,200,0.08)' : undefined)),
          filter: avail ? 'none' : 'grayscale(0.4)',
        }}
      >
        {/* Label row: text left, effect tags right (always shown, dimmed when unavailable) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <div style={{
            fontVariant: 'small-caps', fontSize: isSuccumb ? '1rem' : '0.9rem', letterSpacing: '0.08em',
            color: isSuccumb ? 'var(--red-bright)' : (avail ? (option.isWhisper ? 'rgba(210,170,255,0.9)' : (isPrepGated ? '#5fb8c8' : 'var(--gold)')) : 'rgba(200,185,155,0.78)'),
            fontStyle: option.isWhisper ? 'italic' : 'normal',
            flex: 1,
          }}>
            {option.isWhisper && (
              <span style={{
                color: '#9b59b6',
                marginRight: '0.25rem',
                fontStyle: 'normal',
              }}>✦</span>
            )}
            {option.label}
          </div>
{isSuccumb ? (
            <span style={{ fontSize: '0.8rem', color: 'var(--red-bright)', padding: '0.1rem 0.3rem', borderRadius: '2px', flexShrink: 0 }}>SUCCUMB</span>
          ) : (
          <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center', flexShrink: 0, opacity: avail ? 1 : 0.45 }}>
            <ResourceConditionHints condition={option.condition} effectiveEffects={effectiveEffects} />
            {/* P16-39: synthesized affordability shortfall tags. May co-render with
                the dread-condition pill above when an option has BOTH a dread
                condition AND a non-dread affordability shortfall — by design,
                surfaces both blockers to the player. */}
            {affordabilityShortfall && (() => {
              // P18-10: for single-resourceMin conditions, suppress the ≥N pill
              // when the cost already covers the requirement — the "-N" tag in
              // EffectTags tells the same story and the pill is redundant.
              const cond = option.condition
              const isSingleResourceMin = cond?.type === 'resourceMin'
              const effectCosts = effectiveEffects
                .filter(e => e.type === 'resource' && e.delta < 0)
                .map(e => ({ resource: (e as { type: 'resource'; resource: string; delta: number }).resource, value: (e as { type: 'resource'; resource: string; delta: number }).delta }))
              return Object.entries(affordabilityShortfall).map(([resource, missing]) => {
                // P22-13/P22-57: Non-dread shortfall pills are redundant — the greyed
                // cost tag already signals the constraint. Show only dread (invisible).
                if (resource !== 'dread') return null
                if (isSingleResourceMin && cond.resource === resource) {
                  if (reqRedundant({ resource, value: cond.min }, effectCosts)) return null
                }
                const Icon = RESOURCE_ICONS[resource as keyof typeof RESOURCE_ICONS]
                const need = (currentResources?.[resource as keyof typeof currentResources] ?? 0) + (missing as number)
                return (
                  <span key={`aff-${resource}`} style={{
                    display: 'inline-flex', alignItems: 'center', gap: '2px',
                    fontSize: '0.78rem', color: 'rgba(180,80,80,0.8)',
                    padding: '0.1rem 0.35rem', borderRadius: '2px',
                    border: '1px solid rgba(180,80,80,0.3)',
                  }}>
                    {Icon && <Icon />}≥{need}
                  </span>
                )
              })
            })()}
            {!avail && disabledReason && (
              <HintTooltip text={disabledReason} ariaLabel={disabledReason}>
                <span style={{
                  fontSize: '0.72rem', color: 'rgba(180,80,80,0.7)',
                  padding: '0.1rem 0.3rem', borderRadius: '2px',
                  border: '1px solid rgba(180,80,80,0.25)',
                }}>
                  ✕
                </span>
              </HintTooltip>
            )}
            <EffectTags
              effects={effectiveEffects}
              // P16-31 (s87): preview-tap available on disabled options too
              // so blocked options stay inspectable (see strings_attached
              // opt 1 — player needs to know WHICH card a hint references).
              onPreviewCard={onPreviewCard}
              onPreviewCards={onPreviewCards}
              inline
              deck={deck}
              currentCardId={currentCard?.id}
              cardTier={currentCard?.tier}
              cardPermanent={currentCard?.permanent}
              currentResources={currentResources}
              isTutorial={isTutorial}
              previewTag={option.previewTag}
              godPathCtx={currentCard?.tier === 'god_path' && currentCard.godPath && currentCard.chainStage
                ? { godPath: currentCard.godPath, chainStage: currentCard.chainStage, chainTotal }
                : undefined}
            />
          </div>
          )}
        </div>
        {option.flavourText && (
          <p style={{ fontSize: '0.8rem', color: isSuccumb ? 'var(--text-faint)' : (avail ? 'rgba(200,185,158,0.82)' : 'rgba(200,185,155,0.68)'), fontStyle: 'italic', lineHeight: 1.2, margin: 0 }}>
            {option.flavourText}
          </p>
        )}
      </div>
    )
  }

  if (allBlocked && !isTutorial) {
    return (
      <div style={{ padding: '0 0.5rem 0.5rem', display: 'flex', flexDirection: 'column', gap: '0.13rem' }}>
        {/* Real options stay visible (greyed) so the lockup reads as "can't afford", not "two options". */}
        {visibleOpts.map(renderOptionRow)}

        {relics > 0 && (
          <button onClick={() => { playSfx('click'); onSpendRelic() }} style={{ ...btnBase, borderColor: 'rgba(212,160,16,0.5)' }}>
            <div style={{ fontVariant: 'small-caps', fontSize: '1rem', color: 'var(--gold)', letterSpacing: '0.08em' }}>
              Spend a Relic — adjust a resource
            </div>
            <p style={{ fontSize: '0.8rem', color: 'rgba(200,185,155,0.75)', fontStyle: 'italic', lineHeight: 1.4, margin: 0 }}>
              Nudge one resource by ±2. ({relics} remaining)
            </p>
          </button>
        )}

        <button
          onClick={() => {
            playSfx('click')
            // P23-77: only arm the two-tap when the player has relics to spend —
            // warning a relic-less player is pointless overhead.
            if (relics > 0 && !succumbArmed) { setSuccumbArmed(true); return }
            onSuccumb()
          }}
          style={{ ...btnBase, borderColor: 'rgba(180,40,40,0.45)' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <div style={{ fontVariant: 'small-caps', fontSize: '1rem', color: 'var(--red-bright)', letterSpacing: '0.08em', flex: 1 }}>
              {succumbArmed
                ? (relics > 0 ? 'You still have relics' : 'Tap again to succumb')
                : godSuccumbLabel}
            </div>
            <span style={{ fontSize: '0.8rem', color: 'var(--red-bright)', padding: '0.1rem 0.3rem', borderRadius: '2px', flexShrink: 0 }}>SUCCUMB</span>
          </div>
          {/* P20-L: succumb reads as a 4th option — label stays red, but the
              flavour matches the other options' pale parchment (was --text-faint,
              which read as disabled) over the same un-filled background. When armed
              with relics unspent, an inline confirm warns a relic could still save the run. */}
          <p style={{ fontSize: '0.8rem', color: 'rgba(210,195,170,0.92)', fontStyle: 'italic', lineHeight: 1.4, margin: 0 }}>
            {succumbArmed && relics > 0
              ? 'A relic could yet turn the tide. Tap again to succumb anyway.'
              : succumbFlavour}
          </p>
        </button>
      </div>
    )
  }

  return (
    <div style={{ padding: '0 0.5rem 0.5rem', display: 'flex', flexDirection: 'column', gap: '0.13rem' }}>
      {visibleOpts.map(renderOptionRow)}
    </div>
  )
}
