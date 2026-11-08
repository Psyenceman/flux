import {owner,getBearer,json} from './trello-shared.mjs';
import {configured,newState,authorizationUrl,cookie} from './github-oauth-shared.mjs';
export async function handler(event){
 if(event.httpMethod!=='POST')return json(405,{ok:false,error:'POST required'});
 try{
  const id=await owner(getBearer(event));if(!id)return json(401,{ok:false,error:'Sign in to Flux first'});
  if(!configured())return json(503,{ok:false,error:'GitHub connection setup is pending in TEST. You can keep working with public repositories.'});
  const state=await newState(id),result=json(200,{ok:true,authorizeUrl:authorizationUrl(state)});result.headers['set-cookie']=cookie(state);return result;
 }catch{return json(503,{ok:false,error:'Unable to start GitHub authorization. Try again.'});}
}
