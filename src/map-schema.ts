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
import {defineShape, exact, optional, or, type ShapeDefinition} from 'object-shape-tester';

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
export type SchemaShapeOptions = FromSchemaOptions &
    PartialWithUndefined<{
        /**
         * Sets types as readonly.
         *
         * @default false
         */
        isReadonly: boolean;
        /**
         * Allows additional properties in the schema. By default, (when this is `false`) additional
         * properties are suppressed (additional properties are a `json-schema-to-ts` feature).
         *
         * @default false
         */
        allowAdditionalProperties: boolean;
        /**
         * Automatically make all properties required.
         *
         * @default false
         */
        allRequired: boolean;
    }>;

/**
 * Converts a JSON Schema type to its equivalent TypeScript type.
 *
 * @category Internal
 */
export type SchemaShapeToType<
    Schema extends JSONSchema,
    Options extends SchemaShapeOptions,
> = FromSchema<Extract<MapSchema<Schema, Options>, JSONSchema>, Options>;

type FixDefs<Schema, Options extends SchemaShapeOptions> = Schema extends {
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
    ? Schema['type'] extends 'object'
        ? Options['allRequired'] extends true
            ? Omit<Schema, 'properties' | 'additionalProperties' | 'required'> & {
                  properties: Readonly<{
                      [Key in keyof Schema['properties']]: MapSchema<
                          Schema['properties'][Key],
                          Options
                      >;
                  }>;
                  required: (keyof Schema['properties'])[];
                  additionalProperties: Options['allowAdditionalProperties'] extends true
                      ? true
                      : false;
              }
            : Omit<Schema, 'properties' | 'additionalProperties'> & {
                  properties: Readonly<{
                      [Key in keyof Schema['properties']]: MapSchema<
                          Schema['properties'][Key],
                          Options
                      >;
                  }>;
                  additionalProperties: Options['allowAdditionalProperties'] extends true
                      ? true
                      : false;
              }
        : Schema['type'] extends 'array'
          ? Omit<Schema, 'items'> & {
                items: Schema['items'] extends ReadonlyArray<any>
                    ? Readonly<{
                          [Key in keyof Schema['items']]: MapSchema<Schema['items'][Key], Options>;
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
              ShapeDefinition<
                  any,
                  Options['isReadonly'] extends boolean ? Options['isReadonly'] : false
              >,
              {
                  runtimeType: ShapeType;
                  defaultValue: ShapeType;
              }
          >
        : never;

/**
 * Maps a schema object to a `ShapeDefinition` which can be used with the
 * [object-shape-tester](https://www.npmjs.com/package/object-shape-tester) package.
 *
 * @category Main
 */
export function mapSchemaToShape<
    const Schema extends JSONSchema,
    const Options extends SchemaShapeOptions = FromSchemaDefaultOptions,
>(rawSchema: Schema, options?: Options): SchemaShape<Schema, Options> {
    return defineShape(
        recursiveSchemaToShape(rawSchema, [], {}),
        options?.isReadonly,
    ) satisfies ShapeDefinition<any, any> as any as SchemaShape<Schema, Options>;
}

function recursiveSchemaToShape(
    rawSchema: JSONSchema | ReadonlyArray<JSONSchema>,
    keyChain: (string | number)[],
    parentDefinitions: Record<string, unknown>,
): any {
    const keyChainString = keyChain.length ? keyChain.join('>') : 'Top level';

    const schema = rawSchema as JSONSchema | JSONSchema[];

    try {
        if (check.isBoolean(schema)) {
            throw new TypeError('A raw boolean schema is not supported.');
        } else if (check.isArray(schema)) {
            assert.isLengthAtLeast(schema, 1, 'Schema array is empty.');
            return or(
                ...typedMap(schema, (entry, index) =>
                    recursiveSchemaToShape(
                        entry,
                        [
                            ...keyChain,
                            index,
                        ],
                        parentDefinitions,
                    ),
                ),
            );
        }

        const newDefinitions =
            '$defs' in schema
                ? mapObjectValues(schema.$defs as AnyObject, (key, value) => {
                      return recursiveSchemaToShape(
                          value,
                          [
                              ...keyChain,
                              '$defs',
                              String(key),
                          ],
                          parentDefinitions,
                      ) as AnyObject;
                  })
                : {};

        const definitions = {
            ...parentDefinitions,
            ...newDefinitions,
        };

        if (schema.type === 'array') {
            if (!schema.items) {
                throw new Error('Got an array without items.');
            }

            return [recursiveSchemaToShape(schema.items, keyChain, definitions)];
        } else if (schema.type === 'object') {
            if (!schema.properties) {
                throw new Error('Got an object without properties.');
            }
            const requiredProperties: ReadonlyArray<string> = schema.required || [];

            return mapObjectValues(schema.properties, (key, propertyValue) => {
                const isPropertyOptional = !requiredProperties.includes(key);

                const propertyShape = recursiveSchemaToShape(
                    propertyValue,
                    [
                        ...keyChain,
                        key,
                    ],
                    definitions,
                );

                if (isPropertyOptional) {
                    return optional(or(propertyShape, undefined));
                } else {
                    return propertyShape;
                }
            });
        } else if (schema.const) {
            return exact(schema.const);
        } else if (schema.enum) {
            if (!check.isArray(schema.enum)) {
                throw new TypeError('Got a non array enum.');
            } else if (!check.isLengthAtLeast(schema.enum, 1)) {
                throw new Error('Got an empty enum array.');
            } else if (schema.enum.some((value) => !check.isPrimitive(value))) {
                throw new Error('Got a non primitive enum value.');
            }

            return or(...typedMap(schema.enum, (value) => exact(value)));
        } else if (schema.type === 'boolean') {
            return schema.default ?? false;
        } else if (schema.type === 'integer' || schema.type === 'number') {
            return schema.default ?? -1;
        } else if (schema.type === 'null') {
            return null;
        } else if (schema.type === 'string') {
            return schema.default ?? '';
        } else if (schema.$ref) {
            const refKey = removePrefix({value: schema.$ref, prefix: '#/$defs/'});

            const definition = definitions[refKey];

            if (definition) {
                return definition;
            } else {
                throw new Error(`No definition found for '${schema.$ref}'`);
            }
        } else {
            throw new Error(`Unexpected schema: ${stringify(schema)}`);
        }
    } catch (error) {
        throw ensureErrorAndPrependMessage(error, `${keyChainString}:`);
    }
}
