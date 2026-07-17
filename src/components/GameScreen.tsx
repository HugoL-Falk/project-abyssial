import { useRef, useState, useEffect } from 'react'
import { useGameStore } from '../state'
import { playSfx } from '../engine/audio'
import { getCardById } from '../data'
import type { Card } from '../types/index'
import { ResourceBar } from './game/ResourceBar'
import { ShubTracker } from './game/ShubTracker'
import { GameOverlays }          from './game/GameOverlays'
import { DrawPileView }          from './game/DrawPileView'
import { CardView }              from './game/CardView'
import type { ResourceKey }      from '../types'

export function GameScreen() {
  const currentCard       = useGameStore(s => s.currentCard)
  const drawNextCard      = useGameStore(s => s.drawNextCard)
  const deck              = useGameStore(s => s.deck)
  const reshuffleCount    = useGameStore(s => s.reshuffleCount)
  const resources         = useGameStore(s => s.resources)
  const runConfig         = useGameStore(s => s.runConfig)
  const spendRelic        = useGameStore(s => s.spendRelic)
  const acceptDefeat      = useGameStore(s => s.acceptDefeat)
  const pendingGameOver        = useGameStore(s => s.pendingGameOver)
  const reshuffleOnly          = useGameStore(s => s.reshuffleOnly)
  const unravellingTier        = useGameStore(s => s.unravellingTier)
  const isTutorial = runConfig?.isTutorial === true

  const drawPileCount    = deck.drawPile.length
  const discardCount     = deck.discardPile.length
  // Cards added on reshuffle beyond the discard pile:
  //   +1 unravelling card (always, non-tutorial)
  //   +N nextCycleQueue cards (unpinned merge into shuffled pile; pinned prepend)
  // Tutorial reshuffle adds nothing (nextCycleQueue becomes the new pile directly).
  const pendingReshuffleAddCount = runConfig?.isTutorial
    ? 0
    : 1 + deck.nextCycleQueue.length
  const nextCard         = (deck.drawPile[0] as Card | undefined) ?? null

  // ── Wake lock — prevent screen sleep during play ─────────────────────────
  useEffect(() => {
    let lock: WakeLockSentinel | null = null
    async function acquireAndWatch() {
      try {
        lock = await (navigator as any).wakeLock?.request('screen')
        // Re-acquire if the browser releases the lock (e.g. battery saver)
        lock?.addEventListener('release', () => {
          if (document.visibilityState === 'visible') acquireAndWatch()
        })
      } catch {}
    }
    acquireAndWatch()
    const onVisible = () => { if (document.visibilityState === 'visible') acquireAndWatch() }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      lock?.release().catch(() => {})
    }
  }, [])

  // ── Pile animation tracking ───────────────────────────────────────────────
  const prevPileLen   = useRef(drawPileCount)
  const prevReshuffle = useRef(reshuffleCount)
  const [insertAnim,    setInsertAnim]    = useState(false)
  const [reshuffleAnim, setReshuffleAnim] = useState(false)
  // P17-3: show the banner at Week 1 too. Initialise true only on a brand-new run
  // (no turns taken, no reshuffle yet). Resumed runs mid-week-1 leave it hidden.
  const [weekBannerVisible, setWeekBannerVisible] = useState(
    () => useGameStore.getState().turnCount === 0 && reshuffleCount === 0,
  )
  const [previewState, setPreviewState] = useState<{ cardId: string; showOptions: boolean } | null>(null)
  const previewCardId = previewState?.cardId ?? null
  const setPreviewCardId = (id: string | null, opts?: { showOptions?: boolean }) => {
    if (id === null) setPreviewState(null)
    else { playSfx('cardPreviewOpen'); setPreviewState({ cardId: id, showOptions: opts?.showOptions ?? false }) }
  }
  const [relicPickerOpen, setRelicPickerOpen] = useState(false)
  const [showTutorialSplash, setShowTutorialSplash] = useState(runConfig?.isTutorial ?? false)

  function handleOpenRelicPicker() {
    if (resources.relics > 0) setRelicPickerOpen(true)
  }
  function handleRelicPick(resource: ResourceKey, delta: 2 | -2) {
    spendRelic(resource, delta)
    setRelicPickerOpen(false)
  }

  useEffect(() => {
    if (reshuffleCount > prevReshuffle.current) {
      setReshuffleAnim(true); setTimeout(() => setReshuffleAnim(false), 950)
    } else if (drawPileCount > prevPileLen.current) {
      setInsertAnim(true); setTimeout(() => setInsertAnim(false), 580)
    }
    prevReshuffle.current = reshuffleCount
    prevPileLen.current   = drawPileCount
  }, [drawPileCount, reshuffleCount])

  // Show the Week banner only on a fresh reshuffleCount increment (not on resume)
  const prevReshuffleCount = useRef(reshuffleCount)
  useEffect(() => {
    if (reshuffleCount > prevReshuffleCount.current) setWeekBannerVisible(true)
    prevReshuffleCount.current = reshuffleCount
  }, [reshuffleCount])

  // Hide the banner on mid-week draws; re-show it when the pile empties (end of week)
  const prevDrawCount = useRef(drawPileCount)
  useEffect(() => {
    if (drawPileCount === 0) {
      setWeekBannerVisible(true)
    } else if (drawPileCount < prevDrawCount.current) {
      setWeekBannerVisible(false)
    }
    prevDrawCount.current = drawPileCount
  }, [drawPileCount])

  // ── Draw flip animation (lift → flip → zoom) ─────────────────────────────
  const [drawAnim, setDrawAnim] = useState<{ phase: 'lift' | 'flip' | 'zoom'; card: Card } | null>(null)
  const [isFlipped, setIsFlipped] = useState(false)

  function handleReshuffle() {
    if (drawPileCount > 0) return
    playSfx('reshuffle')
    setReshuffleAnim(true)
    setTimeout(() => setReshuffleAnim(false), 750)
    reshuffleOnly()
  }

  function handleDraw() {
    if (!nextCard) return  // draw pile empty
    playSfx('cardDraw')
    drawNextCard()
    setIsFlipped(false)
    setDrawAnim({ phase: 'lift', card: nextCard })
    // lift → flip
    setTimeout(() => setDrawAnim(a => a ? { phase: 'flip', card: a.card } : null), 220)
    // trigger flip rotation
    setTimeout(() => setIsFlipped(true), 280)
    // flip → zoom
    setTimeout(() => setDrawAnim(a => a ? { phase: 'zoom', card: a.card } : null), 840)
    // zoom complete → CardView mounts and its mount effect opens options after 600ms
    setTimeout(() => { setDrawAnim(null); setIsFlipped(false) }, 1150)
  }

  // ── Derived display state ─────────────────────────────────────────────────
  const showingDrawPile   = !currentCard || drawAnim !== null
  const previewCard       = previewCardId ? (getCardById(previewCardId) ?? null) : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative', overflow: 'hidden' }} className="screen-fade">

      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>

        {showingDrawPile ? (
          /* ── Draw pile view + lift → flip → zoom animation ── */
          <DrawPileView
            drawAnim={drawAnim}
            isFlipped={isFlipped}
            drawPileCount={drawPileCount}
            discardCount={discardCount}
            pendingReshuffleAddCount={pendingReshuffleAddCount}
            insertAnim={insertAnim}
            reshuffleAnim={reshuffleAnim}
            weekBannerVisible={weekBannerVisible}
            reshuffleCount={reshuffleCount}
            unravellingTier={unravellingTier}
            isTutorial={isTutorial}
            godPath={runConfig?.godPath}
            onDraw={handleDraw}
            onReshuffle={handleReshuffle}
            onPreviewCard={setPreviewCardId}
          />

        ) : (
          /* ── Card view with overlay options ── */
          <CardView
            onPreviewCard={setPreviewCardId}
            onOpenRelicPicker={handleOpenRelicPicker}
          />
        )}

        {/* ResourceBar + ShubTracker — elevated together while relic picker is open */}
        <div style={{ position: relicPickerOpen ? 'fixed' : 'absolute', top: 0, left: 0, right: 0, zIndex: relicPickerOpen ? 201 : 20 }}>
          <ResourceBar onOpenRelicPicker={handleOpenRelicPicker} />
          <ShubTracker />
        </div>


      </div>

      <GameOverlays
        showTutorialSplash={showTutorialSplash}
        onBegin={() => setShowTutorialSplash(false)}
        relicPickerOpen={relicPickerOpen}
        onRelicPick={handleRelicPick}
        onRelicPickerClose={() => setRelicPickerOpen(false)}
        pendingGameOver={pendingGameOver}
        acceptDefeat={acceptDefeat}
        resources={resources}
        onSpendRelic={spendRelic}
        previewCard={previewCard}
        showOptions={previewState?.showOptions ?? false}
        onClosePreview={() => setPreviewCardId(null)}
      />

    </div>
  )
}
