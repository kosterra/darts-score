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
      // Widgets on the club dashboard, in display order. Empty means the default set;
      // the UI owns the list of available widgets.
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
