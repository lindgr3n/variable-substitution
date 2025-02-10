import sinon = require("sinon");
import { expect } from 'chai';

import { EnvTreeUtility, isPredefinedVariable } from "../operations/envVariableUtility";

import { JsonSubstitution } from "../operations/jsonVariableSubstitutionUtility";

describe('Test JSON Variable Substitution', () => {
    var jsonObject, isApplied;

    before(() => {       
        let stub = sinon.stub(EnvTreeUtility, "getEnvVarTree").callsFake(() => {
            let envVariables = new Map([
                [ 'SYSTEM.DEBUG', 'true'],
                [ 'DATA_CONNECTIONSTRING', 'database_connection'],
                [ 'DATA_USERNAME', 'db_admin'],
                [ 'DATA_PASSWORD', 'db_pass'],
                [ '&PL_CH@R@CTER_K^Y', '*.config'],
                [ 'BUILD_SOURCEDIRECTORY', 'DefaultWorkingDirectory'],
                [ 'USER_PROFILE.NAME.FIRST', 'firstName'],
                [ 'USER_PROFILE', 'replace_all'],
                [ 'CONSTRUCTOR_NAME', 'newConstructorName'],
                [ 'CONSTRUCTOR_VALUEOF', 'constructorNewValue'],
                [ 'PROFILE_USERS', '["suaggar","rok","asranja", "chaitanya"]'],
                [ 'PROFILE_ENABLED', 'false'],
                [ 'PROFILE_VERSION', '1173'],
                [ 'PROFILE_SOMEFLOAT', '97.75'],
                [ 'PROFILE_PREMIUMLEVEL', '{"suaggar": "V4", "rok": "V5", "asranja": { "type" : "V6"}}']
            ]);
            
            let envVarTree = {
                value: null,
                isEnd: false,
                child: {
                    '__proto__': null
                }
            };
            for(let [key, value] of envVariables.entries()) {
                if(!isPredefinedVariable(key)) {
                    let envVarTreeIterator = envVarTree;
                    let envVariableNameArray = key.split('_');
                    
                    for(let variableName of envVariableNameArray) {
                        if(envVarTreeIterator.child[variableName] === undefined || typeof envVarTreeIterator.child[variableName] === 'function') {
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
            }
            return envVarTree;
        });
        
        jsonObject = {
            'User.Profile': 'do_not_replace',
            'data': {
                'ConnectionString' : 'connect_string',
                'userName': 'name',
                'password': 'pass'
            },
            '&pl': {
                'ch@r@cter.k^y': 'v@lue'
            },
            'system': {
                'debug' : 'no_change'
            },
            'user.profile': {
                'name.first' : 'fname'
            },
            'constructor.name': 'myconstructorname',
            'constructor': {
                'name': 'myconstructorname',
                'valueOf': 'myconstructorvalue'
            },
            'profile': {
                'users': ['arjgupta', 'raagra', 'muthuk'],
                'premiumLevel': {
                    'arjgupta': 'V1',
                    'raagra': 'V2',
                    'muthuk': {
                        'type': 'V3'
                    }
                },
                "enabled": true,
                "version": 2,
                "somefloat": 2.3456
            }
        };

        let jsonSubsitution =  new JsonSubstitution();
        isApplied = jsonSubsitution.substituteJsonVariable(jsonObject, EnvTreeUtility.getEnvVarTree());
        stub.restore();
    });

    it("Should substitute", () => {
        console.log(JSON.stringify(jsonObject));
        expect(isApplied).to.equal(true);
    });

    it("Validate simple string change", () => {
        expect(jsonObject['data']['ConnectionString']).to.equal('database_connection');
        expect(jsonObject['data']['userName']).to.equal('db_admin');
    });

    it("Validate system variable elimination", () => {
        expect(jsonObject['system']['debug']).to.equal('no_change');
    });

    it("Validate special variables", () => {
        expect(jsonObject['&pl']['ch@r@cter.k^y']).to.equal('*.config');
    });

    // it("Validate case sensitive variables", () => {
    //     expect(jsonObject['User.Profile']).to.equal('do_not_replace');
    // });

     it("Validate case sensitive variables is replaced", () => {
        expect(jsonObject['User.Profile']).to.equal('replace_all');
    });

    it("Validate inbuilt JSON attributes substitution", () => {
        expect(jsonObject['constructor.name']).to.equal('newConstructorName');
        expect(jsonObject['constructor']['name']).to.equal('newConstructorName');
        expect(jsonObject['constructor']['valueOf']).to.equal('constructorNewValue');
    });

    it("Validate Array Object", () => {
        expect(jsonObject['profile']['users'].length).to.equal(4);
        let newArray = ["suaggar", "rok", "asranja", "chaitanya"];
        expect(jsonObject['profile']['users']).to.deep.equal(newArray);
    });

    it("Validate Boolean", () => {
        expect(jsonObject['profile']['enabled']).to.equal(false);
    });

    it("Validate Number(float)", () => {
        expect(jsonObject['profile']['somefloat']).to.equal(97.75);
    });

    it("Validate Number(int)", () => {
        expect(jsonObject['profile']['version']).to.equal(1173);
    });

    it("Validate Object", () => {
        expect(jsonObject['profile']['premiumLevel']).to.deep.equal({"suaggar": "V4", "rok": "V5", "asranja": { "type" : "V6"}});
    });
});