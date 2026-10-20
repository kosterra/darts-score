export default (mongoose) => {
  const schema = mongoose.Schema(
    {
      name:        { type: String, required: true, trim: true },
      description: { type: String, trim: true, default: '' },
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
