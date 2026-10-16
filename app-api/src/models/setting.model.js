// Settings of the whole installation, set by global admins. There is one
// document per kind of setting, found by its key (e.g. "banner").
export default (mongoose) => {
  const schema = mongoose.Schema(
    {
      key:   { type: String, required: true, unique: true },
      value: { type: mongoose.Schema.Types.Mixed, default: {} },
    },
    { timestamps: true }
  );

  return mongoose.model('setting', schema);
};
