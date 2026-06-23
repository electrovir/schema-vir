import {assert} from '@augment-vir/assert';
import {describe, it, itCases} from '@augment-vir/test';
import {type Static} from '@sinclair/typebox';
import {
    assertValidShape,
    defineShape,
    exactShape,
    optionalShape,
    partialShape,
    pickShape,
    recordShape,
    unionShape,
} from 'object-shape-tester';
import {mapSchemaToShape, type RuntimeTypeToSchema, type SchemaShapeOptions} from './map-schema.js';
import {hugeSchema} from './map-schema.mock.js';

/** A type-level identity probe: `Static<RuntimeTypeToSchema<T>>` should reconstruct `T` exactly. */
type RoundTrip<T> = Static<RuntimeTypeToSchema<T>>;

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
            usesDef: {text: string; page_numbers?: number[] | undefined}[];
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
                nested_items?:
                    | {
                          text: string;
                          page_numbers?: number[] | undefined;
                      }[]
                    | undefined;
            }[];
            usesDef2?:
                | {
                      text: string;
                      nested_items?:
                          | {
                                text: string;
                                page_numbers?: number[] | undefined;
                            }[]
                          | undefined;
                  }[]
                | undefined;
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
                page_numbers?: number[] | undefined;
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

    it('resolves a JSON Pointer $ref into another part of the document', () => {
        const withPointer = mapSchemaToShape({
            $schema: 'http://json-schema.org/draft-07/schema#',
            type: 'object',
            required: [
                'episodes',
                'legacyEpisodes',
            ],
            properties: {
                episodes: {
                    type: 'array',
                    items: {
                        type: 'object',
                        required: [
                            'text',
                        ],
                        properties: {
                            text: {
                                type: 'string',
                            },
                        },
                    },
                },
                legacyEpisodes: {
                    type: 'array',
                    items: {
                        $ref: '#/properties/episodes/items',
                    },
                },
            },
        });

        assert.tsType<typeof withPointer.runtimeType>().notEquals<unknown>();
        assert.tsType<typeof withPointer.runtimeType>().equals<{
            episodes: {text: string}[];
            legacyEpisodes: {text: string}[];
        }>();

        assertValidShape(
            {
                episodes: [
                    {
                        text: 'a',
                    },
                ],
                legacyEpisodes: [
                    {
                        text: 'b',
                    },
                ],
            } satisfies typeof withPointer.runtimeType,
            withPointer,
        );
        assert.throws(() =>
            assertValidShape(
                {
                    episodes: [],
                    legacyEpisodes: [
                        {
                            text: 5,
                        },
                    ],
                },
                withPointer,
            ),
        );
    });

    it('resolves a legacy #/definitions/ $ref', () => {
        const withDefinitions = mapSchemaToShape({
            $schema: 'http://json-schema.org/draft-07/schema#',
            type: 'object',
            required: [
                'usesDef',
            ],
            definitions: {
                item: {
                    type: 'object',
                    required: [
                        'text',
                    ],
                    properties: {
                        text: {
                            type: 'string',
                        },
                    },
                },
            },
            properties: {
                usesDef: {
                    type: 'array',
                    items: {
                        $ref: '#/definitions/item',
                    },
                },
            },
        });

        assert.tsType<typeof withDefinitions.runtimeType>().notEquals<unknown>();
        assert.tsType<typeof withDefinitions.runtimeType>().equals<{
            usesDef: {text: string}[];
        }>();

        assertValidShape(
            {
                usesDef: [
                    {
                        text: 'hi',
                    },
                ],
            } satisfies typeof withDefinitions.runtimeType,
            withDefinitions,
        );
    });

    it('fails on an unresolvable JSON Pointer $ref', () => {
        assert.throws(() =>
            mapSchemaToShape({
                $schema: 'http://json-schema.org/draft-07/schema#',
                type: 'object',
                properties: {
                    usesDef: {
                        type: 'array',
                        items: {
                            $ref: '#/properties/missing/items',
                        },
                    },
                },
            }),
        );
    });

    it('fails on a non-local (external) $ref', () => {
        assert.throws(
            () =>
                mapSchemaToShape({
                    $schema: 'http://json-schema.org/draft-07/schema#',
                    type: 'object',
                    properties: {
                        usesDef: {
                            type: 'array',
                            items: {
                                $ref: 'https://example.com/schemas/item.json',
                            },
                        },
                    },
                }),
            {
                matchMessage: 'No definition found',
            },
        );
    });

    it('generates a valid type for a complex JSON Pointer $ref reused from multiple sites', () => {
        const withReusedPointer = mapSchemaToShape({
            $schema: 'http://json-schema.org/draft-07/schema#',
            type: 'object',
            required: [
                'coverageHistory',
            ],
            properties: {
                coverageHistory: {
                    type: 'object',
                    required: [
                        'episodes',
                    ],
                    properties: {
                        episodes: {
                            type: 'array',
                            items: {
                                type: 'object',
                                required: [
                                    'episodeType',
                                ],
                                properties: {
                                    episodeType: {
                                        type: 'string',
                                    },
                                    daysCount: {
                                        type: [
                                            'integer',
                                            'null',
                                        ],
                                    },
                                    facility: {
                                        type: 'object',
                                        required: [
                                            'name',
                                        ],
                                        properties: {
                                            name: {
                                                type: 'string',
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
                utilization: {
                    type: 'array',
                    items: {
                        $ref: '#/properties/coverageHistory/properties/episodes/items',
                    },
                },
                legacyEpisodes: {
                    type: 'array',
                    items: {
                        $ref: '#/properties/coverageHistory/properties/episodes/items',
                    },
                },
            },
        });

        type Episode = {
            episodeType: string;
            daysCount?: number | null | undefined;
            facility?:
                | {
                      name: string;
                  }
                | undefined;
        };

        assert.tsType<typeof withReusedPointer.runtimeType>().notEquals<unknown>();
        assert.tsType<typeof withReusedPointer.runtimeType>().equals<{
            coverageHistory: {
                episodes: Episode[];
            };
            utilization?: Episode[] | undefined;
            legacyEpisodes?: Episode[] | undefined;
        }>();

        assertValidShape(
            {
                coverageHistory: {
                    episodes: [
                        {
                            episodeType: 'Inpatient',
                            daysCount: 5,
                            facility: {
                                name: 'Example Facility',
                            },
                        },
                    ],
                },
                utilization: [
                    {
                        episodeType: 'Skilled Nursing',
                        daysCount: null,
                    },
                ],
                legacyEpisodes: [
                    {
                        episodeType: 'Hospice',
                    },
                ],
            } satisfies typeof withReusedPointer.runtimeType,
            withReusedPointer,
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

        assert.tsType<typeof schemaShape.runtimeType>().equals<{
            optionalBooleanWithDefault?: boolean | undefined;
            optionalNumberWithDefault?: number | undefined;
            optionalStringWithDefault?: string | undefined;
            optionalMultiTypeWithDefault?: boolean | null | undefined;
        }>();
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
            thirdProp?:
                | {
                      threeA: string;
                  }[]
                | undefined;
        }>();
    });
});

describe(`${mapSchemaToShape.name} + pickShape`, () => {
    const settingsSchema = {
        $schema: 'http://json-schema.org/draft-07/schema#',
        type: 'object',
        properties: {
            id: {
                type: 'string',
            },
            retries: {
                type: 'number',
                default: 3,
            },
            banner: {
                type: 'object',
                default: {
                    visible: false,
                    label: 'none',
                },
                properties: {
                    visible: {
                        type: 'boolean',
                        default: false,
                    },
                    label: {
                        type: 'string',
                        default: 'none',
                    },
                },
                required: [
                    'visible',
                    'label',
                ],
            },
        },
        required: [
            'id',
        ],
    } as const;

    it('picks a required scalar property', () => {
        const idShape = pickShape(mapSchemaToShape(settingsSchema), {
            id: true,
        });

        assert.tsType<typeof idShape.runtimeType>().equals<{
            id: string;
        }>();

        assertValidShape(
            {
                id: 'abc',
            } satisfies typeof idShape.runtimeType,
            idShape,
        );
    });

    it('picks an optional object property and preserves its optionality', () => {
        const bannerShape = pickShape(mapSchemaToShape(settingsSchema), {
            banner: true,
        });

        assert.tsType<typeof bannerShape.runtimeType>().notEquals<unknown>();
        assert.tsType<typeof bannerShape.runtimeType>().equals<{
            banner?:
                | {
                      visible: boolean;
                      label: string;
                  }
                | undefined;
        }>();

        assertValidShape(
            {
                banner: {
                    visible: true,
                    label: 'down for maintenance',
                },
            } satisfies typeof bannerShape.runtimeType,
            bannerShape,
        );
        assertValidShape({} satisfies typeof bannerShape.runtimeType, bannerShape);
    });
});

describe('RuntimeTypeToSchema', () => {
    it('round-trips an object of required scalars', () => {
        assert
            .tsType<
                RoundTrip<{
                    name: string;
                    count: number;
                    enabled: boolean;
                }>
            >()
            .equals<{
                name: string;
                count: number;
                enabled: boolean;
            }>();
    });

    it('round-trips an object of optional scalars', () => {
        assert
            .tsType<
                RoundTrip<{
                    name?: string | undefined;
                    count?: number | undefined;
                    enabled?: boolean | undefined;
                }>
            >()
            .equals<{
                name?: string | undefined;
                count?: number | undefined;
                enabled?: boolean | undefined;
            }>();
    });

    it('round-trips a mix of required and optional properties', () => {
        assert
            .tsType<
                RoundTrip<{
                    requiredString: string;
                    optionalNumber?: number | undefined;
                    requiredBoolean: boolean;
                    optionalString?: string | undefined;
                }>
            >()
            .equals<{
                requiredString: string;
                optionalNumber?: number | undefined;
                requiredBoolean: boolean;
                optionalString?: string | undefined;
            }>();
    });

    it('round-trips a required nested object verbatim', () => {
        assert
            .tsType<
                RoundTrip<{
                    nested: {
                        inner: string;
                        innerOptional?: number | undefined;
                    };
                }>
            >()
            .equals<{
                nested: {
                    inner: string;
                    innerOptional?: number | undefined;
                };
            }>();
    });

    it('round-trips an optional nested object verbatim', () => {
        assert
            .tsType<
                RoundTrip<{
                    nested?:
                        | {
                              inner: string;
                          }
                        | undefined;
                }>
            >()
            .equals<{
                nested?:
                    | {
                          inner: string;
                      }
                    | undefined;
            }>();
    });

    it('round-trips array properties', () => {
        assert
            .tsType<
                RoundTrip<{
                    scalars: string[];
                    objects: {x: number}[];
                    optionalArray?: boolean[] | undefined;
                }>
            >()
            .equals<{
                scalars: string[];
                objects: {x: number}[];
                optionalArray?: boolean[] | undefined;
            }>();
    });

    it('round-trips a record property', () => {
        assert
            .tsType<
                RoundTrip<{
                    map: Record<string, string>;
                    unknownMap: Record<string, unknown>;
                }>
            >()
            .equals<{
                map: Record<string, string>;
                unknownMap: Record<string, unknown>;
            }>();
    });

    it('round-trips union and literal-union properties', () => {
        assert
            .tsType<
                RoundTrip<{
                    union: string | number;
                    literals: 'red' | 'green' | 'blue';
                    nullable: string | null;
                    optionalUnion?: string | number | undefined;
                }>
            >()
            .equals<{
                union: string | number;
                literals: 'red' | 'green' | 'blue';
                nullable: string | null;
                optionalUnion?: string | number | undefined;
            }>();
    });

    it('round-trips a null property', () => {
        assert
            .tsType<
                RoundTrip<{
                    nothing: null;
                }>
            >()
            .equals<{
                nothing: null;
            }>();
    });

    it('round-trips deeply nested optionality verbatim', () => {
        assert
            .tsType<
                RoundTrip<{
                    a: {
                        b: {
                            c?: string | undefined;
                            d: number[];
                        };
                    };
                }>
            >()
            .equals<{
                a: {
                    b: {
                        c?: string | undefined;
                        d: number[];
                    };
                };
            }>();
    });

    it('round-trips a top-level array', () => {
        assert.tsType<RoundTrip<string[]>>().equals<string[]>();
        assert.tsType<RoundTrip<{x: number}[]>>().equals<{x: number}[]>();
    });

    it('round-trips a top-level record', () => {
        assert.tsType<RoundTrip<Record<string, number>>>().equals<Record<string, number>>();
    });

    it('round-trips top-level primitives', () => {
        assert.tsType<RoundTrip<string>>().equals<string>();
        assert.tsType<RoundTrip<number>>().equals<number>();
        assert.tsType<RoundTrip<boolean>>().equals<boolean>();
        assert.tsType<RoundTrip<null>>().equals<null>();
    });

    it('matches the runtime type produced by mapSchemaToShape', () => {
        const schemaShape = mapSchemaToShape({
            $schema: 'http://json-schema.org/draft-07/schema#',
            type: 'object',
            required: [
                'id',
            ],
            properties: {
                id: {
                    type: 'string',
                },
                age: {
                    type: 'number',
                },
                tags: {
                    type: 'array',
                    items: {
                        type: 'string',
                    },
                },
            },
        });

        assert
            .tsType<RoundTrip<typeof schemaShape.runtimeType>>()
            .equals<typeof schemaShape.runtimeType>();
    });
});

describe(`${mapSchemaToShape.name} + partialShape`, () => {
    const userSchema = {
        $schema: 'http://json-schema.org/draft-07/schema#',
        type: 'object',
        required: [
            'id',
            'name',
        ],
        properties: {
            id: {
                type: 'string',
            },
            name: {
                type: 'string',
            },
            nickname: {
                type: 'string',
            },
        },
    } as const;

    it('makes every property optional', () => {
        const partial = partialShape(mapSchemaToShape(userSchema));

        assert.tsType<typeof partial.runtimeType>().notEquals<unknown>();
        assert.tsType<typeof partial.runtimeType>().equals<{
            id?: string;
            name?: string;
            nickname?: string | undefined;
        }>();

        assertValidShape({} satisfies typeof partial.runtimeType, partial);
        assertValidShape(
            {
                id: 'abc',
            } satisfies typeof partial.runtimeType,
            partial,
        );
        assertValidShape(
            {
                id: 'abc',
                name: 'name',
                nickname: 'nick',
            } satisfies typeof partial.runtimeType,
            partial,
        );
    });
});

describe(`${mapSchemaToShape.name} + pickShape extras`, () => {
    const recordSchema = {
        $schema: 'http://json-schema.org/draft-07/schema#',
        type: 'object',
        required: [
            'id',
            'name',
        ],
        properties: {
            id: {
                type: 'string',
            },
            name: {
                type: 'string',
            },
            score: {
                type: 'number',
            },
            tags: {
                type: 'array',
                items: {
                    type: 'string',
                },
            },
        },
    } as const;

    it('picks multiple properties and preserves each optionality', () => {
        const picked = pickShape(mapSchemaToShape(recordSchema), {
            id: true,
            score: true,
            tags: true,
        });

        assert.tsType<typeof picked.runtimeType>().equals<{
            id: string;
            score?: number | undefined;
            tags?: string[] | undefined;
        }>();

        assertValidShape(
            {
                id: 'abc',
                score: 5,
                tags: [
                    'a',
                    'b',
                ],
            } satisfies typeof picked.runtimeType,
            picked,
        );
        assertValidShape(
            {
                id: 'abc',
            } satisfies typeof picked.runtimeType,
            picked,
        );
    });

    it('picks a single optional scalar property', () => {
        const picked = pickShape(mapSchemaToShape(recordSchema), {
            score: true,
        });

        assert.tsType<typeof picked.runtimeType>().equals<{
            score?: number | undefined;
        }>();

        assertValidShape({} satisfies typeof picked.runtimeType, picked);
        assertValidShape(
            {
                score: 10,
            } satisfies typeof picked.runtimeType,
            picked,
        );
    });
});

describe(`${mapSchemaToShape.name} with a huge schema`, () => {
    const hugeShape = mapSchemaToShape(hugeSchema);
    type Report = (typeof hugeShape.runtimeType)['report'];

    it('maps a huge, deeply nested schema without producing unknown', () => {
        assert.tsType<typeof hugeShape.runtimeType>().notEquals<unknown>();
        assert.tsType<Report>().notEquals<unknown>();
    });

    it('resolves a $ref to a $defs measurement into a concrete type', () => {
        assert.tsType<Report['spacecraft']['mass_kg']>().notEquals<unknown>();
        assert
            .tsType<NonNullable<Report['spacecraft']['mass_kg']>['unit']>()
            .equals<
                | 'kelvin'
                | 'pascal'
                | 'meters_per_second'
                | 'volts'
                | 'amperes'
                | 'kilograms'
                | 'percent'
            >();
    });

    it('resolves a $defs array item type (crew)', () => {
        type CrewMember = NonNullable<Report['crew']>[number];
        assert.tsType<CrewMember>().notEquals<unknown>();
        assert
            .tsType<CrewMember['role']>()
            .equals<'commander' | 'pilot' | 'engineer' | 'scientist' | 'medic'>();
    });

    it('resolves a JSON Pointer $ref reused from another property (legacy_anomalies)', () => {
        type Anomaly = NonNullable<Report['anomalies']>[number];
        type LegacyAnomaly = NonNullable<Report['legacy_anomalies']>[number];
        assert.tsType<LegacyAnomaly>().notEquals<unknown>();
        assert.tsType<LegacyAnomaly>().equals<Anomaly>();
        assert
            .tsType<LegacyAnomaly['severity']>()
            .equals<'info' | 'caution' | 'warning' | 'critical'>();
    });

    it('resolves legacy #/definitions/ $refs (subsystems and ground contacts)', () => {
        type Subsystem = NonNullable<Report['subsystems']>[number];
        assert.tsType<Subsystem>().notEquals<unknown>();
        assert
            .tsType<Subsystem['state']>()
            .equals<'nominal' | 'standby' | 'degraded' | 'offline'>();

        type GroundContact = NonNullable<Report['ground_contacts']>[number];
        assert.tsType<GroundContact>().notEquals<unknown>();
        assert.tsType<GroundContact['band']>().equals<'S' | 'X' | 'Ka' | undefined>();
    });

    it('validates a representative value against the huge shape at runtime', () => {
        const value = {
            report: {
                schema_version: 'v1',
                generated_at: '2026-01-01T00:00:00Z',
                mission: {
                    id: 'mission-1',
                    name: 'Example Mission',
                    phase: 'orbit',
                },
                spacecraft: {
                    designation: 'EX-1',
                    mass_kg: {
                        value: 12_000,
                        unit: 'kilograms',
                    },
                    propulsion: {
                        mode: 'ion',
                    },
                    life_support: {
                        cabin_pressure: {
                            value: 101,
                            unit: 'pascal',
                        },
                    },
                    navigation: {
                        reference_frame: 'inertial',
                    },
                },
                crew: [
                    {
                        id: 'crew-1',
                        name: 'Example Person',
                        role: 'commander',
                        vitals: {
                            heart_rate: {
                                value: 62,
                                unit: 'percent',
                            },
                        },
                    },
                ],
                anomalies: [
                    {
                        code: 'A-100',
                        severity: 'caution',
                    },
                ],
                legacy_anomalies: [
                    {
                        code: 'A-099',
                        severity: 'info',
                    },
                ],
                subsystems: [
                    {
                        name: 'thermal',
                        state: 'nominal',
                    },
                ],
                ground_contacts: [
                    {
                        station: 'Canberra',
                        band: 'X',
                    },
                ],
            },
        } satisfies typeof hugeShape.runtimeType;

        assertValidShape(value, hugeShape);
    });

    it('rejects a value that violates a deeply nested enum', () => {
        assert.throws(() =>
            assertValidShape(
                {
                    report: {
                        schema_version: 'v1',
                        generated_at: '2026-01-01T00:00:00Z',
                        mission: {
                            id: 'mission-1',
                            name: 'Example Mission',
                            phase: 'not_a_real_phase',
                        },
                        spacecraft: {
                            designation: 'EX-1',
                            propulsion: {
                                mode: 'ion',
                            },
                            life_support: {
                                cabin_pressure: {
                                    value: 101,
                                    unit: 'pascal',
                                },
                            },
                            navigation: {
                                reference_frame: 'inertial',
                            },
                        },
                    },
                },
                hugeShape,
            ),
        );
    });
});
