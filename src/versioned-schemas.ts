import {assert, check} from '@augment-vir/assert';
import {
    arrayToObject,
    ensureErrorAndPrependMessage,
    getDeepValue,
    mapObject,
    mapObjectValues,
    type AnyObject,
    type ArrayElement,
    type Values,
} from '@augment-vir/common';
import {type JSONSchema} from 'json-schema-to-ts';
import {assertValidShape} from 'object-shape-tester';
import {type IsEqual, type OmitIndexSignature} from 'type-fest';
import {mapSchemaToShape, type SchemaShape, type SchemaShapeOptions} from './map-schema.js';
import {
    extractSchemaVersion,
    type BaseVersionedSchemas,
    type SchemaMatch,
    type VersionEnum,
    type VersionMap,
} from './versioned-schema-types.js';

/**
 * Converts a JSON Schema into a Shape and requires a const schema version to exist within the
 * shape. Versions must all be a string const.
 *
 * @category Main
 */
export function defineVersionedSchema<
    const VersionPath extends ReadonlyArray<string>,
    const Schema extends JSONSchema,
    const Options extends SchemaShapeOptions,
>(
    /**
     * Path in the schema's runtime type to the schema's version. The version must be a string
     * const.
     */
    versionPath: VersionPath,
    /** The JSON Schema. */
    schema: Schema,
    options?: Options,
): {
    versionPath: Readonly<VersionPath>;
    schemaShape: Readonly<SchemaShape<Schema, Options>>;
} {
    return {
        versionPath,
        /** `any` casts are added here to reduce TypeScript complexity and "too deep" errors. */
        schemaShape: mapSchemaToShape<any, any>(schema, options) as any,
    };
}

/**
 * Combines multiple versioned schemas into a single object which contains:
 *
 * - The original versioned schemas (`.originalVersionedSchemas`).
 * - Each schema mapped by its version string (`.versions`).
 * - An enum of the available schema versions (`.Version`).
 * - A type (do not use at runtime) of all the available schema values (`.ValueType`).
 * - A type (do not use at runtime) that maps each available version to its schema value
 *   (`.VersionedValueType`).
 * - A function that matches a raw value instance to its corresponding schema version
 *   (`.assertWrapMatch()`).
 *
 * @category Main
 */
export function defineVersionedSchemaSuite<
    const VersionedSchemas extends Readonly<BaseVersionedSchemas>,
>(versionedSchemas: Readonly<VersionedSchemas>): VersionedSchemaSuite<VersionedSchemas> {
    assertVersionedSchemas(versionedSchemas);

    const versions = mapObject(versionedSchemas, (key, versionedSchema) => {
        try {
            const version = extractSchemaVersion(versionedSchema);
            assert.isString(version, 'Invalid schema version.');

            return {
                key: version,
                value: {
                    ...versionedSchema,
                    version,
                } satisfies Values<VersionMap<any>>,
            };
            /* node:coverage ignore next 3: just covering edge cases, `assertVersionedSchemas` should already be catching errors. */
        } catch (error) {
            throw ensureErrorAndPrependMessage(error, `Failed to handle schema '${String(key)}'.`);
        }
    }) as AnyObject as VersionMap<VersionedSchemas>;
    const Version = mapObjectValues(versions, (originalKey, {version}) => {
        return version;
    }) satisfies Record<string, string> as VersionEnum<VersionedSchemas>;

    const typeKeys = [
        'ValueType',
        'VersionedValueType',
    ] as const;

    const result: Omit<
        VersionedSchemaSuiteObject<VersionedSchemas>,
        ArrayElement<typeof typeKeys>
    > = {
        originalVersionedSchemas: versionedSchemas,
        versions,
        Version,
        assertWrapMatch(value) {
            return assertWrapMatch<VersionedSchemaSuiteObject<VersionedSchemas>['versions']>(
                versions,
                value,
            );
        },
    };

    Object.defineProperties(
        result,
        arrayToObject(
            typeKeys,
            (typeKey) => {
                return {
                    key: typeKey,
                    value: {
                        configurable: false,
                        enumerable: false,
                        get() {
                            throw new Error(
                                `Cannot access ${typeKey} as a value, it is only a type.`,
                            );
                        },
                    },
                } satisfies {key: ArrayElement<typeof typeKeys>; value: PropertyDescriptor};
            },
            {
                useRequired: true,
            },
        ) satisfies Record<ArrayElement<typeof typeKeys>, PropertyDescriptor>,
    );

    return result as VersionedSchemaSuite<VersionedSchemas>;
}

/** Asserts that the raw versioned schema inputs are valid. */
function assertVersionedSchemas(versionedSchemas: Readonly<BaseVersionedSchemas>) {
    const versions: string[] = [];

    Object.entries(versionedSchemas).forEach(
        ([
            schemaKey,
            versionedSchema,
        ]) => {
            const version = extractSchemaVersion(versionedSchema);

            if (versions.includes(version)) {
                throw new Error(`Duplicate schema version found under '${schemaKey}'`);
            }

            versions.push(version);
        },
    );
}

/**
 * All outputs from {@link defineVersionedSchemaSuite} with input validation.
 *
 * @category Internal
 */
export type VersionedSchemaSuite<VersionedSchemas extends Readonly<BaseVersionedSchemas>> =
    IsEqual<keyof OmitIndexSignature<VersionEnum<VersionedSchemas>>, never> extends true
        ? 'ERROR: Invalid schema: optional or non-const version detected.'
        : VersionedSchemaSuiteObject<VersionedSchemas>;

/**
 * All outputs from {@link defineVersionedSchemaSuite}.
 *
 * @category Internal
 */
export type VersionedSchemaSuiteObject<VersionedSchemas extends Readonly<BaseVersionedSchemas>> = {
    /** The original versioned schemas. */
    originalVersionedSchemas: VersionedSchemas;
    /** Each schema mapped by its version string. */
    versions: VersionMap<VersionedSchemas>;
    /** An enum of the available schema versions. */
    Version: VersionEnum<VersionedSchemas>;
    /** A type (do not use at runtime) of all the available schema values. */
    ValueType: Values<VersionMap<VersionedSchemas>>['schemaShape']['runtimeType'];
    /** A type (do not use at runtime) that maps each available version to its schema value. */
    VersionedValueType: {
        [Version in keyof VersionMap<VersionedSchemas>]: VersionMap<VersionedSchemas>[Version]['schemaShape']['runtimeType'];
    };
    /** A function that matches a raw value instance to its corresponding schema version. */
    assertWrapMatch: (value: unknown) => SchemaMatch<VersionMap<VersionedSchemas>>;
};

/**
 * It is not recommended to use this directly. Instead, use
 * `defineVersionedSchemaSuite(schemas).assertWrapMatch()`.
 *
 * An external version of `VersionedSchemasObject.assertWrapMatch`.
 *
 * @category Internal
 */
export function assertWrapMatch<const Versions extends Readonly<VersionMap<any>>>(
    versions: Readonly<Versions>,
    value: unknown,
): SchemaMatch<Versions> {
    const matchedSchemas = Object.values(versions as Readonly<VersionMap<any>>).filter(
        ({version, versionPath}) => {
            const rawVersion = getDeepValue<any, any>(value, versionPath);

            return rawVersion === version;
        },
    );

    /* node:coverage ignore next 3 */
    if (matchedSchemas.length > 1) {
        assert.never('Matched multiple schemas somehow.');
    } else if (!check.isLengthAtLeast(matchedSchemas, 1)) {
        throw new Error('Data does not match any schemas.');
    }

    const matchedSchema = matchedSchemas[0];

    assertValidShape(value, matchedSchema.schemaShape, {
        allowExtraKeys: true,
    });

    return {
        value,
        ...matchedSchema,
    } satisfies SchemaMatch<any> as SchemaMatch<Versions>;
}
