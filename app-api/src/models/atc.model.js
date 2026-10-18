export default (mongoose) => {
  const schema = mongoose.Schema(
    {
      club:              { type: mongoose.Schema.Types.ObjectId, ref: 'club', index: true },
      // the time in hundredths of a second (despite the name)
      timeMs:       { type: Number, min: 1 },
      // the parts of the time, only in entries from before 2026-10
      hours:        Number,
      minutes:      Number,
      seconds:      Number,
      milliseconds: Number,
      mode:         String,
      // { id, nickname }: the nickname for when the player is deleted later
      player:       mongoose.Schema.Types.Mixed,
    },
    { timestamps: true }
  );

  // Used by mode filter queries
  schema.index({ mode: 1 });

  schema.method('toJSON', function () {
    const { _id, ...object } = this.toObject();
    object.id = _id;
    return object;
  });

  return mongoose.model('atc', schema);
};
