// Warnings and errors the API logged, for the error log of global admins.
// Entries remove themselves after 30 days.
export const LOG_RETENTION_DAYS = 30;

export default (mongoose) => {
  const schema = mongoose.Schema(
    {
      time:    { type: Date, default: Date.now, expires: `${LOG_RETENTION_DAYS}d` },
      level:   { type: String, enum: ['warn', 'error', 'fatal'], required: true },
      message: { type: String, default: '' },
      // the error behind the entry, when there was one
      error:   { type: { type: String }, message: String, stack: String },
      // anything else that was logged with it, e.g. the request that failed
      context: { type: mongoose.Schema.Types.Mixed, default: null },
    },
    { versionKey: false }
  );
  schema.index({ level: 1, time: -1 });

  schema.method('toJSON', function () {
    const { _id, ...object } = this.toObject();
    object.id = _id;
    return object;
  });

  return mongoose.model('logentry', schema);
};
