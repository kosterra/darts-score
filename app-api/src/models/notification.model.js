export default (mongoose) => {
  const schema = mongoose.Schema(
    {
      // who it is for: an account, or a player without a login at the address their club keeps (see playerContact)
      user:     { type: mongoose.Schema.Types.ObjectId, ref: 'user', default: null },
      player:   { type: mongoose.Schema.Types.ObjectId, ref: 'player', default: null },
      // what happened, e.g. 'fairPlayDeleted' (see rules/notifications.js)
      kind:     { type: String, required: true },
      title:    { type: String, required: true },
      body:     String,
      // where it leads, a path of the app; with the club it belongs to
      link:     String,
      club:     { type: mongoose.Schema.Types.ObjectId, ref: 'club' },
      // who did it, with the name for when the account is gone later
      by:       { type: mongoose.Schema.Types.ObjectId, ref: 'user' },
      byName:   String,
      readAt:   { type: Date, default: null },
      // whether it shows in the notification center, and how it goes by mail:
      // 'off', 'instant', 'daily' or 'weekly' (with the next summary); when it went
      inApp:    { type: Boolean, default: true },
      mail:     { type: String, default: 'off' },
      mailedAt: { type: Date, default: null },
    },
    { timestamps: true }
  );
  schema.index({ user: 1, createdAt: -1 });
  schema.index({ mail: 1, mailedAt: 1 });
  // a year is enough to look back
  schema.index({ createdAt: 1 }, { expireAfterSeconds: 365 * 24 * 60 * 60 });
  return mongoose.model('notification', schema);
};
