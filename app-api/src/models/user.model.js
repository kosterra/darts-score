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
      // the user's own dashboards, per club, instead of the club's: [{ club, layout: [{ id, size }] }]
      dashboards:     { type: [{ _id: false, club: { type: mongoose.Schema.Types.ObjectId, ref: 'club' }, layout: [{ _id: false, id: String, size: String }] }], default: [] },
      role:           { type: String, enum: Object.values(ROLES), default: ROLES.USER },
      // Bumped on password change so older session cookies stop working
      sessionVersion: { type: Number, default: 0 },
      // Hash of the token from a "set your password" mail, and when it stops working
      resetTokenHash:    { type: String, default: null, index: true },
      resetTokenExpires: { type: Date, default: null },
      // Shown to global admins, to spot accounts nobody uses
      lastLoginAt:       { type: Date, default: null },
      // A blocked account cannot log in or use the API, e.g. one a spam rule caught
      blockedAt:         { type: Date, default: null },
      blockedReason:     { type: String, default: '' },
    },
    { timestamps: true }
  );

  schema.method('toJSON', function () {
    // eslint-disable-next-line no-unused-vars
    const { _id, passwordHash, sessionVersion, resetTokenHash, resetTokenExpires, ...object } = this.toObject();
    object.id = _id;
    return object;
  });

  return mongoose.model('user', schema);
};
