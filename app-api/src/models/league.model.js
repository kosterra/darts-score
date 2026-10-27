import { LEAGUE_STATUSES, MEETINGS } from '../rules/leagues.js';

// A league of a club (see rules/leagues.js and utils/leagues.js): its players,
// how often they meet, the rules of every match, the matchdays with their
// dates and every match (played as an X01 game, or decided by an admin).
export default (mongoose) => {
  const rules = {
    _id: false,
    startingScore: Number, legInMode: String, legOutMode: String,
    setMode: String, numberOfSets: Number, legMode: String, numberOfLegs: Number,
  };
  const schema = mongoose.Schema(
    {
      club:        { type: mongoose.Schema.Types.ObjectId, ref: 'club', required: true, index: true },
      name:        { type: String, required: true, trim: true },
      description: { type: String, default: '', trim: true },
      status:      { type: String, enum: LEAGUE_STATUSES, default: 'draft', index: true },
      players:     { type: [String], default: [] },
      meetings:    { type: Number, enum: MEETINGS, default: 1 },
      rules,
      // the first matchday and how many days from one to the next
      firstDay:    { type: Date, required: true },
      everyDays:   { type: Number, default: 7 },
      // the matchdays of the season: their number and day (an admin may move one)
      matchdays:   { type: [{ _id: false, day: Number, date: Date }], default: [] },
      // every match: "d3-1" the second of the third matchday; its own date when moved
      matches: {
        type: [{
          _id: false,
          id:        { type: String, required: true },
          day:       Number,
          index:     Number,
          players:   { type: [String], default: [] },
          date:      { type: Date, default: null },
          status:    { type: String, enum: ['ready', 'running', 'done', 'walkover'], default: 'ready' },
          winner:    { type: String, default: null },
          game:      { type: mongoose.Schema.Types.ObjectId, ref: 'x01', default: null },
          score:     { type: mongoose.Schema.Types.Mixed, default: null },
          decidedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'user', default: null },
          decidedAt: { type: Date, default: null },
        }],
        default: [],
      },
      startedAt:  { type: Date, default: null },
      finishedAt: { type: Date, default: null },
      winner:     { type: String, default: null },
      createdBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'user', default: null },
      // what the admins were told about, so each goes out once
      reminded:   { type: [String], default: [] },
    },
    { timestamps: true, minimize: false }
  );

  schema.method('toJSON', function () {
    // eslint-disable-next-line no-unused-vars
    const { __v, _id, reminded, ...object } = this.toObject();
    object.id = _id;
    return object;
  });

  return mongoose.model('league', schema);
};
