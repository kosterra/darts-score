// The use of the app on one day, for the usage statistics of the global
// admins: who used it (accounts, once each) and how many logins there were.
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
    },
    { timestamps: false }
  );
  schema.index({ at: 1 }, { expireAfterSeconds: USAGE_KEEP_DAYS * 24 * 60 * 60 });
  return mongoose.model('usageday', schema);
};
