const path = require("path");

const { getArgs } = require("../../args");
const { isFunction, isArray, deepMergeWithArray } = require("../../utils");
const { log } = require("../../logger");
const { applyJestConfigPlugins } = require("../plugins");
const { projectRoot } = require("../../paths");
const { createJestBabelTransform } = require("./create-jest-babel-transform");

const BABEL_TRANSFORM_ENTRY_KEY_BEFORE_2_1_0 = "^.+\\.(js|jsx)$";
const BABEL_TRANSFORM_ENTRY_KEY = "^.+\\.(js|jsx|ts|tsx)$";

function overrideBabelTransform(jestConfig, cracoConfig, transformKey) {
    jestConfig.transform[transformKey] = createJestBabelTransform(cracoConfig);

    log("Overrided Jest Babel transformer.");
}

function configureBabel(jestConfig, cracoConfig) {
    const { addPresets, addPlugins } = cracoConfig.jest.babel;

    if (addPresets || addPlugins) {
        if (cracoConfig.babel) {
            const { presets, plugins } = cracoConfig.babel;

            if (isArray(presets) || isArray(plugins)) {
                if (jestConfig.transform[BABEL_TRANSFORM_ENTRY_KEY]) {
                    overrideBabelTransform(jestConfig, cracoConfig, BABEL_TRANSFORM_ENTRY_KEY);
                } else if (jestConfig.transform[BABEL_TRANSFORM_ENTRY_KEY_BEFORE_2_1_0]) {
                    overrideBabelTransform(jestConfig, cracoConfig, BABEL_TRANSFORM_ENTRY_KEY_BEFORE_2_1_0);
                } else {
                    throw new Error(
                        `craco: Cannot find Jest transform entry for Babel ${BABEL_TRANSFORM_ENTRY_KEY} or ${BABEL_TRANSFORM_ENTRY_KEY_BEFORE_2_1_0}.`
                    );
                }
            }
        }
    }
}

function giveTotalControl(jestConfig, configureJest, context) {
    if (isFunction(configureJest)) {
        jestConfig = configureJest(jestConfig, context);

        if (!jestConfig) {
            throw new Error("craco: 'jest.configure' function didn't returned a Jest config object.");
        }
    } else {
        // TODO: ensure is otherwise a plain object, if not, log an error.
        jestConfig = deepMergeWithArray({}, jestConfig, configureJest);
    }

    log("Merged Jest config with 'jest.configure'.");

    return jestConfig;
}

function mergeJestConfig(cracoConfig, craJestConfigProvider, context) {
    const customResolve = relativePath =>
        require.resolve(path.join(cracoConfig.reactScriptsVersion, relativePath), { paths: [projectRoot] });

    let jestConfig = craJestConfigProvider(customResolve, projectRoot, false);

    if (cracoConfig.jest) {
        configureBabel(jestConfig, cracoConfig);

        const jestContext = {
            ...context,
            resolve: customResolve,
            rootDir: projectRoot
        };

        if (cracoConfig.jest.configure) {
            jestConfig = giveTotalControl(jestConfig, cracoConfig.jest.configure, jestContext);
        }

        jestConfig = applyJestConfigPlugins(cracoConfig, jestConfig, jestContext);

        log("Merged Jest config.");
    }

    return jestConfig;
}

module.exports = {
    mergeJestConfig
};
