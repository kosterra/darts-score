import { useState, useRef } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { Calendar } from 'primereact/calendar';
import { classNames } from 'primereact/utils';
import { Toast } from 'primereact/toast';

import ImageUploader from './image.uploader';
import PlayerService from '../../services/player.service';
import PlayerModel from '../../models/player.model';
import { t } from '../../utils/i18n';

/**
 * Adds a player, in a dialog (a player is edited on a page of its own,
 * _player.edit.page). With "clubs" (global admins) the new player can be
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

const PlayerForm = ({ onPlayerAdd, clubs, defaultClubId, label }) => {
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
                    summary: t('Create Player'),
                    detail: t('Successfully created player: ') + data.nickname,
                    life: 3000
                });
                onPlayerAdd(choosesClub ? clubId : undefined);
            }
        } catch (error) {
            toast.current.show({
                severity: 'error',
                summary: t('Create Player'),
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

    const getFormErrorMessage = (name) =>
        errors[name]
            ? <small className="p-error">{errors[name].message}</small>
            : <small className="p-error">&nbsp;</small>;

    const footerContent = (
        <div className="d-flex justify-content-end align-items-end gap-3">
            <Button type="button" label={t('Close')} icon="pi pi-times" severity="secondary" onClick={resetDialog} />
            <Button type="submit" label={t('Create')} icon="pi pi-save" disabled={choosesClub && !clubId} />
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

    return (
        <div>
            <Dialog
                header={t('Add New Player')}
                visible={showDialog}
                blockScroll={true}
                onHide={resetDialog}
                className="m-4"
            >
                <form onSubmit={handleSubmit(onSubmit)} className="flex flex-column gap-2">
                    <div className="row">
                        <div className="col-12 d-flex justify-content-center">
                            <ImageUploader
                                name={firstname + ' ' + lastname}
                                previewUrl={previewUrl}
                                onFileChange={onFileChange}
                                onFileDelete={onFileDelete}
                            />
                        </div>
                        <div className="col d-flex flex-column justify-content-center align-items-center p-2 pt-4 gap-4">
                            {choosesClub &&
                                <div className="py-1 w-100 w-sm-50">
                                    <span className="p-float-label w-100">
                                        <Dropdown
                                            inputId="player-club"
                                            value={clubId}
                                            options={clubs}
                                            optionLabel="name"
                                            optionValue="id"
                                            onChange={(e) => setClubId(e.value)}
                                            filter={clubs.length > 8}
                                            className="w-100"
                                        />
                                        <label htmlFor="player-club">{t('Club')}</label>
                                    </span>
                                    <small className="text-faint">&nbsp;</small>
                                </div>
                            }
                            <div className="py-1 w-100 w-sm-50">
                                <span className="p-float-label w-100">
                                    <Controller
                                        name="firstname"
                                        control={control}
                                        rules={{ required: t('Firstname is required') }}
                                        render={({ field }) => (
                                            <InputText
                                                id="firstname"
                                                {...field}
                                                className={classNames('w-100', { 'p-invalid': errors.firstname })}
                                            />
                                        )}
                                    />
                                    <label htmlFor="firstname">{t('Firstname')}</label>
                                </span>
                                {getFormErrorMessage('firstname')}
                            </div>
                            <div className="py-1 w-100 w-sm-50">
                                <span className="p-float-label w-100">
                                    <Controller
                                        name="lastname"
                                        control={control}
                                        rules={{ required: t('Lastname is required') }}
                                        render={({ field }) => (
                                            <InputText
                                                id="lastname"
                                                {...field}
                                                className={classNames('w-100', { 'p-invalid': errors.lastname })}
                                            />
                                        )}
                                    />
                                    <label htmlFor="lastname">{t('Lastname')}</label>
                                </span>
                                {getFormErrorMessage('lastname')}
                            </div>
                            <div className="py-1 w-100 w-sm-50">
                                <span className="p-float-label w-100">
                                    <Controller
                                        name="nickname"
                                        control={control}
                                        rules={{ required: t('Nickname is required') }}
                                        render={({ field }) => (
                                            <InputText
                                                id="nickname"
                                                {...field}
                                                className={classNames('w-100', { 'p-invalid': errors.nickname })}
                                            />
                                        )}
                                    />
                                    <label htmlFor="nickname">{t('Nickname')}</label>
                                </span>
                                {getFormErrorMessage('nickname')}
                            </div>
                            <div className="py-1 w-100 w-sm-50">
                                <span className="p-float-label w-100">
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
                                                dateFormat="dd.mm.yy"
                                                mask="99.99.9999"
                                                maxDate={new Date()}
                                                viewDate={field.value ? undefined : tenYearsAgo()}
                                                showIcon
                                                icon="pi pi-calendar"
                                                pt={{ input: { root: { inputMode: 'numeric', autoComplete: 'bday' } } }}
                                                className={classNames('w-100', { 'p-invalid': errors.dateOfBirth })}
                                                inputClassName={classNames({ 'p-invalid': errors.dateOfBirth })}
                                            />
                                        )}
                                    />
                                    <label htmlFor="dateOfBirth">{t('Date of birth')}</label>
                                </span>
                                {errors.dateOfBirth
                                    ? getFormErrorMessage('dateOfBirth')
                                    : <small className="text-faint">{t('For fair handicaps between players of different ages.')}</small>}
                            </div>
                        </div>
                        {footerContent}
                    </div>
                </form>
            </Dialog>

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
                    onClick={handleOpen}
                />
            </div>
            <Toast ref={toast} position="bottom-right" />
        </div>
    );
};

export default PlayerForm;
