import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {createClient} from "@supabase/supabase-js";

const SUPABASE_URL=Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SITE_URL="https://camposwebpersonal.github.io/folha-de-ponto/";
const REDIRECT_URI=`${SUPABASE_URL}/functions/v1/canva-sync/callback`;
const CANVA_API="https://api.canva.com/rest/v1";
const NOTICE_ID="renovacao-receitas";
const SCOPES="design:meta:read design:content:read";
const admin=createClient(SUPABASE_URL,SERVICE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});

const allowedOrigins=new Set([
  "https://camposwebpersonal.github.io",
  "http://localhost:8080",
  "http://127.0.0.1:8080"
]);

function cors(req:Request){
  const origin=req.headers.get("origin")||"";
  return {
    "Access-Control-Allow-Origin":allowedOrigins.has(origin)?origin:"https://camposwebpersonal.github.io",
    "Access-Control-Allow-Headers":"authorization, apikey, content-type, x-client-info",
    "Access-Control-Allow-Methods":"GET, POST, OPTIONS",
    "Vary":"Origin"
  };
}

function json(req:Request,data:unknown,status=200){
  return Response.json(data,{status,headers:{...cors(req),"Cache-Control":"no-store"}});
}

function message(error:unknown){return error instanceof Error?error.message:String(error);}

function randomBase64Url(size=32){
  const bytes=crypto.getRandomValues(new Uint8Array(size));
  return base64Url(bytes);
}

function base64Url(bytes:Uint8Array){
  let binary="";
  for(const byte of bytes)binary+=String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/g,"");
}

async function sha256Base64Url(value:string){
  return base64Url(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(value))));
}

async function getSecret(name:string){
  const {data,error}=await admin.rpc("fp_get_canva_secret",{p_name:name});
  if(error)throw error;
  return typeof data==="string"?data:"";
}

async function credentials(){
  const [clientId,clientSecret]=await Promise.all([getSecret("canva_client_id"),getSecret("canva_client_secret")]);
  return {clientId,clientSecret,configured:Boolean(clientId&&clientSecret)};
}

async function requireAdmin(req:Request){
  const authorization=req.headers.get("authorization")||"";
  const token=authorization.startsWith("Bearer ")?authorization.slice(7):"";
  if(!token)throw new Error("Sessão administrativa não encontrada.");
  const {data:{user},error}=await admin.auth.getUser(token);
  if(error||!user)throw new Error("Sessão administrativa inválida.");
  const {data:profile,error:profileError}=await admin.from("fp_profiles").select("role").eq("id",user.id).maybeSingle();
  if(profileError||profile?.role!=="admin")throw new Error("Acesso restrito ao administrador.");
  return user;
}

async function isCron(req:Request){
  const supplied=req.headers.get("x-cron-secret")||"";
  if(!supplied)return false;
  const expected=await getSecret("canva_sync_cron_secret");
  if(!expected||supplied.length!==expected.length)return false;
  const a=new TextEncoder().encode(supplied),b=new TextEncoder().encode(expected);
  let difference=0;
  for(let index=0;index<a.length;index++)difference|=a[index]^b[index];
  return difference===0;
}

async function canvaFetch(path:string,token:string,init:RequestInit={}){
  const response=await fetch(`${CANVA_API}${path}`,{
    ...init,
    headers:{"Authorization":`Bearer ${token}`,"Content-Type":"application/json",...(init.headers||{})}
  });
  const body=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(body?.message||body?.error?.message||`Canva respondeu com HTTP ${response.status}.`);
  return body;
}

async function refreshAccessToken(connection:any){
  const {clientId,clientSecret,configured}=await credentials();
  if(!configured)throw new Error("Credenciais da integração Canva ainda não foram cadastradas.");
  const response=await fetch(`${CANVA_API}/oauth/token`,{
    method:"POST",
    headers:{
      "Authorization":`Basic ${btoa(`${clientId}:${clientSecret}`)}`,
      "Content-Type":"application/x-www-form-urlencoded"
    },
    body:new URLSearchParams({grant_type:"refresh_token",refresh_token:connection.refresh_token})
  });
  const token=await response.json().catch(()=>({}));
  if(!response.ok||!token.access_token||!token.refresh_token)throw new Error(token?.message||"Não foi possível renovar a autorização do Canva.");
  const expiresAt=new Date(Date.now()+Number(token.expires_in||14400)*1000).toISOString();
  const {error}=await admin.from("fp_canva_connections").update({
    access_token:token.access_token,
    refresh_token:token.refresh_token,
    expires_at:expiresAt,
    scope:token.scope||connection.scope,
    last_error:null
  }).eq("id","primary");
  if(error)throw error;
  return token.access_token as string;
}

async function validAccessToken(connection:any){
  if(new Date(connection.expires_at).getTime()>Date.now()+300000)return connection.access_token as string;
  return refreshAccessToken(connection);
}

async function pollExport(jobId:string,token:string){
  for(let attempt=0;attempt<30;attempt++){
    const result=await canvaFetch(`/exports/${encodeURIComponent(jobId)}`,token);
    if(result.job?.status==="success"&&result.job.urls?.length)return result.job.urls as string[];
    if(result.job?.status==="failed")throw new Error(result.job.error?.message||"A exportação do Canva falhou.");
    await new Promise(resolve=>setTimeout(resolve,1000));
  }
  throw new Error("A exportação do Canva excedeu o tempo de espera.");
}

async function exportDesign(designId:string,token:string,format:Record<string,unknown>){
  let result;
  try{
    result=await canvaFetch("/exports",token,{method:"POST",body:JSON.stringify({design_id:designId,format:{...format,export_quality:"pro"}})});
  }catch(error){
    result=await canvaFetch("/exports",token,{method:"POST",body:JSON.stringify({design_id:designId,format:{...format,export_quality:"regular"}})});
  }
  if(result.job?.status==="success"&&result.job.urls?.length)return result.job.urls as string[];
  if(!result.job?.id)throw new Error("O Canva não iniciou a exportação solicitada.");
  return pollExport(result.job.id,token);
}

async function releaseLock(error:string|null=null){
  await admin.from("fp_canva_connections").update({sync_locked_until:null,last_error:error}).eq("id","primary");
}

async function syncNotice(force=false){
  const {data:claimed,error:claimError}=await admin.rpc("fp_claim_canva_sync");
  if(claimError)throw claimError;
  if(!claimed)return {ok:true,skipped:true,reason:"locked"};

  try{
    const [{data:connection,error:connectionError},{data:notice,error:noticeError}]=await Promise.all([
      admin.from("fp_canva_connections").select("*").eq("id","primary").maybeSingle(),
      admin.from("fp_notice_assets").select("*").eq("id",NOTICE_ID).single()
    ]);
    if(connectionError)throw connectionError;
    if(noticeError)throw noticeError;
    if(!connection)throw new Error("O Canva ainda não foi autorizado para este site.");

    await admin.from("fp_notice_assets").update({sync_status:"syncing",last_error:null}).eq("id",NOTICE_ID);
    const token=await validAccessToken(connection);
    const metadata=await canvaFetch(`/designs/${encodeURIComponent(notice.design_id)}`,token);
    const updatedAt=Number(metadata.design?.updated_at||0);

    if(!force&&notice.version>0&&updatedAt&&updatedAt===Number(notice.source_updated_at)){
      const now=new Date().toISOString();
      await Promise.all([
        admin.from("fp_notice_assets").update({sync_status:"ready",synced_at:now,last_error:null}).eq("id",NOTICE_ID),
        admin.from("fp_canva_connections").update({last_sync_at:now,last_error:null,sync_locked_until:null}).eq("id","primary")
      ]);
      return {ok:true,changed:false,updated_at:updatedAt};
    }

    const [pngUrls,pdfUrls]=await Promise.all([
      exportDesign(notice.design_id,token,{type:"png",pages:[1]}),
      exportDesign(notice.design_id,token,{type:"pdf",pages:[1]})
    ]);
    const [pngResponse,pdfResponse]=await Promise.all([fetch(pngUrls[0]),fetch(pdfUrls[0])]);
    if(!pngResponse.ok||!pdfResponse.ok)throw new Error("Não foi possível baixar os arquivos recém-exportados do Canva.");
    const [png,pdf]=await Promise.all([pngResponse.arrayBuffer(),pdfResponse.arrayBuffer()]);

    const [pngUpload,pdfUpload]=await Promise.all([
      admin.storage.from(notice.storage_bucket).upload(notice.image_path,png,{contentType:"image/png",cacheControl:"60",upsert:true}),
      admin.storage.from(notice.storage_bucket).upload(notice.pdf_path,pdf,{contentType:"application/pdf",cacheControl:"60",upsert:true})
    ]);
    if(pngUpload.error)throw pngUpload.error;
    if(pdfUpload.error)throw pdfUpload.error;

    const now=new Date().toISOString(),version=Date.now();
    const {error:updateError}=await admin.from("fp_notice_assets").update({
      version,
      source_updated_at:updatedAt,
      synced_at:now,
      sync_status:"ready",
      last_error:null
    }).eq("id",NOTICE_ID);
    if(updateError)throw updateError;
    await admin.from("fp_canva_connections").update({last_sync_at:now,last_error:null,sync_locked_until:null}).eq("id","primary");
    return {ok:true,changed:true,updated_at:updatedAt,version};
  }catch(error){
    const detail=message(error).slice(0,1000);
    await Promise.all([
      admin.from("fp_notice_assets").update({sync_status:"error",last_error:detail}).eq("id",NOTICE_ID),
      releaseLock(detail)
    ]);
    throw error;
  }
}

async function handleCallback(req:Request){
  const url=new URL(req.url),code=url.searchParams.get("code"),state=url.searchParams.get("state"),oauthError=url.searchParams.get("error");
  if(oauthError||!code||!state)return Response.redirect(`${SITE_URL}?canva=error#avisos`,302);
  const {data:saved,error}=await admin.from("fp_canva_oauth_states").select("*").eq("state",state).gt("expires_at",new Date().toISOString()).maybeSingle();
  if(error||!saved)return Response.redirect(`${SITE_URL}?canva=expired#avisos`,302);
  await admin.from("fp_canva_oauth_states").delete().eq("state",state);

  try{
    const {clientId,clientSecret,configured}=await credentials();
    if(!configured)throw new Error("Credenciais ausentes.");
    const response=await fetch(`${CANVA_API}/oauth/token`,{
      method:"POST",
      headers:{
        "Authorization":`Basic ${btoa(`${clientId}:${clientSecret}`)}`,
        "Content-Type":"application/x-www-form-urlencoded"
      },
      body:new URLSearchParams({
        grant_type:"authorization_code",
        code,
        code_verifier:saved.code_verifier,
        redirect_uri:REDIRECT_URI
      })
    });
    const token=await response.json().catch(()=>({}));
    if(!response.ok||!token.access_token||!token.refresh_token)throw new Error(token?.message||"Falha na autorização do Canva.");
    const {error:saveError}=await admin.from("fp_canva_connections").upsert({
      id:"primary",
      access_token:token.access_token,
      refresh_token:token.refresh_token,
      expires_at:new Date(Date.now()+Number(token.expires_in||14400)*1000).toISOString(),
      scope:token.scope||SCOPES,
      connected_by:saved.user_id,
      last_error:null,
      sync_locked_until:null
    });
    if(saveError)throw saveError;
    await syncNotice(true);
    return Response.redirect(`${SITE_URL}?canva=connected#avisos`,302);
  }catch(error){
    console.error("Canva OAuth callback failed:",message(error));
    return Response.redirect(`${SITE_URL}?canva=error#avisos`,302);
  }
}

Deno.serve(async(req:Request)=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:cors(req)});
  if(new URL(req.url).pathname.endsWith("/callback"))return handleCallback(req);
  if(req.method!=="POST")return json(req,{error:"Método não permitido."},405);

  try{
    const body=await req.json().catch(()=>({}));
    const action=String(body.action||"status");

    if(action==="sync"&&await isCron(req))return json(req,await syncNotice(false));
    const user=await requireAdmin(req);

    if(action==="configure"){
      const clientId=String(body.client_id||"").trim(),clientSecret=String(body.client_secret||"").trim();
      const {error}=await admin.rpc("fp_set_canva_credentials",{p_client_id:clientId,p_client_secret:clientSecret});
      if(error)throw error;
      return json(req,{ok:true,redirect_uri:REDIRECT_URI});
    }

    if(action==="authorize"){
      const {clientId,configured}=await credentials();
      if(!configured)return json(req,{error:"Cadastre primeiro o Client ID e o Client secret da integração Canva.",redirect_uri:REDIRECT_URI},409);
      const state=randomBase64Url(32),verifier=randomBase64Url(64),challenge=await sha256Base64Url(verifier);
      const {error}=await admin.from("fp_canva_oauth_states").insert({
        state,
        code_verifier:verifier,
        user_id:user.id,
        expires_at:new Date(Date.now()+10*60*1000).toISOString()
      });
      if(error)throw error;
      const params=new URLSearchParams({
        code_challenge:challenge,
        code_challenge_method:"s256",
        scope:SCOPES,
        response_type:"code",
        client_id:clientId,
        state,
        redirect_uri:REDIRECT_URI
      });
      return json(req,{authorization_url:`https://www.canva.com/api/oauth/authorize?${params}`});
    }

    if(action==="sync")return json(req,await syncNotice(true));

    const [{clientId,configured},{data:connection},{data:notice}]=await Promise.all([
      credentials(),
      admin.from("fp_canva_connections").select("expires_at,last_sync_at,last_error").eq("id","primary").maybeSingle(),
      admin.from("fp_notice_assets").select("sync_status,synced_at,last_error,version").eq("id",NOTICE_ID).maybeSingle()
    ]);
    return json(req,{
      configured,
      connected:Boolean(connection),
      client_id_hint:clientId?`${clientId.slice(0,6)}…${clientId.slice(-4)}`:null,
      redirect_uri:REDIRECT_URI,
      last_sync_at:connection?.last_sync_at||notice?.synced_at||null,
      sync_status:notice?.sync_status||"pending",
      last_error:connection?.last_error||notice?.last_error||null,
      version:notice?.version||0,
      schedule:"every_minute"
    });
  }catch(error){
    const detail=message(error);
    const status=/Sessão|Acesso restrito/.test(detail)?401:500;
    console.error("canva-sync:",detail);
    return json(req,{error:detail},status);
  }
});
