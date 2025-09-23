# schema-vir

Utilities for handling JSON Schemas and mapping them to [object-shape-tester](https://www.npmjs.com/package/object-shape-tester) `Shape` instances.

## Install

```sh
npm i schema-vir
```

## Usage

### Mapping Schema to Shape

`mapSchemaToShape` converts a JSON Schema object into an [object-shape-tester](https://www.npmjs.com/package/object-shape-tester) `Shape` instance, which can then be used for its automatically generated default value, ensuring TypeScript types, and validating runtime values. (See [object-shape-tester](https://www.npmjs.com/package/object-shape-tester) for more details on how `Shape` is used.)

<!-- example-link: src/readme-examples/simple-usage.example.ts -->

```TypeScript
import {mapSchemaToShape} from 'schema-vir';

const myShape = mapSchemaToShape({
    type: 'object',
    properties: {
        a: {
            type: 'string',
        },
    },
});
```

## Versioned Schemas

Use `defineVersionedSchema` to define multiple versioned JSON Schemas and then use `defineVersionedSchemaSuite` to combine them all and generate enums, matchers, types, etc.

<!-- example-link: src/readme-examples/versioned-schemas.example.ts -->

```TypeScript
import {defineVersionedSchema, defineVersionedSchemaSuite} from 'schema-vir';

export const v1Schema = defineVersionedSchema(
    [
        'schemaVersion',
    ],
    {
        $schema: 'http://json-schema.org/draft-07/schema#',
        type: 'object',
        required: [
            'data',
            'schemaVersion',
        ],
        properties: {
            schemaVersion: {
                const: 'v1',
                type: 'string',
            },
            data: {
                type: 'object',
                required: [
                    'value',
                ],
                properties: {
                    value: {
                        type: 'string',
                    },
                },
            },
        },
    },
);

export const v2Schema = defineVersionedSchema(
    [
        'schemaVersion',
    ],
    {
        $schema: 'http://json-schema.org/draft-07/schema#',
        type: 'object',
        required: [
            'data',
            'schemaVersion',
        ],
        properties: {
            schemaVersion: {
                const: 'v2',
                type: 'string',
            },
            data: {
                type: 'object',
                required: [
                    'value',
                ],
                properties: {
                    value: {
                        type: 'number',
                    },
                },
            },
        },
    },
);

const schemas = defineVersionedSchemaSuite({
    v1Schema,
    v2Schema,
});

// Schema shaped mapped by their version.
schemas.versions;

// An enum of all versions.
schemas.Version;

// Find the schema and version that the given object matches (if any).
schemas.matchValue({
    schemaVersion: 'v2',
    data: {
        value: 10,
    },
});

// Access all possible schema runtime types with `schemas.ValueType`.
// Access all possible schema runtime types keyed by their version with `schemas.VersionedValueType`.
```
