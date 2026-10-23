import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Panel } from 'primereact/panel';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { InputTextarea } from 'primereact/inputtextarea';
import { SelectButton } from 'primereact/selectbutton';
import { Avatar } from 'primereact/avatar';
import { Toast } from 'primereact/toast';

import IntegrityService, { announceFairPlayChange } from '../../services/integrity.service';
import ClubLogo from '../elements/club.logo';
import { ClubFilter } from '../admin/club.filter';
import PageLoader from '../elements/page.loader';
import DeletePopup from '../elements/delete.popup';
import FairPlayDetails from './fair.play.details';
import { LEVEL_LABELS, listOf } from './fair.play.lists';
import { useAuth } from '../../utils/auth.context';
import { resolvePlayerImg, resolvePlayerInitials } from '../../utils/image.utils';
import { t, tn } from '../../utils/i18n';
import { formatDate } from '../../utils/dates';

/**
 * Asks why an entry is marked: as fine (a false alarm; needed for what the
 * rules call impossible) or kept on the watch list.
 */
const ReviewDialog = ({ review, onCancel, onSave }) => {
    const [reason, setReason] = useState('');
    useEffect(() => setReason(''), [review]);
    if (!review) return null;
    const { entry, status } = review;
    const needed = status === 'ok' && entry.level === 'impossible';
    const header = status === 'watch' ? t('Keep on the watch list') : entry.level === 'suspicious' ? t('Looks fine') : t('False alarm');

    return (
        <Dialog header={header} visible onHide={onCancel} draggable={false} blockScroll style={{ width: 'min(32rem, calc(100vw - 2rem))' }}>
            <p className="text-subtle fs-7 mt-0">
                {status === 'watch'
                    ? t('It stays on the watch list, to be looked at again.')
                    : t('It goes to "Looks fine" and stays as it is. Who marked it and why stays visible for the other admins.')}
            </p>
            <label htmlFor="fair-play-reason" className="text-default fs-7 fw-semibold d-block mb-2">
                {t('Why')}{needed ? '' : t(' (optional)')}
            </label>
            <InputTextarea
                id="fair-play-reason"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                rows={3}
                maxLength={300}
                autoResize
                className="w-100"
                placeholder={needed ? t('e.g. the score was corrected with undo during the game') : ''}
            />
            <div className="d-flex justify-content-end gap-2 mt-3">
                <Button type="button" label={t('Cancel')} size="small" severity="secondary" onClick={onCancel} />
                <Button type="button" label={t('Save')} size="small" disabled={needed && !reason.trim()} onClick={() => onSave(entry, status, reason.trim())} />
            </div>
        </Dialog>
    );
};

// what a repair does, before it is done
const RepairDialog = ({ entry, onCancel, onRepair }) => entry && (
    <Dialog header={t('Repair the game')} visible onHide={onCancel} draggable={false} blockScroll style={{ width: 'min(32rem, calc(100vw - 2rem))' }}>
        <p className="text-subtle fs-7 mt-0">
            {t('The scores left of')}{' '}{entry.summary}{' '}{t('are worked out again from the darts thrown. The darts, who won each leg and the statistics stay as they are; the badges are worked out again. The players and the club admins are told.')}
        </p>
        <div className="d-flex justify-content-end gap-2 mt-3">
            <Button type="button" label={t('Cancel')} size="small" severity="secondary" onClick={onCancel} />
            <Button type="button" label={t('Repair')} icon="pi pi-wrench" size="small" onClick={() => onRepair(entry)} />
        </div>
    </Dialog>
);

// putting back the date of birth of a player who made themselves younger
const RestoreDialog = ({ entry, onCancel, onRestore }) => entry && (
    <Dialog header={t('Restore the date of birth')} visible onHide={onCancel} draggable={false} blockScroll style={{ width: 'min(32rem, calc(100vw - 2rem))' }}>
        <p className="text-subtle fs-7 mt-0">
            {entry.players[0]?.nickname}{' '}{t('gets back the date of birth from before the change, and is told. The games then count as before.')}
        </p>
        <div className="d-flex justify-content-end gap-2 mt-3">
            <Button type="button" label={t('Cancel')} size="small" severity="secondary" onClick={onCancel} />
            <Button type="button" label={t('Restore date')} icon="pi pi-replay" size="small" onClick={() => onRestore(entry)} />
        </div>
    </Dialog>
);

/**
 * Fair play: games and trainings that cannot be real (to be deleted), whose
 * data is wrong but no cheat (data errors, to be repaired) or that are worth a
 * look (suspicious: kept on the watch list or marked as fine). Every entry
 * opens to what was thrown. For the admins of the selected club, or with "all"
 * for global admins over every club.
 */
const FairPlayPage = ({ all = false }) => {
    const { activeClub } = useAuth();
    const navigate = useNavigate();
    const toast = useRef(null);
    const [data, setData] = useState(null);
    const [failed, setFailed] = useState(false);
    const [list, setList] = useState(null);
    const [busy, setBusy] = useState(null);
    const [open, setOpen] = useState(() => new Set());
    const [reviewing, setReviewing] = useState(null);
    const [repairing, setRepairing] = useState(null);
    const [restoring, setRestoring] = useState(null);
    // global admins: the clubs shown, none chosen means all
    const [clubFilter, setClubFilter] = useState([]);

    const load = useCallback(() => IntegrityService.loadFindings(all).then(setData).catch(() => setFailed(true)), [all]);
    useEffect(() => { load(); }, [load]);

    // the clubs with findings, for the filter
    const clubs = useMemo(() => {
        const byId = new Map((data?.entries ?? []).map(entry => [entry.club.id, entry.club]));
        return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
    }, [data]);
    const inFilter = (entry) => !all || !clubFilter.length || clubFilter.includes(entry.club.id);

    const counts = useMemo(() => {
        const result = { impossible: 0, error: 0, suspicious: 0, watch: 0, fine: 0 };
        (data?.entries ?? []).filter(inFilter).forEach(entry => { result[listOf(entry)] += 1; });
        return result;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data, clubFilter, all]);
    // the list to start with: what needs doing first
    const shown = list ?? ['impossible', 'error', 'suspicious', 'watch'].find(name => counts[name]) ?? 'suspicious';

    if (failed) return <div className="container-fluid p-4 text-subtle">{t('The games could not be checked. Please reload the page.')}</div>;
    if (!data) return <PageLoader />;

    const options = [
        { label: t('Impossible · {{impossible}}', { impossible: counts.impossible }), value: 'impossible' },
        { label: t('Data errors · {{error}}', { error: counts.error }), value: 'error' },
        { label: t('Suspicious · {{suspicious}}', { suspicious: counts.suspicious }), value: 'suspicious' },
        { label: t('Watched · {{watch}}', { watch: counts.watch }), value: 'watch' },
        { label: t('Looks fine · {{fine}}', { fine: counts.fine }), value: 'fine' },
    ];
    const entries = data.entries.filter(entry => inFilter(entry) && listOf(entry) === shown);

    const fail = (summary, error) => toast.current?.show({ severity: 'error', summary, detail: error.message, life: 6000 });
    const toggle = (entry) => setOpen(current => {
        const next = new Set(current);
        if (next.has(entry.id)) next.delete(entry.id);
        else next.add(entry.id);
        return next;
    });

    const saveReview = async (entry, status, reason) => {
        setReviewing(null);
        setBusy(entry.id);
        try {
            const review = await IntegrityService.review(entry.type, entry.id, status, reason);
            setData(current => ({ ...current, entries: current.entries.map(item => item.id === entry.id ? { ...item, review } : item) }));
            announceFairPlayChange();
        } catch (error) {
            fail(t('Not saved'), error);
        } finally {
            setBusy(null);
        }
    };
    const repair = async (entry) => {
        setRepairing(null);
        setBusy(entry.id);
        try {
            const { repaired } = await IntegrityService.repair(entry.type, entry.id);
            toast.current?.show({ severity: 'success', summary: t('Repaired'), detail: tn(repaired, '{{count}} score left worked out again from the darts.', '{{count}} scores left worked out again from the darts.'), life: 4000 });
            announceFairPlayChange();
            await load();
        } catch (error) {
            fail(t('Not repaired'), error);
        } finally {
            setBusy(null);
        }
    };
    const restoreBirth = async (entry) => {
        setRestoring(null);
        setBusy(entry.id);
        try {
            await IntegrityService.restoreBirth(entry.id);
            toast.current?.show({ severity: 'success', summary: t('Date of birth restored'), detail: t('{{nickname}} has the earlier date again and is told.', { nickname: entry.players[0]?.nickname }), life: 4000 });
            setData(current => ({ ...current, entries: current.entries.filter(item => item.id !== entry.id) }));
            announceFairPlayChange();
        } catch (error) {
            fail(t('Not restored'), error);
        } finally {
            setBusy(null);
        }
    };
    // every entry of the list shown (and the clubs chosen) at once
    const removeAll = async () => {
        const items = entries.filter(entry => entry.type !== 'birth').map(entry => ({ type: entry.type, id: entry.id }));
        setBusy('all');
        try {
            await IntegrityService.removeMany(items);
        } catch (error) {
            fail(t('Not everything was deleted'), error);
        } finally {
            setBusy(null);
            announceFairPlayChange();
            load();
        }
    };
    const remove = async (entry) => {
        setBusy(entry.id);
        try {
            await IntegrityService.remove(entry.type, entry.id);
            setData(current => ({ ...current, entries: current.entries.filter(item => item.id !== entry.id) }));
            announceFairPlayChange();
        } catch (error) {
            fail(t('Not deleted'), error);
        } finally {
            setBusy(null);
        }
    };

    return (
        <div className="container-fluid p-4 border-0">
            <Toast ref={toast} />
            <ReviewDialog review={reviewing} onCancel={() => setReviewing(null)} onSave={saveReview} />
            <RepairDialog entry={repairing} onCancel={() => setRepairing(null)} onRepair={repair} />
            <RestoreDialog entry={restoring} onCancel={() => setRestoring(null)} onRestore={restoreBirth} />
            <Panel header={all ? t('Fair play · all clubs') : t('Fair play')}>
                <p className="text-subtle fs-7 mt-0 mb-3">
                    {t('Games and trainings checked for what cannot be real or is far out of the ordinary. Open an entry with Details to see what was thrown.')}
                    <strong className="text-default">{' '}{t('Impossible')}</strong>{' '}{t('ones (e.g. Around the Clock in a few seconds, a dart that is not on the board) cannot come from a real game: delete them, with the badges earned in them, or mark them as a false alarm.')}
                    <strong className="text-default">{' '}{t('Data errors')}</strong>{' '}{t('are wrong but no cheat (e.g. a score left that does not add up after an undo): repair them where the darts allow it.')}
                    <strong className="text-default">{' '}{t('Suspicious')}</strong>{' '}{t('ones are possible but worth a look (e.g. a world-class time, an opponent who never threw): mark them as fine, or keep them on the watch list. The players and the club admins are told when a game is deleted or repaired.')}
                </p>
                <div className="fair-play-filters">
                    <SelectButton value={shown} options={options} onChange={(e) => e.value && setList(e.value)} className="p-selectbutton-pills pills-inline flex-wrap" aria-label={t('List')} />
                    {shown === 'impossible' && entries.length > 1 &&
                        <DeletePopup
                            data={entries}
                            header={t('Delete all for fair play')}
                            message={t('all {{length}} games and trainings that cannot be real{{value}}, with the badges earned in them', { length: entries.length, value: all && clubFilter.length ? ' of the chosen clubs' : '' })}
                            handleDelete={removeAll}
                            label={busy === 'all' ? t('Deleting…') : t('Delete all {{length}}', { length: entries.length })}
                            size="small"
                        />
                    }
                    {all && clubs.length > 0 &&
                        <ClubFilter clubs={clubs} selectedIds={clubFilter} onChange={(ids) => setClubFilter(ids ?? [])} optional />
                    }
                </div>

                {entries.length === 0
                    ? <p className="text-faint fs-7 py-4 text-center m-0">{shown === 'impossible' ? t('Nothing impossible: no data that cannot be real.') : shown === 'error' ? t('No data errors.') : t('Nothing here.')}</p>
                    : (
                        <ul className="fair-play-list list-unstyled m-0">
                            {entries.map(entry => {
                                const viewable = !['training', 'birth'].includes(entry.type) && (!all || entry.club.id === activeClub?.id);
                                const expanded = open.has(entry.id);
                                return (
                                    <li key={`${entry.type}-${entry.id}`} className={`fair-play-entry is-${entry.level}`}>
                                        {/* across all clubs: whose club it is comes first */}
                                        {all &&
                                            <div className="fair-play-club">
                                                <ClubLogo club={entry.club} size="sm" />
                                                <span className="text-default fw-semibold">{entry.club.name || t('Unknown club')}</span>
                                            </div>
                                        }
                                        <div className="fair-play-head">
                                            <span className={`fair-play-level is-${entry.level}`}>{LEVEL_LABELS[entry.level]}</span>
                                            <span className="text-default fw-semibold">{entry.summary}</span>
                                            <span className="text-faint fs-8">{formatDate(entry.at, { time: true })}</span>
                                        </div>
                                        <div className="fair-play-players">
                                            {entry.players.map(player => (
                                                <span key={player.id} className="d-inline-flex align-items-center gap-2">
                                                    <Avatar
                                                        label={player.profileImg ? undefined : resolvePlayerInitials(player.firstname ?? player.nickname ?? '?', player.lastname ?? '')}
                                                        image={resolvePlayerImg(player.profileImg)}
                                                        shape="circle"
                                                        className="avatar-xs bg-surface-high"
                                                    />
                                                    <span className="text-subtle fs-8">{player.nickname}</span>
                                                </span>
                                            ))}
                                        </div>
                                        <ul className="fair-play-findings list-unstyled m-0">
                                            {entry.findings.map((item, index) => (
                                                <li key={index} className={`is-${item.level}`}>
                                                    <span className="fw-semibold">{item.title}</span>
                                                    {item.playerId && entry.players.length > 1 && <span className="text-faint"> · {entry.players.find(player => player.id === item.playerId)?.nickname}</span>}
                                                    <span className="text-faint"> · {item.detail}</span>
                                                </li>
                                            ))}
                                        </ul>
                                        {expanded && <FairPlayDetails entry={entry} />}
                                        {entry.review &&
                                            <span className="text-faint fs-8">
                                                {entry.review.status === 'ok' ? t('Marked as fine') : t('Kept on the watch list')}{' '}{t('by')}{' '}{entry.review.byName}, {formatDate(entry.review.at)}
                                                {entry.review.reason && <>: <span className="text-subtle">{entry.review.reason}</span></>}
                                            </span>
                                        }
                                        <div className="fair-play-actions">
                                            <Button type="button" label={expanded ? t('Hide details') : t('Details')} icon={`pi ${expanded ? 'pi-chevron-up' : 'pi-search'}`} size="small" severity="secondary" onClick={() => toggle(entry)} aria-expanded={expanded} />
                                            {viewable && <Button type="button" label={t('View')} icon="pi pi-chart-bar" size="small" severity="secondary" onClick={() => navigate(`/stats/games/${entry.type}/${entry.id}`)} />}
                                            {entry.repairable && entry.review?.status !== 'ok' &&
                                                <Button type="button" label={t('Repair')} icon="pi pi-wrench" size="small" disabled={busy === entry.id} onClick={() => setRepairing(entry)} />}
                                            {entry.review?.status !== 'ok' &&
                                                <Button type="button" label={entry.level === 'suspicious' ? t('Looks fine') : t('False alarm')} icon="pi pi-check" size="small" outlined disabled={busy === entry.id} onClick={() => setReviewing({ entry, status: 'ok' })} />}
                                            {entry.level !== 'impossible' && entry.review?.status !== 'watch' &&
                                                <Button type="button" label={t('Watch')} icon="pi pi-eye" size="small" severity="secondary" disabled={busy === entry.id} onClick={() => setReviewing({ entry, status: 'watch' })} />}
                                            {entry.type === 'birth' &&
                                                <Button type="button" label={t('Restore date')} icon="pi pi-replay" size="small" disabled={busy === entry.id} onClick={() => setRestoring(entry)} />}
                                            {entry.type !== 'birth' && <DeletePopup
                                                data={entry}
                                                header={t('Delete for fair play')}
                                                message={(entry.type === 'training' ? t('this training ({{summary}}) and the badges earned in it', { summary: entry.summary }) : t('this game ({{summary}}) and the badges earned in it', { summary: entry.summary }))}
                                                handleDelete={() => remove(entry)}
                                                label={t('Delete')}
                                                size="small"
                                            />}
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    )
                }
            </Panel>
        </div>
    );
};

export default FairPlayPage;
