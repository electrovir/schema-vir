import {mapSchemaToShape} from '../index.js';

const myShape = mapSchemaToShape({
    type: 'object',
    properties: {
        a: {
            type: 'string',
        },
    },
});
