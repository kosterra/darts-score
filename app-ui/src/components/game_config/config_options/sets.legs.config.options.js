const SetsLegsConfigOptions = {
    setLegModeOptions: {
        values: [
            { value: 'Best of' },
            { value: 'First to' }
        ],
        default: 'Best of'
    },
    ftLegsNumberOptions: {
        values: [
            { name: '1 leg', value: 1 },
            { name: '2 legs', value: 2 },
            { name: '3 legs', value: 3 },
            { name: '4 legs', value: 4 },
            { name: '5 legs', value: 5 },
            { name: '6 legs', value: 6 },
            { name: '7 legs', value: 7 },
            { name: '8 legs', value: 8 },
            { name: '9 legs', value: 9 },
            { name: '10 legs', value: 10 },
            { name: '11 legs', value: 11 }
        ],
        default: 3
    },
    boLegsNumberOptions: {
        values: [
            { name: '3 legs', value: 3 },
            { name: '5 legs', value: 5 },
            { name: '7 legs', value: 7 },
            { name: '9 legs', value: 9 },
            { name: '11 legs', value: 11 }
        ],
        default: 3
    },
    ftSetsNumberOptions: {
        values: [
            { name: '1 set', value: 1 },
            { name: '2 sets', value: 2 },
            { name: '3 sets', value: 3 },
            { name: '4 sets', value: 4 },
            { name: '5 sets', value: 5 },
            { name: '6 sets', value: 6 },
            { name: '7 sets', value: 7 },
            { name: '8 sets', value: 8 },
            { name: '9 sets', value: 9 },
            { name: '10 sets', value: 10 },
            { name: '11 sets', value: 11 }
        ],
        default: 3
    },
    boSetsNumberOptions: {
        values: [
            { name: '3 sets', value: 3 },
            { name: '5 sets', value: 5 },
            { name: '7 sets', value: 7 },
            { name: '9 sets', value: 9 },
            { name: '11 sets', value: 11 }
        ],
        default: 3
    },
    legInOptions: {
        values: [
            { value: 'Straight In' },
            { value: 'Double In' },
            { value: 'Master In' }
        ],
        default: 'Straight In'
    },
    legOutOptions: {
        values: [
            { value: 'Straight Out' },
            { value: 'Double Out' },
            { value: 'Master Out' }
        ],
        default: 'Double Out'
    }
};

export default SetsLegsConfigOptions;