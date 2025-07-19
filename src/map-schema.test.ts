import {assert} from '@augment-vir/assert';
import {describe, it, itCases} from '@augment-vir/test';
import {assertValidShape, defineShape, exact, optional, or} from 'object-shape-tester';
import {mapSchemaToShape, type SchemaShapeOptions} from './map-schema.js';

/** Test mock schema validity here: https://borischerny.com/json-schema-to-typescript-browser */

describe(mapSchemaToShape.name, () => {
    itCases(mapSchemaToShape<any, SchemaShapeOptions>, [
        {
            it: 'maps an example',
            inputs: [
                {
                    title: 'Example Schema',
                    type: 'object',
                    properties: {
                        firstName: {
                            type: 'string',
                        },
                        lastName: {
                            type: 'string',
                        },
                        age: {
                            description: 'Age in years',
                            type: 'integer',
                            minimum: 0,
                        },
                        hairColor: {
                            enum: [
                                'black',
                                'brown',
                                'blue',
                            ],
                            type: 'string',
                        },
                    },
                    required: [
                        'firstName',
                        'lastName',
                    ],
                },
            ],
            expect: defineShape({
                firstName: '',
                lastName: '',
                age: optional(or(-1, undefined)),
                hairColor: optional(
                    or(or(exact('black'), exact('brown'), exact('blue')), undefined),
                ),
            }),
        },
        {
            it: 'rejects object without properties',
            inputs: [
                {
                    title: 'Example Schema',
                    type: 'object',
                },
            ],
            throws: {
                matchMessage: 'object without properties',
            },
        },
        {
            it: 'rejects unexpected schema',
            inputs: [
                {
                    required: ['firstName'],
                },
            ],
            throws: {
                matchMessage: 'Unexpected schema',
            },
        },
        {
            it: 'rejects non-primitive enum',
            inputs: [
                {
                    enum: [{}],
                },
            ],
            throws: {
                matchMessage: 'non primitive enum value',
            },
        },
        {
            it: 'rejects empty enum values',
            inputs: [
                {
                    enum: [],
                },
            ],
            throws: {
                matchMessage: 'empty enum array',
            },
        },
        {
            it: 'rejects non array enum',
            inputs: [
                {
                    enum: 5,
                },
            ],
            throws: {
                matchMessage: 'non array enum',
            },
        },
        {
            it: 'rejects raw boolean schema',
            inputs: [
                false,
            ],
            throws: {
                matchMessage: 'raw boolean schema is not supported',
            },
        },
        {
            it: 'rejects an empty array schema',
            inputs: [
                [] as any,
            ],
            throws: {
                matchMessage: 'is empty',
            },
        },
        {
            it: 'rejects an array without items',
            inputs: [
                {
                    type: 'array',
                },
            ],
            throws: {
                matchMessage: 'array without items',
            },
        },
        {
            it: 'handles all types',
            inputs: [
                {
                    type: 'object',
                    properties: {
                        isNull: {type: 'null'},
                        isInt: {type: 'integer'},
                        isNumber: {type: 'number'},
                        isBooleanWithDefault: {type: 'boolean', default: true},
                        isBooleanWithoutDefault: {type: 'boolean'},
                        isConst: {const: 'five'},
                        isArray: {
                            type: 'array',
                            items: [
                                {type: 'string'},
                                {type: 'number'},
                            ],
                        },
                    },
                },
                {isReadonly: true},
            ],
            expect: defineShape(
                {
                    isNull: optional(or(null, undefined)),
                    isInt: optional(or(-1, undefined)),
                    isNumber: optional(or(-1, undefined)),
                    isBooleanWithDefault: optional(or(true, undefined)),
                    isBooleanWithoutDefault: optional(or(false, undefined)),
                    isConst: optional(or(exact('five'), undefined)),
                    isArray: optional(or([or('', -1)], undefined)),
                },
                true as any,
            ),
        },
    ]);

    it('matches', () => {
        const value = {
            firstName: 'first',
            lastName: 'last',
        } as unknown;

        const schemaShape = mapSchemaToShape({
            title: 'Example Schema',
            type: 'object',
            properties: {
                firstName: {
                    type: 'string',
                },
                lastName: {
                    type: 'string',
                },
                age: {
                    description: 'Age in years',
                    type: 'integer',
                    minimum: 0,
                },
                hairColor: {
                    enum: [
                        'black',
                        'brown',
                        'blue',
                    ],
                    type: 'string',
                },
                nested: {
                    type: 'object',
                    properties: {
                        nestedA: {
                            type: 'string',
                        },
                        nestedB: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    nestedArrayItem: {
                                        type: 'string',
                                    },
                                },
                                required: ['nestedArrayItem'],
                            },
                        },
                    },
                    required: [
                        'nestedA',
                        'nestedB',
                    ],
                },
            },
            required: [
                'firstName',
                'lastName',
            ],
        });

        assertValidShape(value, schemaShape);

        assert.tsType(value).equals<{
            firstName: string;
            lastName: string;
            age?: number | undefined;
            hairColor?: 'black' | 'brown' | 'blue' | undefined;
            nested?:
                | undefined
                | {
                      nestedA: string;

                      nestedB: {nestedArrayItem: string}[];
                  };
        }>();
    });

    it('can make all properties required', () => {
        const value = {
            firstName: 'first',
            lastName: 'last',
        } as unknown;

        const schemaShape = mapSchemaToShape(
            {
                title: 'Example Schema',
                type: 'object',
                properties: {
                    firstName: {
                        type: 'string',
                    },
                    lastName: {
                        type: 'string',
                    },
                    age: {
                        description: 'Age in years',
                        type: 'integer',
                        minimum: 0,
                    },
                    hairColor: {
                        enum: [
                            'black',
                            'brown',
                            'blue',
                        ],
                        type: 'string',
                    },
                    nested: {
                        type: 'object',
                        properties: {
                            nestedA: {
                                type: 'string',
                            },
                            nestedB: {
                                type: 'array',
                                items: {
                                    type: 'object',
                                    properties: {
                                        nestedArrayItem: {
                                            type: 'string',
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
            {allRequired: true},
        );

        assertValidShape(value, schemaShape);

        assert.tsType(value).equals<{
            firstName: string;
            lastName: string;
            age: number;
            hairColor: 'black' | 'brown' | 'blue';
            nested: {
                nestedA: string;

                nestedB: {nestedArrayItem: string}[];
            };
        }>();
    });
});
