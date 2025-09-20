import {assert, check} from '@augment-vir/assert';
import {
    arrayToObject,
    ensureErrorAndPrependMessage,
    getDeepValue,
    mapObject,
    mapObjectValues,
    type AnyObject,
    type ArrayElement,
    type DeepValue,
    type Values,
} from '@augment-vir/common';
import {type JSONSchema} from 'json-schema-to-ts';
import {checkValidShape, type Shape} from 'object-shape-tester';
import {type IsEqual, type OmitIndexSignature} from 'type-fest';
import {mapSchemaToShape, type SchemaShape, type SchemaShapeOptions} from './map-schema.js';

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
 * A versioned schema instance. Output of {@link defineVersionedSchema}.
 *
 * @category Internal
 */
export type VersionedSchema<
    VersionPath extends ReadonlyArray<string> = ReadonlyArray<string>,
    Schema extends JSONSchema = any,
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    Options extends SchemaShapeOptions = {},
> = {
    versionPath: Readonly<VersionPath>;
    schemaShape: Readonly<SchemaShape<Schema, Options>>;
};

/**
 * Base type for inputs to {@link collectVersionedSchemas}.
 *
 * @category Internal
 */
export type BaseVersionedSchemas = Record<string, VersionedSchema>;

/**
 * Combines multiple versioned schemas into a single object which contains:
 *
 * - The original versioned schemas (`.originalVersionedSchemas`).
 * - Each schema mapped by its version string (`.versions`).
 * - An enum of the available schema versions (`.Version`).
 * - A type (do not use at runtime) of all the available schema values (`.ValueType`).
 * - A type (do not use at runtime) that maps each available version to its schema value
 *   (`.VersionedValueType`).
 * - A function that matches a raw data instance to its corresponding schema version (`.findMatch()`).
 *
 * @category Main
 */
export function collectVersionedSchemas<
    const VersionedSchemas extends Readonly<BaseVersionedSchemas>,
>(versionedSchemas: Readonly<VersionedSchemas>): CollectedVersionedSchemas<VersionedSchemas> {
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

    const result: Omit<VersionedSchemasObject<VersionedSchemas>, ArrayElement<typeof typeKeys>> = {
        originalVersionedSchemas: versionedSchemas,
        versions,
        Version,
        findMatch(raw) {
            return findSchemaMatch(versions, raw);
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

    return result as CollectedVersionedSchemas<VersionedSchemas>;
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
 * All outputs from {@link collectVersionedSchemas} with input validation.
 *
 * @category Internal
 */
export type CollectedVersionedSchemas<VersionedSchemas extends Readonly<BaseVersionedSchemas>> =
    IsEqual<keyof OmitIndexSignature<VersionEnum<VersionedSchemas>>, never> extends true
        ? 'ERROR: Invalid schema: optional or non-const version detected.'
        : VersionedSchemasObject<VersionedSchemas>;

/**
 * All outputs from {@link collectVersionedSchemas}.
 *
 * @category Internal
 */
export type VersionedSchemasObject<VersionedSchemas extends Readonly<BaseVersionedSchemas>> = {
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
    /** A function that matches a raw data instance to its corresponding schema version. */
    findMatch: (raw: Readonly<AnyObject>) => SchemaMatch<VersionedSchemas> | undefined;
};

/**
 * Output of `VersionedSchemasObject.findMatch`. Data and the schema version that it was matched
 * with.
 *
 * @category Internal
 */
export type SchemaMatch<VersionedSchemas extends Readonly<BaseVersionedSchemas>> = {
    data: Values<VersionMap<VersionedSchemas>>['schemaShape']['runtimeType'];
} & Values<VersionMap<VersionedSchemas>>;

/**
 * Converts an object of versioned schemas to an enum of their available schema versions.
 *
 * @category Internal
 */
export type VersionEnum<VersionedSchemas extends Readonly<BaseVersionedSchemas>> = {
    [Version in keyof VersionMap<VersionedSchemas>]: Version;
};

/**
 * Maps all schema versions to the schema shape and version.
 *
 * @category Internal
 */
export type VersionMap<VersionedSchemas extends Readonly<BaseVersionedSchemas>> = {
    [Key in keyof VersionedSchemas]: {
        schemaVersion: ExtractVersion<VersionedSchemas[Key]>;
        schemaShape: VersionedSchemas[Key]['schemaShape'];
    };
} extends infer InnerVersions extends Record<string, {schemaVersion: string; schemaShape: Shape}>
    ? {
          [VersionKey in Values<InnerVersions>['schemaVersion']]: {
              version: VersionKey;
              versionPath: ReadonlyArray<string>;
              schemaShape: Extract<
                  Values<InnerVersions>,
                  {schemaVersion: VersionKey}
              >['schemaShape'];
          };
      }
    : never;

/**
 * Extracts the version string from a versioned schema.
 *
 * @category Internal
 */
export type ExtractVersion<Schema extends Readonly<VersionedSchema>> =
    Schema['schemaShape']['runtimeType'] extends AnyObject
        ? DeepValue<Schema['schemaShape']['runtimeType'], Schema['versionPath']>
        : 'ERROR: cannot extract schema version from non object.';

/**
 * Extracts the runtime schema version from a versioned schema.
 *
 * @category Internal
 */
export function extractSchemaVersion<const Schema extends Readonly<VersionedSchema>>(
    schemaShape: Readonly<Schema>,
): ExtractVersion<Schema> {
    const schemaVersion = getDeepValue<any, any>(
        schemaShape.schemaShape.default,
        schemaShape.versionPath,
    );

    assert.isString(schemaVersion, 'Failed to extract schema version.');

    return schemaVersion as ExtractVersion<Schema>;
}

/**
 * An external version of `VersionedSchemasObject.findMatch`.
 *
 * @category Internal
 */
export function findSchemaMatch<const VersionedSchemas extends Readonly<BaseVersionedSchemas>>(
    versions: Readonly<VersionMap<VersionedSchemas>>,
    raw: Readonly<AnyObject>,
): SchemaMatch<VersionedSchemas> | undefined {
    const matchedSchemas = Object.values(versions as Readonly<VersionMap<any>>).filter(
        ({schemaShape, version, versionPath}) => {
            const rawVersion = getDeepValue<any, any>(raw, versionPath);

            return (
                rawVersion === version &&
                checkValidShape(raw, schemaShape, {
                    allowExtraKeys: true,
                })
            );
        },
    );

    /* node:coverage ignore next 3 */
    if (matchedSchemas.length > 1) {
        assert.never('Matched multiple schemas somehow.');
    } else if (!check.isLengthAtLeast(matchedSchemas, 1)) {
        return undefined;
    }

    return {
        data: raw,
        ...matchedSchemas[0],
    } satisfies SchemaMatch<any> as SchemaMatch<VersionedSchemas>;
}
