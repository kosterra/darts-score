/**
 * The mails of the app in German, French, Italian and Spanish: the default
 * texts of every template (as in mail.templates.js for English) and the words
 * of the layout around them. Informal, like the app; Swiss German spelling.
 */

export const TEMPLATE_TEXTS = {
    de: {
        passwordReset: {
            subject: 'Setze dein Legmate-Passwort zurück',
            body: 'Hallo {{firstname}}\n\nWir haben eine Anfrage erhalten, das Passwort deines Legmate-Kontos zurückzusetzen. Wähle mit dem Knopf unten ein neues. Der Link funktioniert einmal und läuft in {{validity}} ab.\n\nFalls du das nicht angefragt hast, kannst du diese E-Mail ignorieren: Dein Passwort bleibt, wie es ist.',
            button: 'Neues Passwort wählen',
        },
        adminAdded: {
            subject: 'Du bist jetzt Admin von {{club}}',
            body: 'Hallo {{firstname}}\n\n{{inviter}} hat dich zum Administrator von {{club}} auf Legmate gemacht. Als Admin kümmerst du dich um den Club: seine Spieler, ihre Logins, die Spiele und die Einstellungen.\n\nMelde dich mit deiner E-Mail-Adresse an, um loszulegen.',
            button: 'Legmate öffnen',
        },
        adminInvited: {
            subject: 'Du bist eingeladen, {{club}} auf Legmate zu führen',
            body: 'Hallo {{firstname}}\n\n{{inviter}} hat dich zum Administrator von {{club}} auf Legmate gemacht, der Anzeigetafel und Statistik für Dartclubs. Für dich wurde ein Konto erstellt.\n\nWähle mit dem Knopf unten dein Passwort, um dich anzumelden. Der Link ist {{validity}} gültig.',
            button: 'Passwort wählen',
        },
        playerAdded: {
            subject: 'Dein Login für {{club}}',
            body: 'Hallo {{firstname}}\n\n{{inviter}} hat dir ein Login für {{club}} auf Legmate gegeben, als Spieler {{nickname}}. Du kannst jetzt selbst Spiele und Trainings starten und deine Statistik, Badges und dein Level verfolgen.\n\nMelde dich mit deiner E-Mail-Adresse an, um loszulegen.',
            button: 'Legmate öffnen',
        },
        playerInvited: {
            subject: 'Du bist eingeladen, bei {{club}} zu spielen',
            body: 'Hallo {{firstname}}\n\n{{inviter}} hat dich zu {{club}} auf Legmate eingeladen, der Anzeigetafel und Statistik für Dartclubs, als Spieler {{nickname}}. Für dich wurde ein Konto erstellt.\n\nWähle mit dem Knopf unten dein Passwort, um dich anzumelden. Der Link ist {{validity}} gültig.',
            button: 'Passwort wählen',
        },
        notification: {
            subject: "{{title}}",
            body: "Hallo {{firstname}}\n\n{{title}}\n\n{{details}}",
            button: "In Legmate öffnen",
        },
        digest: {
            subject: "Deine Legmate-News {{period}}",
            body: "Hallo {{firstname}}\n\nDas ist {{period}} passiert:\n\n{{list}}",
            button: "Deine Mitteilungen öffnen",
        },
        weeklySummary: {
            subject: "Deine Woche am Oche",
            body: "Hallo {{firstname}}\n\nDas war deine Woche am Oche:\n\n{{summary}}",
            button: "Deine Statistik",
        },
        tournamentInvite: {
            subject: "Du bist eingeladen: {{tournament}} von {{club}}",
            body: "Hallo {{firstname}}\n\n{{club}} veranstaltet ein Turnier, {{tournament}}, und du bist eingeladen mitzuspielen.\n\n{{schedule}}\n\nSpielst du mit? Melde dich bis {{closes}} mit dem Knopf unten an. Diesmal nicht? {{declineLink}}",
            button: "Ich bin dabei",
        },
        tournamentReminder: {
            subject: "Letzte Chance: Anmeldung für {{tournament}}",
            body: "Hallo {{firstname}}\n\ndie Anmeldung für {{tournament}} von {{club}} endet am {{closes}}, und du hast noch nicht geantwortet.\n\n{{schedule}}\n\nMelde dich mit dem Knopf unten an. Diesmal nicht? {{declineLink}}",
            button: "Ich bin dabei",
        },
        usageReport: {
            subject: "Legmate: die Woche vom {{week}}",
            body: "Hallo {{firstname}}\n\nSo wurde Legmate in der Woche vom {{week}} genutzt, verglichen mit der Woche davor:\n\n{{summary}}",
            button: "Nutzung im Detail",
        },
        clubSummary: {
            subject: "Die Woche von {{club}}",
            body: "Hallo {{firstname}}\n\nDas war die Woche von {{club}}:\n\n{{summary}}",
            button: "Club öffnen",
        },
        passwordChanged: {
            subject: "Dein Legmate-Passwort wurde geändert",
            body: "Hallo {{firstname}}\n\nDas Passwort deines Legmate-Kontos wurde am {{date}} geändert. Wenn du das warst, ist alles in Ordnung.\n\nWenn nicht, wähle mit dem Knopf unten sofort ein neues Passwort und informiere die Admins deines Clubs.",
            button: "Neues Passwort wählen",
        },
        emailChanged: {
            subject: "Die E-Mail-Adresse deines Legmate-Kontos wurde geändert",
            body: "Hallo {{firstname}}\n\nDie E-Mail-Adresse deines Legmate-Kontos wurde am {{date}} von {{oldEmail}} zu {{newEmail}} geändert. Ab jetzt meldest du dich mit der neuen an.\n\nWenn du das nicht warst, informiere sofort die Admins deines Clubs: Sie können die Adresse zurücksetzen.",
            button: "Legmate öffnen",
        },
        accountBlocked: {
            subject: "Dein Legmate-Konto wurde gesperrt",
            body: "Hallo {{firstname}}\n\nDein Legmate-Konto wurde gesperrt, du kannst dich nicht mehr anmelden. Der Grund: {{reason}}\n\nWenn du denkst, dass das ein Fehler ist, informiere die Admins deines Clubs.",
            button: "Legmate öffnen",
        },
        securityNotice: {
            subject: "{{title}}",
            body: "Hallo {{firstname}}\n\n{{title}} ({{date}}).\n\n{{details}}",
            button: "Legmate öffnen",
        },
        contactNews: {
            subject: "{{title}}",
            body: "Hallo {{firstname}}\n\n{{details}}\n\nDu erhältst diese E-Mail, weil {{club}} deine Adresse für deinen Spieler {{nickname}} hinterlegt hat. Mit einem eigenen Login siehst du deine Statistik, Badges und dein Level jederzeit.",
            button: "Eigenes Login holen",
        },
        contactMessage: {
            subject: "Eine Nachricht an Legmate von {{name}}",
            body: "Über das Kontaktformular von Legmate ist eine Nachricht gekommen.\n\nVon: {{name}} ({{email}})\n\n{{message}}\n\nAntworte auf diese E-Mail, um {{name}} zu antworten.",
            button: "Legmate öffnen",
        },
    },
    fr: {
        passwordReset: {
            subject: 'Réinitialise ton mot de passe Legmate',
            body: 'Bonjour {{firstname}},\n\nNous avons reçu une demande pour réinitialiser le mot de passe de ton compte Legmate. Choisis-en un nouveau avec le bouton ci-dessous. Le lien fonctionne une fois et expire dans {{validity}}.\n\nSi tu n\'as rien demandé, tu peux ignorer cet e-mail : ton mot de passe reste tel quel.',
            button: 'Choisir un nouveau mot de passe',
        },
        adminAdded: {
            subject: 'Tu es maintenant admin de {{club}}',
            body: 'Bonjour {{firstname}},\n\n{{inviter}} a fait de toi un administrateur de {{club}} sur Legmate. En tant qu\'admin, tu t\'occupes du club : ses joueurs, leurs accès, les parties et les réglages.\n\nConnecte-toi avec ton adresse e-mail pour commencer.',
            button: 'Ouvrir Legmate',
        },
        adminInvited: {
            subject: 'Tu es invité à gérer {{club}} sur Legmate',
            body: 'Bonjour {{firstname}},\n\n{{inviter}} a fait de toi un administrateur de {{club}} sur Legmate, le tableau de score et les statistiques pour les clubs de fléchettes. Un compte a été créé pour toi.\n\nChoisis ton mot de passe avec le bouton ci-dessous pour te connecter. Le lien est valable {{validity}}.',
            button: 'Choisir ton mot de passe',
        },
        playerAdded: {
            subject: 'Ton accès pour {{club}}',
            body: 'Bonjour {{firstname}},\n\n{{inviter}} t\'a donné un accès à {{club}} sur Legmate, en tant que joueur {{nickname}}. Tu peux maintenant lancer toi-même des parties et des entraînements et suivre tes statistiques, tes badges et ton niveau.\n\nConnecte-toi avec ton adresse e-mail pour commencer.',
            button: 'Ouvrir Legmate',
        },
        playerInvited: {
            subject: 'Tu es invité à jouer à {{club}}',
            body: 'Bonjour {{firstname}},\n\n{{inviter}} t\'a invité à {{club}} sur Legmate, le tableau de score et les statistiques pour les clubs de fléchettes, en tant que joueur {{nickname}}. Un compte a été créé pour toi.\n\nChoisis ton mot de passe avec le bouton ci-dessous pour te connecter. Le lien est valable {{validity}}.',
            button: 'Choisir ton mot de passe',
        },
        notification: {
            subject: "{{title}}",
            body: "Bonjour {{firstname}},\n\n{{title}}\n\n{{details}}",
            button: "Ouvrir dans Legmate",
        },
        digest: {
            subject: "Tes nouvelles de Legmate {{period}}",
            body: "Bonjour {{firstname}},\n\nVoici ce qui s'est passé {{period}} :\n\n{{list}}",
            button: "Ouvrir tes notifications",
        },
        weeklySummary: {
            subject: "Ta semaine à l'oche",
            body: "Bonjour {{firstname}},\n\nVoici ta semaine à l'oche :\n\n{{summary}}",
            button: "Tes statistiques",
        },
        tournamentInvite: {
            subject: "Tu es invité : {{tournament}} de {{club}}",
            body: "Salut {{firstname}},\n\n{{club}} organise un tournoi, {{tournament}}, et tu es invité à jouer.\n\n{{schedule}}\n\nTu joues ? Inscris-toi avec le bouton ci-dessous jusqu'au {{closes}}. Pas cette fois ? {{declineLink}}",
            button: "J'en suis",
        },
        tournamentReminder: {
            subject: "Dernière chance pour t'inscrire à {{tournament}}",
            body: "Salut {{firstname}},\n\nles inscriptions pour {{tournament}} de {{club}} se terminent le {{closes}}, et tu n'as pas encore répondu.\n\n{{schedule}}\n\nInscris-toi avec le bouton ci-dessous. Pas cette fois ? {{declineLink}}",
            button: "J'en suis",
        },
        usageReport: {
            subject: "Legmate : la semaine du {{week}}",
            body: "Bonjour {{firstname}},\n\nVoici comment Legmate a été utilisé la semaine du {{week}}, par rapport à la semaine précédente :\n\n{{summary}}",
            button: "Utilisation en détail",
        },
        clubSummary: {
            subject: "La semaine de {{club}}",
            body: "Bonjour {{firstname}},\n\nVoici la semaine de {{club}} :\n\n{{summary}}",
            button: "Ouvrir le club",
        },
        passwordChanged: {
            subject: "Ton mot de passe Legmate a été modifié",
            body: "Bonjour {{firstname}},\n\nLe mot de passe de ton compte Legmate a été modifié le {{date}}. Si c'était toi, tout va bien.\n\nSinon, choisis tout de suite un nouveau mot de passe avec le bouton ci-dessous et préviens les admins de ton club.",
            button: "Choisir un nouveau mot de passe",
        },
        emailChanged: {
            subject: "L'adresse e-mail de ton compte Legmate a été modifiée",
            body: "Bonjour {{firstname}},\n\nL'adresse e-mail de ton compte Legmate est passée de {{oldEmail}} à {{newEmail}} le {{date}}. Désormais, tu te connectes avec la nouvelle.\n\nSi ce n'était pas toi, préviens tout de suite les admins de ton club : ils peuvent remettre l'ancienne adresse.",
            button: "Ouvrir Legmate",
        },
        accountBlocked: {
            subject: "Ton compte Legmate a été bloqué",
            body: "Bonjour {{firstname}},\n\nTon compte Legmate a été bloqué, tu ne peux plus te connecter. La raison : {{reason}}\n\nSi tu penses que c'est une erreur, préviens les admins de ton club.",
            button: "Ouvrir Legmate",
        },
        securityNotice: {
            subject: "{{title}}",
            body: "Bonjour {{firstname}},\n\n{{title}} ({{date}}).\n\n{{details}}",
            button: "Ouvrir Legmate",
        },
        contactNews: {
            subject: "{{title}}",
            body: "Bonjour {{firstname}},\n\n{{details}}\n\nTu reçois cet e-mail parce que {{club}} garde ton adresse pour ton joueur {{nickname}}. Avec ton propre accès, tu vois tes statistiques, tes badges et ton niveau à tout moment.",
            button: "Obtenir ton propre accès",
        },
        contactMessage: {
            subject: "Un message pour Legmate de {{name}}",
            body: "Un message est arrivé par le formulaire de contact de Legmate.\n\nDe : {{name}} ({{email}})\n\n{{message}}\n\nRéponds à cet e-mail pour répondre à {{name}}.",
            button: "Ouvrir Legmate",
        },
    },
    it: {
        passwordReset: {
            subject: 'Reimposta la tua password di Legmate',
            body: 'Ciao {{firstname}},\n\nAbbiamo ricevuto una richiesta di reimpostare la password del tuo account Legmate. Scegline una nuova con il pulsante qui sotto. Il link funziona una volta e scade tra {{validity}}.\n\nSe non l\'hai chiesto tu, puoi ignorare questa email: la tua password resta com\'è.',
            button: 'Scegli una nuova password',
        },
        adminAdded: {
            subject: 'Ora sei admin di {{club}}',
            body: 'Ciao {{firstname}},\n\n{{inviter}} ti ha nominato amministratore di {{club}} su Legmate. Come admin ti occupi del club: i suoi giocatori, i loro accessi, le partite e le impostazioni.\n\nAccedi con il tuo indirizzo email per iniziare.',
            button: 'Apri Legmate',
        },
        adminInvited: {
            subject: 'Sei invitato a gestire {{club}} su Legmate',
            body: 'Ciao {{firstname}},\n\n{{inviter}} ti ha nominato amministratore di {{club}} su Legmate, il segnapunti e le statistiche per i club di freccette. È stato creato un account per te.\n\nScegli la tua password con il pulsante qui sotto per accedere. Il link è valido per {{validity}}.',
            button: 'Scegli la tua password',
        },
        playerAdded: {
            subject: 'Il tuo accesso per {{club}}',
            body: 'Ciao {{firstname}},\n\n{{inviter}} ti ha dato un accesso a {{club}} su Legmate, come giocatore {{nickname}}. Ora puoi avviare da solo partite e allenamenti e seguire le tue statistiche, i tuoi badge e il tuo livello.\n\nAccedi con il tuo indirizzo email per iniziare.',
            button: 'Apri Legmate',
        },
        playerInvited: {
            subject: 'Sei invitato a giocare a {{club}}',
            body: 'Ciao {{firstname}},\n\n{{inviter}} ti ha invitato a {{club}} su Legmate, il segnapunti e le statistiche per i club di freccette, come giocatore {{nickname}}. È stato creato un account per te.\n\nScegli la tua password con il pulsante qui sotto per accedere. Il link è valido per {{validity}}.',
            button: 'Scegli la tua password',
        },
        notification: {
            subject: "{{title}}",
            body: "Ciao {{firstname}},\n\n{{title}}\n\n{{details}}",
            button: "Apri in Legmate",
        },
        digest: {
            subject: "Le tue novità di Legmate {{period}}",
            body: "Ciao {{firstname}},\n\nEcco cosa è successo {{period}}:\n\n{{list}}",
            button: "Apri le tue notifiche",
        },
        weeklySummary: {
            subject: "La tua settimana all'oche",
            body: "Ciao {{firstname}},\n\nEcco la tua settimana all'oche:\n\n{{summary}}",
            button: "Le tue statistiche",
        },
        tournamentInvite: {
            subject: "Sei invitato: {{tournament}} di {{club}}",
            body: "Ciao {{firstname}},\n\n{{club}} organizza un torneo, {{tournament}}, e sei invitato a giocare.\n\n{{schedule}}\n\nGiochi? Iscriviti con il pulsante qui sotto entro il {{closes}}. Non questa volta? {{declineLink}}",
            button: "Ci sono",
        },
        tournamentReminder: {
            subject: "Ultima occasione per iscriverti a {{tournament}}",
            body: "Ciao {{firstname}},\n\nle iscrizioni a {{tournament}} di {{club}} chiudono il {{closes}} e non hai ancora risposto.\n\n{{schedule}}\n\nIscriviti con il pulsante qui sotto. Non questa volta? {{declineLink}}",
            button: "Ci sono",
        },
        usageReport: {
            subject: "Legmate: la settimana del {{week}}",
            body: "Ciao {{firstname}},\n\nEcco come è stato usato Legmate nella settimana del {{week}}, rispetto alla settimana prima:\n\n{{summary}}",
            button: "Utilizzo nel dettaglio",
        },
        clubSummary: {
            subject: "La settimana di {{club}}",
            body: "Ciao {{firstname}},\n\nEcco la settimana di {{club}}:\n\n{{summary}}",
            button: "Apri il club",
        },
        passwordChanged: {
            subject: "La tua password di Legmate è stata cambiata",
            body: "Ciao {{firstname}},\n\nLa password del tuo account Legmate è stata cambiata il {{date}}. Se sei stato tu, va tutto bene.\n\nAltrimenti scegli subito una nuova password con il pulsante qui sotto e avvisa gli admin del tuo club.",
            button: "Scegli una nuova password",
        },
        emailChanged: {
            subject: "L'indirizzo email del tuo account Legmate è stato cambiato",
            body: "Ciao {{firstname}},\n\nL'indirizzo email del tuo account Legmate è stato cambiato da {{oldEmail}} a {{newEmail}} il {{date}}. D'ora in poi accedi con quello nuovo.\n\nSe non sei stato tu, avvisa subito gli admin del tuo club: possono rimettere l'indirizzo di prima.",
            button: "Apri Legmate",
        },
        accountBlocked: {
            subject: "Il tuo account Legmate è stato bloccato",
            body: "Ciao {{firstname}},\n\nIl tuo account Legmate è stato bloccato, non puoi più accedere. Il motivo: {{reason}}\n\nSe pensi che sia un errore, avvisa gli admin del tuo club.",
            button: "Apri Legmate",
        },
        securityNotice: {
            subject: "{{title}}",
            body: "Ciao {{firstname}},\n\n{{title}} ({{date}}).\n\n{{details}}",
            button: "Apri Legmate",
        },
        contactNews: {
            subject: "{{title}}",
            body: "Ciao {{firstname}},\n\n{{details}}\n\nRicevi questa email perché {{club}} conserva il tuo indirizzo per il tuo giocatore {{nickname}}. Con un accesso tuo vedi le tue statistiche, i badge e il livello in ogni momento.",
            button: "Ottieni un accesso tuo",
        },
        contactMessage: {
            subject: "Un messaggio per Legmate da {{name}}",
            body: "È arrivato un messaggio dal modulo di contatto di Legmate.\n\nDa: {{name}} ({{email}})\n\n{{message}}\n\nRispondi a questa email per rispondere a {{name}}.",
            button: "Apri Legmate",
        },
    },
    es: {
        passwordReset: {
            subject: 'Restablece tu contraseña de Legmate',
            body: 'Hola, {{firstname}}:\n\nHemos recibido una solicitud para restablecer la contraseña de tu cuenta de Legmate. Elige una nueva con el botón de abajo. El enlace funciona una vez y caduca en {{validity}}.\n\nSi no lo pediste, puedes ignorar este correo: tu contraseña se queda como está.',
            button: 'Elegir una contraseña nueva',
        },
        adminAdded: {
            subject: 'Ahora eres admin de {{club}}',
            body: 'Hola, {{firstname}}:\n\n{{inviter}} te ha nombrado administrador de {{club}} en Legmate. Como admin cuidas del club: sus jugadores, sus accesos, las partidas y los ajustes.\n\nInicia sesión con tu dirección de correo para empezar.',
            button: 'Abrir Legmate',
        },
        adminInvited: {
            subject: 'Te invitan a llevar {{club}} en Legmate',
            body: 'Hola, {{firstname}}:\n\n{{inviter}} te ha nombrado administrador de {{club}} en Legmate, el marcador y las estadísticas para clubes de dardos. Se ha creado una cuenta para ti.\n\nElige tu contraseña con el botón de abajo para iniciar sesión. El enlace es válido durante {{validity}}.',
            button: 'Elegir tu contraseña',
        },
        playerAdded: {
            subject: 'Tu acceso para {{club}}',
            body: 'Hola, {{firstname}}:\n\n{{inviter}} te ha dado un acceso a {{club}} en Legmate, como el jugador {{nickname}}. Ahora puedes empezar tú mismo partidas y entrenamientos y seguir tus estadísticas, insignias y nivel.\n\nInicia sesión con tu dirección de correo para empezar.',
            button: 'Abrir Legmate',
        },
        playerInvited: {
            subject: 'Te invitan a jugar en {{club}}',
            body: 'Hola, {{firstname}}:\n\n{{inviter}} te ha invitado a {{club}} en Legmate, el marcador y las estadísticas para clubes de dardos, como el jugador {{nickname}}. Se ha creado una cuenta para ti.\n\nElige tu contraseña con el botón de abajo para iniciar sesión. El enlace es válido durante {{validity}}.',
            button: 'Elegir tu contraseña',
        },
        notification: {
            subject: "{{title}}",
            body: "Hola, {{firstname}}:\n\n{{title}}\n\n{{details}}",
            button: "Abrir en Legmate",
        },
        digest: {
            subject: "Tus novedades de Legmate {{period}}",
            body: "Hola, {{firstname}}:\n\nEsto pasó {{period}}:\n\n{{list}}",
            button: "Abrir tus notificaciones",
        },
        weeklySummary: {
            subject: "Tu semana en el oche",
            body: "Hola, {{firstname}}:\n\nAsí fue tu semana en el oche:\n\n{{summary}}",
            button: "Tus estadísticas",
        },
        tournamentInvite: {
            subject: "Estás invitado: {{tournament}} de {{club}}",
            body: "Hola, {{firstname}}:\n\n{{club}} organiza un torneo, {{tournament}}, y estás invitado a jugar.\n\n{{schedule}}\n\n¿Juegas? Apúntate con el botón de abajo hasta el {{closes}}. ¿Esta vez no? {{declineLink}}",
            button: "Me apunto",
        },
        tournamentReminder: {
            subject: "Última oportunidad para apuntarte a {{tournament}}",
            body: "Hola, {{firstname}}:\n\nla inscripción para {{tournament}} de {{club}} termina el {{closes}} y aún no has respondido.\n\n{{schedule}}\n\nApúntate con el botón de abajo. ¿Esta vez no? {{declineLink}}",
            button: "Me apunto",
        },
        usageReport: {
            subject: "Legmate: la semana del {{week}}",
            body: "Hola, {{firstname}}:\n\nAsí se usó Legmate en la semana del {{week}}, comparado con la semana anterior:\n\n{{summary}}",
            button: "Uso en detalle",
        },
        clubSummary: {
            subject: "La semana de {{club}}",
            body: "Hola, {{firstname}}:\n\nAsí fue la semana de {{club}}:\n\n{{summary}}",
            button: "Abrir el club",
        },
        passwordChanged: {
            subject: "Tu contraseña de Legmate ha cambiado",
            body: "Hola, {{firstname}}:\n\nLa contraseña de tu cuenta de Legmate se cambió el {{date}}. Si fuiste tú, todo está bien.\n\nSi no, elige ahora mismo una contraseña nueva con el botón de abajo y avisa a los admins de tu club.",
            button: "Elegir una contraseña nueva",
        },
        emailChanged: {
            subject: "La dirección de correo de tu cuenta de Legmate ha cambiado",
            body: "Hola, {{firstname}}:\n\nLa dirección de correo de tu cuenta de Legmate se cambió de {{oldEmail}} a {{newEmail}} el {{date}}. A partir de ahora inicias sesión con la nueva.\n\nSi no fuiste tú, avisa ahora mismo a los admins de tu club: pueden volver a poner la dirección anterior.",
            button: "Abrir Legmate",
        },
        accountBlocked: {
            subject: "Tu cuenta de Legmate ha sido bloqueada",
            body: "Hola, {{firstname}}:\n\nTu cuenta de Legmate ha sido bloqueada y ya no puedes iniciar sesión. El motivo: {{reason}}\n\nSi crees que es un error, avisa a los admins de tu club.",
            button: "Abrir Legmate",
        },
        securityNotice: {
            subject: "{{title}}",
            body: "Hola, {{firstname}}:\n\n{{title}} ({{date}}).\n\n{{details}}",
            button: "Abrir Legmate",
        },
        contactNews: {
            subject: "{{title}}",
            body: "Hola, {{firstname}}:\n\n{{details}}\n\nRecibes este correo porque {{club}} guarda tu dirección para tu jugador {{nickname}}. Con un acceso propio ves tus estadísticas, insignias y nivel en cualquier momento.",
            button: "Conseguir tu propio acceso",
        },
        contactMessage: {
            subject: "Un mensaje para Legmate de {{name}}",
            body: "Ha llegado un mensaje por el formulario de contacto de Legmate.\n\nDe: {{name}} ({{email}})\n\n{{message}}\n\nResponde a este correo para contestar a {{name}}.",
            button: "Abrir Legmate",
        },
    },
};

// the words of the layout around every mail
export const LAYOUT = {
    en: {
        manage: "Choose which notifications you get:",
        unsubscribe: "No more mails like this:",
        period: { daily: "today", weekly: "this week" },
        footer: (appUrl) => `This email was sent by Legmate${appUrl ? ` (${appUrl})` : ''}. If you did not expect it, you can ignore it.`,
        noButton: 'If the button does not work, copy this address into your browser:',
        hour: ['hour', 'hours'],
        day: ['day', 'days'],
    },
    de: {
        manage: "Wähle, welche Mitteilungen du erhältst:",
        unsubscribe: "Keine solchen E-Mails mehr:",
        period: { daily: "heute", weekly: "diese Woche" },
        footer: (appUrl) => `Diese E-Mail wurde von Legmate${appUrl ? ` (${appUrl})` : ''} gesendet. Falls du sie nicht erwartet hast, kannst du sie ignorieren.`,
        noButton: 'Falls der Knopf nicht funktioniert, kopiere diese Adresse in deinen Browser:',
        hour: ['Stunde', 'Stunden'],
        day: ['Tag', 'Tage'],
    },
    fr: {
        manage: "Choisis les notifications que tu reçois :",
        unsubscribe: "Plus d'e-mails comme celui-ci :",
        period: { daily: "aujourd'hui", weekly: "cette semaine" },
        footer: (appUrl) => `Cet e-mail a été envoyé par Legmate${appUrl ? ` (${appUrl})` : ''}. Si tu ne l'attendais pas, tu peux l'ignorer.`,
        noButton: 'Si le bouton ne fonctionne pas, copie cette adresse dans ton navigateur :',
        hour: ['heure', 'heures'],
        day: ['jour', 'jours'],
    },
    it: {
        manage: "Scegli quali notifiche ricevi:",
        unsubscribe: "Niente più email come questa:",
        period: { daily: "oggi", weekly: "questa settimana" },
        footer: (appUrl) => `Questa email è stata inviata da Legmate${appUrl ? ` (${appUrl})` : ''}. Se non te l'aspettavi, puoi ignorarla.`,
        noButton: 'Se il pulsante non funziona, copia questo indirizzo nel tuo browser:',
        hour: ['ora', 'ore'],
        day: ['giorno', 'giorni'],
    },
    es: {
        manage: "Elige qué notificaciones recibes:",
        unsubscribe: "No más correos como este:",
        period: { daily: "hoy", weekly: "esta semana" },
        footer: (appUrl) => `Este correo lo ha enviado Legmate${appUrl ? ` (${appUrl})` : ''}. Si no lo esperabas, puedes ignorarlo.`,
        noButton: 'Si el botón no funciona, copia esta dirección en tu navegador:',
        hour: ['hora', 'horas'],
        day: ['día', 'días'],
    },
};

export const layoutOf = (language) => LAYOUT[language] ?? LAYOUT.en;

// the test mail of the global admins: whether mails get through, with when and over which server
export const TEST_MAIL = {
    en: {
        subject: 'Test mail from Legmate',
        body: 'Hello {{firstname}},\n\nThis is a test mail from Legmate. If you can read it, the mail server of the installation works: password resets, invitations and notifications get through.\n\nSent on {{date}} through {{server}}.',
        button: 'Open Legmate',
    },
    de: {
        subject: 'Test-E-Mail von Legmate',
        body: 'Hallo {{firstname}}\n\nDas ist eine Test-E-Mail von Legmate. Wenn du sie lesen kannst, funktioniert der Mailserver der Installation: Passwort-Resets, Einladungen und Mitteilungen kommen an.\n\nGesendet am {{date}} über {{server}}.',
        button: 'Legmate öffnen',
    },
    fr: {
        subject: 'E-mail de test d\'Legmate',
        body: 'Salut {{firstname}},\n\nCeci est un e-mail de test d\'Legmate. Si tu peux le lire, le serveur mail de l\'installation fonctionne : les réinitialisations de mot de passe, les invitations et les notifications arrivent.\n\nEnvoyé le {{date}} via {{server}}.',
        button: 'Ouvrir Legmate',
    },
    it: {
        subject: 'Email di prova da Legmate',
        body: 'Ciao {{firstname}},\n\nQuesta è un\'email di prova da Legmate. Se riesci a leggerla, il server di posta dell\'installazione funziona: il ripristino della password, gli inviti e le notifiche arrivano.\n\nInviata il {{date}} tramite {{server}}.',
        button: 'Apri Legmate',
    },
    es: {
        subject: 'Correo de prueba de Legmate',
        body: 'Hola {{firstname}}:\n\nEste es un correo de prueba de Legmate. Si puedes leerlo, el servidor de correo de la instalación funciona: los restablecimientos de contraseña, las invitaciones y las notificaciones llegan.\n\nEnviado el {{date}} a través de {{server}}.',
        button: 'Abrir Legmate',
    },
};
