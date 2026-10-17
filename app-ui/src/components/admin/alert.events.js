// The alert count in the menu updates when alerts are resolved or reopened
export const ALERTS_CHANGED = 'darts-score:alerts-changed';

export const announceAlertsChange = () => window.dispatchEvent(new Event(ALERTS_CHANGED));
