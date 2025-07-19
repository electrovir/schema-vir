import {baseNcuConfig} from '@virmator/deps/configs/ncu.config.base';
import {RunOptions} from 'npm-check-updates';

export const ncuConfig: RunOptions = {
    ...baseNcuConfig,
    // exclude these
    reject: [
        ...baseNcuConfig.reject,
        /** https://github.com/sindresorhus/eslint-plugin-unicorn/pull/2706 */
        'eslint-plugin-unicorn',
    ],
    // include only these
    filter: [],
};
