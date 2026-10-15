import { useEffect, useState } from 'react';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { Message } from 'primereact/message';

import ImageUploader from '../elements/image.uploader';
import ClubService from '../../services/club.service';
import { resolveClubLogo } from '../../utils/image.utils';

const DESCRIPTION_MAX = 500;

/**
 * Edits what a club is: its name, description and logo.
 */
const ClubEditDialog = ({ club, onHide, onSaved }) => {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [logoPreview, setLogoPreview] = useState('');
    // 'unchanged' | File (new logo) | null (logo removed)
    const [logo, setLogo] = useState('unchanged');
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!club) return;
        setName(club.name);
        setDescription(club.description ?? '');
        setLogoPreview(resolveClubLogo(club.logo));
        setLogo('unchanged');
        setError('');
    }, [club]);

    const onSave = async (event) => {
        event.preventDefault();
        setError('');
        setSaving(true);
        try {
            await ClubService.updateClub(club.id, { name, description });
            if (logo instanceof File) await ClubService.uploadLogo(club.id, logo);
            else if (logo === null && club.logo) await ClubService.removeLogo(club.id);
            await onSaved();
            onHide();
        } catch (err) {
            setError(err.message);
        }
        setSaving(false);
    };

    return (
        <Dialog header="Edit Club" visible={!!club} blockScroll onHide={onHide} draggable={false} className="m-4" style={{ width: '34rem', maxWidth: '100%' }}>
            {club &&
                <form onSubmit={onSave} className="d-flex flex-column gap-3 pt-2">
                    <ImageUploader
                        name={name}
                        previewUrl={logoPreview}
                        onFileChange={(file) => { setLogo(file); setLogoPreview(URL.createObjectURL(file)); }}
                        onFileDelete={() => { setLogo(null); setLogoPreview(''); }}
                    />
                    <label htmlFor="club-edit-name" className="text-subtle fs-7">Name</label>
                    <InputText id="club-edit-name" value={name} onChange={(e) => setName(e.target.value)} minLength={3} maxLength={50} required />
                    <label htmlFor="club-edit-description" className="text-subtle fs-7">Description (optional)</label>
                    <InputTextarea
                        id="club-edit-description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        maxLength={DESCRIPTION_MAX}
                        rows={4}
                        autoResize
                        placeholder="Where and when you play, who can join, …"
                    />
                    <span className="text-faint fs-8 text-end">{description.length} / {DESCRIPTION_MAX}</span>
                    {error && <Message severity="error" text={error} className="w-100 justify-content-start" />}
                    <div className="d-flex justify-content-end gap-3">
                        <Button type="button" label="Cancel" severity="secondary" size="small" onClick={onHide} />
                        <Button type="submit" label="Save" icon="pi pi-save" size="small" loading={saving} />
                    </div>
                </form>
            }
        </Dialog>
    );
};

export default ClubEditDialog;
