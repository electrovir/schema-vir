import {assert} from '@augment-vir/assert';
import {getDeepValue, type AnyObject, type DeepValue, type Values} from '@augment-vir/common';
import {type JSONSchema} from 'json-schema-to-ts';
import {type Shape} from 'object-shape-tester';
import {type SchemaShape, type SchemaShapeOptions} from './map-schema.js';

/**
 * A versioned schema instance. Output of `defineVersionedSchema`.
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
 * Base type for inputs to `defineVersionedSchemaSuite`.
 *
 * @category Internal
 */
export type BaseVersionedSchemas = Record<string, VersionedSchema>;

/**
 * Output of `VersionedSchemasObject.assertWrapMatch`. Data and the schema version that it was
 * matched with.
 *
 * @category Internal
 */
export type SchemaMatch<Versions extends VersionMap<any>> = Readonly<
    {
        value: Values<Versions>['schemaShape']['runtimeType'];
    } & Values<Versions>
>;

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
