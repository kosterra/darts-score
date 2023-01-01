const SetsLegsConfigOptions = {
    setLegModeOptions: { values: ['Best of', 'First to'], default: 'Best of' },
    ftSetNumberOptions: { values: Array.from(Array(11), (x, i) => i+1), default: 1 },
    ftLegNumberOptions: { values: Array.from(Array(11), (x, i) => i+1), default: 3 },
    boSetNumberOptions: { values: [3, 5, 7, 9, 11], default: 3 },
    boLegNumberOptions: { values: [3, 5, 7, 9, 11], default: 3 },
    legInOptions: { values: ['Straight In', 'Double In', 'Master In'], default: 'Straight In' },
    legOutOptions: { values: ['Straight Out', 'Double Out', 'Master Out'], default: 'Double Out' }
};

export default SetsLegsConfigOptions;