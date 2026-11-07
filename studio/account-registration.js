// Supabase Auth remains the authority for email uniqueness; no public account lookup.
export const normalizeEmail=value=>String(value||'').trim().toLowerCase();
export async function registerAccount(client,email,password){
 if(!client)throw Error('Account service is loading. Please try again.');
 const normalized=normalizeEmail(email);
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized))throw Error('Enter a valid email address.');
 if(!password)throw Error('Enter a password.');
 const {data,error}=await client.auth.signUp({email:normalized,password});
 if(error){
  if(['user_already_exists','email_exists','user_already_registered'].includes(error.code)||/already (registered|exists)/i.test(error.message||''))return {status:'existing',message:'An account with this email already exists. Sign in with your existing account.'};
  throw Error(error.message||'Registration unavailable. Please try again.');
 }
 // Confirmed duplicate signup may return an obfuscated user, not an error.
 if(!data?.session&&Array.isArray(data?.user?.identities)&&data.user.identities.length===0)return {status:'existing',message:'An account with this email already exists. Sign in with your existing account.'};
 if(data?.session)return {status:'signed_in',message:'Your account is ready. You are signed in.'};
 return {status:'confirmation',message:'Check your email to confirm registration. If you already have an account, sign in instead.'};
}
