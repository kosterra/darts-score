import { ATTENDANCE_ANSWERS } from '../rules/calendar.js';

// Who comes to a club night: one answer per player and night (see rules/calendar.js)
export default (mongoose) => {
  const schema = mongoose.Schema(
    {
      club:   { type: mongoose.Schema.Types.ObjectId, ref: 'club', required: true },
      // the night as "YYYY-MM-DD"
      day:    { type: String, required: true },
      player: { type: mongoose.Schema.Types.ObjectId, ref: 'player', required: true },
      answer: { type: String, enum: ATTENDANCE_ANSWERS, required: true },
    },
    { timestamps: true }
  );
  schema.index({ club: 1, day: 1, player: 1 }, { unique: true });

  schema.method('toJSON', function () {
    // eslint-disable-next-line no-unused-vars
    const { __v, _id, ...object } = this.toObject();
    object.id = _id;
    return object;
  });

  return mongoose.model('attendance', schema);
};
