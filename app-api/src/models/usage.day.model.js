// The use of the app on one day, for the usage statistics of the global
// admins: who used it (accounts, once each), how many logins there were, and
// the mails sent against the daily limit of the mail server.
// Kept for half a year: the statistics look back 26 weeks at most.
export const USAGE_KEEP_DAYS = 190;

export default (mongoose) => {
  const schema = mongoose.Schema(
    {
      // the day in the time zone of the server: "2026-10-24"
      day:    { type: String, required: true, unique: true },
      at:     { type: Date, required: true },
      users:  { type: [mongoose.Schema.Types.ObjectId], default: [] },
      logins: { type: Number, default: 0 },
      // the mails of the day: sent, held back once the daily limit was reached, the limit
      // that day, when it was reached (by the count, or refused by the mail server), and
      // when the global admins heard that it was close
      mails:              { type: Number, default: 0 },
      mailsHeldBack:      { type: Number, default: 0 },
      mailLimit:          { type: Number, default: null },
      mailLimitReachedAt: { type: Date, default: null },
      mailLimitNearAt:    { type: Date, default: null },
    },
    { timestamps: false }
  );
  schema.index({ at: 1 }, { expireAfterSeconds: USAGE_KEEP_DAYS * 24 * 60 * 60 });
  return mongoose.model('usageday', schema);
};
