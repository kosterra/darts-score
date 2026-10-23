/**
 * The mails of the app in German, French, Italian and Spanish: the default
 * texts of every template (as in mail.templates.js for English) and the words
 * of the layout around them. Informal, like the app; Swiss German spelling.
 */

export const TEMPLATE_TEXTS = {
    de: {
        passwordReset: {
            subject: 'Setze dein Oche-Passwort zurück',
            body: 'Hallo {{firstname}}\n\nWir haben eine Anfrage erhalten, das Passwort deines Oche-Kontos zurückzusetzen. Wähle mit dem Knopf unten ein neues. Der Link funktioniert einmal und läuft in {{validity}} ab.\n\nFalls du das nicht angefragt hast, kannst du diese E-Mail ignorieren: Dein Passwort bleibt, wie es ist.',
            button: 'Neues Passwort wählen',
        },
        adminAdded: {
            subject: 'Du bist jetzt Admin von {{club}}',
            body: 'Hallo {{firstname}}\n\n{{inviter}} hat dich zum Administrator von {{club}} auf Oche gemacht. Als Admin kümmerst du dich um den Club: seine Spieler, ihre Logins, die Spiele und die Einstellungen.\n\nMelde dich mit deiner E-Mail-Adresse an, um loszulegen.',
            button: 'Oche öffnen',
        },
        adminInvited: {
            subject: 'Du bist eingeladen, {{club}} auf Oche zu führen',
            body: 'Hallo {{firstname}}\n\n{{inviter}} hat dich zum Administrator von {{club}} auf Oche gemacht, der Anzeigetafel und Statistik für Dartclubs. Für dich wurde ein Konto erstellt.\n\nWähle mit dem Knopf unten dein Passwort, um dich anzumelden. Der Link ist {{validity}} gültig.',
            button: 'Passwort wählen',
        },
        playerAdded: {
            subject: 'Dein Login für {{club}}',
            body: 'Hallo {{firstname}}\n\n{{inviter}} hat dir ein Login für {{club}} auf Oche gegeben, als Spieler {{nickname}}. Du kannst jetzt selbst Spiele und Trainings starten und deine Statistik, Badges und dein Level verfolgen.\n\nMelde dich mit deiner E-Mail-Adresse an, um loszulegen.',
            button: 'Oche öffnen',
        },
        playerInvited: {
            subject: 'Du bist eingeladen, bei {{club}} zu spielen',
            body: 'Hallo {{firstname}}\n\n{{inviter}} hat dich zu {{club}} auf Oche eingeladen, der Anzeigetafel und Statistik für Dartclubs, als Spieler {{nickname}}. Für dich wurde ein Konto erstellt.\n\nWähle mit dem Knopf unten dein Passwort, um dich anzumelden. Der Link ist {{validity}} gültig.',
            button: 'Passwort wählen',
        },
    },
    fr: {
        passwordReset: {
            subject: 'Réinitialise ton mot de passe Oche',
            body: 'Bonjour {{firstname}},\n\nNous avons reçu une demande pour réinitialiser le mot de passe de ton compte Oche. Choisis-en un nouveau avec le bouton ci-dessous. Le lien fonctionne une fois et expire dans {{validity}}.\n\nSi tu n\'as rien demandé, tu peux ignorer cet e-mail : ton mot de passe reste tel quel.',
            button: 'Choisir un nouveau mot de passe',
        },
        adminAdded: {
            subject: 'Tu es maintenant admin de {{club}}',
            body: 'Bonjour {{firstname}},\n\n{{inviter}} a fait de toi un administrateur de {{club}} sur Oche. En tant qu\'admin, tu t\'occupes du club : ses joueurs, leurs accès, les parties et les réglages.\n\nConnecte-toi avec ton adresse e-mail pour commencer.',
            button: 'Ouvrir Oche',
        },
        adminInvited: {
            subject: 'Tu es invité à gérer {{club}} sur Oche',
            body: 'Bonjour {{firstname}},\n\n{{inviter}} a fait de toi un administrateur de {{club}} sur Oche, le tableau de score et les statistiques pour les clubs de fléchettes. Un compte a été créé pour toi.\n\nChoisis ton mot de passe avec le bouton ci-dessous pour te connecter. Le lien est valable {{validity}}.',
            button: 'Choisir ton mot de passe',
        },
        playerAdded: {
            subject: 'Ton accès pour {{club}}',
            body: 'Bonjour {{firstname}},\n\n{{inviter}} t\'a donné un accès à {{club}} sur Oche, en tant que joueur {{nickname}}. Tu peux maintenant lancer toi-même des parties et des entraînements et suivre tes statistiques, tes badges et ton niveau.\n\nConnecte-toi avec ton adresse e-mail pour commencer.',
            button: 'Ouvrir Oche',
        },
        playerInvited: {
            subject: 'Tu es invité à jouer à {{club}}',
            body: 'Bonjour {{firstname}},\n\n{{inviter}} t\'a invité à {{club}} sur Oche, le tableau de score et les statistiques pour les clubs de fléchettes, en tant que joueur {{nickname}}. Un compte a été créé pour toi.\n\nChoisis ton mot de passe avec le bouton ci-dessous pour te connecter. Le lien est valable {{validity}}.',
            button: 'Choisir ton mot de passe',
        },
    },
    it: {
        passwordReset: {
            subject: 'Reimposta la tua password di Oche',
            body: 'Ciao {{firstname}},\n\nAbbiamo ricevuto una richiesta di reimpostare la password del tuo account Oche. Scegline una nuova con il pulsante qui sotto. Il link funziona una volta e scade tra {{validity}}.\n\nSe non l\'hai chiesto tu, puoi ignorare questa email: la tua password resta com\'è.',
            button: 'Scegli una nuova password',
        },
        adminAdded: {
            subject: 'Ora sei admin di {{club}}',
            body: 'Ciao {{firstname}},\n\n{{inviter}} ti ha nominato amministratore di {{club}} su Oche. Come admin ti occupi del club: i suoi giocatori, i loro accessi, le partite e le impostazioni.\n\nAccedi con il tuo indirizzo email per iniziare.',
            button: 'Apri Oche',
        },
        adminInvited: {
            subject: 'Sei invitato a gestire {{club}} su Oche',
            body: 'Ciao {{firstname}},\n\n{{inviter}} ti ha nominato amministratore di {{club}} su Oche, il segnapunti e le statistiche per i club di freccette. È stato creato un account per te.\n\nScegli la tua password con il pulsante qui sotto per accedere. Il link è valido per {{validity}}.',
            button: 'Scegli la tua password',
        },
        playerAdded: {
            subject: 'Il tuo accesso per {{club}}',
            body: 'Ciao {{firstname}},\n\n{{inviter}} ti ha dato un accesso a {{club}} su Oche, come giocatore {{nickname}}. Ora puoi avviare da solo partite e allenamenti e seguire le tue statistiche, i tuoi badge e il tuo livello.\n\nAccedi con il tuo indirizzo email per iniziare.',
            button: 'Apri Oche',
        },
        playerInvited: {
            subject: 'Sei invitato a giocare a {{club}}',
            body: 'Ciao {{firstname}},\n\n{{inviter}} ti ha invitato a {{club}} su Oche, il segnapunti e le statistiche per i club di freccette, come giocatore {{nickname}}. È stato creato un account per te.\n\nScegli la tua password con il pulsante qui sotto per accedere. Il link è valido per {{validity}}.',
            button: 'Scegli la tua password',
        },
    },
    es: {
        passwordReset: {
            subject: 'Restablece tu contraseña de Oche',
            body: 'Hola, {{firstname}}:\n\nHemos recibido una solicitud para restablecer la contraseña de tu cuenta de Oche. Elige una nueva con el botón de abajo. El enlace funciona una vez y caduca en {{validity}}.\n\nSi no lo pediste, puedes ignorar este correo: tu contraseña se queda como está.',
            button: 'Elegir una contraseña nueva',
        },
        adminAdded: {
            subject: 'Ahora eres admin de {{club}}',
            body: 'Hola, {{firstname}}:\n\n{{inviter}} te ha nombrado administrador de {{club}} en Oche. Como admin cuidas del club: sus jugadores, sus accesos, las partidas y los ajustes.\n\nInicia sesión con tu dirección de correo para empezar.',
            button: 'Abrir Oche',
        },
        adminInvited: {
            subject: 'Te invitan a llevar {{club}} en Oche',
            body: 'Hola, {{firstname}}:\n\n{{inviter}} te ha nombrado administrador de {{club}} en Oche, el marcador y las estadísticas para clubes de dardos. Se ha creado una cuenta para ti.\n\nElige tu contraseña con el botón de abajo para iniciar sesión. El enlace es válido durante {{validity}}.',
            button: 'Elegir tu contraseña',
        },
        playerAdded: {
            subject: 'Tu acceso para {{club}}',
            body: 'Hola, {{firstname}}:\n\n{{inviter}} te ha dado un acceso a {{club}} en Oche, como el jugador {{nickname}}. Ahora puedes empezar tú mismo partidas y entrenamientos y seguir tus estadísticas, insignias y nivel.\n\nInicia sesión con tu dirección de correo para empezar.',
            button: 'Abrir Oche',
        },
        playerInvited: {
            subject: 'Te invitan a jugar en {{club}}',
            body: 'Hola, {{firstname}}:\n\n{{inviter}} te ha invitado a {{club}} en Oche, el marcador y las estadísticas para clubes de dardos, como el jugador {{nickname}}. Se ha creado una cuenta para ti.\n\nElige tu contraseña con el botón de abajo para iniciar sesión. El enlace es válido durante {{validity}}.',
            button: 'Elegir tu contraseña',
        },
    },
};

// the words of the layout around every mail
export const LAYOUT = {
    en: {
        footer: (appUrl) => `This email was sent by Oche${appUrl ? ` (${appUrl})` : ''}. If you did not expect it, you can ignore it.`,
        noButton: 'If the button does not work, copy this address into your browser:',
        hour: ['hour', 'hours'],
        day: ['day', 'days'],
    },
    de: {
        footer: (appUrl) => `Diese E-Mail wurde von Oche${appUrl ? ` (${appUrl})` : ''} gesendet. Falls du sie nicht erwartet hast, kannst du sie ignorieren.`,
        noButton: 'Falls der Knopf nicht funktioniert, kopiere diese Adresse in deinen Browser:',
        hour: ['Stunde', 'Stunden'],
        day: ['Tag', 'Tage'],
    },
    fr: {
        footer: (appUrl) => `Cet e-mail a été envoyé par Oche${appUrl ? ` (${appUrl})` : ''}. Si tu ne l'attendais pas, tu peux l'ignorer.`,
        noButton: 'Si le bouton ne fonctionne pas, copie cette adresse dans ton navigateur :',
        hour: ['heure', 'heures'],
        day: ['jour', 'jours'],
    },
    it: {
        footer: (appUrl) => `Questa email è stata inviata da Oche${appUrl ? ` (${appUrl})` : ''}. Se non te l'aspettavi, puoi ignorarla.`,
        noButton: 'Se il pulsante non funziona, copia questo indirizzo nel tuo browser:',
        hour: ['ora', 'ore'],
        day: ['giorno', 'giorni'],
    },
    es: {
        footer: (appUrl) => `Este correo lo ha enviado Oche${appUrl ? ` (${appUrl})` : ''}. Si no lo esperabas, puedes ignorarlo.`,
        noButton: 'Si el botón no funciona, copia esta dirección en tu navegador:',
        hour: ['hora', 'horas'],
        day: ['día', 'días'],
    },
};

export const layoutOf = (language) => LAYOUT[language] ?? LAYOUT.en;
