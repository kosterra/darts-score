export default (mongoose) => {
  const schema = mongoose.Schema(
    {
      // what was reviewed: a game ('x01', 'cricket', 'elimination', 'clock') or a 'training'
      club:       { type: mongoose.Schema.Types.ObjectId, ref: 'club', index: true },
      sourceType: { type: String, required: true },
      sourceId:   { type: String, required: true },
      // 'ok' looked at and fine, 'watch' kept on the watch list
      status:     { type: String, enum: ['ok', 'watch'], required: true },
      // why, e.g. what makes a finding a false alarm
      reason:     { type: String, default: '' },
      // who decided, with the name for when the account is gone later
      by:         { type: mongoose.Schema.Types.ObjectId, ref: 'user' },
      byName:     String,
    },
    { timestamps: true }
  );
  schema.index({ sourceType: 1, sourceId: 1 }, { unique: true });
  return mongoose.model('integrityReview', schema);
};
