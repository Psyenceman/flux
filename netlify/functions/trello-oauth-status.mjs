const json=(statusCode,data)=>({statusCode,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'},body:JSON.stringify(data)});
export async function handler(event){
 if(event.httpMethod!=='GET')return json(405,{ok:false,error:'GET required'});
 const clientId=process.env.TRELLO_CLIENT_ID;
 const clientSecret=process.env.TRELLO_CLIENT_SECRET;
 const configured=Boolean(clientId&&clientSecret);
 const encryptionConfigured=Boolean(process.env.FLUX_CONNECTION_ENCRYPTION_KEY?.length>=32);
 return json(200,{ok:true,provider:'trello',environment:'test',credentialsConfigured:configured,oauthAvailable:configured&&encryptionConfigured,encryptionConfigured,message:configured&&encryptionConfigured?'Trello OAuth backend configured; authorize from signed-in Flux Studio TEST.':'Trello OAuth needs a dedicated connection encryption key.'});
}