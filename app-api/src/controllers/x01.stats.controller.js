import logger from '../models/logger.model.js';
import db from '../models/db.model.js';
import { x01StatsModel, avgItemModel } from '../models/x01.stats.models.js';
import { viewOf } from '../utils/game.view.js';

const X01 = db.x01;

// Get statistics for a X01 game by game id
export const getX01Stats = async (req, res, next) => {
    logger.debug("statistics get x01 stats called!");
    try {
        const x01Stats = await calculateX01Stats(req.params.id);
        res.send(x01Stats);
    } catch (err) {
        logger.error(err, 'Failed to calculate x01 stats');
        next(err);
    }
};

// the same statistics for an X01 training against the bot
export const getX01TrainingStats = async (req, res, next) => {
    try {
        res.send(await calculateX01Stats(req.params.id, db.x01Training));
    } catch (err) {
        logger.error(err, 'Failed to calculate x01 training stats');
        next(err);
    }
};

async function calculateX01Stats(gameId, Model = X01) {
    logger.debug('calculate x01 stats called');
    return x01StatsOf(await findX01Game(gameId, Model));
}

/**
 * The statistics of one X01 game (a document or the plain game): the averages
 * per leg, the doubles, the score ranges and the sections hit.
 */
export function x01StatsOf(stored) {
    // the sets and legs played follow from the visits
    const x01Game = viewOf('x01', stored);
    const x01Stats = JSON.parse(JSON.stringify(x01StatsModel));

    x01Stats.avg = getPlayersAveragesX01(x01Game);
    x01Stats.checkouts = getPlayersCheckoutHitsX01(x01Game);
    x01Stats.scoreRanges = getPlayersScoreRangesX01(x01Game, x01Stats.scoreRanges);
    x01Stats.sectionHits = getPlayersSectionHitsX01(x01Game, x01Stats.sectionHits);

    return x01Stats;
}

async function findX01Game(gameId, Model = X01) {
    logger.debug('find x01 game by id called');
    let x01Game = await Model.findById(gameId)
        .then(data => {
            return data;
        })
        .catch(err => {
            logger.error('Failed to find x01 games. ' + err);
        });

    return x01Game;
}

const getPlayersAveragesX01 = (game) => {
    let averages = [];
    game.players.map((playerId, idx) => {
        var playerModel = game.playerModels[playerId];

        for (let s = 1; s <= game.setsPlayed; s++) {
            for (let l = 1; l <= game.legsPlayed; l++) {
                if ((((playerModel || {}).averages || {})['set-' + s] || {})['leg-' + l]) {
                    var item = {};
                    var label = 'S' + s + '/L' + l;
                    var desc = 'Set ' + s + ' - Leg ' + l;
                    const existingIndex = averages.findIndex(item => item.label === label);

                    if (existingIndex >= 0) {
                        item = averages[existingIndex];
                    } else {
                        item = JSON.parse(JSON.stringify(avgItemModel));
                        item.label = label;
                        item.desc = desc;
                    }

                    item['player' + (idx + 1)] = (((((playerModel || {}).averages || {})['set-' + s] || {})['leg-' + l] || {}).begMidLeg || 0).toFixed(1);

                    if (existingIndex >= 0) {
                        averages[existingIndex] = item;
                    } else {
                        averages.push(item);
                    }
                }
            }
        }
    });

    return averages;
};

const getPlayersSectionHitsX01 = (game, sectionHits) => {
    game.players.map((playerId, idx) => {
        var hits = game.playerModels[playerId].hit || {};

        sectionHits.map((item) => {
            var singles = hits['S' + item.section] || 0;
            var doubles = hits['D' + item.section] || 0;
            var triples = hits['T' + item.section] || 0;

            item['player' + (idx + 1) + 'Hit'] = singles + doubles + triples;
            item['player' + (idx + 1) + 'S'] = singles;
            item['player' + (idx + 1) + 'D'] = doubles;
            item['player' + (idx + 1) + 'T'] = triples;
        });
    });

    return sectionHits;
};

const getPlayersScoreRangesX01 = (game, scoreRanges) => {
    game.players.map((playerId, idx) => {
        var ranges = (game.playerModels[playerId].scoreRanges || {}).game || {};

        scoreRanges.map((item) => {
            item['player' + (idx + 1) + 'Count'] = ranges[item.range] || 0;
        });
    });

    return scoreRanges;
};

const getPlayersCheckoutHitsX01 = (game) => {
    const checkoutHits = {};
    var excludes = ['total', 'miss', 'hit'];

    game.players.map((playerId, idx) => {
        var checkouts = [];
        var checkoutSections = (game.playerModels[playerId].checkout || {}).sections || {};

        Object.entries(checkoutSections).forEach(([key, value]) => {
            if (excludes.indexOf(key) === -1) {
                var checkoutItem = {};
                checkoutItem.section = key;
                checkoutItem.hit = value.hit;
                checkoutItem.miss = value.miss;
                checkoutItem.total = value.total;
                checkoutItem.rate = ((100 * value.hit) / value.total).toFixed(1);
                checkouts.push(checkoutItem);
            }
        });

        checkoutHits['player' + (idx + 1)] = checkouts;
    });

    return checkoutHits;
};
