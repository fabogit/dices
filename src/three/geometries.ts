import * as THREE from 'three';
import { ALLOWED_FACES, type DieFaces } from '../core/types';

export { ALLOWED_FACES, type DieFaces };

export interface DieTheme {
  primaryColor: string;
  secondaryColor: string;
  borderColor: string;
  textColor: string;
  accentColor: string;
  roughness: number;
  metalness: number;
}

export const DIE_THEMES: Record<DieFaces, DieTheme> = {
  2: {
    primaryColor: '#eab308',
    secondaryColor: '#ca8a04',
    borderColor: '#713f12',
    textColor: '#422006',
    accentColor: '#fef08a',
    roughness: 0.3,
    metalness: 0.75,
  },
  4: {
    primaryColor: '#059669',
    secondaryColor: '#065f46',
    borderColor: '#a7f3d0',
    textColor: '#ffffff',
    accentColor: '#34d399',
    roughness: 0.35,
    metalness: 0.1,
  },
  6: {
    primaryColor: '#dc2626',
    secondaryColor: '#991b1b',
    borderColor: '#fecaca',
    textColor: '#ffffff',
    accentColor: '#f87171',
    roughness: 0.35,
    metalness: 0.1,
  },
  8: {
    primaryColor: '#2563eb',
    secondaryColor: '#1e3a8a',
    borderColor: '#bfdbfe',
    textColor: '#ffffff',
    accentColor: '#60a5fa',
    roughness: 0.35,
    metalness: 0.1,
  },
  10: {
    primaryColor: '#7c3aed',
    secondaryColor: '#4c1d95',
    borderColor: '#ddd6fe',
    textColor: '#ffffff',
    accentColor: '#a78bfa',
    roughness: 0.35,
    metalness: 0.1,
  },
  12: {
    primaryColor: '#d97706',
    secondaryColor: '#78350f',
    borderColor: '#fde68a',
    textColor: '#ffffff',
    accentColor: '#fbbf24',
    roughness: 0.35,
    metalness: 0.1,
  },
  20: {
    primaryColor: '#0f172a',
    secondaryColor: '#020617',
    borderColor: '#38bdf8',
    textColor: '#38bdf8',
    accentColor: '#06b6d4',
    roughness: 0.3,
    metalness: 0.2,
  },
};

/**
 * Cache for generated textures to minimize canvas rendering and GPU texture allocations.
 */
const textureCache = new Map<string, THREE.Texture>();

/**
 * Face normals registry populated for all supported dice and their values 1..faces.
 */
const FACE_NORMALS: Record<DieFaces, THREE.Vector3[]> = {
  2: [],
  4: [],
  6: [],
  8: [],
  10: [],
  12: [],
  20: [],
};

// Initialize d2 face normals (value 1 -> HEADS: (0, 1, 0), value 2 -> TAILS: (0, -1, 0))
FACE_NORMALS[2] = [
  new THREE.Vector3(0, 1, 0),
  new THREE.Vector3(0, -1, 0),
];

// Initialize d4 face normals
{
  const s = 1.25 / Math.sqrt(3);
  const V = [
    new THREE.Vector3(s, s, s),
    new THREE.Vector3(s, -s, -s),
    new THREE.Vector3(-s, s, -s),
    new THREE.Vector3(-s, -s, s),
  ];
  const polys = [
    [V[0], V[1], V[2]],
    [V[0], V[3], V[1]],
    [V[0], V[2], V[3]],
    [V[1], V[3], V[2]],
  ];
  FACE_NORMALS[4] = polys.map((poly) =>
    new THREE.Vector3()
      .crossVectors(poly[1].clone().sub(poly[0]), poly[2].clone().sub(poly[0]))
      .normalize()
  );
}

// Initialize d6 face normals (opposite faces sum to 7: 1-6, 2-5, 3-4)
FACE_NORMALS[6] = [
  new THREE.Vector3(0, 1, 0),  // 1: Top (+Y)
  new THREE.Vector3(1, 0, 0),  // 2: Right (+X)
  new THREE.Vector3(0, 0, 1),  // 3: Front (+Z)
  new THREE.Vector3(0, 0, -1), // 4: Back (-Z)
  new THREE.Vector3(-1, 0, 0), // 5: Left (-X)
  new THREE.Vector3(0, -1, 0), // 6: Bottom (-Y)
];

// Initialize d8 face normals (opposite faces sum to 9: 1-8, 2-7, 3-6, 4-5)
{
  const R = 1.15;
  const xp = new THREE.Vector3(R, 0, 0), xm = new THREE.Vector3(-R, 0, 0);
  const yp = new THREE.Vector3(0, R, 0), ym = new THREE.Vector3(0, -R, 0);
  const zp = new THREE.Vector3(0, 0, R), zm = new THREE.Vector3(0, 0, -R);
  const polys = [
    [yp, zp, xp], // 1
    [yp, xp, zm], // 2
    [yp, zm, xm], // 3
    [yp, xm, zp], // 4
    [ym, zp, xm], // 5 (opposite 4)
    [ym, zm, xp], // 6 (opposite 3)
    [ym, xm, zm], // 7 (opposite 2)
    [ym, xp, zp], // 8 (opposite 1)
  ];
  FACE_NORMALS[8] = polys.map((poly) => {
    const c = poly[0].clone().add(poly[1]).add(poly[2]).multiplyScalar(1 / 3);
    const n = new THREE.Vector3()
      .crossVectors(poly[1].clone().sub(poly[0]), poly[2].clone().sub(poly[0]))
      .normalize();
    return n.dot(c) > 0 ? n : n.negate();
  });
}

// Initialize d10 face normals (pentagonal trapezohedron)
{
  const R = 1.05;
  const H = 1.35;
  const h = H / (5 + 2 * Math.sqrt(5));
  const N = new THREE.Vector3(0, H, 0);
  const S = new THREE.Vector3(0, -H, 0);
  const U: THREE.Vector3[] = [];
  const L: THREE.Vector3[] = [];
  for (let k = 0; k < 5; k++) {
    const thetaU = (2 * Math.PI * k) / 5;
    const thetaL = (2 * Math.PI * k + Math.PI) / 5;
    U.push(new THREE.Vector3(R * Math.cos(thetaU), h, R * Math.sin(thetaU)));
    L.push(new THREE.Vector3(R * Math.cos(thetaL), -h, R * Math.sin(thetaL)));
  }
  const quads: THREE.Vector3[][] = [];
  for (let k = 0; k < 5; k++) {
    quads.push([N, U[(k + 1) % 5], L[k], U[k]]);
  }
  for (let k = 0; k < 5; k++) {
    quads.push([S, L[k], U[(k + 1) % 5], L[(k + 1) % 5]]);
  }
  FACE_NORMALS[10] = quads.map((quad) => {
    const c = quad.reduce((acc, v) => acc.add(v), new THREE.Vector3()).multiplyScalar(0.25);
    const n = new THREE.Vector3()
      .crossVectors(quad[1].clone().sub(quad[0]), quad[2].clone().sub(quad[0]))
      .normalize();
    return n.dot(c) > 0 ? n : n.negate();
  });
}

// Initialize d12 face normals (dodecahedron)
{
  const base = new THREE.DodecahedronGeometry(1.05, 0);
  const pos = base.attributes.position;
  const normals: THREE.Vector3[] = [];
  for (let i = 0; i < pos.count; i += 3) {
    const v0 = new THREE.Vector3().fromBufferAttribute(pos, i);
    const v1 = new THREE.Vector3().fromBufferAttribute(pos, i + 1);
    const v2 = new THREE.Vector3().fromBufferAttribute(pos, i + 2);
    const n = new THREE.Vector3().crossVectors(v1.clone().sub(v0), v2.clone().sub(v0)).normalize();
    if (!normals.some((existing) => existing.dot(n) > 0.99)) {
      normals.push(n);
    }
  }
  FACE_NORMALS[12] = normals;
}

// Initialize d20 face normals (icosahedron)
{
  const base = new THREE.IcosahedronGeometry(1.15, 0);
  const pos = base.attributes.position;
  const normals: THREE.Vector3[] = [];
  for (let i = 0; i < pos.count; i += 3) {
    const v0 = new THREE.Vector3().fromBufferAttribute(pos, i);
    const v1 = new THREE.Vector3().fromBufferAttribute(pos, i + 1);
    const v2 = new THREE.Vector3().fromBufferAttribute(pos, i + 2);
    const n = new THREE.Vector3().crossVectors(v1.clone().sub(v0), v2.clone().sub(v0)).normalize();
    normals.push(n);
  }
  FACE_NORMALS[20] = normals;
}

/**
 * Returns the outward unit normal for a die face value v in [1, faces].
 */
export function getFaceNormal(faces: DieFaces, value: number): THREE.Vector3 {
  if (!ALLOWED_FACES.includes(faces)) {
    throw new Error(`Unsupported face count: ${faces}`);
  }
  if (!Number.isInteger(value) || value < 1 || value > faces) {
    throw new RangeError(`Invalid value ${value} for d${faces} (must be integer in [1, ${faces}])`);
  }
  const normal = FACE_NORMALS[faces][value - 1];
  if (!normal) {
    throw new Error(`Normal not found for d${faces} value ${value}`);
  }
  return normal.clone();
}

/**
 * Computes the target quaternion aligning faceNormal to (0, 1, 0) with optional vertical yaw.
 */
export function computeTargetQuaternion(
  faces: DieFaces,
  value: number,
  yawRadians = 0
): THREE.Quaternion {
  const normal = getFaceNormal(faces, value);
  const up = new THREE.Vector3(0, 1, 0);
  const qAlign = new THREE.Quaternion().setFromUnitVectors(normal, up);
  if (yawRadians !== 0) {
    const qYaw = new THREE.Quaternion().setFromAxisAngle(up, yawRadians);
    qAlign.premultiply(qYaw);
  }
  return qAlign;
}

/**
 * Projects a 3D polygon onto its tangent plane to generate non-distorted planar UV coordinates.
 */
function buildPlanarFaceGeometry(
  polygons: THREE.Vector3[][],
  normals: THREE.Vector3[]
): THREE.BufferGeometry {
  const positions: number[] = [];
  const normalArray: number[] = [];
  const uvs: number[] = [];
  const geometry = new THREE.BufferGeometry();

  polygons.forEach((poly, faceIndex) => {
    const normal = normals[faceIndex];
    const c = poly.reduce((acc, v) => acc.add(v), new THREE.Vector3()).multiplyScalar(1 / poly.length);

    // Coordinate basis on tangent plane
    const ref = Math.abs(normal.dot(new THREE.Vector3(0, 1, 0))) < 0.95
      ? new THREE.Vector3(0, 1, 0)
      : new THREE.Vector3(0, 0, 1);
    const tangent = new THREE.Vector3().crossVectors(ref, normal).normalize();
    const bitangent = new THREE.Vector3().crossVectors(normal, tangent).normalize();
    const maxRadius = Math.max(...poly.map((v) => v.distanceTo(c)));

    // Triangulate polygon (fan from vertex 0)
    const triangles: THREE.Vector3[][] = [];
    for (let i = 1; i < poly.length - 1; i++) {
      triangles.push([poly[0], poly[i], poly[i + 1]]);
    }

    const startVertex = positions.length / 3;
    let vertexCount = 0;

    for (const tri of triangles) {
      for (const v of tri) {
        positions.push(v.x, v.y, v.z);
        normalArray.push(normal.x, normal.y, normal.z);

        const rel = v.clone().sub(c);
        const u = 0.5 + rel.dot(tangent) / (2.2 * maxRadius);
        const u_v = 0.5 + rel.dot(bitangent) / (2.2 * maxRadius);
        uvs.push(u, u_v);
        vertexCount++;
      }
    }

    geometry.addGroup(startVertex, vertexCount, faceIndex);
  });

  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normalArray, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));

  return geometry;
}

/**
 * Procedural geometry generator for any supported die type.
 */
export function createDieGeometry(faces: DieFaces): THREE.BufferGeometry {
  if (!ALLOWED_FACES.includes(faces)) {
    throw new Error(`Unsupported face count: ${faces}`);
  }

  if (faces === 2) {
    // Coin cylinder geometry: 3 groups (0: side rim, 1: top cap HEADS, 2: bottom cap TAILS)
    return new THREE.CylinderGeometry(1.05, 1.05, 0.16, 48);
  }

  if (faces === 4) {
    const s = 1.25 / Math.sqrt(3);
    const V = [
      new THREE.Vector3(s, s, s),
      new THREE.Vector3(s, -s, -s),
      new THREE.Vector3(-s, s, -s),
      new THREE.Vector3(-s, -s, s),
    ];
    const polys = [
      [V[0], V[1], V[2]],
      [V[0], V[3], V[1]],
      [V[0], V[2], V[3]],
      [V[1], V[3], V[2]],
    ];
    return buildPlanarFaceGeometry(polys, FACE_NORMALS[4]);
  }

  if (faces === 6) {
    const s = 0.8;
    const polys = [
      [new THREE.Vector3(-s, s, s), new THREE.Vector3(s, s, s), new THREE.Vector3(s, s, -s), new THREE.Vector3(-s, s, -s)],
      [new THREE.Vector3(s, -s, s), new THREE.Vector3(s, -s, -s), new THREE.Vector3(s, s, -s), new THREE.Vector3(s, s, s)],
      [new THREE.Vector3(-s, -s, s), new THREE.Vector3(s, -s, s), new THREE.Vector3(s, s, s), new THREE.Vector3(-s, s, s)],
      [new THREE.Vector3(s, -s, -s), new THREE.Vector3(-s, -s, -s), new THREE.Vector3(-s, s, -s), new THREE.Vector3(s, s, -s)],
      [new THREE.Vector3(-s, -s, -s), new THREE.Vector3(-s, -s, s), new THREE.Vector3(-s, s, s), new THREE.Vector3(-s, s, -s)],
      [new THREE.Vector3(-s, -s, -s), new THREE.Vector3(s, -s, -s), new THREE.Vector3(s, -s, s), new THREE.Vector3(-s, -s, s)],
    ];
    return buildPlanarFaceGeometry(polys, FACE_NORMALS[6]);
  }

  if (faces === 8) {
    const R = 1.15;
    const xp = new THREE.Vector3(R, 0, 0), xm = new THREE.Vector3(-R, 0, 0);
    const yp = new THREE.Vector3(0, R, 0), ym = new THREE.Vector3(0, -R, 0);
    const zp = new THREE.Vector3(0, 0, R), zm = new THREE.Vector3(0, 0, -R);
    const polys = [
      [yp, zp, xp],
      [yp, xp, zm],
      [yp, zm, xm],
      [yp, xm, zp],
      [ym, zp, xm],
      [ym, zm, xp],
      [ym, xm, zm],
      [ym, xp, zp],
    ];
    return buildPlanarFaceGeometry(polys, FACE_NORMALS[8]);
  }

  if (faces === 10) {
    const R = 1.05;
    const H = 1.35;
    const h = H / (5 + 2 * Math.sqrt(5));
    const N = new THREE.Vector3(0, H, 0);
    const S = new THREE.Vector3(0, -H, 0);
    const U: THREE.Vector3[] = [];
    const L: THREE.Vector3[] = [];
    for (let k = 0; k < 5; k++) {
      const thetaU = (2 * Math.PI * k) / 5;
      const thetaL = (2 * Math.PI * k + Math.PI) / 5;
      U.push(new THREE.Vector3(R * Math.cos(thetaU), h, R * Math.sin(thetaU)));
      L.push(new THREE.Vector3(R * Math.cos(thetaL), -h, R * Math.sin(thetaL)));
    }
    const quads: THREE.Vector3[][] = [];
    for (let k = 0; k < 5; k++) {
      quads.push([N, U[(k + 1) % 5], L[k], U[k]]);
    }
    for (let k = 0; k < 5; k++) {
      quads.push([S, L[k], U[(k + 1) % 5], L[(k + 1) % 5]]);
    }
    return buildPlanarFaceGeometry(quads, FACE_NORMALS[10]);
  }

  if (faces === 12) {
    const base = new THREE.DodecahedronGeometry(1.05, 0);
    const pos = base.attributes.position;
    const rawFaces: Array<{ normal: THREE.Vector3; triangles: THREE.Vector3[][] }> = [];

    for (let i = 0; i < pos.count; i += 3) {
      const v0 = new THREE.Vector3().fromBufferAttribute(pos, i);
      const v1 = new THREE.Vector3().fromBufferAttribute(pos, i + 1);
      const v2 = new THREE.Vector3().fromBufferAttribute(pos, i + 2);
      const n = new THREE.Vector3().crossVectors(v1.clone().sub(v0), v2.clone().sub(v0)).normalize();

      let target = rawFaces.find((f) => f.normal.dot(n) > 0.99);
      if (!target) {
        target = { normal: n, triangles: [] };
        rawFaces.push(target);
      }
      target.triangles.push([v0, v1, v2]);
    }

    const positions: number[] = [];
    const normalArray: number[] = [];
    const uvs: number[] = [];
    const geometry = new THREE.BufferGeometry();

    rawFaces.forEach((face, fIdx) => {
      const allVerts = face.triangles.flat();
      const c = allVerts.reduce((acc, v) => acc.add(v), new THREE.Vector3()).multiplyScalar(1 / allVerts.length);
      const normal = face.normal;

      const ref = Math.abs(normal.dot(new THREE.Vector3(0, 1, 0))) < 0.95
        ? new THREE.Vector3(0, 1, 0)
        : new THREE.Vector3(0, 0, 1);
      const tangent = new THREE.Vector3().crossVectors(ref, normal).normalize();
      const bitangent = new THREE.Vector3().crossVectors(normal, tangent).normalize();
      const maxRadius = Math.max(...allVerts.map((v) => v.distanceTo(c)));

      const startVertex = positions.length / 3;
      let vertexCount = 0;

      for (const tri of face.triangles) {
        for (const v of tri) {
          positions.push(v.x, v.y, v.z);
          normalArray.push(normal.x, normal.y, normal.z);

          const rel = v.clone().sub(c);
          const u = 0.5 + rel.dot(tangent) / (2.2 * maxRadius);
          const u_v = 0.5 + rel.dot(bitangent) / (2.2 * maxRadius);
          uvs.push(u, u_v);
          vertexCount++;
        }
      }

      geometry.addGroup(startVertex, vertexCount, fIdx);
    });

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normalArray, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));

    return geometry;
  }

  // faces === 20
  {
    const base = new THREE.IcosahedronGeometry(1.15, 0);
    const pos = base.attributes.position;
    const positions: number[] = [];
    const normalArray: number[] = [];
    const uvs: number[] = [];
    const geometry = new THREE.BufferGeometry();

    for (let i = 0; i < pos.count; i += 3) {
      const fIdx = i / 3;
      const v0 = new THREE.Vector3().fromBufferAttribute(pos, i);
      const v1 = new THREE.Vector3().fromBufferAttribute(pos, i + 1);
      const v2 = new THREE.Vector3().fromBufferAttribute(pos, i + 2);
      const normal = new THREE.Vector3().crossVectors(v1.clone().sub(v0), v2.clone().sub(v0)).normalize();
      const c = v0.clone().add(v1).add(v2).multiplyScalar(1 / 3);

      const ref = Math.abs(normal.dot(new THREE.Vector3(0, 1, 0))) < 0.95
        ? new THREE.Vector3(0, 1, 0)
        : new THREE.Vector3(0, 0, 1);
      const tangent = new THREE.Vector3().crossVectors(ref, normal).normalize();
      const bitangent = new THREE.Vector3().crossVectors(normal, tangent).normalize();
      const maxRadius = Math.max(v0.distanceTo(c), v1.distanceTo(c), v2.distanceTo(c));

      geometry.addGroup(i, 3, fIdx);

      for (const v of [v0, v1, v2]) {
        positions.push(v.x, v.y, v.z);
        normalArray.push(normal.x, normal.y, normal.z);

        const rel = v.clone().sub(c);
        const u = 0.5 + rel.dot(tangent) / (2.2 * maxRadius);
        const u_v = 0.5 + rel.dot(bitangent) / (2.2 * maxRadius);
        uvs.push(u, u_v);
      }
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normalArray, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));

    return geometry;
  }
}

/**
 * Generates a crisp Canvas2D texture with high-contrast numeral/emblem and border framing.
 * Falls back safely to a lightweight THREE.DataTexture in Node/Vitest environments.
 */
export function generateDieFaceTexture(
  faces: DieFaces,
  value: number,
  customLabel?: string
): THREE.Texture {
  const cacheKey = `${faces}_${value}_${customLabel ?? ''}`;
  const cached = textureCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  // Node/headless test environment guard
  if (typeof document === 'undefined') {
    const fallback = new THREE.DataTexture(new Uint8Array([240, 240, 240, 255]), 1, 1);
    fallback.needsUpdate = true;
    textureCache.set(cacheKey, fallback);
    return fallback;
  }

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    const fallback = new THREE.DataTexture(new Uint8Array([240, 240, 240, 255]), 1, 1);
    fallback.needsUpdate = true;
    textureCache.set(cacheKey, fallback);
    return fallback;
  }

  const theme = DIE_THEMES[faces];
  const cx = 128;
  const cy = 128;

  // Background radial gradient
  const grad = ctx.createRadialGradient(cx, cy, 20, cx, cy, 124);
  grad.addColorStop(0, theme.primaryColor);
  grad.addColorStop(1, theme.secondaryColor);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);

  // Decorative border framing
  ctx.strokeStyle = theme.borderColor;
  ctx.lineWidth = 8;
  ctx.strokeRect(16, 16, 224, 224);

  // Inner accent line
  ctx.strokeStyle = theme.accentColor;
  ctx.lineWidth = 2;
  ctx.strokeRect(28, 28, 200, 200);

  // Text / Numeral Rendering
  const label = customLabel ?? (faces === 2 ? (value === 1 ? 'HEADS' : 'TAILS') : String(value));
  ctx.fillStyle = theme.textColor;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  if (faces === 2) {
    // Coin emblem & text
    ctx.font = 'bold 36px "Segoe UI", Roboto, sans-serif';
    ctx.fillText(label, cx, cy);

    // Decorative circle for coin
    ctx.beginPath();
    ctx.arc(cx, cy, 84, 0, Math.PI * 2);
    ctx.strokeStyle = theme.accentColor;
    ctx.lineWidth = 4;
    ctx.stroke();
  } else {
    // High-contrast numeral
    const fontSize = label.length > 1 ? 92 : 110;
    ctx.font = `bold ${fontSize}px "Segoe UI", Roboto, sans-serif`;
    ctx.fillText(label, cx, cy - 4);

    // Underline bar for 6 and 9 to eliminate reading ambiguity
    if (value === 6 || value === 9) {
      ctx.fillStyle = theme.textColor;
      ctx.fillRect(cx - 28, cy + 48, 56, 8);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  textureCache.set(cacheKey, texture);
  return texture;
}

/**
 * Creates the array of materials corresponding to the die's material groups.
 */
export function createDieMaterials(faces: DieFaces): THREE.Material[] {
  const theme = DIE_THEMES[faces];

  if (faces === 2) {
    // Coin: 3 materials
    const rimMat = new THREE.MeshStandardMaterial({
      color: 0xd4af37,
      metalness: 0.85,
      roughness: 0.25,
    });
    const headsMat = new THREE.MeshStandardMaterial({
      map: generateDieFaceTexture(2, 1, 'HEADS'),
      metalness: theme.metalness,
      roughness: theme.roughness,
    });
    const tailsMat = new THREE.MeshStandardMaterial({
      map: generateDieFaceTexture(2, 2, 'TAILS'),
      metalness: theme.metalness,
      roughness: theme.roughness,
    });
    return [rimMat, headsMat, tailsMat];
  }

  // Polyhedral dice: faces materials (index f corresponds to value f + 1)
  const materials: THREE.Material[] = [];
  for (let v = 1; v <= faces; v++) {
    materials.push(
      new THREE.MeshStandardMaterial({
        map: generateDieFaceTexture(faces, v),
        metalness: theme.metalness,
        roughness: theme.roughness,
      })
    );
  }
  return materials;
}

/**
 * Constructs a fully configured 3D die mesh with procedural geometry and materials.
 */
export function createDieMesh(faces: DieFaces): THREE.Mesh {
  const geometry = createDieGeometry(faces);
  const materials = createDieMaterials(faces);
  const mesh = new THREE.Mesh(geometry, materials);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}
