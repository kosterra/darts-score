// A login that is running: the session cookie carries its sid. Global admins
// see who is logged in and can end a session; it goes by itself once it ends
// (expiresAt), and with a logout.
export default (mongoose) => {
  const schema = mongoose.Schema(
    {
      sid:        { type: String, required: true, unique: true },
      user:       { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true, index: true },
      // the sessionVersion of the account at the login: a new password ends the session
      v:          { type: Number, default: 0 },
      // the browser and system, e.g. "Firefox · Android"
      device:     { type: String, default: '' },
      lastSeenAt: { type: Date, default: Date.now },
      expiresAt:  { type: Date, required: true },
    },
    { timestamps: { createdAt: true, updatedAt: false } }
  );
  schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
  return mongoose.model('session', schema);
};
