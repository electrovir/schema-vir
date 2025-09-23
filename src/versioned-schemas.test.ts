import {assert} from '@augment-vir/assert';
import {describe, it} from '@augment-vir/test';
import {extractSchemaVersion} from './versioned-schema-types.js';
import {defineVersionedSchemaSuite} from './versioned-schemas.js';
import {
    missingSchemaVersionMock,
    mockV1Schema,
    mockV2Schema,
    mockV3Schema,
    mockVersionedSchemaSuite,
    nonConstVersionMock,
    optionalVersionMockSchema,
    validMockSchemas,
} from './versioned-schemas.mock.js';

describe(defineVersionedSchemaSuite.name, () => {
    it('combines versioned schemas', () => {
        /** Testing `.originalVersionedSchemas`. */
        assert.strictEquals(
            mockVersionedSchemaSuite.originalVersionedSchemas,
            validMockSchemas,
            '.versionedSchemas mismatch',
        );
        /** Testing `.versions` */
        assert.deepEquals(
            mockVersionedSchemaSuite.versions,
            {
                v1: {
                    version: 'v1',
                    schemaShape: mockV1Schema.schemaShape,
                    versionPath: mockV1Schema.versionPath,
                },
                v2: {
                    version: 'v2',
                    schemaShape: mockV2Schema.schemaShape,
                    versionPath: mockV2Schema.versionPath,
                },
                v3: {
                    version: 'v3',
                    schemaShape: mockV3Schema.schemaShape,
                    versionPath: mockV3Schema.versionPath,
                },
            },
            '.versions mismatch',
        );
        assert.tsType(mockVersionedSchemaSuite.versions).equals<
            Readonly<{
                v1: Readonly<{
                    version: 'v1';
                    schemaShape: typeof mockV1Schema.schemaShape;
                    versionPath: typeof mockV1Schema.versionPath;
                }>;
                v2: Readonly<{
                    version: 'v2';
                    schemaShape: typeof mockV2Schema.schemaShape;
                    versionPath: typeof mockV2Schema.versionPath;
                }>;
                v3: Readonly<{
                    version: 'v3';
                    schemaShape: typeof mockV3Schema.schemaShape;
                    versionPath: typeof mockV3Schema.versionPath;
                }>;
            }>
        >();

        /** Testing `.Version`. */
        assert.deepEquals(
            mockVersionedSchemaSuite.Version,
            {
                v1: 'v1',
                v2: 'v2',
                v3: 'v3',
            },
            '.Version mismatch',
        );
        assert.tsType(mockVersionedSchemaSuite.Version).equals<{
            v1: 'v1';
            v2: 'v2';
            v3: 'v3';
        }>();

        /** Testing `.ValueType`. */
        assert.throws(
            () => mockVersionedSchemaSuite.ValueType,
            {
                matchMessage: 'Cannot access ValueType as a value, it is only a type.',
            },
            '.ValueType mismatch',
        );
        assert
            .tsType<typeof mockVersionedSchemaSuite.ValueType>()
            .equals<
                | typeof mockV1Schema.schemaShape.runtimeType
                | typeof mockV2Schema.schemaShape.runtimeType
                | typeof mockV3Schema.schemaShape.runtimeType
            >();

        /** Testing `.VersionedValueType`. */
        assert.throws(
            () => mockVersionedSchemaSuite.VersionedValueType,
            {
                matchMessage: 'Cannot access VersionedValueType as a value, it is only a type.',
            },
            '.VersionedValueType mismatch',
        );
        assert.tsType<typeof mockVersionedSchemaSuite.VersionedValueType>().equals<{
            v1: typeof mockV1Schema.schemaShape.runtimeType;
            v2: typeof mockV2Schema.schemaShape.runtimeType;
            v3: typeof mockV3Schema.schemaShape.runtimeType;
        }>();

        /** Testing `.findMatch()` */
        assert.isDefined(
            mockVersionedSchemaSuite.matchValue({
                schemaVersion: 'v1',
                topProp: {
                    secondProp: {},
                },
            } satisfies (typeof mockVersionedSchemaSuite.VersionedValueType)['v1']),
            '.findMatch match mismatch',
        );
        assert.throws(
            () =>
                mockVersionedSchemaSuite.matchValue({
                    schemaVersion: 'v99',
                    topProp: {
                        secondProp: {},
                    },
                }),
            {
                matchMessage: 'data does not match any schemas',
            },
        );
        assert.throws(
            () =>
                mockVersionedSchemaSuite.matchValue({
                    topProp: {
                        secondProp: {},
                    },
                }),
            {
                matchMessage: 'data does not match any schemas',
            },
        );
        assert.throws(
            () =>
                mockVersionedSchemaSuite.matchValue({
                    schemaVersion: 'v1',
                    topProp: {
                        wrongProp: {},
                    },
                }),
            {
                matchMessage: 'Shape mismatch',
            },
        );
    });

    it('errors on optional schema version', () => {
        const result = defineVersionedSchemaSuite({
            mockV1Schema,
            optionalVersionMockSchema,
        });

        assert
            .tsType(result)
            .equals<'ERROR: Invalid schema: optional or non-const version detected.'>();
    });
    it('errors on non-const schema version', () => {
        const result = defineVersionedSchemaSuite({
            mockV1Schema,
            nonConstVersionMock,
        });

        assert
            .tsType(result)
            .equals<'ERROR: Invalid schema: optional or non-const version detected.'>();
    });
    it('errors on missing schema path', () => {
        assert.throws(
            () => {
                const result = defineVersionedSchemaSuite({
                    mockV1Schema,
                    invalidSchemaVersionPath: missingSchemaVersionMock,
                });

                assert
                    .tsType(result)
                    .equals<'ERROR: Invalid schema: optional or non-const version detected.'>();
            },
            {
                matchMessage: 'Failed to extract schema version',
            },
        );
    });
    it('errors on invalid schema version path', () => {
        const result = defineVersionedSchemaSuite({
            mockV1Schema,
            nonConstVersionMock,
        });

        assert
            .tsType(result)
            .equals<'ERROR: Invalid schema: optional or non-const version detected.'>();
    });
    it('errors on duplicate versions', () => {
        assert.throws(
            () => {
                defineVersionedSchemaSuite({
                    mockV1Schema,
                    another: mockV1Schema,
                });
            },
            {
                matchMessage: 'Duplicate schema version found',
            },
        );
    });
});

describe(extractSchemaVersion.name, () => {
    it('extracts version', () => {
        const result = extractSchemaVersion(mockV1Schema);

        assert.strictEquals(result, 'v1');
        assert.tsType(result).equals<'v1'>();
    });
});
