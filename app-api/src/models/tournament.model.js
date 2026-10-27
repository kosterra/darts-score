import { FORMATS, INVITE_CHANNELS, MAX_PLAYERS_CHOICES, SEEDINGS, STATUSES } from '../rules/tournaments.js';

// A knockout tournament of a club (see rules/tournaments.js and
// utils/tournaments.js): set up by its admins, the members invited to enter,
// the draw, and the matches played as X01 games until the final. The host
// club and the club of every entry are kept, for tournaments between clubs
// later on.
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
      status:      { type: String, enum: STATUSES, default: 'draft', index: true },
      // knockout, or groups first and then a knockout bracket of the best of each group
      format:      { type: String, enum: FORMATS, default: 'knockout' },
      preset:      { type: String, default: null },
      maxPlayers:  { type: Number, enum: MAX_PLAYERS_CHOICES, default: 16 },
      // the registration: until when the members can answer, and how they hear of it
      closesAt:    { type: Date, required: true },
      invite:      { type: String, enum: INVITE_CHANNELS, default: 'mail' },
      // each round by how many players are left in it (16, 8, 4, 2; 0 the group stage): its day and rules;
      // a round the field is too small for is left out at the draw
      rounds: {
        type: [{ _id: false, size: Number, date: Date, rules, skipped: { type: Boolean, default: false } }],
        default: [],
      },
      // who was asked, and what they answered: 'invited' (no answer yet), 'in', 'out'
      entries: {
        type: [{
          _id: false,
          player:     { type: mongoose.Schema.Types.ObjectId, ref: 'player', required: true },
          club:       { type: mongoose.Schema.Types.ObjectId, ref: 'club' },
          status:     { type: String, enum: ['invited', 'in', 'out'], default: 'invited' },
          answeredAt: { type: Date, default: null },
          // added by an admin rather than answering themselves
          byAdmin:    { type: Boolean, default: false },
          seed:       { type: Number, default: null },
        }],
        default: [],
      },
      draw: {
        at:      { type: Date, default: null },
        by:      { type: mongoose.Schema.Types.ObjectId, ref: 'user', default: null },
        seeding: { type: String, enum: [...SEEDINGS, null], default: null },
        size:    { type: Number, default: null },
        // groups + knockout: the groups (player ids in the order of the draw), how large they were
        // made, how many of each go on, and when the bracket was filled from them
        groups:    { type: [[String]], default: undefined },
        groupSize: { type: Number, default: null },
        advance:   { type: Number, default: null },
        knockoutAt: { type: Date, default: null },
      },
      // every match of the bracket: "8-0" the first quarter-final; players by id, the game
      // that decides it, and how it was decided ('done' played, 'walkover', 'bye')
      matches: {
        type: [{
          _id: false,
          id:       { type: String, required: true },
          size:     Number,
          index:    Number,
          // a match of the group stage: the number of its group (0 the first)
          group:    { type: Number, default: undefined },
          players:  { type: [String], default: [null, null] },
          status:   { type: String, enum: ['waiting', 'ready', 'running', 'done', 'walkover', 'bye'], default: 'waiting' },
          winner:   { type: String, default: null },
          bye:      { type: Boolean, default: false },
          game:     { type: mongoose.Schema.Types.ObjectId, ref: 'x01', default: null },
          // the result as the bracket shows it: sets (when played in sets) and legs per player
          score:    { type: mongoose.Schema.Types.Mixed, default: null },
          decidedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'user', default: null },
          decidedAt: { type: Date, default: null },
        }],
        default: [],
      },
      winner:     { type: String, default: null },
      finishedAt: { type: Date, default: null },
      createdBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'user', default: null },
      // what the reminders were sent about, so each goes out once
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

  return mongoose.model('tournament', schema);
};
