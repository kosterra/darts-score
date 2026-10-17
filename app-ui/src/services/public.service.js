import { requestJSON } from '../utils/service.utils';

/**
 * What the public start page shows: overall numbers, public clubs, their
 * running games and latest results. Needs no login.
 */
const loadOverview = () => requestJSON('/api/public/overview');

/**
 * The banner on top of every page (e.g. "Test environment"): { enabled, text, color }.
 */
const loadBanner = () => requestJSON('/api/public/banner');

const PublicService = {
    loadOverview,
    loadBanner
};

export default PublicService;
