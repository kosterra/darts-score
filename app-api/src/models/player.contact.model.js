// The email address a club keeps for a player without a login, with their
// consent, for the mails its admins chose (see CONTACT_TOPICS in
// rules/notifications.js). Kept apart from the player, so it never shows
// where players are listed.
export default (mongoose) => {
  const schema = mongoose.Schema(
    {
      player:      { type: mongoose.Schema.Types.ObjectId, ref: 'player', required: true, unique: true },
      email:       { type: String, required: true, lowercase: true, trim: true },
      language:    { type: String, default: 'en' },
      // the topics mailed, e.g. ['badges', 'weeklySummary']
      topics:      { type: [String], default: [] },
      // the admin who confirmed the player agreed, and when
      consentBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'user' },
      consentAt:   { type: Date, required: true },
      // when the last mails went out, and when the player asked for no more
      digestSentAt: { daily: { type: Date, default: null }, weekly: { type: Date, default: null } },
      unsubscribedAt: { type: Date, default: null },
    },
    { timestamps: true }
  );
  return mongoose.model('playercontact', schema);
};
