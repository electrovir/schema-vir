import {assert} from '@augment-vir/assert';
import {mapObject, mapObjectValues, type AnyObject, type Values} from '@augment-vir/common';
import {type VersionMap} from './versioned-schema-types.js';
import {matchValue, type VersionedSchemaSuiteObject} from './versioned-schemas.js';

/**
 * An individually defined schema mapper, output from `SchemaMapperSuite.defineMapper`.
 *
 * @category Internal
 */
export type SchemaMapper<
    Versions extends VersionMap<any>,
    Version extends keyof Versions,
    MapOutput,
    Context,
> = {
    version: Version;
    mapper: SchemaMapperMethod<Versions, Version, MapOutput, Context>;
};

/**
 * Params for {@link SchemaMapperMethod}.
 *
 * @category Internal
 */
export type SchemaMapperParams<
    Versions extends VersionMap<any>,
    Version extends keyof Versions,
    Context,
> = {
    value: Versions[Version]['schemaShape']['runtimeType'];
    context: Context;
};

/**
 * The mapper method for {@link SchemaMapper}.
 *
 * @category Internal
 */
export type SchemaMapperMethod<
    Versions extends VersionMap<any>,
    Version extends keyof Versions,
    MapOutput,
    Context,
> = (params: SchemaMapperParams<Versions, Version, Context>) => MapOutput;

/**
 * Output of `SchemaMapperSuite.collectMappers`.
 *
 * @category Internal
 */
export type CollectedSchemaMappers<Versions extends VersionMap<any>, MapOutput, Context> = {
    /** All the mappers, keyed by schema version. */
    mappers: {
        [Version in keyof Versions]: SchemaMapper<Versions, Version, MapOutput, Context>;
    };

    /**
     * Detects the value's schema version and runs the appropriate mapper on it.
     *
     * @throws If the value does not match any schema.
     */
    mapSchema: (
        ...params: Context extends undefined
            ? [value: Readonly<AnyObject>, context?: Context]
            : [value: Readonly<AnyObject>, context: Context]
    ) => MapOutput;
};

/**
 * Output of {@link defineSchemaMapperSuite}.
 *
 * @category Internal
 */
export type SchemaMapperSuite<
    SchemaSuite extends Readonly<VersionedSchemaSuiteObject<any>>,
    MapOutput,
    Context,
> = {
    /** Defines a schema mapper for a specific schema version. */
    defineMapper: {
        [Version in keyof SchemaSuite['versions']]: (
            mapper: SchemaMapperMethod<SchemaSuite['versions'], Version, MapOutput, Context>,
        ) => SchemaMapper<SchemaSuite['versions'], Version, MapOutput, Context>;
    };
    /**
     * Collects multiple mappers together for running mapping.
     *
     * @throws If mappers are missing for any schema version or if multiple mappers are found for a
     *   single schema version.
     */
    collectMappers: (
        mappers: Record<string, SchemaMapper<SchemaSuite['versions'], any, MapOutput, Context>>,
    ) => CollectedSchemaMappers<SchemaSuite['versions'], MapOutput, Context>;
};

/**
 * Defines a suite of schema mapper methods.
 *
 * @category Main
 */
export function defineSchemaMapperSuite<MapOutput, Context = undefined>() {
    return <const SchemaSuite extends Readonly<VersionedSchemaSuiteObject<any>>>(
        schemaSuite: Readonly<SchemaSuite>,
    ): SchemaMapperSuite<SchemaSuite, MapOutput, Context> => {
        const defineMapper: Record<
            keyof SchemaMapperSuite<SchemaSuite, MapOutput, Context>['defineMapper'],
            Values<SchemaMapperSuite<SchemaSuite, MapOutput, Context>['defineMapper']>
        > = mapObjectValues(schemaSuite.versions, (version) => {
            return (
                mapper: SchemaMapperMethod<
                    SchemaSuite['versions'],
                    typeof version,
                    MapOutput,
                    Context
                >,
            ) => {
                return defineSchemaMapper(schemaSuite.versions, version, mapper);
            };
        });

        return {
            defineMapper: defineMapper as AnyObject as SchemaMapperSuite<
                SchemaSuite,
                MapOutput,
                Context
            >['defineMapper'],
            collectMappers(
                mappers: Record<
                    string,
                    SchemaMapper<
                        SchemaSuite['versions'],
                        keyof SchemaSuite['versions'],
                        MapOutput,
                        Context
                    >
                >,
            ) {
                return collectMappers(schemaSuite.versions, mappers);
            },
        };
    };
}

/**
 * It is not recommended to use this directly. Instead, use
 * `defineSchemaMapperSuite(schemaSuite).defineMapper()`.
 *
 * An external version of `SchemaMapperSuite.defineMapper`.
 *
 * @category Internal
 */
export function defineSchemaMapper<
    const Versions extends VersionMap<any>,
    const Version extends keyof Versions,
    MapOutput,
    Context,
>(
    versions: Versions,
    version: Version,
    mapper: SchemaMapperMethod<Versions, Version, MapOutput, Context>,
): SchemaMapper<Versions, Version, MapOutput, Context> {
    assert.hasKey(versions, version, `Invalid schema mapper version: '${String(version)}'`);

    return {
        version,
        mapper,
    };
}

/**
 * It is not recommended to use this directly. Instead, use
 * `defineSchemaMapperSuite(schemaSuite).collectMappers()`.
 *
 * An external version of `SchemaMapperSuite.collectMappers`.
 *
 * @category Internal
 */
export function collectMappers<const Versions extends VersionMap<any>, MapOutput, Context>(
    versions: Versions,
    mappers: Record<string, SchemaMapper<Versions, keyof Versions, MapOutput, Context>>,
): CollectedSchemaMappers<Versions, MapOutput, Context> {
    const versionsUsed: (keyof Versions)[] = [];

    const mappersByVersion: CollectedSchemaMappers<Versions, MapOutput, Context>['mappers'] =
        mapObject(mappers, (key, mapper) => {
            if (versionsUsed.includes(mapper.version)) {
                throw new Error(
                    `Duplicate mapper for version '${String(mapper.version)}' detected at key '${key}'`,
                );
            }
            versionsUsed.push(mapper.version);

            return {
                key: mapper.version,
                value: mapper,
            };
        }) satisfies Record<
            keyof CollectedSchemaMappers<Versions, MapOutput, Context>['mappers'],
            Values<CollectedSchemaMappers<Versions, MapOutput, Context>['mappers']>
        > as AnyObject as CollectedSchemaMappers<Versions, MapOutput, Context>['mappers'];

    const missingVersions: string[] = Object.keys(versions).filter(
        (version) => !versionsUsed.includes(version),
    );

    if (missingVersions.length) {
        throw new Error(`Missing mappers for versions: ${missingVersions.join(',')}`);
    }

    return {
        mappers: mappersByVersion,
        mapSchema(...params) {
            return mapSchema(versions, mappersByVersion, ...params);
        },
    };
}

/**
 * It is not recommended to use this directly. Instead, use
 * `defineSchemaMapperSuite(schemaSuite).collectMappers(mappers).mapSchema()`.
 *
 * An external version of `CollectedSchemaMappers.mapSchema`.
 *
 * @category Internal
 */
export function mapSchema<const Versions extends VersionMap<any>, MapOutput, Context>(
    versions: Versions,
    mappers: CollectedSchemaMappers<Versions, MapOutput, Context>['mappers'],
    ...[
        value,
        context,
    ]: Context extends undefined
        ? [value: Readonly<AnyObject>, context?: Context]
        : [value: Readonly<AnyObject>, context: Context]
): MapOutput {
    const schemaMatch = matchValue<Versions>(versions, value);

    const mapper = mappers[schemaMatch.version].mapper;

    assert.isDefined(mapper, `No mapper found for version '${schemaMatch.version}'`);

    return mapper({
        value,
        context: context as Context,
    });
}
