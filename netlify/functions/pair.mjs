import {getStore} from '@netlify/blobs';
import {randomBytes,createHash} from 'node:crypto';
const digest=s=>createHash('sha256').update(s).digest('hex');
const normalize=s=>String(s||'').toUpperCase().replace(/[\s-]/g,'');
const reply=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
export function makeHandler(storeFactory=()=>getStore({name:'storie-tv-demo-v1',consistency:'strong'}),now=()=>Date.now()){
 return async req=>{
  if(req.method!=='POST')return reply({error:'Metodo non consentito.'},405);
  if(req.headers.get('origin')!==new URL(req.url).origin)return reply({error:'Origine non consentita.'},403);
  try{
   const text=await req.text();if(text.length>2048)return reply({error:'Richiesta troppo grande.'},413);
   let body;try{body=JSON.parse(text)}catch{return reply({error:'Richiesta non valida.'},400)}
   const store=storeFactory();const action=body.action;
   if(action==='create'){
    for(let i=0;i<4;i++){
     const code=randomBytes(5).toString('hex').toUpperCase();const secret=randomBytes(32).toString('hex');const expires=now()+10*60*1000;
     const {modified}=await store.setJSON('sessions/'+code,{secretHash:digest(secret),expires},{onlyIfNew:true});
     if(modified)return reply({code,secret,expires});
    }
    return reply({error:'Riprova tra qualche istante.'},503);
   }
   const code=normalize(body.code);if(!/^[A-F0-9]{10}$/.test(code))return reply({error:'Controlla il codice visualizzato sulla TV.'},400);
   const session=await store.get('sessions/'+code,{type:'json'});
   if(!session)return reply({error:'Codice non trovato. Genera un nuovo QR sulla TV.'},404);
   const approval=await store.get('approved/'+code,{type:'json'});
   const validApproval=approval&&approval.until>now();
   if(action==='approve'||action==='inspect'){
    if(session.expires<=now())return reply({error:'Codice scaduto. Genera un nuovo QR sulla TV.'},410);
    if(action==='approve')await store.setJSON('approved/'+code,{until:now()+6*60*60*1000},{onlyIfNew:true});
    return reply({ok:true,code,expires:session.expires});
   }
   if(action==='status'){
    if(typeof body.secret!=='string'||body.secret.length!==64||digest(body.secret)!==session.secretHash)return reply({error:'Sessione non valida.'},403);
    if(validApproval)return reply({approved:true,until:approval.until,videoId:'InW7y6Pj9V8'});
    if(session.expires<=now())return reply({error:'Codice scaduto. Genera un nuovo QR.'},410);
    return reply({approved:false,expires:session.expires});
   }
   return reply({error:'Operazione non valida.'},400);
  }catch(error){console.error('pair failure',error?.message);return reply({error:'Collegamento al servizio non riuscito. Riprova; se persiste controlla le Functions su Netlify.'},503)}
 };
}
export default makeHandler();
export const config={rateLimit:{action:'rate_limit',aggregateBy:['ip','domain'],windowSize:60,windowLimit:90}};
