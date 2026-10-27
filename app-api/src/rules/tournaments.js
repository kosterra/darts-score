/**
 * Tournaments of a club: knockout brackets (or groups first, then a bracket),
 * their rounds and the rules each round is played by. Plain data and functions without texts: the API keeps
 * an identical copy (see shared.js) to check what is entered, hold the draw
 * and move the winners on.
 *
 * A round is named by how many players are left in it: 2 is the final, 4 the
 * semi-finals, 8 the quarter-finals, then the last 16, 32 and 64.
 */

// at least this many members to set up a tournament, and entries to start it
export const MIN_PLAYERS = 4;
// the largest brackets offered
export const MAX_PLAYERS_CHOICES = [8, 16, 32, 64];
export const SEEDINGS = ['seeded', 'random'];
// how the members hear of the registration (the invitation and the reminder): in the app and by
// mail as each chose, only in the app, or only from the banner on the club's dashboard
export const INVITE_CHANNELS = ['mail', 'notification', 'banner'];
export const STATUSES = ['draft', 'registration', 'closed', 'drawn', 'running', 'finished', 'cancelled'];
// a tournament the club sees on its dashboard: from the registration until a week after the final
export const SHOWN_DAYS_AFTER = 7;

const SET_LEG_MODES = ['Best of', 'First to'];
const IN_MODES = ['Straight In', 'Double In', 'Master In'];
const OUT_MODES = ['Straight Out', 'Double Out', 'Master Out'];
export const STARTING_SCORES = [301, 501, 701, 1001];

// the rules of one round (an X01 game): legs only when numberOfSets is 1
const legs = (mode, count, sets = null) => ({
    startingScore: 501, legInMode: 'Straight In', legOutMode: 'Double Out',
    setMode: sets ? sets[0] : 'Best of', numberOfSets: sets ? sets[1] : 1,
    legMode: mode, numberOfLegs: count,
});
const bestOf = (count) => legs('Best of', count);
const firstTo = (count) => legs('First to', count);
const setsFirstTo = (count) => legs('Best of', 5, ['First to', count]);
const setsBestOf = (count) => legs('Best of', 5, ['Best of', count]);

/**
 * The usual formats, each as its rounds from the final backwards (the last
 * one also for every earlier round). The PDC ones as the PDC plays them;
 * they are long for a club evening.
 */
export const PRESETS = [
    { id: 'clubNight', rounds: [bestOf(7), bestOf(5), bestOf(3)] },
    { id: 'clubClassic', rounds: [bestOf(11), bestOf(9), bestOf(7), bestOf(5)] },
    { id: 'miniWorld', rounds: [setsBestOf(5), setsBestOf(3)] },
    { id: 'playersChampionship', pdc: true, rounds: [bestOf(11)] },
    { id: 'europeanTour', pdc: true, rounds: [bestOf(15), bestOf(13), bestOf(11)] },
    { id: 'worldMatchplay', pdc: true, rounds: [firstTo(18), firstTo(17), firstTo(16), firstTo(11), firstTo(10)] },
    { id: 'worldChampionship', pdc: true, rounds: [setsFirstTo(7), setsFirstTo(6), setsFirstTo(5), setsFirstTo(4), setsFirstTo(4), setsFirstTo(3)] },
];

export const presetById = (id) => PRESETS.find(preset => preset.id === id) ?? null;

// the round sizes of a bracket, the first round first: 16 → [16, 8, 4, 2]
export const roundSizes = (bracket) => {
    const sizes = [];
    for (let size = bracket; size >= 2; size /= 2) sizes.push(size);
    return sizes;
};

// the bracket for a number of players: the next power of two, at least 4
export const bracketSize = (players) => {
    let size = 4;
    while (size < players) size *= 2;
    return size;
};

// the rules of a preset for the round of a size
export const presetRules = (preset, size) => {
    const fromFinal = Math.log2(size) - 1;
    const rounds = preset?.rounds ?? PRESETS[0].rounds;
    return { ...rounds[Math.min(fromFinal, rounds.length - 1)] };
};

// the rounds of a tournament of up to maxPlayers, with the rules of a preset and no dates yet
export const roundsOfPreset = (presetId, maxPlayers) => roundSizes(maxPlayers).map(size => ({ size, date: null, rules: presetRules(presetById(presetId), size) }));

// how many legs a round lasts at most: "Best of 5 legs" 5, "First to 3 sets of best of 5 legs" 25
export const maxLegs = (rules) => {
    const legsPerSet = rules.legMode === 'First to' ? rules.numberOfLegs * 2 - 1 : rules.numberOfLegs;
    const sets = rules.setMode === 'First to' ? rules.numberOfSets * 2 - 1 : rules.numberOfSets;
    return legsPerSet * sets;
};

/**
 * Why the rules of a round cannot be played, or null.
 */
export const rulesError = (rules) => {
    if (!rules || typeof rules !== 'object') return 'The rules of a round are missing.';
    if (!STARTING_SCORES.includes(Number(rules.startingScore))) return 'Choose the starting score of every round.';
    if (!IN_MODES.includes(rules.legInMode) || !OUT_MODES.includes(rules.legOutMode)) return 'Choose how every round starts and ends a leg.';
    if (!SET_LEG_MODES.includes(rules.setMode) || !SET_LEG_MODES.includes(rules.legMode)) return 'Choose Best of or First to for every round.';
    const sets = Number(rules.numberOfSets);
    const count = Number(rules.numberOfLegs);
    if (!Number.isInteger(sets) || sets < 1 || sets > 13) return 'A round has 1 to 13 sets.';
    if (!Number.isInteger(count) || count < 1 || count > 35) return 'A round has 1 to 35 legs.';
    // "Best of" an even number has no winner for sure
    if (rules.setMode === 'Best of' && sets % 2 === 0) return 'Best of an even number of sets can end in a draw: choose an odd number.';
    if (rules.legMode === 'Best of' && count % 2 === 0) return 'Best of an even number of legs can end in a draw: choose an odd number.';
    return null;
};

// only what a round's rules are made of, as numbers where they are numbers
export const cleanRules = (rules) => ({
    startingScore: Number(rules.startingScore),
    legInMode: rules.legInMode,
    legOutMode: rules.legOutMode,
    setMode: rules.setMode,
    numberOfSets: Number(rules.numberOfSets),
    legMode: rules.legMode,
    numberOfLegs: Number(rules.numberOfLegs),
});

/**
 * The order of the seeds in a bracket, so the best meet last: for 8,
 * [1, 8, 4, 5, 2, 7, 3, 6] (1 against 8, 4 against 5, …).
 */
export const seedOrder = (size) => {
    let order = [1, 2];
    while (order.length < size) {
        const sum = order.length * 2 + 1;
        order = order.flatMap(seed => [seed, sum - seed]);
    }
    return order;
};

// how many players are seeded: a quarter of the bracket, at least 2
export const seedCount = (size) => Math.max(2, size / 4);

/**
 * The draw: places the players in the first round. ranked: the players, the
 * best first when seeded (the seeds keep their order, the others are
 * shuffled); random: all shuffled. Byes (the bracket not full) meet the
 * first seeds. random() can be given for tests.
 * → { size, slots: [playerId | null] } in bracket order (pairs side by side)
 */
export const drawBracket = (ranked, { seeding = 'seeded', random = Math.random } = {}) => {
    const size = bracketSize(ranked.length);
    const shuffle = (list) => {
        const copy = [...list];
        for (let index = copy.length - 1; index > 0; index -= 1) {
            const other = Math.floor(random() * (index + 1));
            [copy[index], copy[other]] = [copy[other], copy[index]];
        }
        return copy;
    };
    const seeds = seeding === 'seeded' ? Math.min(seedCount(size), ranked.length) : 0;
    // the seeds in order, the rest shuffled: their place in this list is their seed number
    const order = [...ranked.slice(0, seeds), ...shuffle(ranked.slice(seeds))];
    return { size, slots: seedOrder(size).map(seed => order[seed - 1] ?? null) };
};

// a match of the bracket by round size and number: "8-0" is the first quarter-final
export const matchId = (size, index) => `${size}-${index}`;

/**
 * The matches of a bracket from its first round: every match of every round,
 * the first round with its players, byes decided at once.
 * → [{ id, size, index, players: [a, b], winner, status }]
 */
export const bracketMatches = ({ size, slots }) => {
    const matches = [];
    for (const roundSize of roundSizes(size)) {
        for (let index = 0; index < roundSize / 2; index += 1) {
            matches.push({ id: matchId(roundSize, index), size: roundSize, index, players: [null, null], winner: null, status: 'waiting', bye: false });
        }
    }
    const byId = new Map(matches.map(match => [match.id, match]));
    for (let index = 0; index < size / 2; index += 1) {
        const match = byId.get(matchId(size, index));
        match.players = [slots[index * 2], slots[index * 2 + 1]];
        const [a, b] = match.players;
        if (a && b) match.status = 'ready';
        else if (a || b) Object.assign(match, { status: 'bye', bye: true, winner: a ?? b });
    }
    // the players of a bye go on at once
    for (const match of matches.filter(entry => entry.bye)) advance(byId, match);
    return matches;
};

// the match the winner of a match goes on to, and on which side; null after the final
export const nextOf = (match) => (match.size > 2 ? { id: matchId(match.size / 2, Math.floor(match.index / 2)), side: match.index % 2 } : null);

/**
 * Moves the winner of a decided match into the next one (which is ready
 * once both its players are known). byId: Map(id → match), changed in place.
 * → the next match, or null after the final
 */
export const advance = (byId, match) => {
    const next = nextOf(match);
    if (!next) return null;
    const target = byId.get(next.id);
    target.players[next.side] = match.winner;
    if (target.players[0] && target.players[1] && target.status === 'waiting') target.status = 'ready';
    return target;
};

/**
 * Takes a winner back out of the next match, as long as that one has not
 * started (a result corrected, a game deleted). → true when it could.
 */
export const retract = (byId, match) => {
    const next = nextOf(match);
    if (!next) return true;
    const target = byId.get(next.id);
    if (!['waiting', 'ready'].includes(target.status)) return false;
    target.players[next.side] = null;
    target.status = 'waiting';
    return true;
};

// the round a tournament is in: the first with a match not decided yet (the groups before the bracket)
export const currentRound = (matches) => {
    const open = matches.filter(match => !['done', 'bye', 'walkover'].includes(match.status));
    if (open.some(match => match.group != null)) return 0;
    return open.length ? Math.max(...open.map(match => match.size)) : null;
};

export const isDecided = (match) => ['done', 'bye', 'walkover'].includes(match.status);

// ---------------------------------------------------------------------------
// Groups + knockout: round-robin groups first, the best of each group then
// in a knockout bracket. The group stage is the "round" of size GROUP_ROUND
// (its rules and day); its matches carry the number of their group.
// ---------------------------------------------------------------------------

export const FORMATS = ['knockout', 'groups'];
export const GROUP_ROUND = 0;
export const GROUP_SIZES = [3, 4, 5, 6];
// points of a win in a group (a loss gives none)
export const WIN_POINTS = 2;

// how many groups the players make with groups of about "size": at least one
export const groupCount = (players, size) => Math.max(1, Math.round(players / size));

// the sizes of the groups: as even as possible, the larger ones first
export const groupSizesOf = (players, size) => {
    const count = groupCount(players, size);
    const base = Math.floor(players / count);
    return Array.from({ length: count }, (_, index) => base + (index < players % count ? 1 : 0));
};

/**
 * Why the groups cannot be played like this, or null. size: the size the
 * groups are made of; advance: how many of each group go on.
 */
export const groupSetupError = (players, size, advance) => {
    if (!GROUP_SIZES.includes(Number(size))) return 'Groups have 3 to 6 players.';
    const smallest = Math.min(...groupSizesOf(players, size));
    if (!Number.isInteger(Number(advance)) || advance < 1 || advance >= smallest) return 'Fewer players go on than a group has.';
    if (groupCount(players, size) * advance < 2) return 'At least two players go on to the knockout stage.';
    return null;
};

// what the app suggests for a number of entries: groups of 4 (all in one with up to 6), the top 2 go on
export const suggestGroups = (players) => ({ size: players <= 6 ? Math.max(3, players) : 4, advance: 2 });

// the bracket of those who go on from the groups: two play the final at once
const knockoutSize = (qualifiers) => (qualifiers <= 2 ? 2 : bracketSize(qualifiers));

// the knockout bracket after the groups: how many go on, and its size
export const knockoutOfGroups = (players, size, advance) => {
    const qualifiers = groupCount(players, size) * advance;
    return { qualifiers, size: knockoutSize(qualifiers) };
};

/**
 * The groups: the players in snake order, so the strongest are spread over
 * the groups (seeded: in the order given; random: shuffled).
 * → [[playerId]] one list per group
 */
export const drawGroups = (ranked, { size, seeding = 'seeded', random = Math.random }) => {
    const count = groupCount(ranked.length, size);
    const order = [...ranked];
    if (seeding !== 'seeded') {
        for (let index = order.length - 1; index > 0; index -= 1) {
            const other = Math.floor(random() * (index + 1));
            [order[index], order[other]] = [order[other], order[index]];
        }
    }
    const groups = Array.from({ length: count }, () => []);
    order.forEach((player, index) => {
        const row = Math.floor(index / count);
        const column = row % 2 === 0 ? index % count : count - 1 - (index % count);
        groups[column].push(player);
    });
    return groups;
};

// a match of a group: "g0-1-3" is the first group's match of its second and fourth player
export const groupMatchId = (group, a, b) => `g${group}-${a}-${b}`;

// what the id of a match looks like, of the bracket or of a group (the API checks it)
export const MATCH_ID = /^(\d+-\d+|g\d+-\d+-\d+)$/;

/**
 * Every match of the groups, each player against each other once, in an
 * order where nobody plays twice in a row where it can be avoided.
 * → [{ id, size: GROUP_ROUND, group, index, players, winner, status }]
 */
export const groupMatches = (groups) => groups.flatMap((players, group) => {
    // the circle method: rounds where everyone plays once (one sits out with an odd number)
    const seats = players.length % 2 ? [...players.keys(), null] : [...players.keys()];
    const rounds = [];
    for (let round = 0; round < seats.length - 1; round += 1) {
        for (let pair = 0; pair < seats.length / 2; pair += 1) {
            const a = seats[pair];
            const b = seats[seats.length - 1 - pair];
            if (a !== null && b !== null) rounds.push([Math.min(a, b), Math.max(a, b)]);
        }
        seats.splice(1, 0, seats.pop());
    }
    return rounds.map(([a, b], index) => ({
        id: groupMatchId(group, a, b), size: GROUP_ROUND, group, index,
        players: [players[a], players[b]], winner: null, status: 'ready', bye: false,
    }));
});

/**
 * The table of a group: played, won, lost, legs for and against, points;
 * ranked by points, then leg difference, then legs won, then the match
 * between two still level, then the order of the draw.
 * players: the group's players in the order of the draw.
 * → [{ player, played, won, lost, legsFor, legsAgainst, points }]
 */
export const groupTable = (players, matches) => {
    const rows = new Map(players.map(player => [player, { player, played: 0, won: 0, lost: 0, legsFor: 0, legsAgainst: 0, points: 0 }]));
    const decided = matches.filter(match => isDecided(match) && match.winner && match.players.every(player => rows.has(player)));
    for (const match of decided) {
        match.players.forEach((player, side) => {
            const row = rows.get(player);
            row.played += 1;
            if (match.winner === player) {
                row.won += 1;
                row.points += WIN_POINTS;
            } else {
                row.lost += 1;
            }
            const legs = match.score?.legs;
            if (legs) {
                row.legsFor += legs[side] ?? 0;
                row.legsAgainst += legs[1 - side] ?? 0;
            }
        });
    }
    const beat = (a, b) => decided.find(match => match.players.includes(a) && match.players.includes(b))?.winner;
    return [...rows.values()].sort((a, b) => b.points - a.points
        || (b.legsFor - b.legsAgainst) - (a.legsFor - a.legsAgainst)
        || b.legsFor - a.legsFor
        || (beat(a.player, b.player) === a.player ? -1 : beat(a.player, b.player) === b.player ? 1 : 0)
        || players.indexOf(a.player) - players.indexOf(b.player));
};

// the group stage is over: every group match decided
export const groupsDone = (matches) => matches.filter(match => match.group != null).every(isDecided);

/**
 * The bracket after the groups: the group winners as the first seeds, then
 * the runners-up, …; nobody meets a player of their own group in the first
 * round where it can be avoided (the order within a place is turned until it
 * fits). → { size, slots }
 */
export const knockoutDraw = (groups, matches, advance) => {
    const tables = groups.map(players => groupTable(players, matches.filter(match => match.group != null)));
    const groupOf = new Map(groups.flatMap((players, group) => players.map(player => [player, group])));
    const places = Array.from({ length: advance }, (_, place) => tables.map(table => table[place]?.player).filter(Boolean));
    const size = knockoutSize(places.flat().length);
    const order = seedOrder(size);
    const slotsOf = (ranked) => order.map(seed => ranked[seed - 1] ?? null);
    const clashes = (slots) => slots.filter((player, index) => index % 2 === 0 && player && slots[index + 1] && groupOf.get(player) === groupOf.get(slots[index + 1])).length;
    // the group winners keep their order; the places behind are turned and reversed until nobody meets their group
    const variants = (list) => [...list.keys()].flatMap(shift => {
        const turned = [...list.slice(shift), ...list.slice(0, shift)];
        return [turned, [...turned].reverse()];
    });
    let best = null;
    const tryPlaces = (fixed, rest) => {
        if (best && best.clash === 0) return;
        if (!rest.length) {
            const slots = slotsOf(fixed.flat());
            const clash = clashes(slots);
            if (!best || clash < best.clash) best = { slots, clash };
            return;
        }
        for (const variant of variants(rest[0])) tryPlaces([...fixed, variant], rest.slice(1));
    };
    tryPlaces([places[0] ?? []], places.slice(1));
    return { size, slots: best?.slots ?? slotsOf(places.flat()) };
};
