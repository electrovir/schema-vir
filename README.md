# schema-vir

Maps a JSON schema to an [object-shape-tester](https://www.npmjs.com/package/object-shape-tester) instance.

## Install

```sh
npm i schema-vir
```

## Usage

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
