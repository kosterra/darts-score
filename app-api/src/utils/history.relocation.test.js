import { describe, it, expect } from 'vitest';
import { targetClubOf, targetClubOfTraining } from './history.relocation.js';

const OLD = 'old';
const NEW = 'new';

describe('targetClubOf', () => {
    it('moves a game when every player left the old club for the same new one', () => {
        expect(targetClubOf([{ clubs: [NEW] }, { clubs: [NEW, 'other'] }], OLD)).toBe(NEW);
    });

    it('keeps a game while a player is still in the old club', () => {
        expect(targetClubOf([{ clubs: [NEW] }, { clubs: [OLD] }], OLD)).toBeNull();
        expect(targetClubOf([{ clubs: [NEW] }, { clubs: [OLD, NEW] }], OLD)).toBeNull();
    });

    it('keeps a game when the players share no club, more than one, or one of them is gone', () => {
        expect(targetClubOf([{ clubs: [NEW] }, { clubs: ['other'] }], OLD)).toBeNull();
        expect(targetClubOf([{ clubs: [NEW, 'other'] }, { clubs: [NEW, 'other'] }], OLD)).toBeNull();
        expect(targetClubOf([{ clubs: [NEW] }, null], OLD)).toBeNull();
    });
});

describe('targetClubOfTraining', () => {
    it('moves a training to the only club of a player who left', () => {
        expect(targetClubOfTraining({ clubs: [NEW] }, OLD)).toBe(NEW);
        expect(targetClubOfTraining({ clubs: [OLD, NEW] }, OLD)).toBeNull();
        expect(targetClubOfTraining({ clubs: [NEW, 'other'] }, OLD)).toBeNull();
    });
});
