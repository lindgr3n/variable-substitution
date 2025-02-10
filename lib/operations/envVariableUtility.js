"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnvTreeUtility = void 0;
exports.isPredefinedVariable = isPredefinedVariable;
exports.getVariableMap = getVariableMap;
exports.isEmpty = isEmpty;
exports.isObject = isObject;
function isPredefinedVariable(variable) {
    let predefinedVarPrefix = ['runner.', 'azure_http_user_agent', 'common.', 'system.'];
    for (let varPrefix of predefinedVarPrefix) {
        if (variable.toLowerCase().startsWith(varPrefix)) {
            return true;
        }
    }
    return false;
}
function getVariableMap() {
    let variableMap = new Map();
    let variables = process.env;
    Object.keys(variables).forEach(key => {
        if (!isPredefinedVariable(key)) {
            // Store each environment key as uppercase to make it case-insensitive
            variableMap.set(key.toUpperCase(), variables[key]);
        }
    });
    return variableMap;
}
function isEmpty(object) {
    if (object == null || object == "")
        return true;
    return false;
}
function isObject(object) {
    if (object == null || object == "" || typeof (object) != 'object') {
        return false;
    }
    return true;
}
class EnvTreeUtility {
    constructor() {
        this.envVarTree = null;
    }
    static getEnvVarTree() {
        let util = new EnvTreeUtility();
        if (!util.envVarTree) {
            util.envVarTree = util.createEnvTree(getVariableMap());
        }
        return util.envVarTree;
    }
    createEnvTree(envVariables) {
        // __proto__ is marked as null, so that custom object can be assgined.
        // This replacement do not affect the JSON object, as no inbuilt JSON function is referenced.
        let envVarTree = {
            value: null,
            isEnd: false,
            child: {
                '__proto__': null
            }
        };
        for (let [key, value] of envVariables.entries()) {
            let envVarTreeIterator = envVarTree;
            let envVariableNameArray = key.split(/_(?!_)/); // Split on single underscore, but not double underscore
            // let envVariableNameArray = key.split('.');
            for (let variableName of envVariableNameArray) {
                if (envVarTreeIterator.child[variableName] === undefined || typeof envVarTreeIterator.child[variableName] === 'function') {
                    envVarTreeIterator.child[variableName] = {
                        value: null,
                        isEnd: false,
                        child: {}
                    };
                }
                envVarTreeIterator = envVarTreeIterator.child[variableName];
            }
            envVarTreeIterator.isEnd = true;
            envVarTreeIterator.value = value;
        }
        return envVarTree;
    }
    checkEnvTreePath(jsonObjectKey, index, jsonObjectKeyLength, envVarTree) {
        if (index == jsonObjectKeyLength) {
            return envVarTree;
        }
        let key = jsonObjectKey[index];
        let envChild = envVarTree.child[key.toUpperCase()];
        if (envChild === undefined || typeof envChild === 'function') {
            return undefined;
        }
        return this.checkEnvTreePath(jsonObjectKey, index + 1, jsonObjectKeyLength, envVarTree.child[key.toUpperCase()]);
    }
}
exports.EnvTreeUtility = EnvTreeUtility;
