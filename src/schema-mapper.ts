import {assert} from '@augment-vir/assert';
import {mapObject, mapObjectValues, type AnyObject, type Values} from '@augment-vir/common';
import {type VersionMap} from './versioned-schema-types.js';
import {findSchemaMatch, type VersionedSchemaSuiteObject} from './versioned-schemas.js';

/**
 * An individually defined schema mapper, output from `SchemaMapperSuite.defineMapper`.
 *
 * @category Internal
 */
export type SchemaMapper<
    Versions extends VersionMap<any>,
    Version extends keyof Versions,
    MapOutput,
> = {
    version: Version;
    mapper: SchemaMapperMethod<Versions, Version, MapOutput>;
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
> = (value: Versions[Version]['schemaShape']['runtimeType']) => MapOutput;

/**
 * Output of `SchemaMapperSuite.collectMappers`.
 *
 * @category Internal
 */
export type CollectedSchemaMappers<Versions extends VersionMap<any>, MapOutput> = {
    /** All the mappers, keyed by schema version. */
    mappers: {
        [Version in keyof Versions]: SchemaMapper<Versions, Version, MapOutput>;
    };

    /**
     * Detects the data's schema version and runs the appropriate mapper on it.
     *
     * @throws If the data does not match any schema.
     */
    mapSchema: (data: Readonly<AnyObject>) => MapOutput;
};

/**
 * Output of {@link defineSchemaMapperSuite}.
 *
 * @category Internal
 */
export type SchemaMapperSuite<
    MapOutput,
    SchemaSuite extends Readonly<VersionedSchemaSuiteObject<any>>,
> = {
    /** Defines a schema mapper for a specific schema version. */
    defineMapper: {
        [Version in keyof SchemaSuite['versions']]: (
            mapper: SchemaMapperMethod<SchemaSuite['versions'], Version, MapOutput>,
        ) => SchemaMapper<SchemaSuite['versions'], Version, MapOutput>;
    };
    /**
     * Collects multiple mappers together for running mapping.
     *
     * @throws If mappers are missing for any schema version or if multiple mappers are found for a
     *   single schema version.
     */
    collectMappers: (
        mappers: Record<string, SchemaMapper<SchemaSuite['versions'], any, MapOutput>>,
    ) => CollectedSchemaMappers<SchemaSuite['versions'], MapOutput>;
};

/**
 * Defines a suite of schema mapper methods.
 *
 * @category Main
 */
export function defineSchemaMapperSuite<MapOutput>() {
    return <const SchemaSuite extends Readonly<VersionedSchemaSuiteObject<any>>>(
        schemaSuite: Readonly<SchemaSuite>,
    ): SchemaMapperSuite<MapOutput, SchemaSuite> => {
        const defineMapper: Record<
            keyof SchemaMapperSuite<MapOutput, SchemaSuite>['defineMapper'],
            Values<SchemaMapperSuite<MapOutput, SchemaSuite>['defineMapper']>
        > = mapObjectValues(schemaSuite.versions, (version) => {
            return (
                mapper: SchemaMapperMethod<SchemaSuite['versions'], typeof version, MapOutput>,
            ) => {
                return defineSchemaMapper(schemaSuite.versions, version, mapper);
            };
        });

        return {
            defineMapper: defineMapper as AnyObject as SchemaMapperSuite<
                MapOutput,
                SchemaSuite
            >['defineMapper'],
            collectMappers(
                mappers: Record<
                    string,
                    SchemaMapper<SchemaSuite['versions'], keyof SchemaSuite['versions'], MapOutput>
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
>(
    versions: Versions,
    version: Version,
    mapper: (value: Versions[Version]['schemaShape']['runtimeType']) => MapOutput,
): SchemaMapper<Versions, Version, MapOutput> {
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
export function collectMappers<const Versions extends VersionMap<any>, MapOutput>(
    versions: Versions,
    mappers: Record<string, SchemaMapper<Versions, keyof Versions, MapOutput>>,
): CollectedSchemaMappers<Versions, MapOutput> {
    const versionsUsed: (keyof Versions)[] = [];

    const mappersByVersion: CollectedSchemaMappers<Versions, MapOutput>['mappers'] = mapObject(
        mappers,
        (key, mapper) => {
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
        },
    ) satisfies Record<
        keyof CollectedSchemaMappers<Versions, MapOutput>['mappers'],
        Values<CollectedSchemaMappers<Versions, MapOutput>['mappers']>
    > as AnyObject as CollectedSchemaMappers<Versions, MapOutput>['mappers'];

    const missingVersions: string[] = Object.keys(versions).filter(
        (version) => !versionsUsed.includes(version),
    );

    if (missingVersions.length) {
        throw new Error(`Missing mappers for versions: ${missingVersions.join(',')}`);
    }

    return {
        mappers: mappersByVersion,
        mapSchema(data) {
            return mapSchema(versions, mappersByVersion, data);
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
export function mapSchema<const Versions extends VersionMap<any>, MapOutput>(
    versions: Versions,
    mappers: CollectedSchemaMappers<Versions, MapOutput>['mappers'],
    data: Readonly<AnyObject>,
): MapOutput {
    const schemaMatch = findSchemaMatch<Versions>(versions, data);

    if (!schemaMatch) {
        throw new Error('Data does not match any schemas.');
    }

    const mapper = mappers[schemaMatch.version].mapper;

    assert.isDefined(mapper, `No mapper found for version '${schemaMatch.version}'`);

    return mapper(data);
}
