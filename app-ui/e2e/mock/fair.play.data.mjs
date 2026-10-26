// fair play entries of the newer games and trainings, for the mock (FP_NEW=1)
import { checkRulesGame, checkRulesTraining, compact, levelOf } from '../../../app-api/src/utils/integrity.js';
import { gameOf } from '../../../app-api/src/rules/games.js';
import { withGameState } from '../../../app-api/src/rules/engine.js';

const now = Date.now();
const shanghai = { _id: 'r1', kind: 'shanghai', settings: {}, players: ['p1', 'p2'], visits: [{ player: 'p1', darts: ['T25', 'S1', 'S1'] }, { player: 'p2', darts: ['S1', 'S1', 'S1'] }] };
const golfVisits = [];
for (let hole = 1; hole <= 9; hole += 1) for (const player of ['p1', 'p2']) golfVisits.push({ player, darts: [player === 'p1' ? `D${hole}` : `S${hole}`] });
const golfBase = { _id: 'r2', kind: 'golf', settings: {}, players: ['p1', 'p2'], visits: golfVisits, createdAt: new Date(now - 3600e3), updatedAt: new Date(now - 3000e3) };
const golf = { ...golfBase, ...withGameState(gameOf('golf'), golfBase) };
const bobs = { _id: 't1', kind: 'bobs27', settings: {}, player: { id: 'p1', nickname: 'Anna' }, darts: Array(63).fill('D1'), score: 1200, startedAt: new Date(now - 20e3), createdAt: new Date(now - 1e3) };

export const fpNewItems = () => [
    ['rules', shanghai, 'Shanghai', compact(checkRulesGame(shanghai))],
    ['rules', golf, 'Golf', compact(checkRulesGame(golf))],
    ['rulesTraining', bobs, "Bob's 27 training · 1200", compact(checkRulesTraining(bobs))],
].map(([type, doc, summary, findings]) => ({ type, id: doc._id, kind: doc.kind, club: { id: 'c1', name: 'Test Club' }, at: new Date(now - 600e3).toISOString(), summary, players: [{ id: 'p1', nickname: 'Anna' }], level: levelOf(findings), findings, review: null, doc }));
