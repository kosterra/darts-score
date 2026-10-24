// A game or training of a club whose data cannot be real, noted when it was
// saved: enough of them within 30 days raises an alert for the global admins.
export default (mongoose) => {
  const schema = mongoose.Schema(
    {
      club:       { type: mongoose.Schema.Types.ObjectId, ref: 'club', required: true },
      sourceType: { type: String, required: true },
      sourceId:   { type: String, required: true },
      at:         { type: Date, default: Date.now },
    },
    { timestamps: false }
  );
  schema.index({ sourceId: 1 }, { unique: true });
  schema.index({ club: 1, at: 1 });
  // after 30 days a hit no longer counts
  schema.index({ at: 1 }, { expireAfterSeconds: 31 * 24 * 60 * 60 });
  return mongoose.model('fairplayhit', schema);
};
