import type { ComponentType, ReactNode } from "react";
import type * as THREE from "three";
import type { FurnitureId } from "../../catalog";
import type { ResidentPose } from "../Resident";
import type { V3 } from "../utils";

/** テーマ別の家具に渡すもの（光のにじみの画像と、上に乗る住人） */
export type PieceProps = { glow: THREE.Texture; children?: ReactNode };
export type Piece = ComponentType<PieceProps>;

/** デスクとイスがあるとき、住人がイスに座る位置と姿勢（イスのグループの中の座標） */
export type Seat = { pose: ResidentPose; headphones?: boolean; position: V3 };

/** テーマごとの家具のセット。書いていない家具は「森」の家具を使う */
export type ThemeFurniture = {
  pieces: Partial<Record<FurnitureId, Piece>>;
  /** 壁の飾りなど（動かせないもの） */
  decor?: ComponentType<{ glow: THREE.Texture }>;
  /** 森の飾り（壁の棚・豆電球・窓辺の植物）も残すか */
  keepNaturalDecor?: boolean;
  seat?: Seat;
  /** ベッドの上で本を読むときの位置（低いふとんなど） */
  bedSpot?: V3;
};
