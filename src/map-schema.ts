import {assert, check} from '@augment-vir/assert';
import {
    type AnyObject,
    ensureErrorAndPrependMessage,
    mapObjectValues,
    type Overwrite,
    type PartialWithUndefined,
    removePrefix,
    stringify,
    typedMap,
} from '@augment-vir/common';
import {
    type FromSchema,
    type FromSchemaDefaultOptions,
    type FromSchemaOptions,
    type JSONSchema,
} from 'json-schema-to-ts';
import {
    defineShape,
    exactShape,
    optionalShape,
    recordShape,
    type Shape,
    unionShape,
    unknownShape,
} from 'object-shape-tester';

export type {
    FromSchema,
    FromSchemaDefaultOptions,
    FromSchemaOptions,
    JSONSchema,
} from 'json-schema-to-ts';

/**
 * Options for {@link mapSchemaToShape}.
 *
 * @category Internal
 */
export type SchemaShapeOptions = Omit<FromSchemaOptions, 'keepDefaultedPropertiesOptional'> &
    PartialWithUndefined<{
        /**
         * Allows additional properties in the schema. By default, (when this is `false`) additional
         * properties are suppressed (additional properties are a `json-schema-to-ts` feature).
         *
         * @default false
         */
        allowAdditionalProperties: boolean;
    }>;

/**
 * Recursively adds `| undefined` to every optional property in a type. `json-schema-to-ts` emits
 * optional properties as `key?: T` which, under `exactOptionalPropertyTypes`, forbids an explicit
 * `undefined` value. The runtime shapes produced here explicitly allow `undefined` for optional
 * properties (via `optionalShape(unionShape(undefined, ...))`), so the generated type must match by
 * allowing `undefined` as well.
 *
 * @category Internal
 */
export type DeepOptionalUndefined<T> =
    T extends ReadonlyArray<any>
        ? {
              [Index in keyof T]: DeepOptionalUndefined<T[Index]>;
          }
        : T extends object
          ? string extends keyof T
              ? {
                    [Key in keyof T]: DeepOptionalUndefined<T[Key]>;
                }
              : {
                    [Key in keyof T]: object extends Pick<T, Key>
                        ? DeepOptionalUndefined<T[Key]> | undefined
                        : DeepOptionalUndefined<T[Key]>;
                }
          : T;

/**
 * Converts a JSON Schema type to its equivalent TypeScript type.
 *
 * @category Internal
 */
export type SchemaShapeToType<
    Schema extends JSONSchema,
    Options extends SchemaShapeOptions,
> = DeepOptionalUndefined<
    FromSchema<
        Extract<MapSchema<Schema, Options>, JSONSchema>,
        Options & {keepDefaultedPropertiesOptional: true}
    >
>;

/**
 * Maps the schema for definitions.
 *
 * @category Internal
 */
export type FixDefs<Schema, Options extends SchemaShapeOptions> = Schema extends {
    $defs: infer Defs extends Record<string, JSONSchema>;
}
    ? Omit<Schema, '$defs'> & {
          $defs: {
              [DefKey in keyof Defs]: MapSchemaInternal<Defs[DefKey], Options>;
          };
      }
    : Schema;

/**
 * Maps the schema to inject some extra properties so that `json-schema-to-ts` will transform it the
 * way we want it to.
 *
 * @category Internal
 */
export type MapSchema<Schema extends JSONSchema, Options extends SchemaShapeOptions> = FixDefs<
    MapSchemaInternal<Schema, Options>,
    Options
>;

/**
 * Inner workings of {@link MapSchema} without fixing definitions.
 *
 * @category Internal
 */
export type MapSchemaInternal<
    Schema extends JSONSchema,
    Options extends SchemaShapeOptions,
> = Schema extends AnyObject
    ? Schema['anyOf'] extends (infer UnionEntry extends JSONSchema)[]
        ? MapSchemaInternal<UnionEntry, Options>
        : Schema['type'] extends 'object'
          ? Omit<Schema, 'properties' | 'additionalProperties'> & {
                properties: Readonly<{
                    [Key in keyof Schema['properties']]: MapSchema<
                        Schema['properties'][Key],
                        Options
                    >;
                }>;
                additionalProperties: Schema['additionalProperties'] extends AnyObject
                    ? MapSchema<Schema['additionalProperties'], Options>
                    : Options['allowAdditionalProperties'] extends true
                      ? true
                      : false;
            }
          : Schema['type'] extends 'array'
            ? Omit<Schema, 'items'> & {
                  items: Schema['items'] extends ReadonlyArray<any>
                      ? Readonly<{
                            [Key in keyof Schema['items']]: MapSchema<
                                Schema['items'][Key],
                                Options
                            >;
                        }>
                      : MapSchema<Schema['items'], Options>;
              }
            : Schema
    : Schema;

/**
 * Maps a schema and options to a shape definition with the schema's mapped type.
 *
 * @category Internal
 */
export type SchemaShape<Schema extends JSONSchema, Options extends SchemaShapeOptions> =
    SchemaShapeToType<Schema, Options> extends infer ShapeType
        ? Overwrite<
              Shape,
              {
                  runtimeType: ShapeType;
                  default: ShapeType;
              }
          >
        : never;

/**
 * Maps a schema object to a `Shape` which can be used with the
 * [object-shape-tester](https://www.npmjs.com/package/object-shape-tester) package.
 *
 * @category Main
 */
export function mapSchemaToShape<
    const Schema extends JSONSchema,
    const Options extends SchemaShapeOptions = Omit<
        FromSchemaDefaultOptions,
        'keepDefaultedPropertiesOptional'
    >,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
>(rawSchema: Schema, options?: Options): SchemaShape<Schema, Options> {
    return defineShape(
        recursiveSchemaToShape(rawSchema, [], {}, {}),
    ) satisfies Shape as any as SchemaShape<Schema, Options>;
}

function recursiveSchemaToShape(
    rawSchema: JSONSchema | ReadonlyArray<JSONSchema>,
    keyChain: (string | number)[],
    parentDefinitions: AnyObject,
    definitionsShapeCache: AnyObject,
): any {
    const keyChainString = keyChain.length ? keyChain.join('>') : 'Top level';

    const schema = rawSchema as JSONSchema | JSONSchema[];

    try {
        if (check.isBoolean(schema)) {
            throw new TypeError('A raw boolean schema is not supported.');
        } else if (check.isArray(schema)) {
            assert.isLengthAtLeast(schema, 1, 'Schema array is empty.');
            return unionShape(
                ...typedMap(schema, (entry, index) =>
                    recursiveSchemaToShape(
                        entry,
                        [
                            ...keyChain,
                            index,
                        ],
                        parentDefinitions,
                        definitionsShapeCache,
                    ),
                ),
            );
        } else if (check.isArray(schema.anyOf)) {
            assert.isLengthAtLeast(schema.anyOf, 1, 'Schema anyOf array is empty.');
            return unionShape(
                ...typedMap(schema.anyOf, (entry, index) =>
                    recursiveSchemaToShape(
                        entry,
                        [
                            ...keyChain,
                            index,
                        ],
                        parentDefinitions,
                        definitionsShapeCache,
                    ),
                ),
            );
        }

        const definitions: AnyObject = {
            ...parentDefinitions,
            ...('$defs' in schema ? (schema.$defs as AnyObject) : {}),
        };

        if (schema.type === 'array') {
            if (!schema.items) {
                throw new Error('Got an array without items.');
            }

            return [
                recursiveSchemaToShape(schema.items, keyChain, definitions, definitionsShapeCache),
            ];
        } else if (schema.type === 'object') {
            const requiredProperties: ReadonlyArray<string> = schema.required || [];

            const propertiesShape = schema.properties
                ? mapObjectValues(schema.properties, (key, propertyValue) => {
                      const isPropertyOptional = !requiredProperties.includes(key);

                      const propertyShape = recursiveSchemaToShape(
                          propertyValue,
                          [
                              ...keyChain,
                              key,
                          ],
                          definitions,
                          definitionsShapeCache,
                      );

                      if (isPropertyOptional) {
                          /**
                           * Optional properties with no explicit `default` resolve to `undefined`
                           * so the parent shape's `.default` omits them on serialization (matching
                           * the `nullableShape` / `optionalShape` convention from
                           * `object-shape-tester`). When the property schema does specify an
                           * explicit `default`, that value is preserved by listing the inner shape
                           * (whose default already reflects the explicit value) first in the
                           * union.
                           */
                          const hasExplicitDefault =
                              check.isObject(propertyValue) && 'default' in propertyValue;

                          return hasExplicitDefault
                              ? optionalShape(unionShape(propertyShape, undefined))
                              : optionalShape(unionShape(undefined, propertyShape));
                      } else {
                          return propertyShape;
                      }
                  })
                : undefined;

            const additionalPropertiesShape = schema.additionalProperties
                ? recordShape({
                      keys: '',
                      values: check.isObject(schema.additionalProperties)
                          ? recursiveSchemaToShape(
                                schema.additionalProperties,
                                [
                                    ...keyChain,
                                    'additionalProperties',
                                ],
                                definitions,
                                definitionsShapeCache,
                            )
                          : unknownShape(),
                  })
                : undefined;

            if (propertiesShape && additionalPropertiesShape) {
                throw new Error(
                    "Do not define 'properties' and a type for 'additionalProperties' at the same time. Both types and shape validation will not work.",
                );
            } else if (propertiesShape) {
                return propertiesShape;
            } else if (additionalPropertiesShape) {
                return additionalPropertiesShape;
            } else {
                throw new Error('Got an object without properties.');
            }
        } else if (schema.const) {
            return exactShape(schema.const);
        } else if (schema.enum) {
            if (!check.isArray(schema.enum)) {
                throw new TypeError('Got a non array enum.');
            } else if (!check.isLengthAtLeast(schema.enum, 1)) {
                throw new Error('Got an empty enum array.');
            } else if (schema.enum.some((value) => !check.isPrimitive(value))) {
                throw new Error('Got a non primitive enum value.');
            }

            return unionShape(...typedMap(schema.enum, (value) => exactShape(value)));
        } else if (schema.type === 'boolean') {
            return schema.default ?? false;
        } else if (schema.type === 'integer' || schema.type === 'number') {
            return schema.default ?? -1;
        } else if (schema.type === 'null') {
            return null;
        } else if (schema.type === 'string') {
            return schema.default ?? '';
        } else if (schema.$ref) {
            const refKey = removePrefix({
                value: schema.$ref,
                prefix: '#/$defs/',
            });

            const definition = definitions[refKey];

            if (definition) {
                if (refKey in definitionsShapeCache) {
                    return definitionsShapeCache[refKey];
                } else {
                    const definitionShape = recursiveSchemaToShape(
                        definition,
                        keyChain,
                        definitions,
                        definitionsShapeCache,
                    );
                    definitionsShapeCache[refKey] = definitionShape;
                    return definitionShape;
                }
            } else {
                throw new Error(`No definition found for '${schema.$ref}'`);
            }
        } else if (check.isArray(schema.type)) {
            const possibleSchemas = schema.type.map((individualType) => {
                return recursiveSchemaToShape(
                    {
                        ...schema,
                        type: individualType,
                    },
                    keyChain,
                    definitions,
                    definitionsShapeCache,
                );
            });

            return unionShape<any>(...possibleSchemas);
        } else {
            throw new TypeError(`Unexpected schema: ${stringify(schema)}`);
        }
    } catch (error) {
        throw ensureErrorAndPrependMessage(error, `${keyChainString}:`);
    }
}
