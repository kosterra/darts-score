// The colours a component needs in JavaScript (charts, inline colours), with
// the values of the style guide's tokens in theme/base/_tokens.scss (a test
// keeps them equal). Stylesheets use the tokens; everything else this.

export const ACCENT = {
    green: '#7ecca5',
    gold: '#ffc94d',
    amber: '#e9ac2f',
    pink: '#e69ac0',
    blue: '#4aa8ff',
    red: '#ec8b80',
    cream: '#efe6d0',
};

// first, second, third
export const PODIUM = ['#ffc94d', '#c9d1d9', '#d29a6a'];

// each game type's colour; the newer games (rules) share one, the trainings take their game's
export const GAME_COLORS = {
    x01: ACCENT.green,
    cricket: '#d4c783',
    elimination: '#c3a9e6',
    clock: '#86bfe6',
    rules: ACCENT.pink,
    atc: '#86bfe6',
    bot: ACCENT.green,
};
