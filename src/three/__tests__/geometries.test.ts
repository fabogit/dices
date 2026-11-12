import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import {
  ALLOWED_FACES,
  type DieFaces,
  getFaceNormal,
  computeTargetQuaternion,
  createDieGeometry,
  createDieMaterials,
  createDieMesh,
  generateDieFaceTexture,
} from '../geometries';

describe('geometries and face-normal quaternion mapping', () => {
  const upVector = new THREE.Vector3(0, 1, 0);
  const yawAngles = [0, Math.PI / 4, Math.PI / 2, Math.PI, (3 * Math.PI) / 2, 2.5];

  ALLOWED_FACES.forEach((faces) => {
    describe(`d${faces}`, () => {
      it(`has valid normalized face normals for all values 1..${faces}`, () => {
        for (let v = 1; v <= faces; v++) {
          const normal = getFaceNormal(faces, v);
          expect(normal).toBeInstanceOf(THREE.Vector3);
          expect(normal.length()).toBeCloseTo(1.0, 5);
        }
      });

      it(`aligns each face value 1..${faces} to (0, 1, 0) via computeTargetQuaternion across multiple yaws`, () => {
        for (let v = 1; v <= faces; v++) {
          const normal = getFaceNormal(faces, v);

          for (const yaw of yawAngles) {
            const quat = computeTargetQuaternion(faces, v, yaw);
            const rotated = normal.clone().applyQuaternion(quat);

            expect(rotated.x).toBeCloseTo(0, 4);
            expect(rotated.y).toBeCloseTo(1, 4);
            expect(rotated.z).toBeCloseTo(0, 4);
            expect(rotated.distanceTo(upVector)).toBeLessThan(1e-4);
          }
        }
      });

      it(`creates geometry with correct number of material groups and valid attributes`, () => {
        const geom = createDieGeometry(faces);
        expect(geom).toBeInstanceOf(THREE.BufferGeometry);

        const expectedGroups = faces === 2 ? 3 : faces;
        expect(geom.groups.length).toBe(expectedGroups);

        const posAttr = geom.getAttribute('position');
        const normAttr = geom.getAttribute('normal');
        const uvAttr = geom.getAttribute('uv');

        expect(posAttr).toBeDefined();
        expect(normAttr).toBeDefined();
        expect(uvAttr).toBeDefined();
        expect(posAttr.count).toBeGreaterThan(0);
        expect(normAttr.count).toBe(posAttr.count);
        expect(uvAttr.count).toBe(posAttr.count);

        // Verify UVs are finite numbers
        for (let i = 0; i < uvAttr.count; i++) {
          const u = uvAttr.getX(i);
          const v = uvAttr.getY(i);
          expect(Number.isFinite(u)).toBe(true);
          expect(Number.isFinite(v)).toBe(true);
        }
      });

      it(`creates full mesh and materials array in headless environment`, () => {
        const materials = createDieMaterials(faces);
        const expectedCount = faces === 2 ? 3 : faces;
        expect(materials.length).toBe(expectedCount);

        const mesh = createDieMesh(faces);
        expect(mesh).toBeInstanceOf(THREE.Mesh);
        expect(mesh.castShadow).toBe(true);
        expect(mesh.receiveShadow).toBe(true);
      });
    });
  });

  describe('input validation and edge cases', () => {
    it('throws when requesting face normal for unsupported face count', () => {
      expect(() => getFaceNormal(7 as unknown as DieFaces, 1)).toThrow('Unsupported face count');
    });

    it('throws RangeError for out-of-bounds value (< 1 or > faces)', () => {
      expect(() => getFaceNormal(6, 0)).toThrow(RangeError);
      expect(() => getFaceNormal(6, 7)).toThrow(RangeError);
      expect(() => getFaceNormal(20, -1)).toThrow(RangeError);
      expect(() => getFaceNormal(20, 21)).toThrow(RangeError);
    });

    it('throws RangeError for non-integer float values', () => {
      expect(() => getFaceNormal(6, 2.5)).toThrow(RangeError);
      expect(() => getFaceNormal(2, 1.1)).toThrow(RangeError);
    });

    it('returns valid fallback texture in headless Node environment', () => {
      const texture = generateDieFaceTexture(6, 1);
      expect(texture).toBeDefined();
    });
  });
});
