// The translations of the API's own texts (locales/server.json), for the
// mails it writes in the language of their reader: the API keeps a copy in
// app-api/src/locales/server.texts.json (npm run copy-rules).
import de from './de.json' with { type: 'json' };
import fr from './fr.json' with { type: 'json' };
import it from './it.json' with { type: 'json' };
import es from './es.json' with { type: 'json' };
import SERVER_TEXTS from './server.json' with { type: 'json' };

export const serverTexts = () => Object.fromEntries(Object.entries({ de, fr, it, es }).map(([language, dictionary]) => [
    language,
    Object.fromEntries(SERVER_TEXTS.filter(key => dictionary[key] !== undefined).map(key => [key, dictionary[key]])),
]));
