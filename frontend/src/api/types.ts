// OpenAPI から生成した型（schema.d.ts）に、使いやすい名前を付けて公開する。
// schema.d.ts は手で編集せず、仕様を変えたら `npm run gen:api` で作り直す。
import type { components } from './schema'

export type User = components['schemas']['User']
export type Credentials = components['schemas']['Credentials']
export type ApiError = components['schemas']['Error']
export type Room = components['schemas']['Room']
export type Avatar = components['schemas']['Avatar']
export type Wallpaper = components['schemas']['Wallpaper']
export type FurnitureId = components['schemas']['FurnitureId']
export type FurniturePlacement = components['schemas']['FurniturePlacement']
export type StudyOverview = components['schemas']['StudyOverview']
export type StudyDay = components['schemas']['StudyDay']
export type StudyGoal = components['schemas']['StudyGoal']
export type GoalKind = components['schemas']['GoalKind']
export type StudyMode = components['schemas']['StudyMode']
export type StudySessionInput = components['schemas']['StudySessionInput']
