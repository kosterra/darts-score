// A link (several per player may be open: the one an admin printed, those in
// the mails) with which a player without a login takes over their player with a
// login of their own: whoever opens it creates an account, or logs in, and
// becomes that player with all their games, statistics and badges.
export default (mongoose) => {
  const schema = mongoose.Schema(
    {
      player:    { type: mongoose.Schema.Types.ObjectId, ref: 'player', required: true, index: true },
      club:      { type: mongoose.Schema.Types.ObjectId, ref: 'club', required: true },
      tokenHash: { type: String, required: true, index: true },
      expiresAt: { type: Date, required: true },
      createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'user' },
    },
    { timestamps: true }
  );
  // an expired link goes by itself
  schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
  return mongoose.model('playerclaim', schema);
};
