import type { Room } from '../../api/types'
import { authApi } from '../auth/authApi'

/**
 * 部屋（模様替え）のAPI。認証と同じ API スライスにエンドポイントを追加する
 * （Cookie の送り方やキャッシュを共通にするため）
 */
export const roomApi = authApi.injectEndpoints({
  endpoints: (builder) => ({
    /** ログイン中のユーザーの部屋。引数のユーザーIDはキャッシュをユーザーごとに分けるためだけに使う */
    getRoom: builder.query<Room, number>({
      query: () => '/me/room',
      providesTags: ['Room'],
    }),
    saveRoom: builder.mutation<Room, { userId: number; room: Room }>({
      query: ({ room }) => ({ url: '/me/room', method: 'PUT', body: room }),
      // 保存できたら、取得済みの部屋のキャッシュも保存した内容に置き換える（取り直さない）
      async onQueryStarted({ userId }, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled
          dispatch(roomApi.util.upsertQueryData('getRoom', userId, data))
        } catch {
          // 失敗は呼び出し側で表示する
        }
      },
    }),
  }),
})

export const { useGetRoomQuery, useSaveRoomMutation } = roomApi
