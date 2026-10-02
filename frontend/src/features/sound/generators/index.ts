import type { SoundId } from '../catalog'
import { birds, fire, insects, rain, stream, thunder, waves, wind } from './ambient'
import type { Generator } from './common'
import { lofiBeats, lofiRoom, musicBox, piano } from './music'

export const GENERATORS: Record<SoundId, Generator> = {
  lofiRoom,
  lofiBeats,
  piano,
  musicBox,
  rain,
  thunder,
  fire,
  waves,
  stream,
  wind,
  birds,
  insects,
}
