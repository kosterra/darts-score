module.exports = mongoose => {

  var schema = mongoose.Schema(
    {
      timeMs: Number,
      hours: Number,
      minutes: Number,
      seconds: Number,
      milliseconds: Number,
      mode: String,
      player: mongoose.Schema.Types.Mixed
    },
    { timestamps: true }
  );

  schema.method("toJSON", function () {
    const { _id, ...object } = this.toObject();
    object.id = _id;
    return object;
  });

  const ATC = mongoose.model("atc", schema);
  return ATC;
};