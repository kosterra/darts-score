import { requestJSON } from '../utils/service.utils';

/**
 * What the public start page shows: overall numbers, public clubs, their
 * running games and latest results. Needs no login.
 */
const loadOverview = () => requestJSON('/api/public/overview');

const PublicService = {
    loadOverview
};

export default PublicService;
