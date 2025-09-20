import {assert} from '@augment-vir/assert';
import {describe, it} from '@augment-vir/test';
import {assertValidShape} from 'object-shape-tester';
import {defineSchemaMapperSuite, type SchemaMapper} from './schema-mapper.js';
import {type MockMapperOutput, mockMapperSuite} from './schema-mapper.mock.js';
import {
    mockV1Schema,
    mockV2Schema,
    mockV3Schema,
    type mockVersionedSchemaSuite,
} from './versioned-schemas.mock.js';

describe(defineSchemaMapperSuite.name, () => {
    it('defines a mapper', () => {
        mockMapperSuite.defineMapper.v1((data) => {
            assert.tsType(data).equals<typeof mockV1Schema.schemaShape.runtimeType>();

            return 1;
        });
    });
    it('requires correct mapper output', () => {
        // @ts-expect-error: intentionally incorrect mapper return type
        mockMapperSuite.defineMapper.v1((data) => {
            return 'invalid';
        });
    });
    it('maps', () => {
        const v1Mapper = mockMapperSuite.defineMapper.v1((data) => {
            assertValidShape(data, mockV1Schema.schemaShape);
            assert.tsType(data).equals<typeof mockV1Schema.schemaShape.runtimeType>();
            return 1;
        });
        assert
            .tsType(v1Mapper)
            .equals<
                SchemaMapper<typeof mockVersionedSchemaSuite.versions, 'v1', MockMapperOutput>
            >();
        const v2Mapper = mockMapperSuite.defineMapper.v2((data) => {
            assertValidShape(data, mockV2Schema.schemaShape);
            assert.tsType(data).equals<typeof mockV2Schema.schemaShape.runtimeType>();
            return 2;
        });
        assert
            .tsType(v2Mapper)
            .equals<
                SchemaMapper<typeof mockVersionedSchemaSuite.versions, 'v2', MockMapperOutput>
            >();
        const v3Mapper = mockMapperSuite.defineMapper.v3((data) => {
            assertValidShape(data, mockV3Schema.schemaShape);
            assert.tsType(data).equals<typeof mockV3Schema.schemaShape.runtimeType>();
            return 3;
        });
        assert
            .tsType(v3Mapper)
            .equals<
                SchemaMapper<typeof mockVersionedSchemaSuite.versions, 'v3', MockMapperOutput>
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
