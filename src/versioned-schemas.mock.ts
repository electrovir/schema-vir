import {defineVersionedSchema} from './versioned-schemas.js';

export const mockV1Schema = defineVersionedSchema(
    [
        'schemaVersion',
    ],
    {
        $schema: 'http://json-schema.org/draft-07/schema#',
        type: 'object',
        required: [
            'topProp',
            'schemaVersion',
        ],
        properties: {
            schemaVersion: {
                const: 'v1',
                type: 'string',
            },
            topProp: {
                type: 'object',
                required: [
                    'secondProp',
                ],
                properties: {
                    secondProp: {
                        type: 'object',
                        properties: {
                            thirdProp: {
                                type: 'array',
                                items: {
                                    type: 'object',
                                    required: [
                                        'threeA',
                                    ],
                                    properties: {
                                        threeA: {
                                            type: 'string',
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
    },
);
/** Slight change to v1. */
export const mockV2Schema = defineVersionedSchema(
    [
        'schemaVersion',
    ],
    {
        $schema: 'http://json-schema.org/draft-07/schema#',
        type: 'object',
        required: [
            'topProp',
            'schemaVersion',
        ],
        properties: {
            schemaVersion: {
                const: 'v2',
                type: 'string',
            },
            topProp: {
                type: 'object',
                required: [
                    'secondProp',
                    'anotherPropUpHere',
                ],
                properties: {
                    anotherPropUpHere: {
                        type: 'string',
                    },
                    secondProp: {
                        type: 'object',
                        properties: {
                            thirdProp: {
                                type: 'array',
                                items: {
                                    type: 'object',
                                    required: [
                                        'threeA',
                                    ],
                                    properties: {
                                        threeA: {
                                            type: 'string',
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
    },
);
/** Moved schema version. */
export const mockV3Schema = defineVersionedSchema(
    [
        'topProp',
        'schemaVersion',
    ],
    {
        $schema: 'http://json-schema.org/draft-07/schema#',
        type: 'object',
        required: [
            'topProp',
        ],
        properties: {
            topProp: {
                type: 'object',
                required: [
                    'secondProp',
                    'anotherPropUpHere',
                    'schemaVersion',
                ],
                properties: {
                    schemaVersion: {
                        const: 'v3',
                        type: 'string',
                    },
                    anotherPropUpHere: {
                        type: 'string',
                    },
                    secondProp: {
                        type: 'object',
                        properties: {
                            thirdProp: {
                                type: 'array',
                                items: {
                                    type: 'object',
                                    required: [
                                        'threeA',
                                    ],
                                    properties: {
                                        threeA: {
                                            type: 'string',
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
    },
);
/** This one has an optional schemaVersion. This should cause errors. */
export const optionalVersionMockSchema = defineVersionedSchema(
    [
        'schemaVersion',
    ],
    {
        $schema: 'http://json-schema.org/draft-07/schema#',
        type: 'object',
        required: [
            'topProp',
        ],
        properties: {
            schemaVersion: {
                const: 'v3',
                type: 'string',
            },
            topProp: {
                type: 'object',
                required: [
                    'secondProp',
                    'anotherPropUpHere',
                ],
                properties: {
                    anotherPropUpHere: {
                        type: 'string',
                    },
                    secondProp: {
                        type: 'object',
                        properties: {
                            thirdProp: {
                                type: 'array',
                                items: {
                                    type: 'object',
                                    required: [
                                        'threeA',
                                    ],
                                    properties: {
                                        threeA: {
                                            type: 'string',
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
    },
);
/** This one has a plain string schemaVersion. This should cause errors. */
export const nonConstVersionMock = defineVersionedSchema(
    [
        'schemaVersion',
    ],
    {
        $schema: 'http://json-schema.org/draft-07/schema#',
        type: 'object',
        required: [
            'topProp',
        ],
        properties: {
            schemaVersion: {
                type: 'string',
            },
            topProp: {
                type: 'object',
                required: [
                    'secondProp',
                    'anotherPropUpHere',
                ],
                properties: {
                    anotherPropUpHere: {
                        type: 'string',
                    },
                    secondProp: {
                        type: 'object',
                        properties: {
                            thirdProp: {
                                type: 'array',
                                items: {
                                    type: 'object',
                                    required: [
                                        'threeA',
                                    ],
                                    properties: {
                                        threeA: {
                                            type: 'string',
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
    },
);
/** This has a schema version path that points to nothing. */
export const missingSchemaVersionMock = defineVersionedSchema(
    [
        'wrongPath',
    ],
    {
        $schema: 'http://json-schema.org/draft-07/schema#',
        type: 'object',
        required: [
            'topProp',
        ],
        properties: {
            schemaVersion: {
                type: 'string',
            },
            topProp: {
                type: 'object',
                required: [
                    'secondProp',
                    'anotherPropUpHere',
                ],
                properties: {
                    anotherPropUpHere: {
                        type: 'string',
                    },
                    secondProp: {
                        type: 'object',
                        properties: {
                            thirdProp: {
                                type: 'array',
                                items: {
                                    type: 'object',
                                    required: [
                                        'threeA',
                                    ],
                                    properties: {
                                        threeA: {
                                            type: 'string',
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
    },
);
