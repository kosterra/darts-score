import db from '../models/db.model.js';
import { removeProfileImageFile } from '../controllers/file.controller.js';

/**
 * Deletes a player's picture file once no player uses it any more: the
 * players of one account share their picture.
 */
export const removeProfileImageIfUnused = async (profileImg) => {
    if (!profileImg) return;
    if (await db.player.exists({ profileImg })) return;
    removeProfileImageFile(profileImg);
};
