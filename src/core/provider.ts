import { rollBatchCryptoFair, type RandomSource } from './csprng';
import type { DieFaces } from './types';

export interface IRollProvider {
  readonly kind: 'local-csprng' | 'remote-multiplayer';
  rollRound(faces: DieFaces, countPerRoll: number): Promise<number[]>;
}

export class LocalCryptoRollProvider implements IRollProvider {
  readonly kind = 'local-csprng' as const;

  constructor(private readonly randomSource?: RandomSource) {}

  async rollRound(faces: DieFaces, countPerRoll: number): Promise<number[]> {
    return rollBatchCryptoFair(faces, countPerRoll, this.randomSource);
  }
}
