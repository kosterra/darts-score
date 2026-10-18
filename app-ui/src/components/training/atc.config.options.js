const ATCConfigOptions = {
    modeOptions: {
        values: [
            { value: 'Single', description: 'Only singles count; finish on the outer bull.' },
            { value: 'Double', description: 'Only doubles count; finish on the bullseye.' },
            { value: 'Triple', description: 'Only trebles count; finish on the bullseye.' },
            { value: 'All', description: 'Any ring counts; finish on either bull.' }
        ],
        default: 'Double'
    }
};

export default ATCConfigOptions;
