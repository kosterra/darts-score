// An internet address that may not register new accounts. A block with an
// end ("until") disappears by itself once it is over.
export default (mongoose) => {
  const schema = mongoose.Schema(
    {
      ip:        { type: String, required: true, unique: true },
      reason:    { type: String, default: '' },
      until:     { type: Date, default: null, expires: 0 },
      // "rules" when a spam rule blocked it, otherwise the global admin's email
      blockedBy: { type: String, default: 'rules' },
    },
    { timestamps: true }
  );

  schema.method('toJSON', function () {
    // eslint-disable-next-line no-unused-vars
    const { _id, __v, ...object } = this.toObject();
    object.id = _id;
    return object;
  });

  return mongoose.model('blockedip', schema);
};
