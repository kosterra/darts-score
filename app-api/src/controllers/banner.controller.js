import logger from '../models/logger.model.js';
import db from '../models/db.model.js';

const KEY = 'banner';
export const BANNER_COLOR = /^#[0-9a-fA-F]{6}$/;
const DEFAULT_BANNER = { enabled: false, text: '', color: '#f2b07e' };

const bannerOf = (setting) => ({ ...DEFAULT_BANNER, ...(setting?.value ?? {}) });

/**
 * The banner every visitor sees on top of every page, e.g. "Test environment".
 * Public, so it shows on the start page and the login too.
 */
export const getBanner = async (req, res) => {
    const setting = await db.setting.findOne({ key: KEY }).lean();
    const banner = bannerOf(setting);
    res.json(banner.enabled && banner.text ? banner : { enabled: false });
};

/**
 * The banner as global admins edit it, also while it is switched off.
 */
export const getBannerSettings = async (req, res) => {
    res.json(bannerOf(await db.setting.findOne({ key: KEY }).lean()));
};

export const updateBanner = async (req, res) => {
    const value = {
        enabled: req.body.enabled === true,
        text: String(req.body.text ?? '').trim(),
        color: req.body.color,
    };
    await db.setting.updateOne({ key: KEY }, { $set: { value } }, { upsert: true });
    logger.info(`Banner ${value.enabled ? `switched on: "${value.text}"` : 'switched off'} by ${req.user.email}`);
    res.json(value);
};
