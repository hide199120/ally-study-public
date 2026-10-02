import { useEffect, useLayoutEffect, useRef } from "react";
import type { ReactNode } from "react";
import * as THREE from "three";
import { useThree, type ThreeEvent } from "@react-three/fiber";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { moveFurniture, selectFurnitureOffset, type FurnitureId } from "./roomLayoutSlice";

/** 家具を置ける床の範囲（奥と左は壁・巾木の手前まで） */
const FLOOR = { min: -2.92, max: 2.98 };
/** つかんでいる間だけ少し持ち上げて「持っている感」を出す */
const LIFT = 0.06;

const FLOOR_PLANE = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const round = (v: number) => Math.round(v * 100) / 100;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** 家具の見た目の大きさ（光のスプライトや照明は除いて、メッシュだけで測る） */
function measureMeshes(root: THREE.Object3D) {
  const box = new THREE.Box3();
  root.updateWorldMatrix(true, true);
  root.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) box.union(new THREE.Box3().setFromObject(o));
  });
  return box;
}

/**
 * 中身をまとめてドラッグで床の上を動かせるようにする。
 * - ドラッグ中は three.js のオブジェクトを直接動かし（毎フレーム再描画しない）、
 *   離したときだけ Redux に位置を保存する
 * - ドラッグ中はカメラの回転（OrbitControls）を止める
 */
export default function Draggable({ id, children }: { id: FurnitureId; children: ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  const offset = useAppSelector((s) => selectFurnitureOffset(s, id));
  const dispatch = useAppDispatch();
  const get = useThree((s) => s.get);
  const hovered = useRef(false);
  const dragging = useRef(false);
  const stopDrag = useRef<(() => void) | null>(null);

  // Redux の位置を three.js のオブジェクトに反映する（リセットしたときなど）
  useLayoutEffect(() => {
    ref.current?.position.set(offset.x, 0, offset.z);
  }, [offset]);

  // 画面から消えるときにドラッグ中なら後片付け
  useEffect(() => () => stopDrag.current?.(), []);

  const updateCursor = () => {
    get().gl.domElement.style.cursor = dragging.current ? "grabbing" : hovered.current ? "move" : "";
  };

  const onPointerDown = (e: ThreeEvent<PointerEvent>) => {
    if (e.button !== 0 || !ref.current) return;
    e.stopPropagation();

    const group = ref.current;
    const { camera, gl } = get();
    const controls = get().controls as unknown as { enabled: boolean } | null;

    const raycaster = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    /** 画面上のマウス位置から、床(y=0)のどこを指しているかを求める */
    const pointOnFloor = (clientX: number, clientY: number) => {
      const rect = gl.domElement.getBoundingClientRect();
      ndc.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
      raycaster.setFromCamera(ndc, camera);
      return raycaster.ray.intersectPlane(FLOOR_PLANE, new THREE.Vector3());
    };

    const start = pointOnFloor(e.nativeEvent.clientX, e.nativeEvent.clientY);
    if (!start) return;

    // 家具がはみ出さずに動ける範囲。今いる位置は必ず範囲に含める
    const from = { x: group.position.x, z: group.position.z };
    const box = measureMeshes(group);
    const range = {
      minX: Math.min(from.x, FLOOR.min - (box.min.x - from.x)),
      maxX: Math.max(from.x, FLOOR.max - (box.max.x - from.x)),
      minZ: Math.min(from.z, FLOOR.min - (box.min.z - from.z)),
      maxZ: Math.max(from.z, FLOOR.max - (box.max.z - from.z)),
    };
    let latest = from;

    const onMove = (ev: PointerEvent) => {
      const p = pointOnFloor(ev.clientX, ev.clientY);
      if (!p) return;
      latest = {
        x: clamp(from.x + p.x - start.x, range.minX, range.maxX),
        z: clamp(from.z + p.z - start.z, range.minZ, range.maxZ),
      };
      group.position.set(latest.x, LIFT, latest.z);
    };

    const finish = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      group.position.y = 0;
      if (controls) controls.enabled = true;
      dragging.current = false;
      stopDrag.current = null;
      updateCursor();
    };

    const onUp = () => {
      finish();
      const next = { x: round(latest.x), z: round(latest.z) };
      group.position.set(next.x, 0, next.z);
      dispatch(moveFurniture({ id, offset: next }));
    };

    if (controls) controls.enabled = false;
    dragging.current = true;
    group.position.y = LIFT;
    updateCursor();
    stopDrag.current = finish;
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  };

  return (
    <group
      ref={ref}
      onPointerDown={onPointerDown}
      onPointerOver={(e) => {
        e.stopPropagation();
        hovered.current = true;
        updateCursor();
      }}
      onPointerOut={() => {
        hovered.current = false;
        updateCursor();
      }}
    >
      {children}
    </group>
  );
}
