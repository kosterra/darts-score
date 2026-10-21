import { useContext } from 'react';

import X01Context from '../../../utils/x01.context';
import { outModeOf } from '../../../utils/x01.rules';
import { checkoutRoutes, formatRoute, scoringTip, setupSuggestions } from '../../../utils/checkout.routes';
import { t } from '../../../utils/i18n';

// the usual way and this many others: nobody looks through hundreds
const OTHER_WAYS = 4;

// a plan of darts and what it leaves for the next visit
const Plan = ({ darts, leaves, note, preferred }) => (
    <div className="x01-ways-setup">
        <span className={`x01-ways-route ${preferred ? 'is-preferred' : ''}`}>{formatRoute(darts)}</span>
        <span className="x01-route-leaves text-subtle fs-8"><i className="pi pi-arrow-right" aria-hidden="true" />{t('leaves')}{' '}<strong className="text-default">{leaves}</strong>{note ? `, ${note}` : ''}</span>
    </div>
);

/**
 * How the player at the oche gets out: the usual way with the darts left in the
 * visit and a few others; without a finish what to set up, or what to score to
 * leave a finish for the next visit, as is common practice.
 */
// why the ways are in this order: the player's own doubles or treble, set or learned
const ProfileNote = ({ profile, about }) => {
    if (!profile) return null;
    if (about === 'double') {
        if (profile.doubleSource === 'set') return <span className="x01-ways-note">{t('Your favourite double first:')}{' '}{profile.favouriteDouble}{' '}{t('(set in the player profile).')}</span>;
        if (profile.doubleSource === 'history') {
            const best = profile.doubles[0];
            return <span className="x01-ways-note">{t('Your best doubles first: {{double}} hit {{rate}} % of {{total}} darts in your games.', { double: best.double, rate: best.rate, total: best.total })}</span>;
        }
        return null;
    }
    if (profile.trebleSource === 'set') return <span className="x01-ways-note">{t('Your main treble:')}{' '}{profile.mainTreble}{' '}{t('(set in the player profile).')}</span>;
    if (profile.trebleSource === 'history') return <span className="x01-ways-note">{t('Your main treble from your games:')}{' '}{profile.mainTreble}.</span>;
    return null;
};

const X01WaysOut = () => {
    const { game, checkoutProfiles = {}, getCurrentThrowScore, checkIfScoreIsBusted } = useContext(X01Context);
    const playerId = game.currentPlayerTurn;
    const score = game.playerModels[playerId].score - getCurrentThrowScore();
    const dartsLeft = 3 - game.currentThrow.filter(dart => dart.trim() !== '').length;
    const outMode = outModeOf(game, playerId);
    // the player's own doubles and main treble, set or learned from their games
    const profile = checkoutProfiles[playerId];
    const own = { doubles: profile?.doubleOrder ?? [], mainTreble: profile?.mainTreble };

    if (checkIfScoreIsBusted(score)) return <p className="text-subtle fs-8 m-0">{t('Bust: the score stays as it was.')}</p>;

    if (dartsLeft === 0) {
        const next = checkoutRoutes(score, { outMode, ...own })[0];
        return (
            <div className="x01-ways">
                <p className="text-subtle fs-8 m-0">{t('All three darts are in: Enter score finishes the visit')}{score === 0 ? t(' and the leg') : ''}.</p>
                {next &&
                    <div className="x01-ways-group">
                        <span className="x01-ways-label">{t('Next visit')}</span>
                        <div className="x01-ways-setup"><span className="x01-ways-route is-preferred">{formatRoute(next)}</span></div>
                    </div>
                }
            </div>
        );
    }

    const routes = checkoutRoutes(score, { dartsLeft, outMode, ...own });
    if (routes.length) {
        const others = routes.slice(1, 1 + OTHER_WAYS);
        return (
            <div className="x01-ways">
                <div className="x01-ways-group">
                    <span className="x01-ways-label">{t('Usual way')}</span>
                    <div className="x01-ways-setup"><span className="x01-ways-route is-preferred">{formatRoute(routes[0])}</span></div>
                </div>
                {others.length > 0 &&
                    <div className="x01-ways-group">
                        <span className="x01-ways-label">{t('Other ways')}</span>
                        <div className="x01-ways-list">
                            {others.map(route => <span key={route.join()} className="x01-ways-route">{formatRoute(route)}</span>)}
                        </div>
                    </div>
                }
                <ProfileNote profile={profile} about="double" />
            </div>
        );
    }

    const setups = setupSuggestions(score, { dartsLeft, outMode, ...own });
    const tip = setups.length ? null : scoringTip(score, { dartsLeft, outMode, ...own });
    // too far for a plan: the treble to stay on, and the one to switch to when it is blocked
    const main = own.mainTreble === 'T19' || own.mainTreble === 'T18' ? own.mainTreble : 'T20';
    const other = main === 'T20' ? 'T19' : 'T20';
    const status = score > 170
        ? t('{{score}} left: no finish in one visit (170 is the highest).', { score: score })
        : outMode === 'Double Out'
            ? (dartsLeft === 1 ? t('No finish for {{score}} with 1 dart and a double.', { score }) : t('No finish for {{score}} with {{darts}} darts and a double.', { score, darts: dartsLeft }))
            : (dartsLeft === 1 ? t('No finish for {{score}} with 1 dart.', { score }) : t('No finish for {{score}} with {{darts}} darts.', { score, darts: dartsLeft }));
    // like the ways out: a label, the darts as chips, and short notes below
    return (
        <div className="x01-ways">
            {setups.length > 0 &&
                <div className="x01-ways-group">
                    <span className="x01-ways-label">{t('Set up instead')}</span>
                    {setups.map((setup, index) => <Plan key={setup.darts.join()} {...setup} preferred={index === 0} />)}
                </div>
            }
            {tip?.darts &&
                <div className="x01-ways-group">
                    <span className="x01-ways-label">{t('Score')}</span>
                    <Plan darts={tip.darts} leaves={tip.leaves} preferred />
                </div>
            }
            {tip && !tip.darts &&
                <div className="x01-ways-group">
                    <span className="x01-ways-label">{t('Aim at')}</span>
                    <div className="x01-ways-setup">
                        <span className="x01-ways-route is-preferred">{main}</span>
                        <span className="x01-ways-route">{other}</span>
                        <span className="text-subtle fs-8">{t('if the')}{' '}{main.slice(1)}{' '}{t('is blocked')}</span>
                    </div>
                </div>
            }
            <div className="d-flex flex-column gap-1">
                <span className="x01-ways-note">{status}{tip?.darts ? (tip.advice ? ` ${tip.advice}` : t(' This leaves a finish for the next visit.')) : ''}</span>
                <ProfileNote profile={profile} about={setups.length ? 'double' : 'treble'} />
            </div>
        </div>
    );
};

export default X01WaysOut;
