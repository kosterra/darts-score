import logger from '../models/logger.model.js';
import db from '../models/db.model.js';
import dayjs from 'dayjs';
import { createGameFilterQuery, findFilteredGames } from '../utils/game.utils.js';
import { averageTrend, scoringVsFinishing, dartsPerLegDistribution, DARTS_PER_LEG_BUCKETS, threeDartAverage } from '../utils/chart.data.js';
import { playersX01StatsModel, checkoutItemModel, avgItemModel } from '../models/players.x01.stats.models.js';
import { viewOf } from '../utils/game.view.js';

const X01 = db.x01;

export const getPlayersX01Stats = async (req, res, next) => {
    logger.debug("load x01 statistics for multiple players!");
    try {
        // the comparison always stays within the selected club
        const x01PlayersStats = await calculateX01PlayersStats({ ...req.body, club: req.club._id });
        res.send(x01PlayersStats);
    } catch (err) {
        logger.error(err, 'Failed to calculate players x01 stats');
        next(err);
    }
};

async function calculateX01PlayersStats(body) {
    logger.debug('calculate x01 players stats called')
    const playersX01Stats = JSON.parse(JSON.stringify(playersX01StatsModel))

    const x01Games = await findX01Games(body)

    playersX01Stats.playedGames = x01Games.length

    body.playerIds.map((playerId, idx) => {
        const wonGamesX01 = x01Games.filter(game => game.playerModels[playerId].hasWonGame === true).length

        playersX01Stats.wonGames['player' + (idx + 1)] = wonGamesX01

        playersX01Stats.avg.overall['player' + (idx + 1)] = calculateOverallX01Avg(x01Games, playerId)
        playersX01Stats.avg.dartsPerLeg['player' + (idx + 1)] = calculateDartsPerLegX01Avg(x01Games, playerId)
        playersX01Stats.avg.perGame['player' + (idx + 1)] = calculatePerGameX01Avg(x01Games, playerId)

        playersX01Stats.throwedDarts['player' + (idx + 1)] = getTotalDartsThrownX01(x01Games, playerId)
        playersX01Stats.throwedPoints['player' + (idx + 1)] = getTotalPointsThrownX01(x01Games, playerId)

        playersX01Stats.num180s['player' + (idx + 1)] = getNumberOf180sX01(x01Games, playerId)
        playersX01Stats.num160plus['player' + (idx + 1)] = getNumberOf160plusX01(x01Games, playerId)
        playersX01Stats.num140plus['player' + (idx + 1)] = getNumberOf140plusX01(x01Games, playerId)

        playersX01Stats.checkouts.hit['player' + (idx + 1)] = getCheckoutHitX01(x01Games, playerId)
        playersX01Stats.checkouts.total['player' + (idx + 1)] = getCheckoutTotalX01(x01Games, playerId)
        playersX01Stats.checkouts.highest['player' + (idx + 1)] = getHighestCheckoutX01(x01Games, playerId)
    })

    playersX01Stats.checkouts.rates = getPlayersCheckoutRatesX01(x01Games, body.playerIds)
    playersX01Stats.avg.perGame = getPlayersAveragesPerGameX01(x01Games, body.playerIds)
    playersX01Stats.scoreRanges = getPlayersScoreRangesX01(x01Games, playersX01Stats.scoreRanges, body.playerIds)
    playersX01Stats.sectionHits = getPlayersSectionHitsX01(x01Games, playersX01Stats.sectionHits, body.playerIds)

    // per player: phase averages, darts per won 501 leg, and the average of every game with its date
    playersX01Stats.scoring = {}
    body.playerIds.forEach((playerId, idx) => {
        playersX01Stats.scoring['player' + (idx + 1)] = scoringVsFinishing(x01Games, playerId)
    })
    playersX01Stats.dartsPerLeg = DARTS_PER_LEG_BUCKETS.map((bucket, index) => {
        const entry = { bucket: bucket.label }
        body.playerIds.forEach((playerId, idx) => {
            entry['player' + (idx + 1)] = dartsPerLegDistribution(x01Games, playerId)[index].count
        })
        return entry
    })
    const trends = body.playerIds.map(playerId => new Map(averageTrend(x01Games, playerId).map(entry => [entry.gameId, entry])))
    playersX01Stats.trend = [...x01Games]
        .sort((a, b) => new Date(a.updatedAt) - new Date(b.updatedAt))
        .map(game => {
            const entry = { gameId: String(game._id), date: game.updatedAt }
            trends.forEach((trend, idx) => { entry['player' + (idx + 1)] = trend.get(String(game._id))?.average ?? null })
            return entry
        })

    return playersX01Stats
}

async function findX01Games(body) {
    logger.debug('find x01 games by filter body');
    const query = { ...createGameFilterQuery(body), club: body.club }

    let x01Games = await findFilteredGames(X01, query, body)
        .then(data => {
            return data;
        })
        .catch(err => {
            logger.error('Failed to find x01 games. ' + err);
        });

    return x01Games;
}

// the real 3-dart average over all visits (not only the scoring part of the legs)
const calculateOverallX01Avg = (x01Games, playerId) => threeDartAverage(x01Games, playerId);

// the 3-dart average of each of the last ten games
const calculatePerGameX01Avg = (x01Games, playerId) => x01Games
    .map((game, idx) => {
        const average = game.playerModels[playerId]?.averages?.game?.overall ?? 0;
        if (!average) return null;
        return {
            label: idx + 1,
            value: Math.round(average * 10) / 10,
            desc: game.startingScore + ' (' + dayjs(game.createdAt).format("DD.MM.YYYY") + ')'
        };
    })
    .filter(stat => stat !== null)
    .slice(-10);

const calculateDartsPerLegX01Avg = (x01Games, playerId) => {
    const legsPlayed = getTotalLegsPlayedX01(x01Games);
    const totalDarts = getTotalDartsThrownX01(x01Games, playerId);

    return Math.round(totalDarts / legsPlayed, 2);
}

// the legs and sets played follow from the visits
const getTotalLegsPlayedX01 = (x01Games) => {
    return x01Games.map(stored => viewOf('x01', stored)).map(game => {
        if ((game.legsPlayed || 0) === 0) {
            return null;
        }
        return game.legsPlayed || 0;
    }).filter(stat => stat !== null).reduce((accumulator, value) => {
        return accumulator + value;
    }, 0);
}

const getTotalDartsThrownX01 = (x01Games, playerId) => {
    return x01Games.map(game => {
        if (((((game.playerModels[playerId] || {}).totalThrow || {}).game || {}).darts || 0) === 0) {
            return null;
        }
        return ((((game.playerModels[playerId] || {}).totalThrow || {}).game || {}).darts || 0);
    }).filter(stat => stat !== null).reduce((accumulator, value) => {
        return accumulator + value;
    }, 0);
}

const getTotalPointsThrownX01 = (x01Games, playerId) => {
    return x01Games.map(stored => viewOf('x01', stored)).map(game => {
        for (let i = 1; i <= game.setsPlayed || 0; i++) {
            for (let x = 1; x <= game.legsPlayed || 0; x++) {
                const rounds = (((game.allSetsThrows || {})['set-' + i] || {})['leg-' + x] || {});
                return rounds.map(round => {
                    if (round.playerId !== playerId) {
                        return null;
                    }
                    return round.roundScore;
                }).filter(stat => stat !== null).reduce((accumulator, value) => {
                    return accumulator + value;
                }, 0);
            }
        }
    }).filter(stat => stat !== null).reduce((accumulator, value) => {
        return accumulator + value;
    }, 0);
}

const getNumberOf180sX01 = (x01Games, playerId) => {
    return x01Games.map(game => {
        if (((((game.playerModels[playerId] || {}).scoreRanges || {}).game || {})['180'] || 0) === 0) {
            return null;
        }
        return ((((game.playerModels[playerId] || {}).scoreRanges || {}).game || {})['180'] || 0);
    }).filter(stat => stat !== null).reduce((accumulator, value) => {
        return accumulator + value;
    }, 0);
}

const getNumberOf160plusX01 = (x01Games, playerId) => {
    return x01Games.map(game => {
        if (((((game.playerModels[playerId] || {}).scoreRanges || {}).game || {})['160-179'] || 0) === 0) {
            return null;
        }
        return ((((game.playerModels[playerId] || {}).scoreRanges || {}).game || {})['160-179'] || 0);
    }).filter(stat => stat !== null).reduce((accumulator, value) => {
        return accumulator + value;
    }, 0);
}

const getNumberOf140plusX01 = (x01Games, playerId) => {
    return x01Games.map(game => {
        if (((((game.playerModels[playerId] || {}).scoreRanges || {}).game || {})['140-159'] || 0) === 0) {
            return null;
        }
        return ((((game.playerModels[playerId] || {}).scoreRanges || {}).game || {})['140-159'] || 0);
    }).filter(stat => stat !== null).reduce((accumulator, value) => {
        return accumulator + value;
    }, 0);
}

const getCheckoutHitX01 = (x01Games, playerId) => {
    return x01Games.map(game => {
        if (((((game.playerModels[playerId] || {}).checkout || {}).game || {}).hit || 0) === 0) {
            return null;
        }
        return ((((game.playerModels[playerId] || {}).checkout || {}).game || {}).hit || 0);
    }).filter(stat => stat !== null).reduce((accumulator, value) => {
        return accumulator + value;
    }, 0);
}

const getCheckoutTotalX01 = (x01Games, playerId) => {
    return x01Games.map(game => {
        if (((((game.playerModels[playerId] || {}).checkout || {}).game || {}).total || 0) === 0) {
            return null;
        }
        return ((((game.playerModels[playerId] || {}).checkout || {}).game || {}).total || 0);
    }).filter(stat => stat !== null).reduce((accumulator, value) => {
        return accumulator + value;
    }, 0);
}

const getHighestCheckoutX01 = (x01Games, playerId) => {
    let highestCheckout = 0;

    x01Games.map(game => {
        Object.keys(((game.playerModels[playerId] || {}).checkoutScores || {}).game || {}).map(key => {
            if (Number(key) > highestCheckout) {
                highestCheckout = Number(key);
            }
        })
    });

    return highestCheckout;
}

const getPlayersAveragesPerGameX01 = (x01Games, playerIds) => {
    let averages = [];
    x01Games.map((game, gameIdx) => {
        var item = {};
        var label = gameIdx + 1;
        var desc = game.startingScore + ' (' + dayjs(game.createdAt).format("DD.MM.YYYY") + ')';
        const existingIndex = averages.findIndex(item => item.label === label);

        if (existingIndex >= 0) {
            item = averages[existingIndex];
        } else {
            item = JSON.parse(JSON.stringify(avgItemModel));
            item.label = label;
            item.desc = desc;
        }

        playerIds.map((playerId, playerIdx) => {
            var playerModel = game.playerModels[playerId];

            if (((playerModel || {}).averages || {}).game || {}) {
                item['player' + (playerIdx + 1)] = (playerModel?.averages?.game?.overall || 0).toFixed(1);
            }
        })

        if (existingIndex >= 0) {
            averages[existingIndex] = item;
        } else {
            averages.push(item);
        }
    })

    return averages;
}

const getPlayersCheckoutRatesX01 = (x01Games, playerIds) => {
    const checkoutHits = {};
    var excludes = ['total', 'miss', 'hit'];

    playerIds.map((playerId, idx) => {
        var checkouts = [];

        x01Games.map(game => {
            var checkoutSections = (game.playerModels[playerId].checkout || {}).sections || {}

            Object.entries(checkoutSections).forEach(([key, value]) => {
                if (excludes.indexOf(key) === -1) {
                    const existingIndex = checkouts.findIndex(item => item.section === key);
                    var checkoutItem = {};

                    if (existingIndex >= 0) {
                        checkoutItem = checkouts[existingIndex];
                        checkoutItem.hit += value.hit;
                        checkoutItem.miss += value.miss;
                        checkoutItem.total += value.total;
                        checkoutItem.rate = ((100 * checkoutItem.hit) / checkoutItem.total).toFixed(1);
                        checkouts[existingIndex] = checkoutItem;
                    } else {
                        checkoutItem = JSON.parse(JSON.stringify(checkoutItemModel));
                        checkoutItem.section = key;
                        checkoutItem.hit = value.hit;
                        checkoutItem.miss = value.miss;
                        checkoutItem.total = value.total;
                        checkoutItem.rate = ((100 * value.hit) / value.total).toFixed(1);
                        checkouts.push(checkoutItem);
                    }
                }
            });
        });

        checkoutHits['player' + (idx + 1)] = checkouts;
    })

    return checkoutHits;
}

const getPlayersScoreRangesX01 = (x01Games, scoreRanges, playerIds) => {
    playerIds.map((playerId, idx) => {
        x01Games.map(game => {
            var ranges = (game.playerModels[playerId].scoreRanges || {}).game || {};

            scoreRanges.map((item) => {
                if (!item['player' + (idx + 1) + 'Count']) {
                    item['player' + (idx + 1) + 'Count'] = 0;
                }
                item['player' + (idx + 1) + 'Count'] += ranges[item.range] || 0;
            })
        })
    })

    return scoreRanges;
}

const getPlayersSectionHitsX01 = (x01Games, sectionHits, playerIds) => {
    playerIds.map((playerId, idx) => {
        x01Games.map(game => {
            var hits = game.playerModels[playerId].hit || {};

            sectionHits.map((item) => {
                var singles = hits['S' + item.section] || 0;
                var doubles = hits['D' + item.section] || 0;
                var triples = hits['T' + item.section] || 0;

                if (!item['player' + (idx + 1) + 'Hit']) {
                    item['player' + (idx + 1) + 'Hit'] = 0;
                }
                item['player' + (idx + 1) + 'Hit'] += singles + doubles + triples;

                if (!item['player' + (idx + 1) + 'S']) {
                    item['player' + (idx + 1) + 'S'] = 0;
                }
                item['player' + (idx + 1) + 'S'] += singles;

                if (!item['player' + (idx + 1) + 'D']) {
                    item['player' + (idx + 1) + 'D'] = 0;
                }
                item['player' + (idx + 1) + 'D'] += doubles;

                if (!item['player' + (idx + 1) + 'T']) {
                    item['player' + (idx + 1) + 'T'] = 0;
                }
                item['player' + (idx + 1) + 'T'] += triples;
            })
        })
    })

    return sectionHits;
}
