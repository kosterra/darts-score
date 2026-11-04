// A week of a user's practice goals (see utils/practice.goals.js): the goals of
// that week with how far each came and when it was reached. The current week's
// is noted when a goal is reached (so it is told once); the Monday after, the
// week is closed with its final figures, for the past weeks and the weeks in a row.
export default (mongoose) => {
  const schema = mongoose.Schema(
    {
      user:     { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true },
      // the Monday of the week as "YYYY-MM-DD"
      week:     { type: String, required: true },
      goals:    {
        type: [{ _id: false, id: String, kind: String, target: Number, training: String, withBot: Boolean, progress: Number, reachedAt: Date }],
        default: [],
      },
      // when the week was over and its figures final; null while it runs
      closedAt: { type: Date, default: null },
    },
    { timestamps: true }
  );
  schema.index({ user: 1, week: 1 }, { unique: true });

  return mongoose.model('practiceGoalWeek', schema);
};
