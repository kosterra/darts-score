// A spam rule that fired, shown to global admins on the alerts page.
// The same rule firing again for the same account or address within an hour
// counts up the open alert instead of adding a new one.
export const ALERT_SEVERITIES = ['warning', 'critical'];
export const ALERT_ACTIONS = ['none', 'rejected', 'user-blocked', 'ip-blocked'];

export default (mongoose) => {
  const schema = mongoose.Schema(
    {
      rule:       { type: String, required: true },
      severity:   { type: String, enum: ALERT_SEVERITIES, default: 'warning' },
      message:    { type: String, default: '' },
      // what triggered it: a registration, club, player, game or training
      subject:    {
        type: { type: String },
        id:   { type: mongoose.Schema.Types.ObjectId, default: null },
        name: { type: String, default: '' },
      },
      // who and from where; email and club name stay when those are deleted
      user:       { type: mongoose.Schema.Types.ObjectId, ref: 'user', default: null },
      userEmail:  { type: String, default: '' },
      club:       { type: mongoose.Schema.Types.ObjectId, ref: 'club', default: null },
      clubName:   { type: String, default: '' },
      ip:         { type: String, default: '' },
      // what the rules did about it
      action:     { type: String, enum: ALERT_ACTIONS, default: 'none' },
      count:      { type: Number, default: 1 },
      lastSeenAt: { type: Date, default: Date.now },
      status:     { type: String, enum: ['open', 'resolved'], default: 'open' },
      resolvedAt: { type: Date, default: null },
      resolvedBy: { type: String, default: '' },
    },
    { timestamps: true }
  );
  schema.index({ status: 1, lastSeenAt: -1 });

  schema.method('toJSON', function () {
    // eslint-disable-next-line no-unused-vars
    const { _id, __v, ...object } = this.toObject();
    object.id = _id;
    return object;
  });

  return mongoose.model('alert', schema);
};
