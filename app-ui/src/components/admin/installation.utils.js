import { locale } from '../../utils/i18n';

export const formatNumber = (value) => new Intl.NumberFormat(locale()).format(value ?? 0);

// the list below an overview, where a club or record picked there shows
export const scrollToList = () => {
    window.requestAnimationFrame(() => document.getElementById('admin-list')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
};
