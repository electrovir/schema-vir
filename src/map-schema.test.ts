import {assert} from '@augment-vir/assert';
import {describe, it, itCases} from '@augment-vir/test';
import {
    assertValidShape,
    defineShape,
    exactShape,
    optionalShape,
    recordShape,
    unionShape,
} from 'object-shape-tester';
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
                age: optionalShape(unionShape(undefined, -1)),
                hairColor: optionalShape(
                    unionShape(
                        undefined,
                        unionShape(exactShape('black'), exactShape('brown'), exactShape('blue')),
                    ),
                ),
            }),
        },
        {
            it: 'maps additionalProperties without properties',
            inputs: [
                {
                    type: 'object',
                    additionalProperties: {
                        type: 'string',
                    },
                },
            ],
            expect: defineShape(
                recordShape({
                    keys: '',
                    values: '',
                }),
            ),
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
                        isNull: {
                            type: 'null',
                        },
                        isInt: {
                            type: 'integer',
                        },
                        isNumber: {
                            type: 'number',
                        },
                        isBooleanWithDefault: {
                            type: 'boolean',
                            default: true,
                        },
                        isBooleanWithoutDefault: {
                            type: 'boolean',
                        },
                        isConst: {
                            const: 'five',
                        },
                        isArray: {
                            type: 'array',
                            items: [
                                {
                                    type: 'string',
                                },
                                {
                                    type: 'number',
                                },
                            ],
                        },
                    },
                },
            ],
            expect: defineShape({
                isNull: optionalShape(unionShape(undefined, null)),
                isInt: optionalShape(unionShape(undefined, -1)),
                isNumber: optionalShape(unionShape(undefined, -1)),
                isBooleanWithDefault: optionalShape(unionShape(true, undefined)),
                isBooleanWithoutDefault: optionalShape(unionShape(undefined, false)),
                isConst: optionalShape(unionShape(undefined, exactShape('five'))),
                isArray: optionalShape(unionShape(undefined, [unionShape('', -1)])),
            }),
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

    it('handles only additional properties', () => {
        const withAdditionalProperties = mapSchemaToShape({
            $schema: 'http://json-schema.org/draft-07/schema#',
            type: 'object',
            required: [
                'nested',
            ],
            properties: {
                nested: {
                    type: 'object',
                    additionalProperties: {
                        type: 'string',
                    },
                },
            },
        });

        assert.tsType<typeof withAdditionalProperties.runtimeType>().equals<{
            nested: Record<string, string>;
        }>();

        assert.deepEquals(withAdditionalProperties.default, {
            nested: {},
        });
        assertValidShape(
            {
                nested: {},
            } satisfies typeof withAdditionalProperties.runtimeType,
            withAdditionalProperties,
        );
        assertValidShape(
            {
                nested: {
                    a: 'b',
                    c: 'd',
                    e: 'f',
                },
            } satisfies typeof withAdditionalProperties.runtimeType,
            withAdditionalProperties,
        );
        assert.throws(() =>
            assertValidShape(
                {
                    nested: {
                        a: 'b',
                        c: 'd',
                        e: 'f',
                        g: 4,
                    },
                },
                withAdditionalProperties,
            ),
        );
    });
    it('errors with additional and normal properties', () => {
        assert.throws(() =>
            mapSchemaToShape({
                $schema: 'http://json-schema.org/draft-07/schema#',
                type: 'object',
                required: [
                    'nested',
                ],
                properties: {
                    nested: {
                        type: 'object',
                        required: ['yo'],
                        properties: {
                            yo: {
                                type: 'number',
                            },
                        },
                        additionalProperties: {
                            type: 'string',
                        },
                    },
                },
            }),
        );
    });

    it('works on definitions', () => {
        const withDefs = mapSchemaToShape({
            $schema: 'http://json-schema.org/draft-07/schema#',
            type: 'object',
            required: [
                'basic',
                'usesDef',
            ],
            $defs: {
                item: {
                    type: 'object',
                    required: [
                        'text',
                    ],
                    properties: {
                        text: {
                            type: 'string',
                        },
                        page_numbers: {
                            type: 'array',
                            items: {
                                type: 'integer',
                            },
                        },
                    },
                },
            },
            properties: {
                basic: {
                    type: 'string',
                },
                usesDef: {
                    type: 'array',
                    items: {
                        $ref: '#/$defs/item',
                    },
                },
            },
        });

        assert.tsType<typeof withDefs.runtimeType>().equals<{
            basic: string;
            usesDef: {text: string; page_numbers?: number[]}[];
        }>();

        assert.deepEquals(withDefs.default, {
            basic: '',
            usesDef: [],
        });
        assertValidShape(
            {
                basic: 'hi',
                usesDef: [
                    {
                        text: 'hi',
                        page_numbers: [1],
                    },
                    {
                        text: 'by',
                    },
                ],
            } satisfies typeof withDefs.runtimeType,
            withDefs,
        );
    });
    it('handles nested definitions', () => {
        const withDefs = mapSchemaToShape({
            $schema: 'http://json-schema.org/draft-07/schema#',
            type: 'object',
            required: [
                'basic',
                'usesDef',
            ],
            $defs: {
                item: {
                    type: 'object',
                    required: [
                        'text',
                    ],
                    properties: {
                        text: {
                            type: 'string',
                        },
                        page_numbers: {
                            type: 'array',
                            items: {
                                type: 'integer',
                            },
                        },
                    },
                },
                item2: {
                    type: 'object',
                    required: [
                        'text',
                    ],
                    properties: {
                        text: {
                            type: 'string',
                        },
                        nested_items: {
                            type: 'array',
                            items: {
                                $ref: '#/$defs/item',
                            },
                        },
                    },
                },
            },
            properties: {
                basic: {
                    type: 'string',
                },
                usesDef: {
                    type: 'array',
                    items: {
                        $ref: '#/$defs/item2',
                    },
                },
                usesDef2: {
                    type: 'array',
                    items: {
                        $ref: '#/$defs/item2',
                    },
                },
            },
        });

        assert.tsType<typeof withDefs.runtimeType>().equals<{
            basic: string;
            usesDef: {
                text: string;
                nested_items?: {
                    text: string;
                    page_numbers?: number[];
                }[];
            }[];
            usesDef2?: {
                text: string;
                nested_items?: {
                    text: string;
                    page_numbers?: number[];
                }[];
            }[];
        }>();

        assert.deepEquals(JSON.parse(JSON.stringify(withDefs.default)), {
            basic: '',
            usesDef: [],
        });
        assertValidShape(
            {
                basic: 'hi',
                usesDef: [
                    {
                        text: 'hi',
                        nested_items: [
                            {
                                text: 'nested!',
                                page_numbers: [1],
                            },
                        ],
                    },
                    {
                        text: 'by',
                    },
                ],
                usesDef2: [
                    {
                        text: 'hi',
                        nested_items: [
                            {
                                text: 'nested!',
                                page_numbers: [1],
                            },
                        ],
                    },
                    {
                        text: 'by',
                    },
                ],
            } satisfies typeof withDefs.runtimeType,
            withDefs,
        );
    });
    it('works on multi type definition', () => {
        const withDefs = mapSchemaToShape({
            $schema: 'http://json-schema.org/draft-07/schema#',
            type: 'object',
            required: [
                'basic',
                'usesDef',
            ],
            $defs: {
                item: {
                    type: 'object',
                    required: [
                        'text',
                    ],
                    properties: {
                        text: {
                            type: [
                                'string',
                                'integer',
                            ],
                        },
                        page_numbers: {
                            type: 'array',
                            items: {
                                type: 'integer',
                            },
                        },
                    },
                },
            },
            properties: {
                basic: {
                    type: 'string',
                },
                usesDef: {
                    type: 'array',
                    items: {
                        $ref: '#/$defs/item',
                    },
                },
            },
        });

        assert.tsType<typeof withDefs.runtimeType>().equals<{
            basic: string;
            usesDef: {
                text: string | number;
                page_numbers?: number[];
            }[];
        }>();

        assert.deepEquals(withDefs.default, {
            basic: '',
            usesDef: [],
        });
        assertValidShape(
            {
                basic: 'hi',
                usesDef: [
                    {
                        text: 'hi',
                        page_numbers: [1],
                    },
                    {
                        text: 100,
                        page_numbers: [1],
                    },
                ],
            } satisfies typeof withDefs.runtimeType,
            withDefs,
        );
    });
    it('works with anyOf', () => {
        const withAnyOf = mapSchemaToShape({
            $schema: 'http://json-schema.org/draft-07/schema#',
            type: 'object',
            required: [
                'value',
            ],
            properties: {
                value: {
                    anyOf: [
                        {
                            type: 'string',
                        },
                        {
                            minimum: 0,
                            type: 'number',
                        },
                        {
                            type: 'object',
                            additionalProperties: true,
                        },
                    ],
                },
            },
        });

        assert.tsType<typeof withAnyOf.runtimeType>().equals<{
            value: string | number | Record<string, unknown>;
        }>();

        assert.deepEquals(withAnyOf.default, {
            value: '',
        });
        assertValidShape(
            {
                value: 'hi',
            } satisfies typeof withAnyOf.runtimeType,
            withAnyOf,
        );
        assertValidShape(
            {
                value: 1,
            } satisfies typeof withAnyOf.runtimeType,
            withAnyOf,
        );
        assertValidShape(
            {
                value: {},
            } satisfies typeof withAnyOf.runtimeType,
            withAnyOf,
        );
        assertValidShape(
            {
                value: {
                    hello: 'there',
                },
            } satisfies typeof withAnyOf.runtimeType,
            withAnyOf,
        );
    });

    it('fails on invalid definition', () => {
        assert.throws(() =>
            mapSchemaToShape({
                $schema: 'http://json-schema.org/draft-07/schema#',
                type: 'object',
                properties: {
                    usesDef: {
                        type: 'array',
                        items: {
                            $ref: '#/$defs/invalid',
                        },
                    },
                },
            }),
        );
    });

    it('omits optional properties without explicit defaults from .default', () => {
        const schemaShape = mapSchemaToShape({
            $schema: 'http://json-schema.org/draft-07/schema#',
            type: 'object',
            required: [
                'requiredString',
            ],
            properties: {
                requiredString: {
                    type: 'string',
                },
                optionalString: {
                    type: 'string',
                },
                optionalNumber: {
                    type: 'number',
                },
                optionalBoolean: {
                    type: 'boolean',
                },
                optionalNullableObject: {
                    anyOf: [
                        {
                            type: 'object',
                            properties: {
                                enabled: {
                                    type: 'boolean',
                                },
                            },
                            required: [
                                'enabled',
                            ],
                            additionalProperties: false,
                        },
                        {
                            type: 'null',
                        },
                    ],
                },
                optionalNullableBoolean: {
                    type: [
                        'boolean',
                        'null',
                    ],
                },
            },
        });

        assert.deepEquals(JSON.parse(JSON.stringify(schemaShape.default)), {
            requiredString: '',
        });
        assert.strictEquals(schemaShape.default.optionalString, undefined);
        assert.strictEquals(schemaShape.default.optionalNumber, undefined);
        assert.strictEquals(schemaShape.default.optionalBoolean, undefined);
        assert.strictEquals(schemaShape.default.optionalNullableObject, undefined);
        assert.strictEquals(schemaShape.default.optionalNullableBoolean, undefined);
    });
    it('honors explicit defaults on optional properties', () => {
        const schemaShape = mapSchemaToShape({
            $schema: 'http://json-schema.org/draft-07/schema#',
            type: 'object',
            properties: {
                optionalBooleanWithDefault: {
                    type: 'boolean',
                    default: true,
                },
                optionalNumberWithDefault: {
                    type: 'number',
                    default: 5,
                },
                optionalStringWithDefault: {
                    type: 'string',
                    default: 'hi',
                },
                optionalMultiTypeWithDefault: {
                    type: [
                        'boolean',
                        'null',
                    ],
                    default: false,
                },
            },
        });

        assert.deepEquals(schemaShape.default, {
            optionalBooleanWithDefault: true,
            optionalNumberWithDefault: 5,
            optionalStringWithDefault: 'hi',
            optionalMultiTypeWithDefault: false,
        });
    });
    it('works without required fields', () => {
        const schemaShape = mapSchemaToShape({
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
        });

        assert.tsType<typeof schemaShape.runtimeType.topProp.secondProp>().notEquals<unknown>();
        assert.tsType<typeof schemaShape.runtimeType.topProp.secondProp>().equals<{
            thirdProp?: {
                threeA: string;
            }[];
        }>();
    });
});
