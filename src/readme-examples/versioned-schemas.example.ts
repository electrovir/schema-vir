import {defineVersionedSchema, defineVersionedSchemaSuite} from '../index.js';

export const v1Schema = defineVersionedSchema(
    [
        'schemaVersion',
    ],
    {
        $schema: 'http://json-schema.org/draft-07/schema#',
        type: 'object',
        required: [
            'data',
            'schemaVersion',
        ],
        properties: {
            schemaVersion: {
                const: 'v1',
                type: 'string',
            },
            data: {
                type: 'object',
                required: [
                    'value',
                ],
                properties: {
                    value: {
                        type: 'string',
                    },
                },
            },
        },
    },
);

export const v2Schema = defineVersionedSchema(
    [
        'schemaVersion',
    ],
    {
        $schema: 'http://json-schema.org/draft-07/schema#',
        type: 'object',
        required: [
            'data',
            'schemaVersion',
        ],
        properties: {
            schemaVersion: {
                const: 'v2',
                type: 'string',
            },
            data: {
                type: 'object',
                required: [
                    'value',
                ],
                properties: {
                    value: {
                        type: 'number',
                    },
                },
            },
        },
    },
);

const schemas = defineVersionedSchemaSuite({
    v1Schema,
    v2Schema,
});

// Schema shaped mapped by their version.
schemas.versions;

// An enum of all versions.
schemas.Version;

// Find the schema and version that the given object matches (if any).
schemas.findMatch({
    schemaVersion: 'v2',
    data: {
        value: 10,
    },
});

// Access all possible schema runtime types with `schemas.ValueType`.
// Access all possible schema runtime types keyed by their version with `schemas.VersionedValueType`.
