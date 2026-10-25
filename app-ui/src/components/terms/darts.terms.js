import { t } from '../../utils/i18n';

/**
 * The darts terms and slang, explained: grouped, each with an id for its own
 * link (/darts-terms#madhouse). The terms stay English in every language, as
 * in the app; only what they mean is translated. aka: other names of it.
 */
export const TERM_GROUPS = [
    {
        id: 'board',
        title: t('The board and the darts'),
        terms: [
            { id: 'oche', term: 'Oche', text: t('The line behind which you stand to throw, 2.37 m from the face of the board. Said "ockey"; Oche is named after it.') },
            { id: 'single', term: 'Single', text: t('The large fields of a number: they count the number once.') },
            { id: 'double', term: 'Double', text: t('The thin outer ring: twice the number. A leg is usually finished on a double.') },
            { id: 'treble', term: 'Treble', aka: ['Triple'], text: t('The thin inner ring: three times the number. The treble 20 is worth 60, the most of any field.') },
            { id: 'bull', term: 'Bull', aka: ['Outer bull', 'Single bull'], text: t('The green ring around the centre: 25 points.') },
            { id: 'bullseye', term: 'Bullseye', aka: ['Inner bull', 'Double bull'], text: t('The red centre: 50 points. It counts as a double, so it finishes a leg.') },
            { id: 'bed', term: 'Bed', text: t('One field of the board, e.g. the treble 20 bed.') },
            { id: 'wire', term: 'Wire', aka: ['Spider'], text: t('The metal that divides the fields. A dart that hits it may bounce out.') },
            { id: 'bounce-out', term: 'Bounce-out', text: t('A dart that does not stay in the board. It scores nothing and may not be thrown again.') },
            { id: 'barrel', term: 'Barrel', text: t('The part of the dart you hold, mostly of tungsten, with its weight and grip.') },
            { id: 'shaft', term: 'Shaft', aka: ['Stem'], text: t('The piece between the barrel and the flight.') },
            { id: 'flight', term: 'Flight', text: t('The wings at the back of the dart that keep it straight in the air.') },
            { id: 'steel-tip', term: 'Steel tip', text: t('Darts with a metal point, thrown at a bristle board; the scores are entered by hand, e.g. in Oche.') },
            { id: 'soft-tip', term: 'Soft tip', text: t('Darts with a plastic point, thrown at an electronic board with holes, from 2.44 m.') },
            { id: 'arrows', term: 'Arrows', text: t('Darts, in the language of the players.') },
        ],
    },
    {
        id: 'scoring',
        title: t('Scoring'),
        terms: [
            { id: 'visit', term: 'Visit', aka: ['Throw', 'Turn'], text: t('Your three darts in a row; their score is entered at once.') },
            { id: 'ton', term: 'Ton', text: t('100 points in a visit. Ton-plus: 100 or more; a ton-40 is 140.') },
            { id: 'ton-80', term: 'Ton-80', aka: ['Maximum', '180'], text: t('180, the most a visit can score: three darts in the treble 20.') },
            { id: 'bust', term: 'Bust', text: t('Too much: more than you have left, or 1 left in Double Out, or zero without a double. The visit counts nothing and you keep the score from before it.') },
            { id: 'checkout', term: 'Checkout', aka: ['Finish', 'Out-shot'], text: t('The visit that ends a leg exactly on zero, in Double Out with a double as the last dart.') },
            { id: 'big-fish', term: 'Big Fish', text: t('170, the highest checkout: treble 20, treble 20, bullseye.') },
            { id: 'bogey-numbers', term: 'Bogey numbers', text: t('Scores below 171 that cannot be checked out in three darts: 169, 168, 166, 165, 163, 162 and 159.') },
            { id: 'setup-shot', term: 'Setup shot', text: t('A dart that leaves a good double, e.g. a single 20 from 60 to leave double 20.') },
            { id: 'average', term: '3-dart average', aka: ['Average'], text: t('The points per visit of three darts, over a leg, a game or longer. The measure of a player.') },
            { id: 'first-9', term: 'First 9 average', text: t('The average of the first nine darts of a leg, before the checkout plays a part: pure scoring.') },
            { id: 'checkout-rate', term: 'Checkout rate', text: t('How many of the darts at a finishing double hit it, in percent.') },
            { id: 'nine-darter', term: 'Nine-darter', text: t('The perfect leg: 501 in nine darts, e.g. two 180s and a checkout of 141.') },
            { id: 'high-finish', term: 'High finish', text: t('A checkout of 100 or more.') },
        ],
    },
    {
        id: 'match',
        title: t('Legs, sets and the match'),
        terms: [
            { id: 'leg', term: 'Leg', text: t('One game from 501 (or 301) down to zero. Whoever gets there first wins the leg.') },
            { id: 'set', term: 'Set', text: t('A number of legs, usually the best of five; a match of sets is won by the most sets.') },
            { id: 'best-of', term: 'Best of', text: t('The most legs or sets a match can last: best of 5 legs is won with three.') },
            { id: 'double-out', term: 'Double Out', text: t('The last dart of a leg must hit a double (or the bullseye). The usual way to play.') },
            { id: 'straight-out', term: 'Straight Out', text: t('Any field finishes the leg, as long as it reaches exactly zero. Easier, good to start with.') },
            { id: 'master-out', term: 'Master Out', text: t('The last dart hits a double or a treble.') },
            { id: 'double-in', term: 'Double In', text: t('Scoring only starts with a double. Rare, but played in some leagues.') },
            { id: 'diddle-for-the-middle', term: 'Diddle for the middle', aka: ['Throw for the bull'], text: t('Each throws one dart at the bull; the closest starts the first leg. After that the start goes in turn.') },
            { id: 'throw', term: 'Throw', text: t('Who starts a leg "has the throw", an advantage in the long run.') },
            { id: 'hold', term: 'Hold', text: t('Winning a leg you started.') },
            { id: 'break', term: 'Break', text: t('Winning a leg your opponent started: the way to win a match.') },
            { id: 'whitewash', term: 'Whitewash', text: t('Winning a match without losing a single leg.') },
            { id: 'game-shot', term: 'Game shot', text: t('What the caller says when a leg is won, followed by the leg and who won it.') },
            { id: 'caller', term: 'Caller', aka: ['Marker', 'Chalker'], text: t('Calls the scores and keeps the score board. In Oche, the app does it.') },
            { id: 'mugs-away', term: 'Mugs away', text: t('In a friendly game, the loser of a leg starts the next one.') },
        ],
    },
    {
        id: 'slang',
        title: t('Slang'),
        terms: [
            { id: 'bed-and-breakfast', term: 'Bed and Breakfast', text: t('26: a single 20, a 5 and a 1, the usual miss when aiming at the treble 20. Once the price of a night in a British inn: two shillings and six pence.') },
            { id: 'madhouse', term: 'Madhouse', aka: ["Annie's room"], text: t('Double 1, the last double there is: miss it and you can only bust.') },
            { id: 'shanghai', term: 'Shanghai', text: t('A single, a double and a treble of the same number in one visit, e.g. 120 as single 20, treble 20, double 20. Also a game of its own.') },
            { id: 'robin-hood', term: 'Robin Hood', text: t('A dart that sticks in the back of another dart.') },
            { id: 'bag-o-nuts', term: "Bag o' nuts", text: t('45 in a visit.') },
            { id: 'three-in-a-bed', term: 'Three in a bed', text: t('All three darts of a visit in the same field.') },
            { id: 'hat-trick', term: 'Hat trick', text: t('Three bullseyes in one visit: 150 points.') },
            { id: 'double-trouble', term: 'Double trouble', text: t('When the finishing double just will not come.') },
            { id: 'downstairs', term: 'Downstairs', text: t('Going for the treble 19 at the bottom of the board, often when the treble 20 is blocked by darts.') },
            { id: 'married-mans-side', term: "Married man's side", text: t('The left of the board around the 11 and 14: playing it safe.') },
            { id: 'round-the-clock', term: 'Round the clock', aka: ['Around the Clock'], text: t('Hitting every number from 1 to 20 in turn, and the bull: a game and a training of its own.') },
        ],
    },
];

// every term with its group, for the search
export const ALL_TERMS = TERM_GROUPS.flatMap(group => group.terms.map(term => ({ ...term, group: group.id })));

// the badges named after a darts term: the term they link to
export const BADGE_TERMS = { bedAndBreakfast: 'bed-and-breakfast', madhouse: 'madhouse', shanghaied: 'shanghai' };

// where a term is explained
export const termLink = (id) => `/darts-terms#${id}`;
