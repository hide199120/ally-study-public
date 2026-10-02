/** 流せる音の一覧 */
export const SOUND_IDS = [
  'lofiRoom',
  'lofiBeats',
  'piano',
  'musicBox',
  'rain',
  'thunder',
  'fire',
  'waves',
  'stream',
  'wind',
  'birds',
  'insects',
] as const

export type SoundId = (typeof SOUND_IDS)[number]

/** music: BGM（1つだけ選べる） / ambient: 環境音（いくつでも重ねられる） */
export type SoundCategory = 'music' | 'ambient'

export type SoundInfo = {
  id: SoundId
  name: string
  icon: string
  category: SoundCategory
  /** 最初の音量（0〜1） */
  defaultVolume: number
  /** 音ごとの大きさの差をそろえるための係数（実際に鳴らして測った音量から決めている） */
  level: number
}

export const SOUNDS: readonly SoundInfo[] = [
  { id: 'lofiRoom', name: 'Lo-fi room', icon: '📻', category: 'music', defaultVolume: 0.7, level: 1 },
  { id: 'lofiBeats', name: 'ローファイビート', icon: '🎧', category: 'music', defaultVolume: 0.7, level: 1.6 },
  { id: 'piano', name: 'ピアノ', icon: '🎹', category: 'music', defaultVolume: 0.7, level: 1.15 },
  { id: 'musicBox', name: 'オルゴール', icon: '🎶', category: 'music', defaultVolume: 0.7, level: 2.8 },
  { id: 'rain', name: '雨', icon: '🌧️', category: 'ambient', defaultVolume: 0.6, level: 0.9 },
  { id: 'thunder', name: '遠雷', icon: '⛈️', category: 'ambient', defaultVolume: 0.5, level: 0.8 },
  { id: 'fire', name: '焚き火', icon: '🔥', category: 'ambient', defaultVolume: 0.6, level: 1 },
  { id: 'waves', name: '波', icon: '🌊', category: 'ambient', defaultVolume: 0.6, level: 1 },
  { id: 'stream', name: '小川', icon: '💧', category: 'ambient', defaultVolume: 0.6, level: 3.9 },
  { id: 'wind', name: '風', icon: '🍃', category: 'ambient', defaultVolume: 0.5, level: 1.1 },
  { id: 'birds', name: '小鳥', icon: '🐦', category: 'ambient', defaultVolume: 0.5, level: 6 },
  { id: 'insects', name: '夜の虫', icon: '🦗', category: 'ambient', defaultVolume: 0.5, level: 1.9 },
]

export const SOUND_BY_ID = Object.fromEntries(SOUNDS.map((s) => [s.id, s])) as Record<SoundId, SoundInfo>
