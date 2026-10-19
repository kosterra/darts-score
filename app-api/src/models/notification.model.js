export default (mongoose) => {
  const schema = mongoose.Schema(
    {
      // who it is for
      user:     { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true },
      // what happened: 'fairPlayDeleted', 'fairPlayRepaired'
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
    },
    { timestamps: true }
  );
  schema.index({ user: 1, createdAt: -1 });
  // a year is enough to look back
  schema.index({ createdAt: 1 }, { expireAfterSeconds: 365 * 24 * 60 * 60 });
  return mongoose.model('notification', schema);
};
