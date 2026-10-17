import logger from '../models/logger.model.js';
import db from '../models/db.model.js';
import dayjs from 'dayjs';
import { playerStatsModel, checkoutItemModel } from '../models/player.stats.models.js';
import { averageTrend, monthlyForm, scoringVsFinishing, dartsPerLegDistribution, trainingProgress, threeDartAverage } from '../utils/chart.data.js';
import { x01Kpis, cricketKpis, eliminationKpis } from '../utils/kpi.data.js';
import { playerLevel, levelInputs } from '../utils/levels.js';
import { createGameFilterQuery, findFilteredGames, profileFiltersOf, isUnfiltered } from '../utils/game.utils.js';

const X01 = db.x01;
const Cricket = db.cricket;

/**
 * A player's statistics for their profile, filtered like the comparison: all
 * their clubs or only the selected one (?scope=club), a period, the last N
 * games and for X01 the starting score and format. The level always counts
 * everything, like badges: it belongs to the person.
 */
export const getPlayerStats = async (req, res, next) => {
    logger.debug("statistics get player stats called!");
    try {
        const playerStats = await calculatePlayerStats(req.params.id, profileFiltersOf(req.query), req.club._id);
        res.send(playerStats);
    } catch (err) {
        logger.error(err, 'Failed to calculate player stats');
        next(err);
    }
};

/**
 * The finished games of a player that match the filters, per game type.
 * Starting score and format only concern X01.
 */
const findPlayerGames = async (playerId, filters, clubId) => {
    const inScope = filters.scope === 'club' ? { club: clubId } : {};
    const forPlayer = { ...filters, playerIds: [playerId], includeOthers: true };
    const x01Query = { ...createGameFilterQuery(forPlayer), ...inScope };
    const otherQuery = { ...createGameFilterQuery({ ...forPlayer, startingScore: undefined, format: undefined }), ...inScope };
    const [x01Games, cricketGames, eliminationGames] = await Promise.all([
        findFilteredGames(X01, x01Query, filters),
        findFilteredGames(Cricket, otherQuery, filters),
        findFilteredGames(db.elimination, otherQuery, filters, true),
    ]);
    // oldest first, as the charts expect
    const chronological = (games) => [...games].sort((a, b) => a.createdAt - b.createdAt);
    return {
        x01Games: chronological(x01Games),
        cricketGames: chronological(cricketGames),
        eliminationGames: chronological(eliminationGames),
        trainingQuery: { 'player.id': playerId, ...inScope, ...(otherQuery.createdAt && { createdAt: otherQuery.createdAt }) },
    };
};

// the X01 formats a player has played, for the format filter
const formatsOf = (games) => {
    const unique = new Map();
    games.forEach(({ setMode, numberOfSets, legMode, numberOfLegs }) => {
        const key = `${setMode}|${numberOfSets}|${legMode}|${numberOfLegs}`;
        if (setMode && legMode && !unique.has(key)) unique.set(key, { setMode, numberOfSets, legMode, numberOfLegs });
    });
    return [...unique.values()];
};

async function calculatePlayerStats(playerId, filters = profileFiltersOf(), clubId = null) {
    logger.debug('calculate player stats called');
    const playerStats = JSON.parse(JSON.stringify(playerStatsModel));
    playerStats.playerId = playerId;

    const filtered = await findPlayerGames(playerId, filters, clubId);
    const { x01Games, cricketGames, eliminationGames, trainingQuery } = filtered;

    // the whole history in all clubs, for the level
    const everything = isUnfiltered(filters) ? filtered : await findPlayerGames(playerId, profileFiltersOf(), clubId);
    // the formats to choose from: every one played in the chosen clubs
    const onlyClubChosen = isUnfiltered({ ...filters, scope: 'all' });
    const inScope = filters.scope === 'all' ? everything
        : onlyClubChosen ? filtered
        : await findPlayerGames(playerId, { ...profileFiltersOf(), scope: 'club' }, clubId);
    playerStats.filterOptions = { formats: formatsOf(inScope.x01Games) };

    playerStats.playedGames.x01 = x01Games.length;
    playerStats.playedGames.cricket = cricketGames.length;
    playerStats.playedGames.elimination = eliminationGames.length;
    playerStats.playedGames.total = x01Games.length + cricketGames.length + eliminationGames.length;

    const wonGamesX01 = x01Games.filter(game => game.playerModels[playerId].hasWonGame === true).length;
    const wonGamesCricket = cricketGames.filter(game => game.playerModels[playerId].hasWonGame === true).length;
    const wonGamesElimination = eliminationGames.filter(game => game.playerModels?.[playerId]?.hasWonGame === true).length;

    playerStats.wonGames.x01 = wonGamesX01;
    playerStats.wonGames.cricket = wonGamesCricket;
    playerStats.wonGames.elimination = wonGamesElimination;
    playerStats.wonGames.total = wonGamesX01 + wonGamesCricket + wonGamesElimination;

    // the player's level, from games, wins, badges and skill
    const player = await db.player.findById(playerId, 'badges').lean();
    playerStats.level = playerLevel(levelInputs({
        ...everything, playerId, badgeCount: player?.badges?.length ?? 0,
    }));

    // key figures per game type for the statistics page
    playerStats.kpis = {
        x01: x01Kpis(x01Games, playerId),
        cricket: cricketKpis(cricketGames, playerId),
        elimination: eliminationKpis(eliminationGames, playerId),
    };

    playerStats.avg.overallX01 = calculateOverallX01Avg(x01Games, playerId);
    playerStats.avg.perGameX01 = calculatePerGameX01Avg(x01Games, playerId);
    playerStats.avg.dartsPerLegX01 = calculateDartsPerLegX01Avg(x01Games, playerId);

    playerStats.throwedDarts.x01 = getTotalDartsThrownX01(x01Games, playerId);
    playerStats.throwedPoints.x01 = getTotalPointsThrownX01(x01Games, playerId);

    playerStats.num180s = getNumberOf180sX01(x01Games, playerId);
    // each count is its own range, like the 180s: 160+ means 160–179
    playerStats.num160plus = getNumberOfVisitsInRange(x01Games, playerId, '160-179');
    playerStats.num120plus = getNumberOfVisitsInRange(x01Games, playerId, '120-139');
    playerStats.num100plus = getNumberOfVisitsInRange(x01Games, playerId, '100-119');
    playerStats.num140plus = getNumberOf140plusX01(x01Games, playerId);

    playerStats.checkouts.hit = getCheckoutHitX01(x01Games, playerId);
    playerStats.checkouts.total = getCheckoutTotalX01(x01Games, playerId);
    playerStats.checkouts.highest = getHighestCheckoutX01(x01Games, playerId);
    playerStats.checkouts.rates = getCheckoutRatesX01(x01Games, playerId);

    playerStats.scoreRanges = getScoreRangesX01(x01Games, playerId);

    playerStats.sectionHits = getSectionHitsX01(x01Games, playerId, playerStats.sectionHits);

    // data for the trend, form, phase, darts-per-leg and training charts
    playerStats.trend = averageTrend(x01Games, playerId);
    playerStats.form = monthlyForm([
        ...x01Games.map(game => ({ type: 'x01', game })),
        ...cricketGames.map(game => ({ type: 'cricket', game })),
    ], playerId);
    playerStats.scoring = scoringVsFinishing(x01Games, playerId);
    playerStats.dartsPerLeg = dartsPerLegDistribution(x01Games, playerId);
    playerStats.training = trainingProgress(await db.atc.find(trainingQuery).sort({ createdAt: 1 }).lean());

    return playerStats;
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

const getTotalLegsPlayedX01 = (x01Games) => {
    return x01Games.map(game => {
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
    return x01Games.map(game => {
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

// visits in one score range, e.g. '160-179'
const getNumberOfVisitsInRange = (x01Games, playerId, range) => x01Games
    .reduce((sum, game) => sum + (game.playerModels[playerId]?.scoreRanges?.game?.[range] || 0), 0);

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

const getCheckoutRatesX01 = (x01Games, playerId) => {
    let checkoutRates = [];
    var excludes = ['total', 'miss', 'hit'];

    x01Games.map(game => {
        Object.keys(((game.playerModels[playerId] || {}).checkout || {}).sections || {}).map(key => {
            if (excludes.indexOf(key) === -1) {
                var gameItem = (((game.playerModels[playerId] || {}).checkout || {}).sections || {})[key] || 0;
                var item = JSON.parse(JSON.stringify(checkoutItemModel));
                item.section = key.toString();

                const existingIndex = checkoutRates.findIndex(item => item.section === key);

                if (existingIndex >= 0) {
                    item = checkoutRates[existingIndex];
                }

                item.hit = item.hit + gameItem.hit;
                item.miss = item.miss + gameItem.miss;
                item.total = item.hit + item.miss;
                item.rate = Math.round((100 * item.hit) / item.total, 0);

                if (existingIndex >= 0) {
                    checkoutRates[existingIndex] = item;
                } else {
                    checkoutRates.push(item);
                }
            }
        })
    });

    return checkoutRates;
}

const getScoreRangesX01 = (x01Games, playerId) => {
    let scoreRanges = [];

    x01Games.map(game => {
        Object.keys(((game.playerModels[playerId] || {}).scoreRanges || {}).game || {}).map(key => {
            if (key !== 'Busted') {
                var item = {};
                const existingIndex = scoreRanges.findIndex(item => item.range === key);

                if (existingIndex >= 0) {
                    item = scoreRanges[existingIndex];
                }

                item.range = key;
                item.count = (item.count ? item.count : 0) + (((game.playerModels[playerId] || {}).scoreRanges || {}).game || {})[key];

                if (existingIndex >= 0) {
                    scoreRanges[existingIndex] = item;
                } else {
                    scoreRanges.push(item);
                }
            }
        })
    });

    scoreRanges.sort(function (a, b) {
        if (a.range === 'ZERO') {
            return -1;
        } else {
            var aValue = a.range.substring(0, a.range.indexOf('-') >= 0 ? a.range.indexOf('-') : a.range.length);
            var bValue = b.range.substring(0, b.range.indexOf('-') >= 0 ? b.range.indexOf('-') : b.range.length);
            return Number(aValue) - Number(bValue);
        }
    });

    return scoreRanges;
}

const getSectionHitsX01 = (x01Games, playerId, sectionHits) => {
    x01Games.map(game => {
        Object.keys((game.playerModels[playerId] || {}).hit || {}).map(key => {
            let field = key[0];
            let section = key.slice(1);
            let hitCount = ((game.playerModels[playerId] || {}).hit || {})[key] || 0;
            var item = sectionHits.find(item => item.section === section);

            if (item) {
                item.hit = item.hit + hitCount;

                if (field === 'S') item.S = item.S + hitCount;
                if (field === 'D') item.D = item.D + hitCount;
                if (field === 'T') item.T = item.T + hitCount;

                var index = sectionHits.findIndex(item => item.section == section);
                sectionHits[index] = item;
            }
        })
    });

    return sectionHits;
}
