import {resourceChoiceController} from './resource-choice.js';
export const slackChannelController=options=>resourceChoiceController(options);
if(typeof window!=='undefined')window.FluxSlackChannels=slackChannelController;
