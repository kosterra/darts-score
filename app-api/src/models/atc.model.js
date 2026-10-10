export default (mongoose) => {
  const schema = mongoose.Schema(
    {
      timeMs:       { type: Number, min: 1 },
      hours:        Number,
      minutes:      Number,
      seconds:      Number,
      milliseconds: Number,
      mode:         String,
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
