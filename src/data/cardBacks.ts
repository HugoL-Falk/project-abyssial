export interface CardBack {
  slug: string
  file: string   // filename in /public/cardbacks/
  label: string  // human-readable name for the picker
}

export const CARD_BACKS: CardBack[] = [
  { slug: 'notegpt-default', file: 'notegpt-default.png',  label: 'NoteGPT' },
  { slug: 'tarot-27',        file: 'tarot-27.png',         label: 'Tarot I' },
  { slug: 'tarot-29',        file: 'tarot-29.png',         label: 'Tarot II' },
  { slug: 'tarot-sym',       file: 'tarot-sym.png',        label: 'Symmetrical' },
  { slug: 'painterly-15',    file: 'painterly-15.png',     label: 'Painterly' },
  { slug: 'void-grimoire',   file: 'void-grimoire.png',    label: 'Void Grimoire' },
  { slug: 'weeping-tree',    file: 'weeping-tree.jpg',     label: 'Weeping Tree' },
  { slug: 'standing-stones', file: 'standing-stones.png',  label: 'Standing Stones' },
  { slug: 'dark-roots',      file: 'dark-roots.png',       label: 'Dark Roots' },
  { slug: 'dual-faces',      file: 'dual-faces.png',       label: 'Dual Faces' },
  { slug: 'serpent-crown',   file: 'serpent-crown.png',    label: 'Serpent Crown' },
]

export const DEFAULT_CARD_BACK = CARD_BACKS[0]  // notegpt-default

export function getCardBackBySlug(slug: string): CardBack {
  return CARD_BACKS.find(cb => cb.slug === slug) ?? DEFAULT_CARD_BACK
}
