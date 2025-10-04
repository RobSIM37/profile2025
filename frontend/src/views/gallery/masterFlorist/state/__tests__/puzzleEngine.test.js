import { __resolveSlotCountForTest as resolveSlotCount, MASTER_FLORIST_DEFAULT_DIFFICULTY } from '../puzzleEngine.js';
import { MF_DROP_ZONE_COUNT } from '../../canvas/constants.js';

describe('resolveSlotCount', () => {
  it('reduces happy mood slots by difficulty penalty', () => {
    const result = resolveSlotCount({ mood: 'happy', difficulty: MASTER_FLORIST_DEFAULT_DIFFICULTY });
    expect(result).toBe(4);
  });

  it('respects angry mood base slots under default difficulty', () => {
    const result = resolveSlotCount({ mood: 'angry', difficulty: MASTER_FLORIST_DEFAULT_DIFFICULTY });
    expect(result).toBe(2);
  });

  it('honors explicit overrides within allowable range', () => {
    const result = resolveSlotCount({ mood: 'happy', override: 3 });
    expect(result).toBe(3);
  });

  it('clamps override values that exceed the drop zone limit', () => {
    const result = resolveSlotCount({ override: MF_DROP_ZONE_COUNT + 5 });
    expect(result).toBe(MF_DROP_ZONE_COUNT);
  });

  it('falls back to slot options when mood is unknown', () => {
    const rng = jest.fn().mockReturnValue(0);
    const result = resolveSlotCount({ mood: 'mystery', rng });
    expect(result).toBe(MF_DROP_ZONE_COUNT);
    expect(rng).toHaveBeenCalled();
  });
});
