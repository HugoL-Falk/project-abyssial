import { useGameStore } from '../../state/gameStore'
import { playSfx } from '../../engine/audio'
import type { ActivityEntry, GodPath } from '../../types'
import { getCardById } from '../../data'
import { ResourceTag } from './tags/ResourceTag'
import { RESOURCE_ORDER } from './ResourceIcons'

const RED_TIERS = new Set(['threat', 'doom', 'overflow', 'deficit'])

const GOD_ACCENT: Record<GodPath, string> = {
  yha_nthlei:    '#5fb8c8', // cyan
  nyarlathotep:  '#9b6fc8', // purple
  shub_niggurath:'#6fb86a', // green
  olgreth:       '#c8a05f', // tutorial fallback gold
}

type PillEntry = Extract<ActivityEntry, { kind: 'insert' | 'purge' | 'prepTagSet' | 'prepTagRemoved' }>
type Group =
  | { kind: 'pillRow'; entries: PillEntry[] }
  | { kind: 'single'; entry: ActivityEntry }

// Group consecutive insert/purge/prepTagSet entries into a single wrapped flex row.
function groupEntries(log: ActivityEntry[]): Group[] {
  const groups: Group[] = []
  for (const e of log) {
    if (e.kind === 'insert' || e.kind === 'purge' || e.kind === 'prepTagSet' || e.kind === 'prepTagRemoved') {
      const last = groups[groups.length - 1]
      if (last && last.kind === 'pillRow') {
        last.entries.push(e as PillEntry)
      } else {
        groups.push({ kind: 'pillRow', entries: [e as PillEntry] })
      }
    } else {
      groups.push({ kind: 'single', entry: e })
    }
  }
  return groups
}

export function ActivityLog({ onPreviewCard }: { onPreviewCard: (id: string) => void }) {
  const log = useGameStore(s => s.activityLog)
  if (log.length === 0) return null

  const groups = groupEntries(log)

  return (
    <div
      role="log"
      aria-live="polite"
      style={{
        // P19-39: was a hard 260px which forced grouped insert pills (e.g.
        // devils_reef's 5× the_weight_of_it) to wrap into many rows. Widen to
        // the available viewport so pills stack horizontally and only wrap at
        // the edge. Parent wrapper caps at 92vw (GameScreen).
        width: 'min(92vw, 460px)',
        margin: '0.6rem auto 0',
        background: 'rgba(0,0,0,0.52)',
        borderRadius: '6px',
        padding: '0.45rem 0.6rem',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'var(--ui-font)',
      }}
    >
      {groups.map((g, gi) => {
        if (g.kind === 'pillRow') {
          return (
            <div key={`g-${gi}`} style={{
              // P20-J: centre simultaneous inserts/removes (e.g. +card & −card
              // at once) side-by-side instead of left-aligning at 2+ entries.
              display: 'flex', flexWrap: 'wrap', gap: '0.25rem',
              justifyContent: 'center',
              padding: '0.2rem 0', animation: 'activityRowIn 0.2s ease-out',
            }}>
              {g.entries.map((e, i) =>
                e.kind === 'prepTagSet'
                  ? <PrepTagPill key={`${i}-${entryKey(e)}`} entry={e} />
                  : e.kind === 'prepTagRemoved'
                    ? <PrepTagRemovedPill key={`${i}-${entryKey(e)}`} entry={e} />
                    : <InsertPurgePill key={`${i}-${entryKey(e)}`} entry={e} onPreviewCard={onPreviewCard} />
              )}
            </div>
          )
        }
        return (
          <ActivityRow key={`g-${gi}-${entryKey(g.entry)}`} entry={g.entry} onPreviewCard={onPreviewCard} />
        )
      })}
    </div>
  )
}

function entryKey(e: ActivityEntry): string {
  switch (e.kind) {
    case 'reshuffle':     return `r-${e.count}`
    case 'doomEscalate':  return 'de'
    case 'insert':        return `i-${e.source}-${e.card.id}`
    case 'purge':         return `p-${e.source}-${e.card.id}`
    case 'randomOutcome': return `ro-${e.flavour ?? ''}-${e.insertedCard?.id ?? ''}`
    case 'whisper':       return `w-${e.cardIds.join(',')}`
    case 'mutationSeed':  return `ms-${e.cardTitles.join(',')}`
    case 'prepTagSet':     return `pt-${e.tag}`
    case 'prepTagRemoved': return `ptr-${e.tag}`
  }
}

// ─── Prep tag pill (P22-8: light blue, outlined, centred — matches insert/purge style) ──

const PREP_BLUE       = '#5fb8c8'
const PREP_BLUE_BORD  = 'rgba(95,184,200,0.45)'

function PrepTagPill({ entry }: { entry: Extract<ActivityEntry, { kind: 'prepTagSet' }> }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
      background: 'rgba(0,0,0,0.72)',
      border: `1px solid ${PREP_BLUE_BORD}`,
      padding: '0.1rem 0.4rem', borderRadius: '2px',
      fontFamily: 'var(--ui-font)', fontSize: '0.8rem',
      color: PREP_BLUE,
    }}>
      <span>❖</span>
      <span>{entry.label}</span>
    </span>
  )
}

function PrepTagRemovedPill({ entry }: { entry: Extract<ActivityEntry, { kind: 'prepTagRemoved' }> }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
      background: 'rgba(0,0,0,0.72)',
      border: `1px solid ${PREP_BLUE_BORD}`,
      padding: '0.1rem 0.4rem', borderRadius: '2px',
      fontFamily: 'var(--ui-font)', fontSize: '0.8rem',
      color: PREP_BLUE, opacity: 0.65,
    }}>
      <span style={{ display: 'inline-flex', alignItems: 'center' }}>−❖</span>
      <span>{entry.label}</span>
    </span>
  )
}

// ─── Insert / purge pill (option-pill style: green for +card, red for −card) ──

type InsertOrPurge = Extract<ActivityEntry, { kind: 'insert' | 'purge' }>

function InsertPurgePill({ entry, onPreviewCard }: {
  entry: InsertOrPurge
  onPreviewCard: (id: string) => void
}) {
  const isInsert = entry.kind === 'insert'
  const isRed = isInsert ? RED_TIERS.has(entry.card.tier) : true
  const isGodPathInsert = isInsert && entry.source === 'godPath'
  const symbol = isInsert ? '+' : '−'
  // P19-38: red-tier inserts (threat/doom/overflow/deficit) and all purges get
  // the red outline; only non-red inserts stay green.
  // P20-J: god-path inserts get the gold outline (matches their gold text/glow).
  const pillBorder = isGodPathInsert
    ? 'rgba(212,175,55,0.55)'
    : (isInsert && !isRed ? 'rgba(122,173,85,0.3)' : 'rgba(220,80,80,0.5)')
  // P22-60: god-path inserts always use gold text (matches gold outline)
  const textColor = isGodPathInsert
    ? 'var(--color-gold-bright)'
    : isInsert
      ? (isRed ? '#c84a3a' : 'var(--gold-bright)')
      : '#e08080'
  const accent = isInsert && entry.source === 'godPath' && entry.godPath
    ? GOD_ACCENT[entry.godPath as GodPath]
    : null

  return (
    <button
      type="button"
      onClick={() => { playSfx('click'); onPreviewCard(entry.card.id) }}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
        background: 'rgba(0,0,0,0.72)',
        border: `1px solid ${pillBorder}`,
        padding: '0.1rem 0.4rem', borderRadius: '2px',
        cursor: 'pointer', textAlign: 'left',
        fontFamily: 'var(--ui-font)', fontSize: '0.8rem',
        color: textColor,
        ...(accent && { boxShadow: '0 0 6px rgba(212,175,55,0.4)' }),
      }}
    >
      <span style={{ display: 'inline-flex', alignItems: 'center' }}>{symbol}</span>
      <span>{entry.card.title}</span>
    </button>
  )
}

// ─── Single-row entries (reshuffle, doomEscalate, randomOutcome) ──────────────

function ActivityRow({ entry, onPreviewCard }: {
  entry: ActivityEntry
  onPreviewCard: (id: string) => void
}) {
  const baseStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
    padding: '0.25rem 0.35rem',
    fontSize: '0.85rem',
    animation: 'activityRowIn 0.2s ease-out',
  }

  if (entry.kind === 'reshuffle') {
    return (
      <div style={{ ...baseStyle, color: '#8a7a5a', fontStyle: 'italic' }}>
        <span style={{ width: '14px', textAlign: 'center', fontWeight: 'bold' }}>↻</span>
        <span>A new week begins.</span>
        <span style={{ opacity: 0.6 }}> · {entry.count} cards</span>
      </div>
    )
  }

  if (entry.kind === 'doomEscalate') {
    return (
      <div style={{ ...baseStyle, color: '#c84a3a', fontVariant: 'small-caps', letterSpacing: '0.08em', justifyContent: 'center' }}>
        <span>Doom escalates</span>
      </div>
    )
  }

  if (entry.kind === 'randomOutcome') {
    const card = entry.insertedCard
    const cardIsRed = card ? RED_TIERS.has(card.tier) : false
    return (
      <div
        style={{
          display: 'flex', flexDirection: 'column', gap: '0.3rem',
          padding: '0.35rem 0',
          animation: 'activityRowIn 0.2s ease-out',
        }}
      >
        {entry.flavour && (
          <div style={{
            fontFamily: 'var(--ui-font)',
            fontSize: '0.8rem', color: 'rgba(200,185,158,0.82)',
            fontStyle: 'italic', lineHeight: 1.28,
            textAlign: 'center',  // P20-J: was left-aligned (traveling_merchant opt1 looked off-centre)
          }}>
            {entry.flavour}
          </div>
        )}
        {(entry.deltas.length > 0 || card) && (
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: '0.25rem', fontFamily: 'var(--ui-font)' }}>
            {[...entry.deltas]
              .sort((a, b) => RESOURCE_ORDER.indexOf(a.resource) - RESOURCE_ORDER.indexOf(b.resource))
              .map((d, i) => (
                <ResourceTag key={i} effect={{ type: 'resource', resource: d.resource, delta: d.delta }} />
              ))}
            {card && (
              <button
                type="button"
                onClick={() => { playSfx('click'); onPreviewCard(card.id) }}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                  background: 'rgba(0,0,0,0.72)',
                  border: `1px solid ${cardIsRed ? 'rgba(220,80,80,0.5)' : 'rgba(122,173,85,0.3)'}`,
                  padding: '0.1rem 0.4rem', borderRadius: '2px',
                  cursor: 'pointer', textAlign: 'left',
                  fontFamily: 'var(--ui-font)', fontSize: '0.8rem',
                  color: cardIsRed ? '#c84a3a' : 'var(--gold-bright)',
                }}
              >
                <span style={{ lineHeight: 1 }}>+</span>
                <span>{card.title}</span>
              </button>
            )}
          </div>
        )}
      </div>
    )
  }

  if (entry.kind === 'whisper') {
    // P20-J: show whispered cards as clickable purple pills (was plain text)
    return (
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: '0.25rem',
        justifyContent: 'center', padding: '0.2rem 0',
        animation: 'activityRowIn 0.2s ease-out',
      }}>
        {entry.cardIds.map(id => {
          const card = getCardById(id)
          return (
            <button key={id} type="button" onClick={() => { playSfx('click'); onPreviewCard(id) }} style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
              background: 'rgba(0,0,0,0.72)', border: '1px solid rgba(155,91,212,0.45)',
              padding: '0.1rem 0.4rem', borderRadius: '2px', cursor: 'pointer',
              fontFamily: 'var(--ui-font)', fontSize: '0.8rem', color: '#9b59b6',
              fontStyle: 'italic',
            }}>
              <span style={{ fontStyle: 'normal' }}>✦</span>
              <span>{card?.title ?? id.replace(/_/g, ' ')}</span>
            </button>
          )
        })}
      </div>
    )
  }

  if (entry.kind === 'mutationSeed') {
    const titles = entry.cardTitles
    const titleText = titles.length === 1
      ? `${titles[0]} in your deck has mutated.`
      : `${titles.slice(0, -1).join(', ')} and ${titles[titles.length - 1]} in your deck have mutated.`
    return (
      <div style={{ ...baseStyle, color: '#6fb86a', fontStyle: 'italic' }}>
        <span style={{ width: '14px', textAlign: 'center' }}>⌘</span>
        <span>{titleText}</span>
      </div>
    )
  }

  return null
}
