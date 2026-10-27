/**
 * Doubles in the setup: the teams follow the throwing order, the teams and
 * partners taking turns (see teamsOf in rules/x01.js): the first and third
 * player against the second and fourth.
 */

// the two teams of four players in their throwing order: [[a1, a2], [b1, b2]]
export const teamsOfOrder = (players) => (players.length === 4 ? [[players[0], players[2]], [players[1], players[3]]] : null);

// the next way to pair them, the first player staying first: the last three
// move round, so three presses go through every pairing and back
export const changePartners = (players) => (players.length === 4 ? [players[0], players[2], players[3], players[1]] : players);
