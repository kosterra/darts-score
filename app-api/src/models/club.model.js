export default (mongoose) => {
  const schema = mongoose.Schema(
    {
      name:   { type: String, required: true, trim: true },
      // A public club is listed on the public start page. Its admins decide
      // whether running games and finished results are shown there too.
      isPublic:        { type: Boolean, default: false },
      publicLiveGames: { type: Boolean, default: true },
      publicResults:   { type: Boolean, default: true },
      // Users who manage the club; always at least one
      admins: { type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'user' }], index: true },
    },
    { timestamps: true }
  );

  schema.method('toJSON', function () {
    const { _id, ...object } = this.toObject();
    object.id = _id;
    return object;
  });

  return mongoose.model('club', schema);
};
