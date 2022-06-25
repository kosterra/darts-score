const x01ConfigOptions = {
  gameScoreOptions: [ 101, 301, 501, 701, 1001 ],
  setLegModeOptions: ['Best of', 'First to'],
  ftSetNumberOptions: Array.from(Array(11), (x, i) => i+1),
  ftLegNumberOptions: Array.from(Array(11), (x, i) => i+1),
  boSetNumberOptions: [3, 5, 7, 9, 11],
  boLegNumberOptions: [3, 5, 7, 9, 11],
  legInOptions: ['Straight In', 'Double In', 'Master In'],
  legOutOptions: ['Straight Out', 'Double Out', 'Master Out'],
  numberOfPlayerOptions: Array.from(Array(4), (x, i) => i+1)
};

export default x01ConfigOptions;