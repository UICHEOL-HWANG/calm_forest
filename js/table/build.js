import * as THREE from 'three';
import { PICNIC_STYLE } from './style-picnic.js';
import { plateParts } from './plates.js';

export const TABLE_STYLES = Object.freeze({ picnic: PICNIC_STYLE });

const GROW_FROM = 0.2;
const SHAPE = {
  box: p => new THREE.BoxGeometry(p.w, p.h, p.d),
  cyl: p => new THREE.CylinderGeometry(p.w / 2, p.w2 / 2, p.h, 14),
  ball: p => new THREE.IcosahedronGeometry(0.5, 0).scale(p.w, p.h, p.d),
  log: p => new THREE.CylinderGeometry(p.h / 2, p.h / 2, p.w, 10).rotateZ(Math.PI / 2),
};

export function buildTable({ style, shape, dishes, mergeGeos, paintGeo }) {
  const look = TABLE_STYLES[style] ?? TABLE_STYLES.picnic;
  const slots = look.slots(shape);
  const geoOf = (parts) => mergeGeos(parts.map(p => paintGeo(SHAPE[p.shape](p).translate(p.x, p.y, p.z), p.color)));
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0, flatShading: true });
  const group = new THREE.Group(); group.name = 'yard-table';
  const body = new THREE.Mesh(geoOf(look.parts(shape)), mat);
  body.castShadow = true; body.receiveShadow = true;
  const plates = new THREE.Mesh(new THREE.BufferGeometry(), mat);
  plates.castShadow = false; plates.receiveShadow = true;
  group.add(body, plates);
  let growLeft = 0, growSec = 1;
  const setDishes = (list) => {
    const parts = list.slice(0, slots.length).flatMap((d, i) => plateParts(slots[i], d, i));
    const geo = parts.length ? geoOf(parts) : new THREE.BufferGeometry();
    plates.geometry.dispose();
    plates.geometry = geo;
    plates.visible = parts.length > 0;
  };
  setDishes(dishes);
  return {
    group,
    setDishes,
    grow(sec) {
      growSec = sec; growLeft = sec;
      group.scale.setScalar(GROW_FROM);
    },
    growing: () => growLeft > 0,
    update(dt) {
      if (growLeft <= 0) return;
      growLeft = Math.max(0, growLeft - dt);
      const p = 1 - growLeft / growSec;
      group.scale.setScalar(GROW_FROM + (1 - GROW_FROM) * p * (2 - p));
    },
    dispose() {
      body.geometry.dispose(); plates.geometry.dispose(); mat.dispose();
    },
  };
}
