export default (mongoose) => {
  const schema = mongoose.Schema(
    {
      firstname:  { type: String, required: true, trim: true },
      lastname:   { type: String, required: true, trim: true },
      nickname:   { type: String, required: true, trim: true },
      profileImg: { type: String, default: '' },
    },
    { timestamps: true }
  );

  // Speeds up name/nickname search queries
  schema.index({ nickname: 1, firstname: 1, lastname: 1 });

  schema.method('toJSON', function () {
    const { _id, ...object } = this.toObject();
    object.id = _id;
    return object;
  });

  return mongoose.model('player', schema);
};
