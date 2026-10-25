export default (mongoose) => {
  const schema = mongoose.Schema(
    {
      name:        { type: String, required: true, trim: true },
      description: { type: String, trim: true, default: '' },
      // where the club plays: an ISO 3166 country code (CH, DE, …); empty when not set
      country:     { type: String, uppercase: true, trim: true, default: '' },
      // the club's accent colour in the app, for the members who did not choose their own (null: Legmate green)
      accent:      { type: String, default: null },
      // File name of the uploaded logo in IMG_DIR/clubs
      logo:        { type: String, default: '' },
      // A public club is listed on the public start page. Its admins decide
      // whether running games and finished results are shown there too.
      isPublic:        { type: Boolean, default: false },
      publicLiveGames: { type: Boolean, default: true },
      publicResults:   { type: Boolean, default: true },
      // The Hall of Shame (Bed and Breakfast, Madhouse, ...); a club with
      // children may rather switch it off
      shameBadges:     { type: Boolean, default: true },
      // ... or keep it and leave children under 16 out of it
      shameWithoutChildren: { type: Boolean, default: false },
      // ... children being the players under this age
      shameMinAge:          { type: Number, min: 6, max: 21, default: 16 },
      // The club's dashboard: the widgets in display order, each with its width
      // (S, M, L, F). Empty means the default set; the UI owns the list of widgets.
      dashboardLayout: { type: [{ _id: false, id: String, size: String }], default: undefined },
      // the widget ids clubs stored before widths could be chosen (moved to dashboardLayout)
      dashboardWidgets: { type: [String], default: undefined },
      // Who can become a member on their own: 'open' (anyone with an account joins at
      // once), 'approval' (they ask, an admin accepts or declines) or 'closed' (only the
      // admins add players). Clubs that take members are listed under "Join a club".
      joinPolicy:      { type: String, enum: ['open', 'approval', 'closed'], default: 'closed' },
      // The club's own rules for its games: per game the defaults, the choices offered
      // and the settings locked; its own formats; whether players may mark a game as
      // friendly; the handicap policy; the ways out. See rules/club.rules.js
      gameRules:       { type: mongoose.Schema.Types.Mixed, default: undefined },
      // the badges the club earned together: { badge, earnedAt, sourceType, sourceId, player, nickname }
      badges: { type: [{ _id: false, badge: String, earnedAt: Date, sourceType: String, sourceId: String, player: String, nickname: String }], default: [] },
      // the goals the club admins set: { id, metric, target, from, until, reachedAt, reachedBy, nickname }
      goals:  { type: [{ _id: false, id: String, metric: String, target: Number, from: Date, until: Date, reachedAt: Date, reachedBy: String, nickname: String }], default: [] },
      // Users who manage the club; always at least one
      admins: { type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'user' }], index: true },
      // when each admin was made one, for the alert on a taken-over club
      adminSince: { type: [{ _id: false, user: { type: mongoose.Schema.Types.ObjectId, ref: 'user' }, at: Date }], default: [] },
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
