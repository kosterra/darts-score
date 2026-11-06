import { useState, useRef } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Button } from 'primereact/button';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { Calendar } from 'primereact/calendar';
import { classNames } from 'primereact/utils';
import { Toast } from 'primereact/toast';

import ImageUploader from './image.uploader';
import PlayerService from '../../services/player.service';
import PlayerModel from '../../models/player.model';
import { t } from '../../utils/i18n';
import { calendarFormat } from '../../utils/dates';

/**
 * Adds a player: a button, and the form opening in place where the page puts
 * it (a player is edited on a page of its own, _player.edit.page).
 * → [button, form] With "clubs" (global admins) the new player can be
 * added to any of these clubs, "defaultClubId" first; otherwise to the
 * selected club.
 */
// a date as the date field wants it: "2016-05-24"
const toDateInput = (value) => value ? String(value).slice(0, 10) : '';
const today = () => new Date().toISOString().slice(0, 10);
// "2016-05-24" and back for the calendar, in local time so the day stays the day
const toDate = (value) => {
    const [year, month, day] = (value || '').split('-').map(Number);
    return year && month && day ? new Date(year, month - 1, day) : null;
};
const fromDate = (date) => date instanceof Date && !Number.isNaN(date.getTime())
    ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    : '';
// with no date yet the calendar opens ten years back: most new players with a date that matters are children
const tenYearsAgo = () => new Date(new Date().getFullYear() - 10, 0, 1);

const usePlayerForm = ({ onPlayerAdd, clubs, defaultClubId, label }) => {
    const toast = useRef(null);
    const choosesClub = Array.isArray(clubs);
    const [clubId, setClubId] = useState(null);
    const initialState = PlayerModel;

    const [showDialog, setShowDialog] = useState(false);
    // previewUrl: what the avatar shows
    const [previewUrl, setPreviewUrl] = useState('');
    // imageAction tracks what the user did:
    //   'unchanged' — no picture chosen
    //   'new'       — user selected a file (setValue('profileImg') is a File)
    //   'cleared'   — user clicked the delete button
    const [imageAction, setImageAction] = useState('unchanged');

    const { control, handleSubmit, setValue, reset, watch, formState: { errors } } = useForm({
        defaultValues: {
            firstname:  initialState.firstname  ?? '',
            lastname:   initialState.lastname   ?? '',
            nickname:   initialState.nickname   ?? '',
            dateOfBirth: toDateInput(initialState.dateOfBirth),
            profileImg: '',
            id:         initialState.id         ?? ''
        }
    });

    const onFileChange = (file) => {
        setPreviewUrl(URL.createObjectURL(file));
        setValue('profileImg', file);
        setImageAction('new');
    };

    const onFileDelete = () => {
        setPreviewUrl('');
        setValue('profileImg', '');
        setImageAction('cleared');
    };

    const onSubmit = async (data) => {
        // Build FormData manually so we have full control over profileImg
        const formData = new FormData();
        formData.append('firstname', data.firstname);
        formData.append('lastname',  data.lastname);
        formData.append('nickname',  data.nickname);
        formData.append('dateOfBirth', data.dateOfBirth);

        if (imageAction === 'new' && data.profileImg instanceof File) {
            // New file selected — upload it
            formData.append('profileImg', data.profileImg);
        } else if (imageAction === 'cleared') {
            // User explicitly deleted the image — tell the API to clear it
            formData.append('clearProfileImg', 'true');
        }
        // 'unchanged': no picture

        try {
            if (await PlayerService.createPlayer(formData, choosesClub ? clubId : undefined)) {
                toast.current.show({
                    severity: 'success',
                    summary: t('Create player'),
                    detail: t('Successfully created player: ') + data.nickname,
                    life: 3000
                });
                onPlayerAdd(choosesClub ? clubId : undefined);
            }
        } catch (error) {
            toast.current.show({
                severity: 'error',
                summary: t('Create player'),
                detail: t('Failed to create player: ') + error.message,
                life: 3000
            });
        }

        resetDialog();
    };

    const resetDialog = () => {
        reset();
        setPreviewUrl('');
        setImageAction('unchanged');
        setShowDialog(false);
    };

    // the message under a field only when there is one, so the fields sit close together
    const getFormErrorMessage = (name) =>
        errors[name] && <small className="p-error">{errors[name].message}</small>;

    const footerContent = (
        <div className="d-flex justify-content-end align-items-center gap-2">
            <Button type="button" label={t('Cancel')} text severity="secondary" size="small" onClick={resetDialog} />
            <Button type="submit" label={t('Create')} icon="pi pi-save" size="small" disabled={choosesClub && !clubId} />
        </div>
    );

    const handleOpen = () => {
        setPreviewUrl('');
        setImageAction('unchanged');
        if (choosesClub) setClubId(clubs.some(club => club.id === defaultClubId) ? defaultClubId : null);
        setShowDialog(true);
    };

    const firstname = watch('firstname');
    const lastname  = watch('lastname');

    // a text field of the form with its label above it
    const textField = (name, label, required) => (
        <div className="player-form-field">
            <label htmlFor={name}>{label}</label>
            <Controller
                name={name}
                control={control}
                rules={{ required }}
                render={({ field }) => (
                    <InputText id={name} {...field} className={classNames('w-100 p-inputtext-sm', { 'p-invalid': errors[name] })} />
                )}
            />
            {getFormErrorMessage(name)}
        </div>
    );

    // compact: the picture with its upload on the left, the fields two by two beside it
    // (on a phone the picture above them, the fields one under another)
    const form = showDialog && (
        <div className="row-editor player-form-inline">
            <div className="row-editor-head">
                <span className="text-default fw-semibold">{t('New player')}</span>
                <Button type="button" icon="pi pi-times" text severity="secondary" aria-label={t('Close')} onClick={resetDialog} />
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="d-flex flex-column gap-3">
                <div className="player-form-body">
                    <ImageUploader
                        name={firstname + ' ' + lastname}
                        previewUrl={previewUrl}
                        onFileChange={onFileChange}
                        onFileDelete={onFileDelete}
                        compact
                    />
                    <div className="player-form-fields">
                        {choosesClub &&
                            <div className="player-form-field is-wide">
                                <label htmlFor="player-club">{t('Club')}</label>
                                <Dropdown
                                    inputId="player-club"
                                    value={clubId}
                                    options={clubs}
                                    optionLabel="name"
                                    optionValue="id"
                                    onChange={(e) => setClubId(e.value)}
                                    filter={clubs.length > 8}
                                    className="w-100 p-inputtext-sm"
                                />
                            </div>
                        }
                        {textField('firstname', t('First name'), t('First name is required'))}
                        {textField('lastname', t('Last name'), t('Last name is required'))}
                        {textField('nickname', t('Nickname'), t('Nickname is required'))}
                        <div className="player-form-field">
                            <label htmlFor="dateOfBirth">{t('Date of birth')}</label>
                            <Controller
                                name="dateOfBirth"
                                control={control}
                                rules={{
                                    required: t('Date of birth is required'),
                                    validate: (value) => value <= today() || t('Date of birth must be in the past'),
                                }}
                                render={({ field }) => (
                                    // typed as 14.03.2012 (the dots come by themselves), or picked:
                                    // a click on the month or year in the header jumps to choosing those
                                    <Calendar
                                        inputId="dateOfBirth"
                                        value={toDate(field.value)}
                                        onChange={(e) => field.onChange(fromDate(e.value))}
                                        onBlur={field.onBlur}
                                        dateFormat={calendarFormat()}
                                        mask="99.99.9999"
                                        maxDate={new Date()}
                                        viewDate={field.value ? undefined : tenYearsAgo()}
                                        showIcon
                                        icon="pi pi-calendar"
                                        pt={{ input: { root: { inputMode: 'numeric', autoComplete: 'bday' } } }}
                                        className={classNames('w-100 p-inputtext-sm', { 'p-invalid': errors.dateOfBirth })}
                                        inputClassName={classNames({ 'p-invalid': errors.dateOfBirth })}
                                    />
                                )}
                            />
                            {errors.dateOfBirth
                                ? getFormErrorMessage('dateOfBirth')
                                : <small className="text-faint">{t('For fair handicaps between players of different ages.')}</small>}
                        </div>
                    </div>
                </div>
                {footerContent}
            </form>
        </div>
    );

    const button = (
        <>
            <div className="d-flex justify-content-center">
                {/* with a label (e.g. next to the players of a game) it is a secondary action: soft */}
                <Button
                    severity="primary"
                    outlined={Boolean(label)}
                    icon="pi pi-user-plus"
                    title={label ? undefined : t('Add a player')}
                    aria-label={label ? undefined : t('Add a player')}
                    label={label}
                    size={label ? 'small' : undefined}
                    onClick={() => (showDialog ? resetDialog() : handleOpen())}
                />
            </div>
            <Toast ref={toast} position="bottom-right" />
        </>
    );

    return [button, form];
};

export default usePlayerForm;
