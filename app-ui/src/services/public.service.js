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

// the privacy policy and imprint: who runs the installation, how long what is kept
const loadLegal = () => requestJSON('/api/public/legal');
// whether the installation shows its start page to everyone: { publicSite }
const loadSite = () => requestJSON('/api/public/site');
// the ways to support Oche with a gift: { url, twint, project }
const loadSupport = () => requestJSON('/api/public/support');

// a message of the contact form to the operator: { name, email, message, website }
const sendContact = (message) => requestJSON('/api/public/contact', { method: 'POST', body: message });

const PublicService = {
    loadOverview,
    loadBanner,
    loadLegal,
    loadSite,
    loadSupport,
    sendContact,
};

export default PublicService;
