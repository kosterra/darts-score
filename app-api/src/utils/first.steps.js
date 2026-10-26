import db from '../models/db.model.js';

/**
 * First steps of a new user in a club, ticked from what is really there: for
 * an admin of the club the club's face, its players, how it plays, the first
 * game and their own player; for a member their player, the first game, a
 * training and their notifications. (Legmate as an app is told by the
 * device itself.) → { role: 'admin' | 'member', items: [{ id, done }] }
 */
export const ADMIN_STEPS = ['clubProfile', 'players', 'rules', 'firstGame', 'you'];
export const MEMBER_STEPS = ['you', 'firstGame', 'training', 'notifications', 'app'];

// which steps are done, from the facts (kept apart, to be tested on its own)
export const stepsOf = (isAdmin, facts) => {
    const done = {
        clubProfile: facts.clubHasFace,
        players: facts.otherPlayers > 0,
        rules: facts.clubHasRules,
        firstGame: isAdmin ? facts.clubHasGame : facts.myGame,
        you: facts.playerComplete,
        training: facts.myTraining,
        notifications: facts.notificationsChosen,
        app: null,
    };
    return { role: isAdmin ? 'admin' : 'member', items: (isAdmin ? ADMIN_STEPS : MEMBER_STEPS).map(id => ({ id, done: done[id] })) };
};

const GAMES = ['x01', 'cricket', 'elimination', 'clock', 'rulesGame'];

export const firstStepsOf = async (user, club) => {
    const isAdmin = (club.admins ?? []).some(admin => String(admin) === String(user._id));
    const player = await db.player.findOne({ user: user._id, clubs: club._id }, '_id profileImg country').lean();
    const id = player ? String(player._id) : null;
    const [otherPlayers, clubGames, myGames, trainings] = await Promise.all([
        db.player.countDocuments({ clubs: club._id, guest: { $ne: true }, ...(player ? { _id: { $ne: player._id } } : {}) }),
        Promise.all(GAMES.map(kind => db[kind].exists({ club: club._id, hasWinner: true }))),
        id ? Promise.all(GAMES.map(kind => db[kind].exists({ club: club._id, players: id, hasWinner: true }))) : [],
        id ? Promise.all([db.atc.exists({ 'player.id': id }), db.rulesTraining.exists({ 'player.id': id }), db.x01Training.exists({ players: id })]) : [],
    ]);
    return stepsOf(isAdmin, {
        clubHasFace: Boolean(club.logo || club.description?.trim()),
        otherPlayers,
        clubHasRules: Object.keys(club.gameRules ?? {}).length > 0,
        clubHasGame: clubGames.some(Boolean),
        myGame: myGames.some(Boolean),
        playerComplete: Boolean(player?.profileImg || player?.country),
        myTraining: trainings.some(Boolean),
        notificationsChosen: user.notifications != null,
    });
};
