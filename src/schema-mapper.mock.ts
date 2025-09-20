import {defineSchemaMapperSuite} from './schema-mapper.js';
import {mockVersionedSchemaSuite} from './versioned-schemas.mock.js';

// eslint-disable-next-line sonarjs/redundant-type-aliases
export type MockMapperOutput = number;

export const mockMapperSuite =
    defineSchemaMapperSuite<MockMapperOutput>()(mockVersionedSchemaSuite);
