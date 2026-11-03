/* CoffeeScreen FOX account-import page. Runs in the screen's local phone page. */
(()=>{
'use strict';
const API='https://client-api.xbloom.com/';
const PUBLIC_KEY=`-----BEGIN PUBLIC KEY-----
MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC4LF40GZ72SdhMyl765K/i4nY5
CPcHz2Q1IKWKZ9S79xmK7G8pUhbVf4EZLvnNF1+9IvOFQUKV5Z7ZNNviqSpnql9
tAT+8+J/He0R7pcirvVSxgdr2i9V/C/gmqAEZ5qVTzRnd3uWdFoKzPdEBxP0Ipor
J1VBbCv90yBSOhVxO+QIDAQAB
-----END PUBLIC KEY-----`;
const host=document.getElementById('xbloom-import'); if(!host) return;
const token=(document.querySelector('input[name=token]')||{}).value;
host.innerHTML=`<h2>استيراد من حساب xBloom</h2><p>اختياري وتجريبي. كلمة المرور تذهب مشفرة مباشرة إلى خدمة xBloom؛ لا تحفظ في شاشة FOX.</p><button id=xbStart>تسجيل الدخول وعرض وصفاتي</button><p id=xbMsg aria-live=polite></p><div id=xbBody></div>`;
const msg=host.querySelector('#xbMsg'), body=host.querySelector('#xbBody');
const say=t=>msg.textContent=t;
const escape=s=>String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
let key;
function loadForge(){return new Promise((resolve,reject)=>{
 if(window.forge) return resolve(window.forge);
 const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/node-forge@1.3.1/dist/forge.min.js';s.onload=()=>resolve(window.forge);s.onerror=()=>reject(new Error('تعذر تحميل أداة التشفير؛ تحقق من الإنترنت'));document.head.append(s);
});}
function crypt(form){
 const forge=window.forge; const bytes=forge.util.encodeUtf8(JSON.stringify(form));let encrypted='';
 for(let i=0;i<bytes.length;i+=117) encrypted+=key.encrypt(bytes.slice(i,i+117),'RSAES-PKCS1-V1_5');
 return forge.util.encode64(encrypted);
}
async function call(endpoint,form){
 const r=await fetch(API+endpoint,{method:'POST',headers:{'Content-Type':'application/json; charset=utf-8'},body:crypt(form)});
 if(!r.ok) throw new Error('تعذر الاتصال بخدمة xBloom ('+r.status+')');
 const data=await r.json();if(data.result!=='success') throw new Error(data.info||'تعذر تنفيذ الطلب');return data;
}
async function login(){
 body.innerHTML=`<label>البريد<input id=xbEmail type=email autocomplete=username required></label><label>كلمة المرور<input id=xbPassword type=password autocomplete=current-password required></label><button id=xbLogin>عرض الوصفات</button>`;
 body.querySelector('#xbLogin').onclick=async()=>{
  const email=body.querySelector('#xbEmail').value.trim(),password=body.querySelector('#xbPassword').value;if(!email||!password){say('أدخل البريد وكلمة المرور');return;}
  try{say('جار تسجيل الدخول…');const result=await call('tMemberLogin.thtml',{interfaceVersion:20240918,skey:'testskey',phoneType:'Android',clientType:2,languageType:1,email,password,jpushId:''});
   body.querySelector('#xbPassword').value='';await list(result.member.tableId,result.token);
  }catch(e){say(e.message||'تعذر تسجيل الدخول');}
 };
}
async function list(memberId,session){
 try{say('جار قراءة وصفاتك…');const data=await call('tuMyTeaRecipeCreated.tuhtml',{interfaceVersion:20240918,skey:'testskey',phoneType:'Android',memberId,clientType:2,languageType:1,token:session,pageNumber:1,countPerPage:100,adaptedModel:1});
  const recipes=(data.list||[]).filter(r=>r.adaptedModel===1&&r.shareRecipeLink); if(!recipes.length){say('لا توجد وصفات Studio قابلة للاستيراد في الحساب');return;}
  body.innerHTML=`<p>${recipes.length} وصفات جاهزة للنقل</p><label><input id=xbAll type=checkbox checked style='width:auto'> تحديد الكل</label><div>${recipes.map((r,i)=>`<label><input class=xbRecipe type=checkbox checked value=${i} style='width:auto'> ${escape(r.theName||'بدون اسم')}</label>`).join('')}</div><button id=xbTransfer>نقل المحدد للشاشة</button>`;
  body.querySelector('#xbAll').onchange=e=>body.querySelectorAll('.xbRecipe').forEach(x=>x.checked=e.target.checked);
  body.querySelector('#xbTransfer').onclick=async()=>{const chosen=[...body.querySelectorAll('.xbRecipe:checked')].map(x=>recipes[+x.value]);if(!chosen.length){say('اختر وصفة واحدة على الأقل');return;} if(!token){say('افتح ربط الجوال من الشاشة أولًا');return;} await transfer(chosen);};say('اختر الوصفات ثم اضغط نقل المحدد للشاشة.');
 }catch(e){say(e.message||'تعذر قراءة الوصفات');}
}
async function transfer(recipes){
 let done=0;for(const recipe of recipes){say(`جار نقل ${done+1} من ${recipes.length}: ${recipe.theName}`);try{const r=await fetch('/import?token='+encodeURIComponent(token),{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:'url='+encodeURIComponent(recipe.shareRecipeLink)});if(!r.ok) throw new Error('HTTP '+r.status);done++;}catch(e){say(`توقف النقل عند «${recipe.theName}». تم نقل ${done} وصفات.`);return;}}
 say(`تم نقل ${done} وصفات إلى الشاشة. لم يبدأ أي تحضير.`);
}
host.querySelector('#xbStart').onclick=async()=>{try{say('جار تجهيز اتصال آمن…');await loadForge();key=window.forge.pki.publicKeyFromPem(PUBLIC_KEY);login();}catch(e){say(e.message||'تعذر تجهيز الاتصال');}};
})();
