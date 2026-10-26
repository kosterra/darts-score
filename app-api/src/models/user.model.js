// Account-wide roles. What a user may do inside a club is decided per club:
// they are one of its admins, or they are linked to one of its players.
export const ROLES = { GLOBAL_ADMIN: 'globalAdmin', USER: 'user' };
export const CLUB_ROLES = { ADMIN: 'admin', PLAYER: 'player' };
// The languages of the app; the mails and messages of the API follow the user's
export const LANGUAGES = ['en', 'de', 'fr', 'it', 'es'];

export default (mongoose) => {
  const schema = mongoose.Schema(
    {
      email:          { type: String, required: true, unique: true, lowercase: true, trim: true },
      passwordHash:   { type: String, required: true },
      firstname:      { type: String, required: true, trim: true },
      lastname:       { type: String, required: true, trim: true },
      // what opens after logging in: the club's dashboard or the user's own statistics
      startPage:      { type: String, enum: ['dashboard', 'myStatistics'], default: 'dashboard' },
      // the club the app opens in after logging in; null: the one used last on the device
      defaultClub:    { type: mongoose.Schema.Types.ObjectId, ref: 'club', default: null },
      // the language of the app and of the mails sent to the user; null: not chosen yet (English for mails)
      language:       { type: String, enum: [...LANGUAGES, null], default: null },
      role:           { type: String, enum: Object.values(ROLES), default: ROLES.USER },
      // how the player likes to play, on every device: the ways out, the keypad, the last setups, … (see rules/club.rules.js)
      gamePreferences: { type: mongoose.Schema.Types.Mixed, default: undefined },
      // which notifications the user gets, and how: { [topic]: { inApp, mail } } (see rules/notifications.js)
      notifications:  { type: mongoose.Schema.Types.Mixed, default: undefined },
      // when the last mail with the notifications of the day and of the week went out
      digestSentAt:   { daily: { type: Date, default: null }, weekly: { type: Date, default: null } },
      // Bumped on password change so older session cookies stop working
      sessionVersion: { type: Number, default: 0 },
      // Hash of the token from a "set your password" mail, and when it stops working
      resetTokenHash:    { type: String, default: null, index: true },
      resetTokenExpires: { type: Date, default: null },
      // Shown to global admins, to spot accounts nobody uses
      lastLoginAt:       { type: Date, default: null },
      // A blocked account cannot log in or use the API, e.g. one a spam rule caught
      blockedAt:         { type: Date, default: null },
      // the welcome tour (done or skipped) and the first steps on the Dashboard (hidden), for new accounts
      onboarding: {
        tourDoneAt:         { type: Date, default: null },
        firstStepsHiddenAt: { type: Date, default: null },
      },
      blockedReason:     { type: String, default: '' },
      // two-step login (see utils/mfa.js): the secret of the authenticator app (encrypted), one being set
      // up, since when it is on, the step of the code used last, the hashes of the recovery codes,
      // and a value that trusted devices carry (a new one forgets them all)
      mfa: {
        secret:         { type: String, default: null },
        pendingSecret:  { type: String, default: null },
        enabledAt:      { type: Date, default: null },
        lastStep:       { type: Number, default: null },
        recoveryHashes: { type: [String], default: [] },
        trustSalt:      { type: String, default: null },
      },
    },
    { timestamps: true }
  );

  schema.method('toJSON', function () {
    // eslint-disable-next-line no-unused-vars
    const { _id, passwordHash, sessionVersion, resetTokenHash, resetTokenExpires, mfa, ...object } = this.toObject();
    object.id = _id;
    object.mfaEnabled = Boolean(mfa?.enabledAt && mfa?.secret);
    return object;
  });

  return mongoose.model('user', schema);
};
