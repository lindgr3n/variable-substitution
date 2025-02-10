"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VariableSubstitution = void 0;
const core = __importStar(require("@actions/core"));
//import * as github  from '@actions/github';
const envVariableUtility_1 = require("./operations/envVariableUtility");
const jsonVariableSubstitutionUtility_1 = require("./operations/jsonVariableSubstitutionUtility");
const xmlDomUtility_1 = require("./operations/xmlDomUtility");
const xmlVariableSubstitution_1 = require("./operations/xmlVariableSubstitution");
const utility_1 = require("./operations/utility");
const fs = require("fs");
const yaml = require("js-yaml");
const fileEncoding = require("./operations/fileEncodingUtility");
class VariableSubstitution {
    constructor() {
        this.fileContentCache = new Map();
        this.parseException = "";
    }
    run() {
        return __awaiter(this, void 0, void 0, function* () {
            let vars;
            let varsInput = core.getInput("vars", { required: false });
            try {
                vars = JSON.parse(varsInput);
            }
            catch (e) {
                throw new Error(`Cannot parse JSON vars.
            Make sure you add the following to this action:
            
            with:
                vars: \${{ toJSON(vars) }}
            `);
            }
            for (const key of Object.keys(vars)) {
                core.exportVariable(key, vars[key]);
                core.info(`Exported var -> ${key}`);
            }
            let secrets;
            let secretsInput = core.getInput("secrets", { required: false });
            try {
                secrets = JSON.parse(secretsInput);
            }
            catch (e) {
                throw new Error(`Cannot parse JSON secrets.
            Make sure you add the following to this action:
            
            with:
                secrets: \${{ toJSON(vars) }}
            `);
            }
            for (const key of Object.keys(secrets)) {
                core.exportVariable(key, secrets[key]);
                core.info(`Exported secret -> ${key}`);
            }
            let filesInput = core.getInput("files", { required: true });
            let files = filesInput.split(",");
            if (files.length > 0) {
                this.segregateFilesAndSubstitute(files);
            }
            else {
                throw Error('File Tranformation is not enabled. Please provide JSON/XML or YAML target files for variable substitution.');
            }
        });
    }
    segregateFilesAndSubstitute(files) {
        let isSubstitutionApplied = false;
        for (let file of files) {
            let matchedFiles = (0, utility_1.findfiles)(file.trim());
            if (matchedFiles.length == 0) {
                core.error('No file matched with specific pattern: ' + file);
                continue;
            }
            for (let file of matchedFiles) {
                let fileBuffer = fs.readFileSync(file);
                let fileEncodeType = fileEncoding.detectFileEncoding(file, fileBuffer);
                let fileContent = fileBuffer.toString();
                if (fileEncodeType.withBOM) {
                    fileContent = fileContent.slice(1);
                }
                if (this.isJson(file, fileContent)) {
                    console.log("Applying variable substitution on JSON file: " + file);
                    let jsonSubsitution = new jsonVariableSubstitutionUtility_1.JsonSubstitution();
                    let jsonObject = this.fileContentCache.get(file);
                    let isJsonSubstitutionApplied = jsonSubsitution.substituteJsonVariable(jsonObject, envVariableUtility_1.EnvTreeUtility.getEnvVarTree());
                    if (isJsonSubstitutionApplied) {
                        fs.writeFileSync(file, (fileEncodeType.withBOM ? '\uFEFF' : '') + JSON.stringify(jsonObject, null, 4));
                        console.log(`Successfully updated file: ${file}`);
                    }
                    else {
                        console.log('Skipped updating file: ' + file);
                    }
                    isSubstitutionApplied = isJsonSubstitutionApplied || isSubstitutionApplied;
                }
                else if (this.isXml(file, fileContent)) {
                    console.log("Applying variable substitution on XML file: " + file);
                    let xmlDomUtilityInstance = this.fileContentCache.get(file);
                    let xmlSubstitution = new xmlVariableSubstitution_1.XmlSubstitution(xmlDomUtilityInstance);
                    let isXmlSubstitutionApplied = xmlSubstitution.substituteXmlVariables();
                    if (isXmlSubstitutionApplied) {
                        let xmlDocument = xmlDomUtilityInstance.getXmlDom();
                        this.replaceEscapeXMLCharacters(xmlDocument);
                        let domContent = (fileEncodeType.withBOM ? '\uFEFF' : '') + xmlDomUtilityInstance.getContentWithHeader(xmlDocument);
                        for (let replacableTokenValue in xmlSubstitution.replacableTokenValues) {
                            core.debug('Substituting original value in place of temp_name: ' + replacableTokenValue);
                            domContent = domContent.split(replacableTokenValue).join(xmlSubstitution.replacableTokenValues[replacableTokenValue]);
                        }
                        fs.writeFileSync(file, domContent);
                        console.log(`Successfully updated file: ${file}`);
                    }
                    else {
                        console.log('Skipped updating file: ' + file);
                    }
                    isSubstitutionApplied = isXmlSubstitutionApplied || isSubstitutionApplied;
                }
                else if (this.isYaml(file, fileContent)) {
                    console.log("Applying variable substitution on YAML file: " + file);
                    let jsonSubsitution = new jsonVariableSubstitutionUtility_1.JsonSubstitution();
                    let yamlObject = this.fileContentCache.get(file);
                    let isYamlSubstitutionApplied = jsonSubsitution.substituteJsonVariable(yamlObject, envVariableUtility_1.EnvTreeUtility.getEnvVarTree());
                    if (isYamlSubstitutionApplied) {
                        fs.writeFileSync(file, (fileEncodeType.withBOM ? '\uFEFF' : '') + yaml.safeDump(yamlObject));
                        console.log(`Successfully updated config file: ${file}`);
                    }
                    else {
                        console.log('Skipped updating file: ' + file);
                    }
                    isSubstitutionApplied = isYamlSubstitutionApplied || isSubstitutionApplied;
                }
                else {
                    throw new Error("Could not parse file: " + file + "\n" + this.parseException);
                }
            }
        }
        if (!isSubstitutionApplied) {
            throw new Error("Failed to apply variable substitution");
        }
    }
    isJson(file, content) {
        try {
            content = this.stripJsonComments(content);
            let jsonObject = JSON.parse(content);
            if (!this.fileContentCache.has(file)) {
                this.fileContentCache.set(file, jsonObject);
            }
            return true;
        }
        catch (exception) {
            this.parseException += "JSON parse error: " + exception + "\n";
            return false;
        }
    }
    isYaml(file, content) {
        try {
            let yamlObject = yaml.load(content);
            if (!this.fileContentCache.has(file)) {
                this.fileContentCache.set(file, yamlObject);
            }
            return true;
        }
        catch (exception) {
            this.parseException += "YAML parse error: " + exception + "\n";
            return false;
        }
    }
    isXml(file, content) {
        try {
            let ltxDomUtiltiyInstance = new xmlDomUtility_1.XmlDomUtility(content);
            if (!this.fileContentCache.has(file)) {
                this.fileContentCache.set(file, ltxDomUtiltiyInstance);
            }
            return true;
        }
        catch (exception) {
            this.parseException += "XML parse error: " + exception;
            return false;
        }
    }
    stripJsonComments(content) {
        if (!content || (content.indexOf("//") < 0 && content.indexOf("/*") < 0)) {
            return content;
        }
        var currentChar;
        var nextChar;
        var insideQuotes = false;
        var contentWithoutComments = '';
        var insideComment = 0;
        var singlelineComment = 1;
        var multilineComment = 2;
        for (var i = 0; i < content.length; i++) {
            currentChar = content[i];
            nextChar = i + 1 < content.length ? content[i + 1] : "";
            if (insideComment) {
                if (insideComment == singlelineComment && (currentChar + nextChar === '\r\n' || currentChar === '\n')) {
                    i--;
                    insideComment = 0;
                    continue;
                }
                if (insideComment == multilineComment && currentChar + nextChar === '*/') {
                    i++;
                    insideComment = 0;
                    continue;
                }
            }
            else {
                if (insideQuotes && currentChar == "\\") {
                    contentWithoutComments += currentChar + nextChar;
                    i++; // Skipping checks for next char if escaped
                    continue;
                }
                else {
                    if (currentChar == '"') {
                        insideQuotes = !insideQuotes;
                    }
                    if (!insideQuotes) {
                        if (currentChar + nextChar === '//') {
                            insideComment = singlelineComment;
                            i++;
                        }
                        if (currentChar + nextChar === '/*') {
                            insideComment = multilineComment;
                            i++;
                        }
                    }
                }
            }
            if (!insideComment) {
                contentWithoutComments += content[i];
            }
        }
        return contentWithoutComments;
    }
    replaceEscapeXMLCharacters(xmlDOMNode) {
        if (!xmlDOMNode || typeof xmlDOMNode == 'string') {
            return;
        }
        for (var xmlAttribute in xmlDOMNode.attrs) {
            xmlDOMNode.attrs[xmlAttribute] = xmlDOMNode.attrs[xmlAttribute].replace(/'/g, "APOS_CHARACTER_TOKEN");
        }
        for (var xmlChild of xmlDOMNode.children) {
            this.replaceEscapeXMLCharacters(xmlChild);
        }
    }
}
exports.VariableSubstitution = VariableSubstitution;
let varSub = new VariableSubstitution();
varSub.run().catch((error) => {
    core.setFailed(error);
});
