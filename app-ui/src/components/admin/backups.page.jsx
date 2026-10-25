import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from 'primereact/button';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { Dropdown } from 'primereact/dropdown';
import { InputNumber } from 'primereact/inputnumber';
import { InputText } from 'primereact/inputtext';
import { Message } from 'primereact/message';
import { Panel } from 'primereact/panel';
import { SelectButton } from 'primereact/selectbutton';
import { Tag } from 'primereact/tag';
import { Toast } from 'primereact/toast';

import AdminService from '../../services/admin.service';
import SettingSwitch from '../elements/setting.switch';
import { Lines } from '../elements/skeletons';
import { formatDateTime } from '../../utils/dates';
import { relativeTime } from '../../utils/relative.time';
import usePageTitle from '../../utils/use.page.title';
import { locale, t } from '../../utils/i18n';

const KINDS = {
    manual: { label: t('By hand'), severity: 'info' },
    auto: { label: t('Automatic'), severity: 'success' },
    'before-restore': { label: t('Before a restore'), severity: 'warning' },
    upload: { label: t('Uploaded'), severity: 'secondary' },
};
const WEEKDAYS = [1, 2, 3, 4, 5, 6, 0].map(day => ({
    value: day,
    label: new Intl.DateTimeFormat(locale(), { weekday: 'long' }).format(new Date(2026, 9, 25 + ((day + 7) % 7))),
}));
const HOURS = Array.from({ length: 24 }, (_, hour) => ({ value: hour, label: `${String(hour).padStart(2, '0')}:00` }));

const sizeOf = (bytes) => (bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`);

/**
 * A backup in the list: when, how, how large, and what can be done with it.
 * Restoring asks to type RESTORE first.
 */
const BackupRow = ({ backup, busy, onRestore, onDelete }) => {
    const [confirming, setConfirming] = useState(false);
    const [typed, setTyped] = useState('');
    const kind = KINDS[backup.kind] ?? KINDS.manual;
    return (
        <li className="backup-row">
            <div className="backup-row-main">
                <span className="d-flex flex-column min-w-0">
                    <span className="text-default fw-semibold">{formatDateTime(backup.createdAt)}</span>
                    <span className="text-faint fs-8">{relativeTime(backup.createdAt)} · {sizeOf(backup.size)}</span>
                </span>
                <Tag value={kind.label} severity={kind.severity} className="flex-shrink-0" />
                <span className="flex-grow-1" />
                <div className="d-flex flex-wrap gap-2 justify-content-end">
                    <a href={AdminService.backupUrl(backup.name)} download={backup.name} className="p-button p-button-sm p-button-secondary p-button-outlined text-decoration-none" aria-label={t('Download')}>
                        <i className="pi pi-download me-2" aria-hidden="true" />{t('Download')}
                    </a>
                    <Button type="button" label={t('Restore')} icon="pi pi-history" size="small" severity="warning" outlined disabled={Boolean(busy)} onClick={() => setConfirming(!confirming)} />
                    <Button type="button" icon="pi pi-trash" size="small" severity="danger" text rounded aria-label={t('Delete')} title={t('Delete')} disabled={Boolean(busy)} onClick={() => onDelete(backup)} />
                </div>
            </div>
            {confirming &&
                <div className="backup-confirm">
                    <span className="fs-7">{t('Everything is put back as it was then: all clubs, players, games and settings, and the pictures. A backup of the state now is made first. Type RESTORE to confirm.')}</span>
                    <div className="d-flex flex-wrap gap-2">
                        <InputText value={typed} onChange={(event) => setTyped(event.target.value)} placeholder="RESTORE" aria-label={t('Type RESTORE to confirm')} />
                        <Button type="button" label={t('Restore this backup')} icon="pi pi-history" size="small" severity="warning" loading={busy === `restore:${backup.name}`} disabled={typed !== 'RESTORE' || Boolean(busy)} onClick={() => onRestore(backup)} />
                        <Button type="button" label={t('Cancel')} size="small" text severity="secondary" onClick={() => { setConfirming(false); setTyped(''); }} />
                    </div>
                </div>}
        </li>
    );
};

/**
 * Backups of the whole installation, for global admins: made now by hand,
 * downloaded to keep elsewhere, brought back from a file, restored, deleted;
 * and the automatic ones: daily or weekly at an hour (server time), the
 * newest few kept.
 */
const BackupsPage = () => {
    usePageTitle(t('Backups'));
    const toast = useRef(null);
    const fileRef = useRef(null);
    const [data, setData] = useState(null);
    const [schedule, setSchedule] = useState(null);
    const [error, setError] = useState('');
    const [busy, setBusy] = useState('');
    const [restarting, setRestarting] = useState(false);

    const load = useCallback(() => AdminService.loadBackups()
        .then(loaded => { setData(loaded); setSchedule(current => current ?? loaded.schedule); setError(''); })
        .catch(err => setError(err.message)), []);
    useEffect(() => { load(); }, [load]);

    const say = (severity, detail) => toast.current?.show({ severity, summary: t('Backups'), detail, life: severity === 'error' ? 6000 : 3500 });
    const run = async (key, work, done) => {
        setBusy(key);
        try {
            const result = await work();
            if (done) done(result);
            await load();
        } catch (err) {
            say('error', err.message);
        }
        setBusy('');
    };

    const backUp = () => run('backup', () => AdminService.createBackup(), () => say('success', t('The backup is made.')));
    const upload = (event) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (file) run('upload', () => AdminService.uploadBackup(file), () => say('success', t('The backup is uploaded. Restore it from the list.')));
    };
    const remove = (backup) => confirmDialog({
        header: t('Delete backup'),
        message: t('Delete the backup of {{date}} for good?', { date: formatDateTime(backup.createdAt) }),
        icon: 'pi pi-exclamation-triangle',
        acceptClassName: 'p-button-danger',
        acceptLabel: t('Delete'),
        rejectLabel: t('Cancel'),
        accept: () => run(`delete:${backup.name}`, () => AdminService.deleteBackup(backup.name), () => say('success', t('The backup is deleted.'))),
    });
    const restore = (backup) => run(`restore:${backup.name}`, () => AdminService.restoreBackup(backup.name), (result) => {
        if (result.restart) {
            setRestarting(true);
            setTimeout(() => window.location.reload(), 10000);
        } else say('success', t('The backup is restored.'));
    });
    const saveSchedule = () => run('schedule', () => AdminService.saveBackupSchedule({
        enabled: schedule.enabled, frequency: schedule.frequency, hour: schedule.hour, weekday: schedule.weekday, keep: schedule.keep,
    }), (saved) => { setSchedule(saved); say('success', saved.enabled ? t('Automatic backups are on.') : t('Automatic backups are off.')); });

    if (restarting) {
        return (
            <div className="container-fluid p-4">
                <Message severity="success" className="w-100 justify-content-start" text={t('The backup is restored. Legmate starts again with it; the page reloads in a moment.')} />
            </div>
        );
    }

    return (
        <div className="container-fluid p-4 d-flex flex-column gap-4 backups-page">
            <Toast ref={toast} position="bottom-right" />
            <ConfirmDialog />
            <Panel header={t('Backups')}>
                <div className="d-flex flex-column gap-3">
                    <p className="text-subtle fs-7 m-0">{t('A backup holds everything: all clubs, players, games, trainings and settings, and the pictures. The logins stay out, so nobody is logged out by a restore. Download backups now and then, to keep them somewhere else than this server.')}</p>
                    <div className="d-flex flex-wrap gap-2">
                        <Button type="button" label={t('Back up now')} icon="pi pi-database" size="small" loading={busy === 'backup'} disabled={Boolean(busy) && busy !== 'backup'} onClick={backUp} />
                        <Button type="button" label={t('Upload a backup')} icon="pi pi-upload" size="small" severity="secondary" outlined loading={busy === 'upload'} disabled={Boolean(busy) && busy !== 'upload'} onClick={() => fileRef.current?.click()} />
                        <input ref={fileRef} type="file" accept=".gz,application/gzip" className="d-none" onChange={upload} />
                    </div>
                    {error && <Message severity="error" className="w-100 justify-content-start" text={error} />}
                    {!data && !error && <Lines count={3} />}
                    {data && data.backups.length === 0 && <p className="text-faint fs-7 m-0">{t('No backups yet.')}</p>}
                    {data && data.backups.length > 0 &&
                        <ul className="list-unstyled m-0 backup-list">
                            {data.backups.map(backup => <BackupRow key={backup.name} backup={backup} busy={busy} onRestore={restore} onDelete={remove} />)}
                        </ul>}
                </div>
            </Panel>

            <Panel header={t('Automatic backups')}>
                {!schedule ? <Lines count={3} /> :
                    <div className="d-flex flex-column gap-3 backup-schedule">
                        <SettingSwitch
                            id="backup-schedule-enabled"
                            title={t('Back up automatically')}
                            hint={schedule.enabled
                                ? t('A backup is made on its own and the oldest go, so only the newest are kept.')
                                : t('Off: backups are only made by hand.')}
                            checked={schedule.enabled}
                            onChange={(enabled) => setSchedule({ ...schedule, enabled })}
                        />
                        <div className="backup-schedule-fields">
                            <label className="d-flex flex-column gap-1">
                                <span className="fs-7 fw-semibold text-default">{t('How often')}</span>
                                <SelectButton value={schedule.frequency} options={[{ label: t('Daily'), value: 'daily' }, { label: t('Weekly'), value: 'weekly' }]} onChange={(event) => event.value && setSchedule({ ...schedule, frequency: event.value })} disabled={!schedule.enabled} />
                            </label>
                            {schedule.frequency === 'weekly' &&
                                <label className="d-flex flex-column gap-1">
                                    <span className="fs-7 fw-semibold text-default">{t('On')}</span>
                                    <Dropdown value={schedule.weekday} options={WEEKDAYS} onChange={(event) => setSchedule({ ...schedule, weekday: event.value })} disabled={!schedule.enabled} />
                                </label>}
                            <label className="d-flex flex-column gap-1">
                                <span className="fs-7 fw-semibold text-default">{t('At')}</span>
                                <Dropdown value={schedule.hour} options={HOURS} onChange={(event) => setSchedule({ ...schedule, hour: event.value })} disabled={!schedule.enabled} />
                            </label>
                            <label className="d-flex flex-column gap-1">
                                <span className="fs-7 fw-semibold text-default">{t('Keep the newest')}</span>
                                <InputNumber value={schedule.keep} onValueChange={(event) => setSchedule({ ...schedule, keep: event.value ?? 1 })} min={1} max={60} showButtons buttonLayout="horizontal" decrementButtonIcon="pi pi-minus" incrementButtonIcon="pi pi-plus" inputClassName="text-center" disabled={!schedule.enabled} />
                            </label>
                        </div>
                        <span className="text-faint fs-8">
                            {t('The time is the time of the server ({{zone}}). Only automatic backups are counted and deleted; the others stay until you delete them.', { zone: schedule.timeZone })}
                            {schedule.enabled && schedule.nextAt && <>{' '}{t('Next backup: {{date}}.', { date: formatDateTime(schedule.nextAt) })}</>}
                        </span>
                        {schedule.lastError && <Message severity="error" className="w-100 justify-content-start" text={t('The last automatic backup failed: {{error}}', { error: schedule.lastError })} />}
                        <div className="d-flex justify-content-end">
                            <Button type="button" label={t('Save')} icon="pi pi-check" size="small" loading={busy === 'schedule'} onClick={saveSchedule} />
                        </div>
                    </div>}
            </Panel>
        </div>
    );
};

export default BackupsPage;
