const { VITE_CF_CLIENT_ID, VITE_CF_CLIENT_SECRET } = import.meta.env;

export const getHeaders = (addContentTypeJSON = false) => ({
    ...(addContentTypeJSON && { 'Content-Type': 'application/json' }),
    ...(VITE_CF_CLIENT_ID && { 'CF-Access-Client-Id': VITE_CF_CLIENT_ID }),
    ...(VITE_CF_CLIENT_SECRET && { 'CF-Access-Client-Secret': VITE_CF_CLIENT_SECRET }),
});
