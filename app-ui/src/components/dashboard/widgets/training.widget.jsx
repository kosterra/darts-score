import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Panel } from 'primereact/panel';
import { Button } from 'primereact/button';

import StatsService from '../../../services/stats.service';
import { useAuth } from '../../../utils/auth.context';
import { useMyPlayers, playerInClub } from '../../../utils/use.my.players';
import { Lines } from '../../elements/skeletons';
import { locale, t, tn } from '../../../utils/i18n';
import { formatTrainingTime } from '../../../utils/training.time';

const formatNumber = (value) => new Intl.NumberFormat(locale()).format(value ?? 0);
const oneDecimal = (value) => new Intl.NumberFormat(locale(), { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(value);
const doubleName = (section) => (section === 25 ? t('Bull') : `D${section}`);

/**
 * "Your training" on the dashboard: the user's own trainings in the club, the
 * X01 against the bot above all: the training average (and how far from the
 * one in games), the checkout rate, scoring and finishing, the double hit
 * best, 180s and visits of 100+, the averages of the last trainings, and how
 * regularly they train. Only for the user; nothing for someone who does not
 * play in the club.
 */
const TrainingWidget = ({ widget }) => {
    const navigate = useNavigate();
    const { activeClub, isGlobalAdmin } = useAuth();
    const player = playerInClub(useMyPlayers(!isGlobalAdmin), activeClub?.id);
    const [stats, setStats] = useState(null);

    useEffect(() => {
        if (!player?.id) return;
        StatsService.loadPlayerStats(player.id).then(setStats).catch(() => setStats({}));
    }, [player?.id]);

    if (!player) return null;

    const summary = stats?.trainingSummary;
    const bot = summary?.bot ?? {};
    const gameAverage = stats?.avg?.overallX01 ?? 0;
    const gap = bot.average != null && gameAverage > 0 ? Math.round((bot.average - gameAverage) * 10) / 10 : null;
    const best = Math.max(1, ...(bot.recent ?? []));

    const body = () => {
        if (!stats) return <Lines count={3} />;
        if (!summary?.total) {
            return <p className="m-0 text-subtle fs-7">{t('No trainings yet. Train X01 against the bot, Around the Clock or Bob\'s 27: your training figures show up here.')}</p>;
        }
        // trainings, but none against the bot: what there is, and what the bot would add
        if (!bot.count) {
            const atc = summary.atc;
            return (
                <>
                    <div className="me-widget-tiles">
                        <div className="me-widget-tile">
                            <span className="me-widget-label">{t('Trainings')}</span>
                            <span className="me-widget-value">{formatNumber(summary.total)}</span>
                        </div>
                        <div className="me-widget-tile">
                            <span className="me-widget-label">{t('In the last 30 days')}</span>
                            <span className="me-widget-value">{formatNumber(summary.last30Days)}</span>
                        </div>
                        {atc?.fastest &&
                            <div className="me-widget-tile">
                                <span className="me-widget-label">{t('Around the Clock')}</span>
                                <span className="me-widget-value">{formatTrainingTime(atc.fastest.timeMs)}</span>
                                <span className="text-faint fs-8">{t('fastest in {{mode}}', { mode: t(atc.fastest.mode) })}</span>
                            </div>}
                    </div>
                    <span className="text-subtle fs-8">{t('Train X01 against the bot for your training average and checkout rate, side by side with your games.')}</span>
                </>
            );
        }
        return (
            <>
                <div className="me-widget-tiles">
                    <div className="me-widget-tile">
                        <span className="me-widget-label">{t('Training average')}</span>
                        <span className="me-widget-value">{bot.average != null ? oneDecimal(bot.average) : '–'}</span>
                        {bot.bestAverage != null && <span className="text-faint fs-8">{t('Best {{value}}', { value: oneDecimal(bot.bestAverage) })}</span>}
                    </div>
                    <div className="me-widget-tile">
                        <span className="me-widget-label">{t('Against games')}</span>
                        <span className={`me-widget-value training-widget-gap${gap > 0 ? ' is-up' : ''}`}>{gap != null ? `${gap > 0 ? '+' : ''}${oneDecimal(gap)}` : '–'}</span>
                        {gameAverage > 0 && <span className="text-faint fs-8">{t('Games {{value}}', { value: oneDecimal(gameAverage) })}</span>}
                    </div>
                    <div className="me-widget-tile">
                        <span className="me-widget-label">{t('Checkout rate')}</span>
                        <span className="me-widget-value">{bot.checkout?.rate != null ? `${oneDecimal(bot.checkout.rate)} %` : '–'}</span>
                        {bot.checkout?.total > 0 && <span className="text-faint fs-8">{t('{{hit}} of {{total}}', { hit: formatNumber(bot.checkout.hit), total: formatNumber(bot.checkout.total) })}</span>}
                    </div>
                </div>

                {bot.finished > 0 &&
                    <dl className="me-widget-figures">
                        <div><dt>{t('Scoring average')}</dt><dd>{bot.scoring != null ? oneDecimal(bot.scoring) : '–'}</dd></div>
                        <div><dt>{t('Finishing average')}</dt><dd>{bot.finishing != null ? oneDecimal(bot.finishing) : '–'}</dd></div>
                        <div>
                            <dt>{t('Best double')}</dt>
                            <dd>{bot.bestDouble ? `${doubleName(bot.bestDouble.section)} · ${oneDecimal(bot.bestDouble.rate)} %` : '–'}</dd>
                        </div>
                        <div><dt>{t('Highest checkout')}</dt><dd>{bot.highestCheckout ?? '–'}</dd></div>
                        <div><dt>{t('180s')}</dt><dd>{formatNumber(bot.oneEighties)}</dd></div>
                        <div><dt>{t('Visits of 100+')}</dt><dd>{formatNumber(bot.tonPlus)}</dd></div>
                    </dl>}

                {bot.recent?.length > 1 &&
                    <div className="d-flex flex-column gap-1">
                        <span className="me-widget-label">{tn(bot.recent.length, 'Average of the last training', 'Average of the last {{count}} trainings')}</span>
                        <span className="training-widget-bars" role="img" aria-label={t('Average of the last trainings: {{values}}', { values: bot.recent.map(oneDecimal).join(', ') })}>
                            {bot.recent.map((value, index) => <span key={index} title={oneDecimal(value)} style={{ height: `${Math.max(8, (value / best) * 100)}%` }} />)}
                        </span>
                    </div>}

                <span className="text-subtle fs-8">
                    {tn(summary.last30Days, '{{count}} training in the last 30 days', '{{count}} trainings in the last 30 days')}
                    {summary.streak > 1 && ` · ${t('{{count}} days in a row', { count: summary.streak })}`}
                </span>
            </>
        );
    };

    return (
        <Panel header={widget.title} className="h-100">
            <div className="me-widget">
                {body()}
                <Button type="button" label={t('Train')} icon="pi pi-bullseye" size="small" severity="secondary" className="align-self-start mt-auto" onClick={() => navigate('/training')} />
            </div>
        </Panel>
    );
};

export default TrainingWidget;
