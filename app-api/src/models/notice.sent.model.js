// What a reminder or summary was sent about (e.g. "gameRunning:<game id>"),
// so the hourly job sends it once.
export default (mongoose) => {
  const schema = mongoose.Schema(
    {
      key: { type: String, required: true, unique: true },
      at:  { type: Date, default: Date.now },
    },
    { timestamps: false }
  );
  schema.index({ at: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });
  return mongoose.model('noticesent', schema);
};
