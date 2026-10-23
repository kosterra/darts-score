import { tn } from '../../../utils/i18n';

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
            { name: tn(1, '{{count}} leg', '{{count}} legs'), value: 1 },
            { name: tn(2, '{{count}} leg', '{{count}} legs'), value: 2 },
            { name: tn(3, '{{count}} leg', '{{count}} legs'), value: 3 },
            { name: tn(4, '{{count}} leg', '{{count}} legs'), value: 4 },
            { name: tn(5, '{{count}} leg', '{{count}} legs'), value: 5 },
            { name: tn(6, '{{count}} leg', '{{count}} legs'), value: 6 },
            { name: tn(7, '{{count}} leg', '{{count}} legs'), value: 7 },
            { name: tn(8, '{{count}} leg', '{{count}} legs'), value: 8 },
            { name: tn(9, '{{count}} leg', '{{count}} legs'), value: 9 },
            { name: tn(10, '{{count}} leg', '{{count}} legs'), value: 10 },
            { name: tn(11, '{{count}} leg', '{{count}} legs'), value: 11 }
        ],
        default: 3
    },
    boLegsNumberOptions: {
        values: [
            { name: tn(3, '{{count}} leg', '{{count}} legs'), value: 3 },
            { name: tn(5, '{{count}} leg', '{{count}} legs'), value: 5 },
            { name: tn(7, '{{count}} leg', '{{count}} legs'), value: 7 },
            { name: tn(9, '{{count}} leg', '{{count}} legs'), value: 9 },
            { name: tn(11, '{{count}} leg', '{{count}} legs'), value: 11 }
        ],
        default: 3
    },
    ftSetsNumberOptions: {
        values: [
            { name: tn(1, '{{count}} set', '{{count}} sets'), value: 1 },
            { name: tn(2, '{{count}} set', '{{count}} sets'), value: 2 },
            { name: tn(3, '{{count}} set', '{{count}} sets'), value: 3 },
            { name: tn(4, '{{count}} set', '{{count}} sets'), value: 4 },
            { name: tn(5, '{{count}} set', '{{count}} sets'), value: 5 },
            { name: tn(6, '{{count}} set', '{{count}} sets'), value: 6 },
            { name: tn(7, '{{count}} set', '{{count}} sets'), value: 7 },
            { name: tn(8, '{{count}} set', '{{count}} sets'), value: 8 },
            { name: tn(9, '{{count}} set', '{{count}} sets'), value: 9 },
            { name: tn(10, '{{count}} set', '{{count}} sets'), value: 10 },
            { name: tn(11, '{{count}} set', '{{count}} sets'), value: 11 }
        ],
        default: 3
    },
    boSetsNumberOptions: {
        values: [
            { name: tn(3, '{{count}} set', '{{count}} sets'), value: 3 },
            { name: tn(5, '{{count}} set', '{{count}} sets'), value: 5 },
            { name: tn(7, '{{count}} set', '{{count}} sets'), value: 7 },
            { name: tn(9, '{{count}} set', '{{count}} sets'), value: 9 },
            { name: tn(11, '{{count}} set', '{{count}} sets'), value: 11 }
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