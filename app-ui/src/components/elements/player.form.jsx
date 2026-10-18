import { useState, useRef, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { classNames } from 'primereact/utils';
import { Toast } from 'primereact/toast';

import ImageUploader from './image.uploader';
import PlayerService from '../../services/player.service';
import PlayerModel from '../../models/player.model';
import { resolvePlayerImg } from '../../utils/image.utils';
import PlayerCheckoutPreferences from '../players/player.checkout.preferences';

/**
 * Adds or edits a player. With "clubs" (global admins) a new player can be
 * added to any of these clubs, "defaultClubId" first; otherwise to the selected club.
 */
// a date as the date field wants it: "2016-05-24"
const toDateInput = (value) => value ? String(value).slice(0, 10) : '';
const today = () => new Date().toISOString().slice(0, 10);

const PlayerForm = ({ onPlayerAdd, onPlayerEdit, updatePlayer, edit, clubs, defaultClubId, label }) => {
    const toast = useRef(null);
    const choosesClub = !edit && Array.isArray(clubs);
    const [clubId, setClubId] = useState(null);
    const initialState = updatePlayer ?? PlayerModel;

    const [showDialog, setShowDialog] = useState(false);
    // previewUrl: what the avatar shows. For edit mode, starts with the existing image URL.
    const [previewUrl, setPreviewUrl] = useState(edit ? resolvePlayerImg(updatePlayer?.profileImg ?? '') : '');
    // imageAction tracks what the user did:
    //   'unchanged' — user opened form but didn't touch the image
    //   'new'       — user selected a new file (setValue('profileImg') is a File)
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

    // Re-initialise form values when updatePlayer changes (replaces Formik's enableReinitialize)
    useEffect(() => {
        if (updatePlayer) {
            reset({
                firstname:  updatePlayer.firstname  ?? '',
                lastname:   updatePlayer.lastname   ?? '',
                nickname:   updatePlayer.nickname   ?? '',
                dateOfBirth: toDateInput(updatePlayer.dateOfBirth),
                profileImg: '',
                id:         updatePlayer.id         ?? ''
            });
        }
    }, [updatePlayer, reset]);

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
        // 'unchanged': don't append profileImg at all → API keeps existing value

        if (edit) {
            formData.append('id', data.id);
            try {
                if (await PlayerService.updatePlayer({ id: data.id, formData })) {
                    toast.current.show({
                        severity: 'success',
                        summary: 'Update Player',
                        detail: 'Successfully updated player: ' + data.nickname,
                        life: 3000
                    });
                    onPlayerEdit();
                }
            } catch (error) {
                toast.current.show({
                    severity: 'error',
                    summary: 'Update Player',
                    detail: 'Failed to update player: ' + error.message,
                    life: 3000
                });
            }
        } else {
            try {
                if (await PlayerService.createPlayer(formData, choosesClub ? clubId : undefined)) {
                    toast.current.show({
                        severity: 'success',
                        summary: 'Create Player',
                        detail: 'Successfully created player: ' + data.nickname,
                        life: 3000
                    });
                    onPlayerAdd(choosesClub ? clubId : undefined);
                }
            } catch (error) {
                toast.current.show({
                    severity: 'error',
                    summary: 'Create Player',
                    detail: 'Failed to create player: ' + error.message,
                    life: 3000
                });
            }
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
            <Button type="button" label="Close" icon="pi pi-times" severity="secondary" onClick={resetDialog} />
            <Button type="submit" label={edit ? 'Update' : 'Create'} icon="pi pi-save" disabled={choosesClub && !clubId} />
        </div>
    );

    const handleOpen = () => {
        // Reset image state to current player image when reopening the dialog
        setPreviewUrl(edit ? resolvePlayerImg(updatePlayer?.profileImg ?? '') : '');
        setImageAction('unchanged');
        if (choosesClub) setClubId(clubs.some(club => club.id === defaultClubId) ? defaultClubId : null);
        setShowDialog(true);
    };

    const firstname = watch('firstname');
    const lastname  = watch('lastname');

    return (
        <div>
            <Dialog
                header={edit ? 'Update Player' : 'Add New Player'}
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
                                        <label htmlFor="player-club">Club</label>
                                    </span>
                                    <small className="text-faint">&nbsp;</small>
                                </div>
                            }
                            <div className="py-1 w-100 w-sm-50">
                                <span className="p-float-label w-100">
                                    <Controller
                                        name="firstname"
                                        control={control}
                                        rules={{ required: 'Firstname is required' }}
                                        render={({ field }) => (
                                            <InputText
                                                id="firstname"
                                                {...field}
                                                className={classNames('w-100', { 'p-invalid': errors.firstname })}
                                            />
                                        )}
                                    />
                                    <label htmlFor="firstname">Firstname</label>
                                </span>
                                {getFormErrorMessage('firstname')}
                            </div>
                            <div className="py-1 w-100 w-sm-50">
                                <span className="p-float-label w-100">
                                    <Controller
                                        name="lastname"
                                        control={control}
                                        rules={{ required: 'Lastname is required' }}
                                        render={({ field }) => (
                                            <InputText
                                                id="lastname"
                                                {...field}
                                                className={classNames('w-100', { 'p-invalid': errors.lastname })}
                                            />
                                        )}
                                    />
                                    <label htmlFor="lastname">Lastname</label>
                                </span>
                                {getFormErrorMessage('lastname')}
                            </div>
                            <div className="py-1 w-100 w-sm-50">
                                <span className="p-float-label w-100">
                                    <Controller
                                        name="nickname"
                                        control={control}
                                        rules={{ required: 'Nickname is required' }}
                                        render={({ field }) => (
                                            <InputText
                                                id="nickname"
                                                {...field}
                                                className={classNames('w-100', { 'p-invalid': errors.nickname })}
                                            />
                                        )}
                                    />
                                    <label htmlFor="nickname">Nickname</label>
                                </span>
                                {getFormErrorMessage('nickname')}
                            </div>
                            <div className="py-1 w-100 w-sm-50">
                                <span className="p-float-label w-100">
                                    <Controller
                                        name="dateOfBirth"
                                        control={control}
                                        rules={{
                                            required: 'Date of birth is required',
                                            validate: (value) => value <= today() || 'Date of birth must be in the past',
                                        }}
                                        render={({ field }) => (
                                            <InputText
                                                id="dateOfBirth"
                                                type="date"
                                                max={today()}
                                                {...field}
                                                className={classNames('w-100', { 'p-invalid': errors.dateOfBirth })}
                                            />
                                        )}
                                    />
                                    <label htmlFor="dateOfBirth">Date of birth</label>
                                </span>
                                {errors.dateOfBirth
                                    ? getFormErrorMessage('dateOfBirth')
                                    : <small className="text-faint">For fair handicaps between players of different ages.</small>}
                            </div>
                        </div>
                        {/* saved right away, apart from the rest of the form */}
                        {edit && updatePlayer?.id && !updatePlayer.guest &&
                            <div className="mt-3">
                                <p className="game-setup-section-title">Ways out in X01</p>
                                <PlayerCheckoutPreferences
                                    player={updatePlayer}
                                    onError={(error) => toast.current?.show({ severity: 'error', summary: 'Ways out', detail: error.message, life: 4000 })}
                                />
                            </div>
                        }
                        {footerContent}
                    </div>
                </form>
            </Dialog>

            <div className="d-flex justify-content-center">
                <Button
                    severity="primary"
                    icon={edit ? 'pi pi-user-edit' : 'pi pi-user-plus'}
                    title={label ? undefined : edit ? 'Edit player' : 'Add a player'}
                    aria-label={label ? undefined : edit ? 'Edit player' : 'Add a player'}
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
