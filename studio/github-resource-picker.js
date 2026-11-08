import {resourceChoiceController} from './resource-choice.js';
export const githubRepositoryController=options=>resourceChoiceController({...options,key:'repository',nameKey:'repositoryName',invalidMessage:'Choose an available GitHub repository. Connect your account and refresh repositories first.'});
if(typeof window!=='undefined')window.FluxGithubRepositories=githubRepositoryController;
