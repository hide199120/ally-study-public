// OpenAPI から生成した型（schema.d.ts）に、使いやすい名前を付けて公開する。
// schema.d.ts は手で編集せず、仕様を変えたら `npm run gen:api` で作り直す。
import type { components } from './schema'

export type User = components['schemas']['User']
export type Credentials = components['schemas']['Credentials']
export type ApiError = components['schemas']['Error']
