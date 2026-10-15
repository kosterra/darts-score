import dayjs from 'dayjs';

export const formatDateTime = (value) => value ? dayjs(value).format('DD.MM.YYYY HH:mm') : '–';
