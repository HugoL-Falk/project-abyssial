import type { Card }        from '../../types/index'
import type { ResourceKey } from '../../types'
import { RelicPicker }      from './ResourceBar'
import { TutorialSplash }   from './TutorialSplash'
import { CardPreviewModal } from './CardPreviewModal'

interface GameOverlaysProps {
  showTutorialSplash: boolean
  onBegin: () => void
  relicPickerOpen: boolean
  onRelicPick: (resource: ResourceKey, delta: 2 | -2) => void
  onRelicPickerClose: () => void
  pendingGameOver: { reason: string } | null
  acceptDefeat: () => void
  resources: { relics: number }
  onSpendRelic: (resource: ResourceKey, delta: 2 | -2) => void
  previewCard: Card | null
  showOptions: boolean
  onClosePreview: () => void
}

export function GameOverlays({
  showTutorialSplash, onBegin,
  relicPickerOpen, onRelicPick, onRelicPickerClose,
  pendingGameOver, acceptDefeat, resources, onSpendRelic,
  previewCard, showOptions, onClosePreview,
}: GameOverlaysProps) {
  return (
    <>
      {showTutorialSplash && (
        <TutorialSplash onBegin={onBegin} />
      )}
      {relicPickerOpen && <RelicPicker onPick={onRelicPick} onClose={onRelicPickerClose} />}
      {pendingGameOver && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 210, background: 'rgba(0,0,0,0.82)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'rgba(10,8,5,0.97)', border: '1px solid rgba(180,60,60,0.45)', padding: '1.2rem 1.1rem 1rem', minWidth: '240px', boxShadow: '0 0 32px rgba(180,60,60,0.18)' }}>
            <div style={{ fontSize: '0.72rem', color: 'rgba(200,120,120,0.9)', fontStyle: 'italic', lineHeight: 1.5, marginBottom: '0.5rem', textAlign: 'center' }}>
              {pendingGameOver.reason}
            </div>
            <div style={{ fontSize: '0.58rem', color: 'rgba(212,160,16,0.7)', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '0.9rem', textAlign: 'center' }}>
              {resources.relics === 1 ? '1 relic remaining' : `${resources.relics} relics remaining`}
            </div>
            <RelicPicker onPick={onSpendRelic} embedded />
            <div style={{ margin: '0.75rem 0 0.25rem', borderTop: '1px solid rgba(180,60,60,0.2)', paddingTop: '0.75rem', textAlign: 'center' }}>
              <button onClick={acceptDefeat} style={{ background: 'transparent', border: '1px solid rgba(180,60,60,0.35)', color: 'rgba(200,100,100,0.8)', fontSize: '0.78rem', padding: '0.4rem 1.2rem', cursor: 'pointer', fontFamily: 'var(--ui-font)', letterSpacing: '0.06em' }}>
                Accept defeat
              </button>
            </div>
          </div>
        </div>
      )}
      {previewCard && <CardPreviewModal card={previewCard} onClose={onClosePreview} showOptions={showOptions} />}
    </>
  )
}
