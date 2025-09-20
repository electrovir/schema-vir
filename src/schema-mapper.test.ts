import {assert} from '@augment-vir/assert';
import {describe, it} from '@augment-vir/test';
import {assertValidShape} from 'object-shape-tester';
import {defineSchemaMapperSuite, type SchemaMapper} from './schema-mapper.js';
import {type MockMapperOutput, mockMapperSuite} from './schema-mapper.mock.js';
import {defineVersionedSchema, defineVersionedSchemaSuite} from './versioned-schemas.js';
import {
    mockV1Schema,
    mockV2Schema,
    mockV3Schema,
    type mockVersionedSchemaSuite,
} from './versioned-schemas.mock.js';

describe(defineSchemaMapperSuite.name, () => {
    it('defines a mapper', () => {
        mockMapperSuite.defineMapper.v1(({value}) => {
            assert.tsType(value).equals<typeof mockV1Schema.schemaShape.runtimeType>();

            return 1;
        });
    });
    it('requires correct mapper output', () => {
        // @ts-expect-error: intentionally incorrect mapper return type
        mockMapperSuite.defineMapper.v1(() => {
            return 'invalid';
        });
    });
    it('requires context', () => {
        const suite = defineSchemaMapperSuite<MockMapperOutput, {context: number}>()(
            defineVersionedSchemaSuite({
                mockV1Schema: defineVersionedSchema(
                    [
                        'a',
                        'b',
                    ],
                    {
                        $schema: 'http://json-schema.org/draft-07/schema#',
                        type: 'object',
                        required: [
                            'a',
                        ],
                        properties: {
                            a: {
                                type: 'object',
                                required: [
                                    'b',
                                ],
                                properties: {
                                    b: {
                                        const: 'v1',
                                        type: 'string',
                                    },
                                },
                            },
                        },
                    },
                ),
            }),
        );

        const {mapSchema} = suite.collectMappers({
            mockV1Mapper: suite.defineMapper.v1(({context, value}) => {
                assert.tsType(value).equals<{a: {b: 'v1'}}>();
                assert.deepEquals(value, {a: {b: 'v1'}});
                assert.tsType(context).equals<{context: number}>;
                assert.deepEquals(context, {context: 1});
                return 1;
            }),
        });

        assert.strictEquals(mapSchema({a: {b: 'v1'}}, {context: 1}), 1);
        // @ts-expect-error: intentionally missing required context input
        assert.throws(() => mapSchema({a: {b: 'v1'}}));
    });

    it('maps', () => {
        const v1Mapper = mockMapperSuite.defineMapper.v1(({value}) => {
            assertValidShape(value, mockV1Schema.schemaShape);
            assert.tsType(value).equals<typeof mockV1Schema.schemaShape.runtimeType>();
            return 1;
        });
        assert
            .tsType(v1Mapper)
            .equals<
                SchemaMapper<
                    typeof mockVersionedSchemaSuite.versions,
                    'v1',
                    MockMapperOutput,
                    undefined
                >
            >();
        const v2Mapper = mockMapperSuite.defineMapper.v2(({value}) => {
            assertValidShape(value, mockV2Schema.schemaShape);
            assert.tsType(value).equals<typeof mockV2Schema.schemaShape.runtimeType>();
            return 2;
        });
        assert
            .tsType(v2Mapper)
            .equals<
                SchemaMapper<
                    typeof mockVersionedSchemaSuite.versions,
                    'v2',
                    MockMapperOutput,
                    undefined
                >
            >();
        const v3Mapper = mockMapperSuite.defineMapper.v3(({value}) => {
            assertValidShape(value, mockV3Schema.schemaShape);
            assert.tsType(value).equals<typeof mockV3Schema.schemaShape.runtimeType>();
            return 3;
        });
        assert
            .tsType(v3Mapper)
            .equals<
                SchemaMapper<
                    typeof mockVersionedSchemaSuite.versions,
                    'v3',
                    MockMapperOutput,
                    undefined
                >
            >();

        const {mapSchema} = mockMapperSuite.collectMappers({
            v1Mapper,
            v2Mapper,
            v3Mapper,
        });

        const v1Data: typeof mockV1Schema.schemaShape.runtimeType = {
            schemaVersion: 'v1',
            topProp: {
                secondProp: {},
            },
        };
        const v2Data: typeof mockV2Schema.schemaShape.runtimeType = {
            schemaVersion: 'v2',
            topProp: {
                anotherPropUpHere: 'hi',
                secondProp: {},
            },
        };
        const v3Data: typeof mockV3Schema.schemaShape.runtimeType = {
            topProp: {
                anotherPropUpHere: 'bye',
                schemaVersion: 'v3',
                secondProp: {},
            },
        };

        assert.strictEquals(mapSchema(v1Data), 1);
        assert.strictEquals(mapSchema(v2Data), 2);
        assert.strictEquals(mapSchema(v3Data), 3);
        assert.throws(() => mapSchema({}), {
            matchMessage: 'Data does not match any schemas.',
        });
    });
    it('rejects missing version mapper', () => {
        const v1Mapper = mockMapperSuite.defineMapper.v1(() => 1);

        assert.throws(
            () =>
                mockMapperSuite.collectMappers({
                    v1Mapper,
                }),
            {
                matchMessage: 'Missing mappers for versions: v2,v3',
            },
        );
    });
    it('rejects duplicate version mapper', () => {
        const v1Mapper = mockMapperSuite.defineMapper.v1(() => 1);
        const v2Mapper = mockMapperSuite.defineMapper.v2(() => 2);
        const v3Mapper = mockMapperSuite.defineMapper.v3(() => 3);

        assert.throws(
            () =>
                mockMapperSuite.collectMappers({
                    v1Mapper,
                    v2Mapper,
                    v3Mapper,
                    v4Mapper: v1Mapper,
                }),
            {
                matchMessage: "Duplicate mapper for version 'v1' detected at key 'v4Mapper'",
            },
        );
    });
});
