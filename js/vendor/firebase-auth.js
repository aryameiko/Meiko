/* MEIKO vendor: Firebase JS SDK 11.10.0 (app + auth + app-check with reCAPTCHA v3, incl. Google sign-in, re-authentication and account deletion), Apache-2.0 (c) Google LLC. esbuild IIFE bundle exposing self.MeikoFirebase; bundled so MEIKO needs no CDN. */
(()=>{var tr=()=>{};var rr=function(n){let e=[],t=0;for(let r=0;r<n.length;r++){let i=n.charCodeAt(r);i<128?e[t++]=i:i<2048?(e[t++]=i>>6|192,e[t++]=i&63|128):(i&64512)===55296&&r+1<n.length&&(n.charCodeAt(r+1)&64512)===56320?(i=65536+((i&1023)<<10)+(n.charCodeAt(++r)&1023),e[t++]=i>>18|240,e[t++]=i>>12&63|128,e[t++]=i>>6&63|128,e[t++]=i&63|128):(e[t++]=i>>12|224,e[t++]=i>>6&63|128,e[t++]=i&63|128)}return e},$i=function(n){let e=[],t=0,r=0;for(;t<n.length;){let i=n[t++];if(i<128)e[r++]=String.fromCharCode(i);else if(i>191&&i<224){let s=n[t++];e[r++]=String.fromCharCode((i&31)<<6|s&63)}else if(i>239&&i<365){let s=n[t++],o=n[t++],c=n[t++],a=((i&7)<<18|(s&63)<<12|(o&63)<<6|c&63)-65536;e[r++]=String.fromCharCode(55296+(a>>10)),e[r++]=String.fromCharCode(56320+(a&1023))}else{let s=n[t++],o=n[t++];e[r++]=String.fromCharCode((i&15)<<12|(s&63)<<6|o&63)}}return e.join("")},Pe={byteToCharMap_:null,charToByteMap_:null,byteToCharMapWebSafe_:null,charToByteMapWebSafe_:null,ENCODED_VALS_BASE:"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",get ENCODED_VALS(){return this.ENCODED_VALS_BASE+"+/="},get ENCODED_VALS_WEBSAFE(){return this.ENCODED_VALS_BASE+"-_."},HAS_NATIVE_SUPPORT:typeof atob=="function",encodeByteArray(n,e){if(!Array.isArray(n))throw Error("encodeByteArray takes an array as a parameter");this.init_();let t=e?this.byteToCharMapWebSafe_:this.byteToCharMap_,r=[];for(let i=0;i<n.length;i+=3){let s=n[i],o=i+1<n.length,c=o?n[i+1]:0,a=i+2<n.length,l=a?n[i+2]:0,d=s>>2,h=(s&3)<<4|c>>4,p=(c&15)<<2|l>>6,S=l&63;a||(S=64,o||(p=64)),r.push(t[d],t[h],t[p],t[S])}return r.join("")},encodeString(n,e){return this.HAS_NATIVE_SUPPORT&&!e?btoa(n):this.encodeByteArray(rr(n),e)},decodeString(n,e){return this.HAS_NATIVE_SUPPORT&&!e?atob(n):$i(this.decodeStringToByteArray(n,e))},decodeStringToByteArray(n,e){this.init_();let t=e?this.charToByteMapWebSafe_:this.charToByteMap_,r=[];for(let i=0;i<n.length;){let s=t[n.charAt(i++)],c=i<n.length?t[n.charAt(i)]:0;++i;let l=i<n.length?t[n.charAt(i)]:64;++i;let h=i<n.length?t[n.charAt(i)]:64;if(++i,s==null||c==null||l==null||h==null)throw new At;let p=s<<2|c>>4;if(r.push(p),l!==64){let S=c<<4&240|l>>2;if(r.push(S),h!==64){let te=l<<6&192|h;r.push(te)}}}return r},init_(){if(!this.byteToCharMap_){this.byteToCharMap_={},this.charToByteMap_={},this.byteToCharMapWebSafe_={},this.charToByteMapWebSafe_={};for(let n=0;n<this.ENCODED_VALS.length;n++)this.byteToCharMap_[n]=this.ENCODED_VALS.charAt(n),this.charToByteMap_[this.byteToCharMap_[n]]=n,this.byteToCharMapWebSafe_[n]=this.ENCODED_VALS_WEBSAFE.charAt(n),this.charToByteMapWebSafe_[this.byteToCharMapWebSafe_[n]]=n,n>=this.ENCODED_VALS_BASE.length&&(this.charToByteMap_[this.ENCODED_VALS_WEBSAFE.charAt(n)]=n,this.charToByteMapWebSafe_[this.ENCODED_VALS.charAt(n)]=n)}}},At=class extends Error{constructor(){super(...arguments),this.name="DecodeBase64StringError"}},zi=function(n){let e=rr(n);return Pe.encodeByteArray(e,!0)},kt=function(n){return zi(n).replace(/\./g,"")},Ce=function(n){try{return Pe.decodeString(n,!0)}catch(e){console.error("base64Decode failed: ",e)}return null};function Rt(){if(typeof self!="undefined")return self;if(typeof window!="undefined")return window;if(typeof global!="undefined")return global;throw new Error("Unable to locate global object.")}var qi=()=>Rt().__FIREBASE_DEFAULTS__,Gi=()=>{if(typeof process=="undefined"||typeof process.env=="undefined")return;let n=process.env.__FIREBASE_DEFAULTS__;if(n)return JSON.parse(n)},Ki=()=>{if(typeof document=="undefined")return;let n;try{n=document.cookie.match(/__FIREBASE_DEFAULTS__=([^;]+)/)}catch{return}let e=n&&Ce(n[1]);return e&&JSON.parse(e)},ir=()=>{try{return tr()||qi()||Gi()||Ki()}catch(n){console.info(`Unable to get __FIREBASE_DEFAULTS__ due to: ${n}`);return}};var Pt=()=>{var n;return(n=ir())===null||n===void 0?void 0:n.config},sr=n=>{var e;return(e=ir())===null||e===void 0?void 0:e[`_${n}`]};var L=class{constructor(){this.reject=()=>{},this.resolve=()=>{},this.promise=new Promise((e,t)=>{this.resolve=e,this.reject=t})}wrapCallback(e){return(t,r)=>{t?this.reject(t):this.resolve(r),typeof e=="function"&&(this.promise.catch(()=>{}),e.length===1?e(t):e(t,r))}}};function Ct(n){try{return(n.startsWith("http://")||n.startsWith("https://")?new URL(n).hostname:n).endsWith(".cloudworkstations.dev")}catch{return!1}}function v(){return typeof navigator!="undefined"&&typeof navigator.userAgent=="string"?navigator.userAgent:""}function or(){return typeof window!="undefined"&&!!(window.cordova||window.phonegap||window.PhoneGap)&&/ios|iphone|ipod|ipad|android|blackberry|iemobile/i.test(v())}function ar(){return typeof navigator!="undefined"&&navigator.userAgent==="Cloudflare-Workers"}function cr(){let n=typeof chrome=="object"?chrome.runtime:typeof browser=="object"?browser.runtime:void 0;return typeof n=="object"&&n.id!==void 0}function lr(){return typeof navigator=="object"&&navigator.product==="ReactNative"}function ur(){let n=v();return n.indexOf("MSIE ")>=0||n.indexOf("Trident/")>=0}function ue(){try{return typeof indexedDB=="object"}catch{return!1}}function dr(){return new Promise((n,e)=>{try{let t=!0,r="validate-browser-context-for-indexeddb-analytics-module",i=self.indexedDB.open(r);i.onsuccess=()=>{i.result.close(),t||self.indexedDB.deleteDatabase(r),n(!0)},i.onupgradeneeded=()=>{t=!1},i.onerror=()=>{var s;e(((s=i.error)===null||s===void 0?void 0:s.message)||"")}}catch(t){e(t)}})}var Ji="FirebaseError",k=class n extends Error{constructor(e,t,r){super(t),this.code=e,this.customData=r,this.name=Ji,Object.setPrototypeOf(this,n.prototype),Error.captureStackTrace&&Error.captureStackTrace(this,R.prototype.create)}},R=class{constructor(e,t,r){this.service=e,this.serviceName=t,this.errors=r}create(e,...t){let r=t[0]||{},i=`${this.service}/${e}`,s=this.errors[e],o=s?Yi(s,r):"Error",c=`${this.serviceName}: ${o} (${i}).`;return new k(i,c,r)}};function Yi(n,e){return n.replace(Xi,(t,r)=>{let i=e[r];return i!=null?String(i):`<${r}?>`})}var Xi=/\{\$([^}]+)}/g;function hr(n){for(let e in n)if(Object.prototype.hasOwnProperty.call(n,e))return!1;return!0}function ne(n,e){if(n===e)return!0;let t=Object.keys(n),r=Object.keys(e);for(let i of t){if(!r.includes(i))return!1;let s=n[i],o=e[i];if(nr(s)&&nr(o)){if(!ne(s,o))return!1}else if(s!==o)return!1}for(let i of r)if(!t.includes(i))return!1;return!0}function nr(n){return n!==null&&typeof n=="object"}function re(n){let e=[];for(let[t,r]of Object.entries(n))Array.isArray(r)?r.forEach(i=>{e.push(encodeURIComponent(t)+"="+encodeURIComponent(i))}):e.push(encodeURIComponent(t)+"="+encodeURIComponent(r));return e.length?"&"+e.join("&"):""}function ie(n){let e={};return n.replace(/^\?/,"").split("&").forEach(r=>{if(r){let[i,s]=r.split("=");e[decodeURIComponent(i)]=decodeURIComponent(s)}}),e}function se(n){let e=n.indexOf("?");if(!e)return"";let t=n.indexOf("#",e);return n.substring(e,t>0?t:void 0)}function fr(n,e){let t=new St(n,e);return t.subscribe.bind(t)}var St=class{constructor(e,t){this.observers=[],this.unsubscribes=[],this.observerCount=0,this.task=Promise.resolve(),this.finalized=!1,this.onNoObservers=t,this.task.then(()=>{e(this)}).catch(r=>{this.error(r)})}next(e){this.forEachObserver(t=>{t.next(e)})}error(e){this.forEachObserver(t=>{t.error(e)}),this.close(e)}complete(){this.forEachObserver(e=>{e.complete()}),this.close()}subscribe(e,t,r){let i;if(e===void 0&&t===void 0&&r===void 0)throw new Error("Missing Observer.");Qi(e,["next","error","complete"])?i=e:i={next:e,error:t,complete:r},i.next===void 0&&(i.next=bt),i.error===void 0&&(i.error=bt),i.complete===void 0&&(i.complete=bt);let s=this.unsubscribeOne.bind(this,this.observers.length);return this.finalized&&this.task.then(()=>{try{this.finalError?i.error(this.finalError):i.complete()}catch{}}),this.observers.push(i),s}unsubscribeOne(e){this.observers===void 0||this.observers[e]===void 0||(delete this.observers[e],this.observerCount-=1,this.observerCount===0&&this.onNoObservers!==void 0&&this.onNoObservers(this))}forEachObserver(e){if(!this.finalized)for(let t=0;t<this.observers.length;t++)this.sendOne(t,e)}sendOne(e,t){this.task.then(()=>{if(this.observers!==void 0&&this.observers[e]!==void 0)try{t(this.observers[e])}catch(r){typeof console!="undefined"&&console.error&&console.error(r)}})}close(e){this.finalized||(this.finalized=!0,e!==void 0&&(this.finalError=e),this.task.then(()=>{this.observers=void 0,this.onNoObservers=void 0}))}};function Qi(n,e){if(typeof n!="object"||n===null)return!1;for(let t of e)if(t in n&&typeof n[t]=="function")return!0;return!1}function bt(){}var Zi=1e3,es=2,ts=4*60*60*1e3,ns=.5;function pr(n,e=Zi,t=es){let r=e*Math.pow(t,n),i=Math.round(ns*r*(Math.random()-.5)*2);return Math.min(ts,r+i)}function I(n){return n&&n._delegate?n._delegate:n}var w=class{constructor(e,t,r){this.name=e,this.instanceFactory=t,this.type=r,this.multipleInstances=!1,this.serviceProps={},this.instantiationMode="LAZY",this.onInstanceCreated=null}setInstantiationMode(e){return this.instantiationMode=e,this}setMultipleInstances(e){return this.multipleInstances=e,this}setServiceProps(e){return this.serviceProps=e,this}setInstanceCreatedCallback(e){return this.onInstanceCreated=e,this}};var q="[DEFAULT]";var Ot=class{constructor(e,t){this.name=e,this.container=t,this.component=null,this.instances=new Map,this.instancesDeferred=new Map,this.instancesOptions=new Map,this.onInitCallbacks=new Map}get(e){let t=this.normalizeInstanceIdentifier(e);if(!this.instancesDeferred.has(t)){let r=new L;if(this.instancesDeferred.set(t,r),this.isInitialized(t)||this.shouldAutoInitialize())try{let i=this.getOrInitializeService({instanceIdentifier:t});i&&r.resolve(i)}catch{}}return this.instancesDeferred.get(t).promise}getImmediate(e){var t;let r=this.normalizeInstanceIdentifier(e==null?void 0:e.identifier),i=(t=e==null?void 0:e.optional)!==null&&t!==void 0?t:!1;if(this.isInitialized(r)||this.shouldAutoInitialize())try{return this.getOrInitializeService({instanceIdentifier:r})}catch(s){if(i)return null;throw s}else{if(i)return null;throw Error(`Service ${this.name} is not available`)}}getComponent(){return this.component}setComponent(e){if(e.name!==this.name)throw Error(`Mismatching Component ${e.name} for Provider ${this.name}.`);if(this.component)throw Error(`Component for ${this.name} has already been provided`);if(this.component=e,!!this.shouldAutoInitialize()){if(is(e))try{this.getOrInitializeService({instanceIdentifier:q})}catch{}for(let[t,r]of this.instancesDeferred.entries()){let i=this.normalizeInstanceIdentifier(t);try{let s=this.getOrInitializeService({instanceIdentifier:i});r.resolve(s)}catch{}}}}clearInstance(e=q){this.instancesDeferred.delete(e),this.instancesOptions.delete(e),this.instances.delete(e)}async delete(){let e=Array.from(this.instances.values());await Promise.all([...e.filter(t=>"INTERNAL"in t).map(t=>t.INTERNAL.delete()),...e.filter(t=>"_delete"in t).map(t=>t._delete())])}isComponentSet(){return this.component!=null}isInitialized(e=q){return this.instances.has(e)}getOptions(e=q){return this.instancesOptions.get(e)||{}}initialize(e={}){let{options:t={}}=e,r=this.normalizeInstanceIdentifier(e.instanceIdentifier);if(this.isInitialized(r))throw Error(`${this.name}(${r}) has already been initialized`);if(!this.isComponentSet())throw Error(`Component ${this.name} has not been registered yet`);let i=this.getOrInitializeService({instanceIdentifier:r,options:t});for(let[s,o]of this.instancesDeferred.entries()){let c=this.normalizeInstanceIdentifier(s);r===c&&o.resolve(i)}return i}onInit(e,t){var r;let i=this.normalizeInstanceIdentifier(t),s=(r=this.onInitCallbacks.get(i))!==null&&r!==void 0?r:new Set;s.add(e),this.onInitCallbacks.set(i,s);let o=this.instances.get(i);return o&&e(o,i),()=>{s.delete(e)}}invokeOnInitCallbacks(e,t){let r=this.onInitCallbacks.get(t);if(r)for(let i of r)try{i(e,t)}catch{}}getOrInitializeService({instanceIdentifier:e,options:t={}}){let r=this.instances.get(e);if(!r&&this.component&&(r=this.component.instanceFactory(this.container,{instanceIdentifier:rs(e),options:t}),this.instances.set(e,r),this.instancesOptions.set(e,t),this.invokeOnInitCallbacks(r,e),this.component.onInstanceCreated))try{this.component.onInstanceCreated(this.container,e,r)}catch{}return r||null}normalizeInstanceIdentifier(e=q){return this.component?this.component.multipleInstances?e:q:e}shouldAutoInitialize(){return!!this.component&&this.component.instantiationMode!=="EXPLICIT"}};function rs(n){return n===q?void 0:n}function is(n){return n.instantiationMode==="EAGER"}var Oe=class{constructor(e){this.name=e,this.providers=new Map}addComponent(e){let t=this.getProvider(e.name);if(t.isComponentSet())throw new Error(`Component ${e.name} has already been registered with ${this.name}`);t.setComponent(e)}addOrOverwriteComponent(e){this.getProvider(e.name).isComponentSet()&&this.providers.delete(e.name),this.addComponent(e)}getProvider(e){if(this.providers.has(e))return this.providers.get(e);let t=new Ot(e,this);return this.providers.set(e,t),t}getProviders(){return Array.from(this.providers.values())}};var ss=[],f;(function(n){n[n.DEBUG=0]="DEBUG",n[n.VERBOSE=1]="VERBOSE",n[n.INFO=2]="INFO",n[n.WARN=3]="WARN",n[n.ERROR=4]="ERROR",n[n.SILENT=5]="SILENT"})(f||(f={}));var os={debug:f.DEBUG,verbose:f.VERBOSE,info:f.INFO,warn:f.WARN,error:f.ERROR,silent:f.SILENT},as=f.INFO,cs={[f.DEBUG]:"log",[f.VERBOSE]:"log",[f.INFO]:"info",[f.WARN]:"warn",[f.ERROR]:"error"},ls=(n,e,...t)=>{if(e<n.logLevel)return;let r=new Date().toISOString(),i=cs[e];if(i)console[i](`[${r}]  ${n.name}:`,...t);else throw new Error(`Attempted to log a message with an invalid logType (value: ${e})`)},H=class{constructor(e){this.name=e,this._logLevel=as,this._logHandler=ls,this._userLogHandler=null,ss.push(this)}get logLevel(){return this._logLevel}set logLevel(e){if(!(e in f))throw new TypeError(`Invalid value "${e}" assigned to \`logLevel\``);this._logLevel=e}setLogLevel(e){this._logLevel=typeof e=="string"?os[e]:e}get logHandler(){return this._logHandler}set logHandler(e){if(typeof e!="function")throw new TypeError("Value assigned to `logHandler` must be a function");this._logHandler=e}get userLogHandler(){return this._userLogHandler}set userLogHandler(e){this._userLogHandler=e}debug(...e){this._userLogHandler&&this._userLogHandler(this,f.DEBUG,...e),this._logHandler(this,f.DEBUG,...e)}log(...e){this._userLogHandler&&this._userLogHandler(this,f.VERBOSE,...e),this._logHandler(this,f.VERBOSE,...e)}info(...e){this._userLogHandler&&this._userLogHandler(this,f.INFO,...e),this._logHandler(this,f.INFO,...e)}warn(...e){this._userLogHandler&&this._userLogHandler(this,f.WARN,...e),this._logHandler(this,f.WARN,...e)}error(...e){this._userLogHandler&&this._userLogHandler(this,f.ERROR,...e),this._logHandler(this,f.ERROR,...e)}};var us=(n,e)=>e.some(t=>n instanceof t),mr,gr;function ds(){return mr||(mr=[IDBDatabase,IDBObjectStore,IDBIndex,IDBCursor,IDBTransaction])}function hs(){return gr||(gr=[IDBCursor.prototype.advance,IDBCursor.prototype.continue,IDBCursor.prototype.continuePrimaryKey])}var _r=new WeakMap,Dt=new WeakMap,vr=new WeakMap,Nt=new WeakMap,Mt=new WeakMap;function fs(n){let e=new Promise((t,r)=>{let i=()=>{n.removeEventListener("success",s),n.removeEventListener("error",o)},s=()=>{t(P(n.result)),i()},o=()=>{r(n.error),i()};n.addEventListener("success",s),n.addEventListener("error",o)});return e.then(t=>{t instanceof IDBCursor&&_r.set(t,n)}).catch(()=>{}),Mt.set(e,n),e}function ps(n){if(Dt.has(n))return;let e=new Promise((t,r)=>{let i=()=>{n.removeEventListener("complete",s),n.removeEventListener("error",o),n.removeEventListener("abort",o)},s=()=>{t(),i()},o=()=>{r(n.error||new DOMException("AbortError","AbortError")),i()};n.addEventListener("complete",s),n.addEventListener("error",o),n.addEventListener("abort",o)});Dt.set(n,e)}var Lt={get(n,e,t){if(n instanceof IDBTransaction){if(e==="done")return Dt.get(n);if(e==="objectStoreNames")return n.objectStoreNames||vr.get(n);if(e==="store")return t.objectStoreNames[1]?void 0:t.objectStore(t.objectStoreNames[0])}return P(n[e])},set(n,e,t){return n[e]=t,!0},has(n,e){return n instanceof IDBTransaction&&(e==="done"||e==="store")?!0:e in n}};function Ir(n){Lt=n(Lt)}function ms(n){return n===IDBDatabase.prototype.transaction&&!("objectStoreNames"in IDBTransaction.prototype)?function(e,...t){let r=n.call(Ne(this),e,...t);return vr.set(r,e.sort?e.sort():[e]),P(r)}:hs().includes(n)?function(...e){return n.apply(Ne(this),e),P(_r.get(this))}:function(...e){return P(n.apply(Ne(this),e))}}function gs(n){return typeof n=="function"?ms(n):(n instanceof IDBTransaction&&ps(n),us(n,ds())?new Proxy(n,Lt):n)}function P(n){if(n instanceof IDBRequest)return fs(n);if(Nt.has(n))return Nt.get(n);let e=gs(n);return e!==n&&(Nt.set(n,e),Mt.set(e,n)),e}var Ne=n=>Mt.get(n);function yr(n,e,{blocked:t,upgrade:r,blocking:i,terminated:s}={}){let o=indexedDB.open(n,e),c=P(o);return r&&o.addEventListener("upgradeneeded",a=>{r(P(o.result),a.oldVersion,a.newVersion,P(o.transaction),a)}),t&&o.addEventListener("blocked",a=>t(a.oldVersion,a.newVersion,a)),c.then(a=>{s&&a.addEventListener("close",()=>s()),i&&a.addEventListener("versionchange",l=>i(l.oldVersion,l.newVersion,l))}).catch(()=>{}),c}var _s=["get","getKey","getAll","getAllKeys","count"],vs=["put","add","delete","clear"],Ut=new Map;function Er(n,e){if(!(n instanceof IDBDatabase&&!(e in n)&&typeof e=="string"))return;if(Ut.get(e))return Ut.get(e);let t=e.replace(/FromIndex$/,""),r=e!==t,i=vs.includes(t);if(!(t in(r?IDBIndex:IDBObjectStore).prototype)||!(i||_s.includes(t)))return;let s=async function(o,...c){let a=this.transaction(o,i?"readwrite":"readonly"),l=a.store;return r&&(l=l.index(c.shift())),(await Promise.all([l[t](...c),i&&a.done]))[0]};return Ut.set(e,s),s}Ir(n=>({...n,get:(e,t,r)=>Er(e,t)||n.get(e,t,r),has:(e,t)=>!!Er(e,t)||n.has(e,t)}));var Ft=class{constructor(e){this.container=e}getPlatformInfoString(){return this.container.getProviders().map(t=>{if(Is(t)){let r=t.getImmediate();return`${r.library}/${r.version}`}else return null}).filter(t=>t).join(" ")}};function Is(n){let e=n.getComponent();return(e==null?void 0:e.type)==="VERSION"}var Vt="@firebase/app",wr="0.13.2";var M=new H("@firebase/app"),Es="@firebase/app-compat",ys="@firebase/analytics-compat",ws="@firebase/analytics",Ts="@firebase/app-check-compat",bs="@firebase/app-check",As="@firebase/auth",Ss="@firebase/auth-compat",ks="@firebase/database",Rs="@firebase/data-connect",Ps="@firebase/database-compat",Cs="@firebase/functions",Os="@firebase/functions-compat",Ns="@firebase/installations",Ds="@firebase/installations-compat",Ls="@firebase/messaging",Ms="@firebase/messaging-compat",Us="@firebase/performance",xs="@firebase/performance-compat",Fs="@firebase/remote-config",Vs="@firebase/remote-config-compat",Hs="@firebase/storage",Ws="@firebase/storage-compat",js="@firebase/firestore",Bs="@firebase/ai",$s="@firebase/firestore-compat",zs="firebase",qs="11.10.0";var Ht="[DEFAULT]",Gs={[Vt]:"fire-core",[Es]:"fire-core-compat",[ws]:"fire-analytics",[ys]:"fire-analytics-compat",[bs]:"fire-app-check",[Ts]:"fire-app-check-compat",[As]:"fire-auth",[Ss]:"fire-auth-compat",[ks]:"fire-rtdb",[Rs]:"fire-data-connect",[Ps]:"fire-rtdb-compat",[Cs]:"fire-fn",[Os]:"fire-fn-compat",[Ns]:"fire-iid",[Ds]:"fire-iid-compat",[Ls]:"fire-fcm",[Ms]:"fire-fcm-compat",[Us]:"fire-perf",[xs]:"fire-perf-compat",[Fs]:"fire-rc",[Vs]:"fire-rc-compat",[Hs]:"fire-gcs",[Ws]:"fire-gcs-compat",[js]:"fire-fst",[$s]:"fire-fst-compat",[Bs]:"fire-vertex","fire-js":"fire-js",[zs]:"fire-js-all"};var De=new Map,Ks=new Map,Wt=new Map;function Tr(n,e){try{n.container.addComponent(e)}catch(t){M.debug(`Component ${e.name} failed to register with FirebaseApp ${n.name}`,t)}}function U(n){let e=n.name;if(Wt.has(e))return M.debug(`There were multiple attempts to register component ${e}.`),!1;Wt.set(e,n);for(let t of De.values())Tr(t,n);for(let t of Ks.values())Tr(t,n);return!0}function he(n,e){let t=n.container.getProvider("heartbeat").getImmediate({optional:!0});return t&&t.triggerHeartbeat(),n.container.getProvider(e)}function E(n){return n==null?!1:n.settings!==void 0}var Js={"no-app":"No Firebase App '{$appName}' has been created - call initializeApp() first","bad-app-name":"Illegal App name: '{$appName}'","duplicate-app":"Firebase App named '{$appName}' already exists with different options or config","app-deleted":"Firebase App named '{$appName}' already deleted","server-app-deleted":"Firebase Server App has been deleted","no-options":"Need to provide options, when not being deployed to hosting via source.","invalid-app-argument":"firebase.{$appName}() takes either no argument or a Firebase App instance.","invalid-log-argument":"First argument to `onLog` must be null or a function.","idb-open":"Error thrown when opening IndexedDB. Original error: {$originalErrorMessage}.","idb-get":"Error thrown when reading from IndexedDB. Original error: {$originalErrorMessage}.","idb-set":"Error thrown when writing to IndexedDB. Original error: {$originalErrorMessage}.","idb-delete":"Error thrown when deleting from IndexedDB. Original error: {$originalErrorMessage}.","finalization-registry-not-supported":"FirebaseServerApp deleteOnDeref field defined but the JS runtime does not support FinalizationRegistry.","invalid-server-app-environment":"FirebaseServerApp is not for use in browser environments."},W=new R("app","Firebase",Js);var jt=class{constructor(e,t,r){this._isDeleted=!1,this._options=Object.assign({},e),this._config=Object.assign({},t),this._name=t.name,this._automaticDataCollectionEnabled=t.automaticDataCollectionEnabled,this._container=r,this.container.addComponent(new w("app",()=>this,"PUBLIC"))}get automaticDataCollectionEnabled(){return this.checkDestroyed(),this._automaticDataCollectionEnabled}set automaticDataCollectionEnabled(e){this.checkDestroyed(),this._automaticDataCollectionEnabled=e}get name(){return this.checkDestroyed(),this._name}get options(){return this.checkDestroyed(),this._options}get config(){return this.checkDestroyed(),this._config}get container(){return this._container}get isDeleted(){return this._isDeleted}set isDeleted(e){this._isDeleted=e}checkDestroyed(){if(this.isDeleted)throw W.create("app-deleted",{appName:this._name})}};var oe=qs;function zt(n,e={}){let t=n;typeof e!="object"&&(e={name:e});let r=Object.assign({name:Ht,automaticDataCollectionEnabled:!0},e),i=r.name;if(typeof i!="string"||!i)throw W.create("bad-app-name",{appName:String(i)});if(t||(t=Pt()),!t)throw W.create("no-options");let s=De.get(i);if(s){if(ne(t,s.options)&&ne(r,s.config))return s;throw W.create("duplicate-app",{appName:i})}let o=new Oe(i);for(let a of Wt.values())o.addComponent(a);let c=new jt(t,r,o);return De.set(i,c),c}function qt(n=Ht){let e=De.get(n);if(!e&&n===Ht&&Pt())return zt();if(!e)throw W.create("no-app",{appName:n});return e}function C(n,e,t){var r;let i=(r=Gs[n])!==null&&r!==void 0?r:n;t&&(i+=`-${t}`);let s=i.match(/\s|\//),o=e.match(/\s|\//);if(s||o){let c=[`Unable to register library "${i}" with version "${e}":`];s&&c.push(`library name "${i}" contains illegal characters (whitespace or "/")`),s&&o&&c.push("and"),o&&c.push(`version name "${e}" contains illegal characters (whitespace or "/")`),M.warn(c.join(" "));return}U(new w(`${i}-version`,()=>({library:i,version:e}),"VERSION"))}var Ys="firebase-heartbeat-database",Xs=1,de="firebase-heartbeat-store",xt=null;function kr(){return xt||(xt=yr(Ys,Xs,{upgrade:(n,e)=>{switch(e){case 0:try{n.createObjectStore(de)}catch(t){console.warn(t)}}}}).catch(n=>{throw W.create("idb-open",{originalErrorMessage:n.message})})),xt}async function Qs(n){try{let t=(await kr()).transaction(de),r=await t.objectStore(de).get(Rr(n));return await t.done,r}catch(e){if(e instanceof k)M.warn(e.message);else{let t=W.create("idb-get",{originalErrorMessage:e==null?void 0:e.message});M.warn(t.message)}}}async function br(n,e){try{let r=(await kr()).transaction(de,"readwrite");await r.objectStore(de).put(e,Rr(n)),await r.done}catch(t){if(t instanceof k)M.warn(t.message);else{let r=W.create("idb-set",{originalErrorMessage:t==null?void 0:t.message});M.warn(r.message)}}}function Rr(n){return`${n.name}!${n.options.appId}`}var Zs=1024,eo=30,Bt=class{constructor(e){this.container=e,this._heartbeatsCache=null;let t=this.container.getProvider("app").getImmediate();this._storage=new $t(t),this._heartbeatsCachePromise=this._storage.read().then(r=>(this._heartbeatsCache=r,r))}async triggerHeartbeat(){var e,t;try{let i=this.container.getProvider("platform-logger").getImmediate().getPlatformInfoString(),s=Ar();if(((e=this._heartbeatsCache)===null||e===void 0?void 0:e.heartbeats)==null&&(this._heartbeatsCache=await this._heartbeatsCachePromise,((t=this._heartbeatsCache)===null||t===void 0?void 0:t.heartbeats)==null)||this._heartbeatsCache.lastSentHeartbeatDate===s||this._heartbeatsCache.heartbeats.some(o=>o.date===s))return;if(this._heartbeatsCache.heartbeats.push({date:s,agent:i}),this._heartbeatsCache.heartbeats.length>eo){let o=no(this._heartbeatsCache.heartbeats);this._heartbeatsCache.heartbeats.splice(o,1)}return this._storage.overwrite(this._heartbeatsCache)}catch(r){M.warn(r)}}async getHeartbeatsHeader(){var e;try{if(this._heartbeatsCache===null&&await this._heartbeatsCachePromise,((e=this._heartbeatsCache)===null||e===void 0?void 0:e.heartbeats)==null||this._heartbeatsCache.heartbeats.length===0)return"";let t=Ar(),{heartbeatsToSend:r,unsentEntries:i}=to(this._heartbeatsCache.heartbeats),s=kt(JSON.stringify({version:2,heartbeats:r}));return this._heartbeatsCache.lastSentHeartbeatDate=t,i.length>0?(this._heartbeatsCache.heartbeats=i,await this._storage.overwrite(this._heartbeatsCache)):(this._heartbeatsCache.heartbeats=[],this._storage.overwrite(this._heartbeatsCache)),s}catch(t){return M.warn(t),""}}};function Ar(){return new Date().toISOString().substring(0,10)}function to(n,e=Zs){let t=[],r=n.slice();for(let i of n){let s=t.find(o=>o.agent===i.agent);if(s){if(s.dates.push(i.date),Sr(t)>e){s.dates.pop();break}}else if(t.push({agent:i.agent,dates:[i.date]}),Sr(t)>e){t.pop();break}r=r.slice(1)}return{heartbeatsToSend:t,unsentEntries:r}}var $t=class{constructor(e){this.app=e,this._canUseIndexedDBPromise=this.runIndexedDBEnvironmentCheck()}async runIndexedDBEnvironmentCheck(){return ue()?dr().then(()=>!0).catch(()=>!1):!1}async read(){if(await this._canUseIndexedDBPromise){let t=await Qs(this.app);return t!=null&&t.heartbeats?t:{heartbeats:[]}}else return{heartbeats:[]}}async overwrite(e){var t;if(await this._canUseIndexedDBPromise){let i=await this.read();return br(this.app,{lastSentHeartbeatDate:(t=e.lastSentHeartbeatDate)!==null&&t!==void 0?t:i.lastSentHeartbeatDate,heartbeats:e.heartbeats})}else return}async add(e){var t;if(await this._canUseIndexedDBPromise){let i=await this.read();return br(this.app,{lastSentHeartbeatDate:(t=e.lastSentHeartbeatDate)!==null&&t!==void 0?t:i.lastSentHeartbeatDate,heartbeats:[...i.heartbeats,...e.heartbeats]})}else return}};function Sr(n){return kt(JSON.stringify({version:2,heartbeats:n})).length}function no(n){if(n.length===0)return-1;let e=0,t=n[0].date;for(let r=1;r<n.length;r++)n[r].date<t&&(t=n[r].date,e=r);return e}function ro(n){U(new w("platform-logger",e=>new Ft(e),"PRIVATE")),U(new w("heartbeat",e=>new Bt(e),"PRIVATE")),C(Vt,wr,n),C(Vt,wr,"esm2017"),C("fire-js","")}ro("");var io="firebase",so="11.10.0";C(io,so,"app");function Le(n,e){var t={};for(var r in n)Object.prototype.hasOwnProperty.call(n,r)&&e.indexOf(r)<0&&(t[r]=n[r]);if(n!=null&&typeof Object.getOwnPropertySymbols=="function")for(var i=0,r=Object.getOwnPropertySymbols(n);i<r.length;i++)e.indexOf(r[i])<0&&Object.prototype.propertyIsEnumerable.call(n,r[i])&&(t[r[i]]=n[r[i]]);return t}function zr(){return{"dependent-sdk-initialized-before-auth":"Another Firebase SDK was initialized and is trying to use Auth before Auth is initialized. Please be sure to call `initializeAuth` or `getAuth` before starting any other Firebase SDK."}}var qr=zr,Gr=new R("auth","Firebase",zr());var We=new H("@firebase/auth");function oo(n,...e){We.logLevel<=f.WARN&&We.warn(`Auth (${oe}): ${n}`,...e)}function Ue(n,...e){We.logLevel<=f.ERROR&&We.error(`Auth (${oe}): ${n}`,...e)}function b(n,...e){throw In(n,...e)}function T(n,...e){return In(n,...e)}function _n(n,e,t){let r=Object.assign(Object.assign({},qr()),{[e]:t});return new R("auth","Firebase",r).create(e,{appName:n.name})}function N(n){return _n(n,"operation-not-supported-in-this-environment","Operations that alter the current user are not supported in conjunction with FirebaseServerApp")}function vn(n,e,t){let r=t;if(!(e instanceof r))throw r.name!==e.constructor.name&&b(n,"argument-error"),_n(n,"argument-error",`Type of ${e.constructor.name} does not match expected instance.Did you pass a reference from a different Auth SDK?`)}function In(n,...e){if(typeof n!="string"){let t=e[0],r=[...e.slice(1)];return r[0]&&(r[0].appName=n.name),n._errorFactory.create(t,...r)}return Gr.create(n,...e)}function u(n,e,...t){if(!n)throw In(e,...t)}function O(n){let e="INTERNAL ASSERTION FAILED: "+n;throw Ue(e),new Error(e)}function F(n,e){n||O(e)}function Qt(){var n;return typeof self!="undefined"&&((n=self.location)===null||n===void 0?void 0:n.href)||""}function ao(){return Pr()==="http:"||Pr()==="https:"}function Pr(){var n;return typeof self!="undefined"&&((n=self.location)===null||n===void 0?void 0:n.protocol)||null}function co(){return typeof navigator!="undefined"&&navigator&&"onLine"in navigator&&typeof navigator.onLine=="boolean"&&(ao()||cr()||"connection"in navigator)?navigator.onLine:!0}function lo(){if(typeof navigator=="undefined")return null;let n=navigator;return n.languages&&n.languages[0]||n.language||null}var K=class{constructor(e,t){this.shortDelay=e,this.longDelay=t,F(t>e,"Short delay should be less than long delay!"),this.isMobile=or()||lr()}get(){return co()?this.isMobile?this.longDelay:this.shortDelay:Math.min(5e3,this.shortDelay)}};function En(n,e){F(n.emulator,"Emulator should always be set here");let{url:t}=n.emulator;return e?`${t}${e.startsWith("/")?e.slice(1):e}`:t}var je=class{static initialize(e,t,r){this.fetchImpl=e,t&&(this.headersImpl=t),r&&(this.responseImpl=r)}static fetch(){if(this.fetchImpl)return this.fetchImpl;if(typeof self!="undefined"&&"fetch"in self)return self.fetch;if(typeof globalThis!="undefined"&&globalThis.fetch)return globalThis.fetch;if(typeof fetch!="undefined")return fetch;O("Could not find fetch implementation, make sure you call FetchProvider.initialize() with an appropriate polyfill")}static headers(){if(this.headersImpl)return this.headersImpl;if(typeof self!="undefined"&&"Headers"in self)return self.Headers;if(typeof globalThis!="undefined"&&globalThis.Headers)return globalThis.Headers;if(typeof Headers!="undefined")return Headers;O("Could not find Headers implementation, make sure you call FetchProvider.initialize() with an appropriate polyfill")}static response(){if(this.responseImpl)return this.responseImpl;if(typeof self!="undefined"&&"Response"in self)return self.Response;if(typeof globalThis!="undefined"&&globalThis.Response)return globalThis.Response;if(typeof Response!="undefined")return Response;O("Could not find Response implementation, make sure you call FetchProvider.initialize() with an appropriate polyfill")}};var uo={CREDENTIAL_MISMATCH:"custom-token-mismatch",MISSING_CUSTOM_TOKEN:"internal-error",INVALID_IDENTIFIER:"invalid-email",MISSING_CONTINUE_URI:"internal-error",INVALID_PASSWORD:"wrong-password",MISSING_PASSWORD:"missing-password",INVALID_LOGIN_CREDENTIALS:"invalid-credential",EMAIL_EXISTS:"email-already-in-use",PASSWORD_LOGIN_DISABLED:"operation-not-allowed",INVALID_IDP_RESPONSE:"invalid-credential",INVALID_PENDING_TOKEN:"invalid-credential",FEDERATED_USER_ID_ALREADY_LINKED:"credential-already-in-use",MISSING_REQ_TYPE:"internal-error",EMAIL_NOT_FOUND:"user-not-found",RESET_PASSWORD_EXCEED_LIMIT:"too-many-requests",EXPIRED_OOB_CODE:"expired-action-code",INVALID_OOB_CODE:"invalid-action-code",MISSING_OOB_CODE:"internal-error",CREDENTIAL_TOO_OLD_LOGIN_AGAIN:"requires-recent-login",INVALID_ID_TOKEN:"invalid-user-token",TOKEN_EXPIRED:"user-token-expired",USER_NOT_FOUND:"user-token-expired",TOO_MANY_ATTEMPTS_TRY_LATER:"too-many-requests",PASSWORD_DOES_NOT_MEET_REQUIREMENTS:"password-does-not-meet-requirements",INVALID_CODE:"invalid-verification-code",INVALID_SESSION_INFO:"invalid-verification-id",INVALID_TEMPORARY_PROOF:"invalid-credential",MISSING_SESSION_INFO:"missing-verification-id",SESSION_EXPIRED:"code-expired",MISSING_ANDROID_PACKAGE_NAME:"missing-android-pkg-name",UNAUTHORIZED_DOMAIN:"unauthorized-continue-uri",INVALID_OAUTH_CLIENT_ID:"invalid-oauth-client-id",ADMIN_ONLY_OPERATION:"admin-restricted-operation",INVALID_MFA_PENDING_CREDENTIAL:"invalid-multi-factor-session",MFA_ENROLLMENT_NOT_FOUND:"multi-factor-info-not-found",MISSING_MFA_ENROLLMENT_ID:"missing-multi-factor-info",MISSING_MFA_PENDING_CREDENTIAL:"missing-multi-factor-session",SECOND_FACTOR_EXISTS:"second-factor-already-in-use",SECOND_FACTOR_LIMIT_EXCEEDED:"maximum-second-factor-count-exceeded",BLOCKING_FUNCTION_ERROR_RESPONSE:"internal-error",RECAPTCHA_NOT_ENABLED:"recaptcha-not-enabled",MISSING_RECAPTCHA_TOKEN:"missing-recaptcha-token",INVALID_RECAPTCHA_TOKEN:"invalid-recaptcha-token",INVALID_RECAPTCHA_ACTION:"invalid-recaptcha-action",MISSING_CLIENT_TYPE:"missing-client-type",MISSING_RECAPTCHA_VERSION:"missing-recaptcha-version",INVALID_RECAPTCHA_VERSION:"invalid-recaptcha-version",INVALID_REQ_TYPE:"invalid-req-type"};var ho=["/v1/accounts:signInWithCustomToken","/v1/accounts:signInWithEmailLink","/v1/accounts:signInWithIdp","/v1/accounts:signInWithPassword","/v1/accounts:signInWithPhoneNumber","/v1/token"],fo=new K(3e4,6e4);function m(n,e){return n.tenantId&&!e.tenantId?Object.assign(Object.assign({},e),{tenantId:n.tenantId}):e}async function _(n,e,t,r,i={}){return Kr(n,i,async()=>{let s={},o={};r&&(e==="GET"?o=r:s={body:JSON.stringify(r)});let c=re(Object.assign({key:n.config.apiKey},o)).slice(1),a=await n._getAdditionalHeaders();a["Content-Type"]="application/json",n.languageCode&&(a["X-Firebase-Locale"]=n.languageCode);let l=Object.assign({method:e,headers:a},s);return ar()||(l.referrerPolicy="no-referrer"),n.emulatorConfig&&Ct(n.emulatorConfig.host)&&(l.credentials="include"),je.fetch()(await Jr(n,n.config.apiHost,t,c),l)})}async function Kr(n,e,t){n._canInitEmulator=!1;let r=Object.assign(Object.assign({},uo),e);try{let i=new Zt(n),s=await Promise.race([t(),i.promise]);i.clearNetworkTimeout();let o=await s.json();if("needConfirmation"in o)throw pe(n,"account-exists-with-different-credential",o);if(s.ok&&!("errorMessage"in o))return o;{let c=s.ok?o.errorMessage:o.error.message,[a,l]=c.split(" : ");if(a==="FEDERATED_USER_ID_ALREADY_LINKED")throw pe(n,"credential-already-in-use",o);if(a==="EMAIL_EXISTS")throw pe(n,"email-already-in-use",o);if(a==="USER_DISABLED")throw pe(n,"user-disabled",o);let d=r[a]||a.toLowerCase().replace(/[_\s]+/g,"-");if(l)throw _n(n,d,l);b(n,d)}}catch(i){if(i instanceof k)throw i;b(n,"network-request-failed",{message:String(i)})}}async function $(n,e,t,r,i={}){let s=await _(n,e,t,r,i);return"mfaPendingCredential"in s&&b(n,"multi-factor-auth-required",{_serverResponse:s}),s}async function Jr(n,e,t,r){let i=`${e}${t}?${r}`,s=n,o=s.config.emulator?En(n.config,i):`${n.config.apiScheme}://${i}`;return ho.includes(t)&&(await s._persistenceManagerAvailable,s._getPersistenceType()==="COOKIE")?s._getPersistence()._getFinalTarget(o).toString():o}function po(n){switch(n){case"ENFORCE":return"ENFORCE";case"AUDIT":return"AUDIT";case"OFF":return"OFF";default:return"ENFORCEMENT_STATE_UNSPECIFIED"}}var Zt=class{clearNetworkTimeout(){clearTimeout(this.timer)}constructor(e){this.auth=e,this.timer=null,this.promise=new Promise((t,r)=>{this.timer=setTimeout(()=>r(T(this.auth,"network-request-failed")),fo.get())})}};function pe(n,e,t){let r={appName:n.name};t.email&&(r.email=t.email),t.phoneNumber&&(r.phoneNumber=t.phoneNumber);let i=T(n,e,r);return i.customData._tokenResponse=t,i}function Cr(n){return n!==void 0&&n.enterprise!==void 0}var Be=class{constructor(e){if(this.siteKey="",this.recaptchaEnforcementState=[],e.recaptchaKey===void 0)throw new Error("recaptchaKey undefined");this.siteKey=e.recaptchaKey.split("/")[3],this.recaptchaEnforcementState=e.recaptchaEnforcementState}getProviderEnforcementState(e){if(!this.recaptchaEnforcementState||this.recaptchaEnforcementState.length===0)return null;for(let t of this.recaptchaEnforcementState)if(t.provider&&t.provider===e)return po(t.enforcementState);return null}isProviderEnabled(e){return this.getProviderEnforcementState(e)==="ENFORCE"||this.getProviderEnforcementState(e)==="AUDIT"}isAnyProviderEnabled(){return this.isProviderEnabled("EMAIL_PASSWORD_PROVIDER")||this.isProviderEnabled("PHONE_PROVIDER")}};async function Yr(n,e){return _(n,"GET","/v2/recaptchaConfig",m(n,e))}async function mo(n,e){return _(n,"POST","/v1/accounts:delete",e)}async function $e(n,e){return _(n,"POST","/v1/accounts:lookup",e)}function me(n){if(n)try{let e=new Date(Number(n));if(!isNaN(e.getTime()))return e.toUTCString()}catch{}}async function Xr(n,e=!1){let t=I(n),r=await t.getIdToken(e),i=yn(r);u(i&&i.exp&&i.auth_time&&i.iat,t.auth,"internal-error");let s=typeof i.firebase=="object"?i.firebase:void 0,o=s==null?void 0:s.sign_in_provider;return{claims:i,token:r,authTime:me(Gt(i.auth_time)),issuedAtTime:me(Gt(i.iat)),expirationTime:me(Gt(i.exp)),signInProvider:o||null,signInSecondFactor:(s==null?void 0:s.sign_in_second_factor)||null}}function Gt(n){return Number(n)*1e3}function yn(n){let[e,t,r]=n.split(".");if(e===void 0||t===void 0||r===void 0)return Ue("JWT malformed, contained fewer than 3 sections"),null;try{let i=Ce(t);return i?JSON.parse(i):(Ue("Failed to decode base64 JWT payload"),null)}catch(i){return Ue("Caught error parsing JWT payload as JSON",i==null?void 0:i.toString()),null}}function Or(n){let e=yn(n);return u(e,"internal-error"),u(typeof e.exp!="undefined","internal-error"),u(typeof e.iat!="undefined","internal-error"),Number(e.exp)-Number(e.iat)}async function ve(n,e,t=!1){if(t)return e;try{return await e}catch(r){throw r instanceof k&&go(r)&&n.auth.currentUser===n&&await n.auth.signOut(),r}}function go({code:n}){return n==="auth/user-disabled"||n==="auth/user-token-expired"}var en=class{constructor(e){this.user=e,this.isRunning=!1,this.timerId=null,this.errorBackoff=3e4}_start(){this.isRunning||(this.isRunning=!0,this.schedule())}_stop(){this.isRunning&&(this.isRunning=!1,this.timerId!==null&&clearTimeout(this.timerId))}getInterval(e){var t;if(e){let r=this.errorBackoff;return this.errorBackoff=Math.min(this.errorBackoff*2,96e4),r}else{this.errorBackoff=3e4;let i=((t=this.user.stsTokenManager.expirationTime)!==null&&t!==void 0?t:0)-Date.now()-3e5;return Math.max(0,i)}}schedule(e=!1){if(!this.isRunning)return;let t=this.getInterval(e);this.timerId=setTimeout(async()=>{await this.iteration()},t)}async iteration(){try{await this.user.getIdToken(!0)}catch(e){(e==null?void 0:e.code)==="auth/network-request-failed"&&this.schedule(!0);return}this.schedule()}};var Ie=class{constructor(e,t){this.createdAt=e,this.lastLoginAt=t,this._initializeTime()}_initializeTime(){this.lastSignInTime=me(this.lastLoginAt),this.creationTime=me(this.createdAt)}_copy(e){this.createdAt=e.createdAt,this.lastLoginAt=e.lastLoginAt,this._initializeTime()}toJSON(){return{createdAt:this.createdAt,lastLoginAt:this.lastLoginAt}}};async function ze(n){var e;let t=n.auth,r=await n.getIdToken(),i=await ve(n,$e(t,{idToken:r}));u(i==null?void 0:i.users.length,t,"internal-error");let s=i.users[0];n._notifyReloadListener(s);let o=!((e=s.providerUserInfo)===null||e===void 0)&&e.length?Qr(s.providerUserInfo):[],c=_o(n.providerData,o),a=n.isAnonymous,l=!(n.email&&s.passwordHash)&&!(c!=null&&c.length),d=a?l:!1,h={uid:s.localId,displayName:s.displayName||null,photoURL:s.photoUrl||null,email:s.email||null,emailVerified:s.emailVerified||!1,phoneNumber:s.phoneNumber||null,tenantId:s.tenantId||null,providerData:c,metadata:new Ie(s.createdAt,s.lastLoginAt),isAnonymous:d};Object.assign(n,h)}async function dt(n){let e=I(n);await ze(e),await e.auth._persistUserIfCurrent(e),e.auth._notifyListenersIfCurrent(e)}function _o(n,e){return[...n.filter(r=>!e.some(i=>i.providerId===r.providerId)),...e]}function Qr(n){return n.map(e=>{var{providerId:t}=e,r=Le(e,["providerId"]);return{providerId:t,uid:r.rawId||"",displayName:r.displayName||null,email:r.email||null,phoneNumber:r.phoneNumber||null,photoURL:r.photoUrl||null}})}async function vo(n,e){let t=await Kr(n,{},async()=>{let r=re({grant_type:"refresh_token",refresh_token:e}).slice(1),{tokenApiHost:i,apiKey:s}=n.config,o=await Jr(n,i,"/v1/token",`key=${s}`),c=await n._getAdditionalHeaders();c["Content-Type"]="application/x-www-form-urlencoded";let a={method:"POST",headers:c,body:r};return n.emulatorConfig&&Ct(n.emulatorConfig.host)&&(a.credentials="include"),je.fetch()(o,a)});return{accessToken:t.access_token,expiresIn:t.expires_in,refreshToken:t.refresh_token}}async function Io(n,e){return _(n,"POST","/v2/accounts:revokeToken",m(n,e))}var ge=class n{constructor(){this.refreshToken=null,this.accessToken=null,this.expirationTime=null}get isExpired(){return!this.expirationTime||Date.now()>this.expirationTime-3e4}updateFromServerResponse(e){u(e.idToken,"internal-error"),u(typeof e.idToken!="undefined","internal-error"),u(typeof e.refreshToken!="undefined","internal-error");let t="expiresIn"in e&&typeof e.expiresIn!="undefined"?Number(e.expiresIn):Or(e.idToken);this.updateTokensAndExpiration(e.idToken,e.refreshToken,t)}updateFromIdToken(e){u(e.length!==0,"internal-error");let t=Or(e);this.updateTokensAndExpiration(e,null,t)}async getToken(e,t=!1){return!t&&this.accessToken&&!this.isExpired?this.accessToken:(u(this.refreshToken,e,"user-token-expired"),this.refreshToken?(await this.refresh(e,this.refreshToken),this.accessToken):null)}clearRefreshToken(){this.refreshToken=null}async refresh(e,t){let{accessToken:r,refreshToken:i,expiresIn:s}=await vo(e,t);this.updateTokensAndExpiration(r,i,Number(s))}updateTokensAndExpiration(e,t,r){this.refreshToken=t||null,this.accessToken=e||null,this.expirationTime=Date.now()+r*1e3}static fromJSON(e,t){let{refreshToken:r,accessToken:i,expirationTime:s}=t,o=new n;return r&&(u(typeof r=="string","internal-error",{appName:e}),o.refreshToken=r),i&&(u(typeof i=="string","internal-error",{appName:e}),o.accessToken=i),s&&(u(typeof s=="number","internal-error",{appName:e}),o.expirationTime=s),o}toJSON(){return{refreshToken:this.refreshToken,accessToken:this.accessToken,expirationTime:this.expirationTime}}_assign(e){this.accessToken=e.accessToken,this.refreshToken=e.refreshToken,this.expirationTime=e.expirationTime}_clone(){return Object.assign(new n,this.toJSON())}_performRefresh(){return O("not implemented")}};function j(n,e){u(typeof n=="string"||typeof n=="undefined","internal-error",{appName:e})}var B=class n{constructor(e){var{uid:t,auth:r,stsTokenManager:i}=e,s=Le(e,["uid","auth","stsTokenManager"]);this.providerId="firebase",this.proactiveRefresh=new en(this),this.reloadUserInfo=null,this.reloadListener=null,this.uid=t,this.auth=r,this.stsTokenManager=i,this.accessToken=i.accessToken,this.displayName=s.displayName||null,this.email=s.email||null,this.emailVerified=s.emailVerified||!1,this.phoneNumber=s.phoneNumber||null,this.photoURL=s.photoURL||null,this.isAnonymous=s.isAnonymous||!1,this.tenantId=s.tenantId||null,this.providerData=s.providerData?[...s.providerData]:[],this.metadata=new Ie(s.createdAt||void 0,s.lastLoginAt||void 0)}async getIdToken(e){let t=await ve(this,this.stsTokenManager.getToken(this.auth,e));return u(t,this.auth,"internal-error"),this.accessToken!==t&&(this.accessToken=t,await this.auth._persistUserIfCurrent(this),this.auth._notifyListenersIfCurrent(this)),t}getIdTokenResult(e){return Xr(this,e)}reload(){return dt(this)}_assign(e){this!==e&&(u(this.uid===e.uid,this.auth,"internal-error"),this.displayName=e.displayName,this.photoURL=e.photoURL,this.email=e.email,this.emailVerified=e.emailVerified,this.phoneNumber=e.phoneNumber,this.isAnonymous=e.isAnonymous,this.tenantId=e.tenantId,this.providerData=e.providerData.map(t=>Object.assign({},t)),this.metadata._copy(e.metadata),this.stsTokenManager._assign(e.stsTokenManager))}_clone(e){let t=new n(Object.assign(Object.assign({},this),{auth:e,stsTokenManager:this.stsTokenManager._clone()}));return t.metadata._copy(this.metadata),t}_onReload(e){u(!this.reloadListener,this.auth,"internal-error"),this.reloadListener=e,this.reloadUserInfo&&(this._notifyReloadListener(this.reloadUserInfo),this.reloadUserInfo=null)}_notifyReloadListener(e){this.reloadListener?this.reloadListener(e):this.reloadUserInfo=e}_startProactiveRefresh(){this.proactiveRefresh._start()}_stopProactiveRefresh(){this.proactiveRefresh._stop()}async _updateTokensIfNecessary(e,t=!1){let r=!1;e.idToken&&e.idToken!==this.stsTokenManager.accessToken&&(this.stsTokenManager.updateFromServerResponse(e),r=!0),t&&await ze(this),await this.auth._persistUserIfCurrent(this),r&&this.auth._notifyListenersIfCurrent(this)}async delete(){if(E(this.auth.app))return Promise.reject(N(this.auth));let e=await this.getIdToken();return await ve(this,mo(this.auth,{idToken:e})),this.stsTokenManager.clearRefreshToken(),this.auth.signOut()}toJSON(){return Object.assign(Object.assign({uid:this.uid,email:this.email||void 0,emailVerified:this.emailVerified,displayName:this.displayName||void 0,isAnonymous:this.isAnonymous,photoURL:this.photoURL||void 0,phoneNumber:this.phoneNumber||void 0,tenantId:this.tenantId||void 0,providerData:this.providerData.map(e=>Object.assign({},e)),stsTokenManager:this.stsTokenManager.toJSON(),_redirectEventId:this._redirectEventId},this.metadata.toJSON()),{apiKey:this.auth.config.apiKey,appName:this.auth.name})}get refreshToken(){return this.stsTokenManager.refreshToken||""}static _fromJSON(e,t){var r,i,s,o,c,a,l,d;let h=(r=t.displayName)!==null&&r!==void 0?r:void 0,p=(i=t.email)!==null&&i!==void 0?i:void 0,S=(s=t.phoneNumber)!==null&&s!==void 0?s:void 0,te=(o=t.photoURL)!==null&&o!==void 0?o:void 0,Jn=(c=t.tenantId)!==null&&c!==void 0?c:void 0,Et=(a=t._redirectEventId)!==null&&a!==void 0?a:void 0,Yn=(l=t.createdAt)!==null&&l!==void 0?l:void 0,Xn=(d=t.lastLoginAt)!==null&&d!==void 0?d:void 0,{uid:yt,emailVerified:Qn,isAnonymous:Zn,providerData:wt,stsTokenManager:er}=t;u(yt&&er,e,"internal-error");let ji=ge.fromJSON(this.name,er);u(typeof yt=="string",e,"internal-error"),j(h,e.name),j(p,e.name),u(typeof Qn=="boolean",e,"internal-error"),u(typeof Zn=="boolean",e,"internal-error"),j(S,e.name),j(te,e.name),j(Jn,e.name),j(Et,e.name),j(Yn,e.name),j(Xn,e.name);let Tt=new n({uid:yt,auth:e,email:p,emailVerified:Qn,displayName:h,isAnonymous:Zn,photoURL:te,phoneNumber:S,tenantId:Jn,stsTokenManager:ji,createdAt:Yn,lastLoginAt:Xn});return wt&&Array.isArray(wt)&&(Tt.providerData=wt.map(Bi=>Object.assign({},Bi))),Et&&(Tt._redirectEventId=Et),Tt}static async _fromIdTokenResponse(e,t,r=!1){let i=new ge;i.updateFromServerResponse(t);let s=new n({uid:t.localId,auth:e,stsTokenManager:i,isAnonymous:r});return await ze(s),s}static async _fromGetAccountInfoResponse(e,t,r){let i=t.users[0];u(i.localId!==void 0,"internal-error");let s=i.providerUserInfo!==void 0?Qr(i.providerUserInfo):[],o=!(i.email&&i.passwordHash)&&!(s!=null&&s.length),c=new ge;c.updateFromIdToken(r);let a=new n({uid:i.localId,auth:e,stsTokenManager:c,isAnonymous:o}),l={uid:i.localId,displayName:i.displayName||null,photoURL:i.photoUrl||null,email:i.email||null,emailVerified:i.emailVerified||!1,phoneNumber:i.phoneNumber||null,tenantId:i.tenantId||null,providerData:s,metadata:new Ie(i.createdAt,i.lastLoginAt),isAnonymous:!(i.email&&i.passwordHash)&&!(s!=null&&s.length)};return Object.assign(a,l),a}};var Nr=new Map;function x(n){F(n instanceof Function,"Expected a class definition");let e=Nr.get(n);return e?(F(e instanceof n,"Instance stored in cache mismatched with class"),e):(e=new n,Nr.set(n,e),e)}var qe=class{constructor(){this.type="NONE",this.storage={}}async _isAvailable(){return!0}async _set(e,t){this.storage[e]=t}async _get(e){let t=this.storage[e];return t===void 0?null:t}async _remove(e){delete this.storage[e]}_addListener(e,t){}_removeListener(e,t){}};qe.type="NONE";var tn=qe;function xe(n,e,t){return`firebase:${n}:${e}:${t}`}var Ge=class n{constructor(e,t,r){this.persistence=e,this.auth=t,this.userKey=r;let{config:i,name:s}=this.auth;this.fullUserKey=xe(this.userKey,i.apiKey,s),this.fullPersistenceKey=xe("persistence",i.apiKey,s),this.boundEventHandler=t._onStorageEvent.bind(t),this.persistence._addListener(this.fullUserKey,this.boundEventHandler)}setCurrentUser(e){return this.persistence._set(this.fullUserKey,e.toJSON())}async getCurrentUser(){let e=await this.persistence._get(this.fullUserKey);if(!e)return null;if(typeof e=="string"){let t=await $e(this.auth,{idToken:e}).catch(()=>{});return t?B._fromGetAccountInfoResponse(this.auth,t,e):null}return B._fromJSON(this.auth,e)}removeCurrentUser(){return this.persistence._remove(this.fullUserKey)}savePersistenceForRedirect(){return this.persistence._set(this.fullPersistenceKey,this.persistence.type)}async setPersistence(e){if(this.persistence===e)return;let t=await this.getCurrentUser();if(await this.removeCurrentUser(),this.persistence=e,t)return this.setCurrentUser(t)}delete(){this.persistence._removeListener(this.fullUserKey,this.boundEventHandler)}static async create(e,t,r="authUser"){if(!t.length)return new n(x(tn),e,r);let i=(await Promise.all(t.map(async l=>{if(await l._isAvailable())return l}))).filter(l=>l),s=i[0]||x(tn),o=xe(r,e.config.apiKey,e.name),c=null;for(let l of t)try{let d=await l._get(o);if(d){let h;if(typeof d=="string"){let p=await $e(e,{idToken:d}).catch(()=>{});if(!p)break;h=await B._fromGetAccountInfoResponse(e,p,d)}else h=B._fromJSON(e,d);l!==s&&(c=h),s=l;break}}catch{}let a=i.filter(l=>l._shouldAllowMigration);return!s._shouldAllowMigration||!a.length?new n(s,e,r):(s=a[0],c&&await s._set(o,c.toJSON()),await Promise.all(t.map(async l=>{if(l!==s)try{await l._remove(o)}catch{}})),new n(s,e,r))}};function Dr(n){let e=n.toLowerCase();if(e.includes("opera/")||e.includes("opr/")||e.includes("opios/"))return"Opera";if(ni(e))return"IEMobile";if(e.includes("msie")||e.includes("trident/"))return"IE";if(e.includes("edge/"))return"Edge";if(Zr(e))return"Firefox";if(e.includes("silk/"))return"Silk";if(ii(e))return"Blackberry";if(si(e))return"Webos";if(ei(e))return"Safari";if((e.includes("chrome/")||ti(e))&&!e.includes("edge/"))return"Chrome";if(ri(e))return"Android";{let t=/([a-zA-Z\d\.]+)\/[a-zA-Z\d\.]*$/,r=n.match(t);if((r==null?void 0:r.length)===2)return r[1]}return"Other"}function Zr(n=v()){return/firefox\//i.test(n)}function ei(n=v()){let e=n.toLowerCase();return e.includes("safari/")&&!e.includes("chrome/")&&!e.includes("crios/")&&!e.includes("android")}function ti(n=v()){return/crios\//i.test(n)}function ni(n=v()){return/iemobile/i.test(n)}function ri(n=v()){return/android/i.test(n)}function ii(n=v()){return/blackberry/i.test(n)}function si(n=v()){return/webos/i.test(n)}function wn(n=v()){return/iphone|ipad|ipod/i.test(n)||/macintosh/i.test(n)&&/mobile/i.test(n)}function Eo(n=v()){var e;return wn(n)&&!!(!((e=window.navigator)===null||e===void 0)&&e.standalone)}function yo(){return ur()&&document.documentMode===10}function oi(n=v()){return wn(n)||ri(n)||si(n)||ii(n)||/windows phone/i.test(n)||ni(n)}function ai(n,e=[]){let t;switch(n){case"Browser":t=Dr(v());break;case"Worker":t=`${Dr(v())}-${n}`;break;default:t=n}let r=e.length?e.join(","):"FirebaseCore-web";return`${t}/JsCore/${oe}/${r}`}var nn=class{constructor(e){this.auth=e,this.queue=[]}pushCallback(e,t){let r=s=>new Promise((o,c)=>{try{let a=e(s);o(a)}catch(a){c(a)}});r.onAbort=t,this.queue.push(r);let i=this.queue.length-1;return()=>{this.queue[i]=()=>Promise.resolve()}}async runMiddleware(e){if(this.auth.currentUser===e)return;let t=[];try{for(let r of this.queue)await r(e),r.onAbort&&t.push(r.onAbort)}catch(r){t.reverse();for(let i of t)try{i()}catch{}throw this.auth._errorFactory.create("login-blocked",{originalMessage:r==null?void 0:r.message})}}};async function wo(n,e={}){return _(n,"GET","/v2/passwordPolicy",m(n,e))}var To=6,rn=class{constructor(e){var t,r,i,s;let o=e.customStrengthOptions;this.customStrengthOptions={},this.customStrengthOptions.minPasswordLength=(t=o.minPasswordLength)!==null&&t!==void 0?t:To,o.maxPasswordLength&&(this.customStrengthOptions.maxPasswordLength=o.maxPasswordLength),o.containsLowercaseCharacter!==void 0&&(this.customStrengthOptions.containsLowercaseLetter=o.containsLowercaseCharacter),o.containsUppercaseCharacter!==void 0&&(this.customStrengthOptions.containsUppercaseLetter=o.containsUppercaseCharacter),o.containsNumericCharacter!==void 0&&(this.customStrengthOptions.containsNumericCharacter=o.containsNumericCharacter),o.containsNonAlphanumericCharacter!==void 0&&(this.customStrengthOptions.containsNonAlphanumericCharacter=o.containsNonAlphanumericCharacter),this.enforcementState=e.enforcementState,this.enforcementState==="ENFORCEMENT_STATE_UNSPECIFIED"&&(this.enforcementState="OFF"),this.allowedNonAlphanumericCharacters=(i=(r=e.allowedNonAlphanumericCharacters)===null||r===void 0?void 0:r.join(""))!==null&&i!==void 0?i:"",this.forceUpgradeOnSignin=(s=e.forceUpgradeOnSignin)!==null&&s!==void 0?s:!1,this.schemaVersion=e.schemaVersion}validatePassword(e){var t,r,i,s,o,c;let a={isValid:!0,passwordPolicy:this};return this.validatePasswordLengthOptions(e,a),this.validatePasswordCharacterOptions(e,a),a.isValid&&(a.isValid=(t=a.meetsMinPasswordLength)!==null&&t!==void 0?t:!0),a.isValid&&(a.isValid=(r=a.meetsMaxPasswordLength)!==null&&r!==void 0?r:!0),a.isValid&&(a.isValid=(i=a.containsLowercaseLetter)!==null&&i!==void 0?i:!0),a.isValid&&(a.isValid=(s=a.containsUppercaseLetter)!==null&&s!==void 0?s:!0),a.isValid&&(a.isValid=(o=a.containsNumericCharacter)!==null&&o!==void 0?o:!0),a.isValid&&(a.isValid=(c=a.containsNonAlphanumericCharacter)!==null&&c!==void 0?c:!0),a}validatePasswordLengthOptions(e,t){let r=this.customStrengthOptions.minPasswordLength,i=this.customStrengthOptions.maxPasswordLength;r&&(t.meetsMinPasswordLength=e.length>=r),i&&(t.meetsMaxPasswordLength=e.length<=i)}validatePasswordCharacterOptions(e,t){this.updatePasswordCharacterOptionsStatuses(t,!1,!1,!1,!1);let r;for(let i=0;i<e.length;i++)r=e.charAt(i),this.updatePasswordCharacterOptionsStatuses(t,r>="a"&&r<="z",r>="A"&&r<="Z",r>="0"&&r<="9",this.allowedNonAlphanumericCharacters.includes(r))}updatePasswordCharacterOptionsStatuses(e,t,r,i,s){this.customStrengthOptions.containsLowercaseLetter&&(e.containsLowercaseLetter||(e.containsLowercaseLetter=t)),this.customStrengthOptions.containsUppercaseLetter&&(e.containsUppercaseLetter||(e.containsUppercaseLetter=r)),this.customStrengthOptions.containsNumericCharacter&&(e.containsNumericCharacter||(e.containsNumericCharacter=i)),this.customStrengthOptions.containsNonAlphanumericCharacter&&(e.containsNonAlphanumericCharacter||(e.containsNonAlphanumericCharacter=s))}};var sn=class{constructor(e,t,r,i){this.app=e,this.heartbeatServiceProvider=t,this.appCheckServiceProvider=r,this.config=i,this.currentUser=null,this.emulatorConfig=null,this.operations=Promise.resolve(),this.authStateSubscription=new Ke(this),this.idTokenSubscription=new Ke(this),this.beforeStateQueue=new nn(this),this.redirectUser=null,this.isProactiveRefreshEnabled=!1,this.EXPECTED_PASSWORD_POLICY_SCHEMA_VERSION=1,this._canInitEmulator=!0,this._isInitialized=!1,this._deleted=!1,this._initializationPromise=null,this._popupRedirectResolver=null,this._errorFactory=Gr,this._agentRecaptchaConfig=null,this._tenantRecaptchaConfigs={},this._projectPasswordPolicy=null,this._tenantPasswordPolicies={},this._resolvePersistenceManagerAvailable=void 0,this.lastNotifiedUid=void 0,this.languageCode=null,this.tenantId=null,this.settings={appVerificationDisabledForTesting:!1},this.frameworks=[],this.name=e.name,this.clientVersion=i.sdkClientVersion,this._persistenceManagerAvailable=new Promise(s=>this._resolvePersistenceManagerAvailable=s)}_initializeWithPersistence(e,t){return t&&(this._popupRedirectResolver=x(t)),this._initializationPromise=this.queue(async()=>{var r,i,s;if(!this._deleted&&(this.persistenceManager=await Ge.create(this,e),(r=this._resolvePersistenceManagerAvailable)===null||r===void 0||r.call(this),!this._deleted)){if(!((i=this._popupRedirectResolver)===null||i===void 0)&&i._shouldInitProactively)try{await this._popupRedirectResolver._initialize(this)}catch{}await this.initializeCurrentUser(t),this.lastNotifiedUid=((s=this.currentUser)===null||s===void 0?void 0:s.uid)||null,!this._deleted&&(this._isInitialized=!0)}}),this._initializationPromise}async _onStorageEvent(){if(this._deleted)return;let e=await this.assertedPersistence.getCurrentUser();if(!(!this.currentUser&&!e)){if(this.currentUser&&e&&this.currentUser.uid===e.uid){this._currentUser._assign(e),await this.currentUser.getIdToken();return}await this._updateCurrentUser(e,!0)}}async initializeCurrentUserFromIdToken(e){try{let t=await $e(this,{idToken:e}),r=await B._fromGetAccountInfoResponse(this,t,e);await this.directlySetCurrentUser(r)}catch(t){console.warn("FirebaseServerApp could not login user with provided authIdToken: ",t),await this.directlySetCurrentUser(null)}}async initializeCurrentUser(e){var t;if(E(this.app)){let o=this.app.settings.authIdToken;return o?new Promise(c=>{setTimeout(()=>this.initializeCurrentUserFromIdToken(o).then(c,c))}):this.directlySetCurrentUser(null)}let r=await this.assertedPersistence.getCurrentUser(),i=r,s=!1;if(e&&this.config.authDomain){await this.getOrInitRedirectPersistenceManager();let o=(t=this.redirectUser)===null||t===void 0?void 0:t._redirectEventId,c=i==null?void 0:i._redirectEventId,a=await this.tryRedirectSignIn(e);(!o||o===c)&&(a!=null&&a.user)&&(i=a.user,s=!0)}if(!i)return this.directlySetCurrentUser(null);if(!i._redirectEventId){if(s)try{await this.beforeStateQueue.runMiddleware(i)}catch(o){i=r,this._popupRedirectResolver._overrideRedirectResult(this,()=>Promise.reject(o))}return i?this.reloadAndSetCurrentUserOrClear(i):this.directlySetCurrentUser(null)}return u(this._popupRedirectResolver,this,"argument-error"),await this.getOrInitRedirectPersistenceManager(),this.redirectUser&&this.redirectUser._redirectEventId===i._redirectEventId?this.directlySetCurrentUser(i):this.reloadAndSetCurrentUserOrClear(i)}async tryRedirectSignIn(e){let t=null;try{t=await this._popupRedirectResolver._completeRedirectFn(this,e,!0)}catch{await this._setRedirectUser(null)}return t}async reloadAndSetCurrentUserOrClear(e){try{await ze(e)}catch(t){if((t==null?void 0:t.code)!=="auth/network-request-failed")return this.directlySetCurrentUser(null)}return this.directlySetCurrentUser(e)}useDeviceLanguage(){this.languageCode=lo()}async _delete(){this._deleted=!0}async updateCurrentUser(e){if(E(this.app))return Promise.reject(N(this));let t=e?I(e):null;return t&&u(t.auth.config.apiKey===this.config.apiKey,this,"invalid-user-token"),this._updateCurrentUser(t&&t._clone(this))}async _updateCurrentUser(e,t=!1){if(!this._deleted)return e&&u(this.tenantId===e.tenantId,this,"tenant-id-mismatch"),t||await this.beforeStateQueue.runMiddleware(e),this.queue(async()=>{await this.directlySetCurrentUser(e),this.notifyAuthListeners()})}async signOut(){return E(this.app)?Promise.reject(N(this)):(await this.beforeStateQueue.runMiddleware(null),(this.redirectPersistenceManager||this._popupRedirectResolver)&&await this._setRedirectUser(null),this._updateCurrentUser(null,!0))}setPersistence(e){return E(this.app)?Promise.reject(N(this)):this.queue(async()=>{await this.assertedPersistence.setPersistence(x(e))})}_getRecaptchaConfig(){return this.tenantId==null?this._agentRecaptchaConfig:this._tenantRecaptchaConfigs[this.tenantId]}async validatePassword(e){this._getPasswordPolicyInternal()||await this._updatePasswordPolicy();let t=this._getPasswordPolicyInternal();return t.schemaVersion!==this.EXPECTED_PASSWORD_POLICY_SCHEMA_VERSION?Promise.reject(this._errorFactory.create("unsupported-password-policy-schema-version",{})):t.validatePassword(e)}_getPasswordPolicyInternal(){return this.tenantId===null?this._projectPasswordPolicy:this._tenantPasswordPolicies[this.tenantId]}async _updatePasswordPolicy(){let e=await wo(this),t=new rn(e);this.tenantId===null?this._projectPasswordPolicy=t:this._tenantPasswordPolicies[this.tenantId]=t}_getPersistenceType(){return this.assertedPersistence.persistence.type}_getPersistence(){return this.assertedPersistence.persistence}_updateErrorMap(e){this._errorFactory=new R("auth","Firebase",e())}onAuthStateChanged(e,t,r){return this.registerStateListener(this.authStateSubscription,e,t,r)}beforeAuthStateChanged(e,t){return this.beforeStateQueue.pushCallback(e,t)}onIdTokenChanged(e,t,r){return this.registerStateListener(this.idTokenSubscription,e,t,r)}authStateReady(){return new Promise((e,t)=>{if(this.currentUser)e();else{let r=this.onAuthStateChanged(()=>{r(),e()},t)}})}async revokeAccessToken(e){if(this.currentUser){let t=await this.currentUser.getIdToken(),r={providerId:"apple.com",tokenType:"ACCESS_TOKEN",token:e,idToken:t};this.tenantId!=null&&(r.tenantId=this.tenantId),await Io(this,r)}}toJSON(){var e;return{apiKey:this.config.apiKey,authDomain:this.config.authDomain,appName:this.name,currentUser:(e=this._currentUser)===null||e===void 0?void 0:e.toJSON()}}async _setRedirectUser(e,t){let r=await this.getOrInitRedirectPersistenceManager(t);return e===null?r.removeCurrentUser():r.setCurrentUser(e)}async getOrInitRedirectPersistenceManager(e){if(!this.redirectPersistenceManager){let t=e&&x(e)||this._popupRedirectResolver;u(t,this,"argument-error"),this.redirectPersistenceManager=await Ge.create(this,[x(t._redirectPersistence)],"redirectUser"),this.redirectUser=await this.redirectPersistenceManager.getCurrentUser()}return this.redirectPersistenceManager}async _redirectUserForId(e){var t,r;return this._isInitialized&&await this.queue(async()=>{}),((t=this._currentUser)===null||t===void 0?void 0:t._redirectEventId)===e?this._currentUser:((r=this.redirectUser)===null||r===void 0?void 0:r._redirectEventId)===e?this.redirectUser:null}async _persistUserIfCurrent(e){if(e===this.currentUser)return this.queue(async()=>this.directlySetCurrentUser(e))}_notifyListenersIfCurrent(e){e===this.currentUser&&this.notifyAuthListeners()}_key(){return`${this.config.authDomain}:${this.config.apiKey}:${this.name}`}_startProactiveRefresh(){this.isProactiveRefreshEnabled=!0,this.currentUser&&this._currentUser._startProactiveRefresh()}_stopProactiveRefresh(){this.isProactiveRefreshEnabled=!1,this.currentUser&&this._currentUser._stopProactiveRefresh()}get _currentUser(){return this.currentUser}notifyAuthListeners(){var e,t;if(!this._isInitialized)return;this.idTokenSubscription.next(this.currentUser);let r=(t=(e=this.currentUser)===null||e===void 0?void 0:e.uid)!==null&&t!==void 0?t:null;this.lastNotifiedUid!==r&&(this.lastNotifiedUid=r,this.authStateSubscription.next(this.currentUser))}registerStateListener(e,t,r,i){if(this._deleted)return()=>{};let s=typeof t=="function"?t:t.next.bind(t),o=!1,c=this._isInitialized?Promise.resolve():this._initializationPromise;if(u(c,this,"internal-error"),c.then(()=>{o||s(this.currentUser)}),typeof t=="function"){let a=e.addObserver(t,r,i);return()=>{o=!0,a()}}else{let a=e.addObserver(t);return()=>{o=!0,a()}}}async directlySetCurrentUser(e){this.currentUser&&this.currentUser!==e&&this._currentUser._stopProactiveRefresh(),e&&this.isProactiveRefreshEnabled&&e._startProactiveRefresh(),this.currentUser=e,e?await this.assertedPersistence.setCurrentUser(e):await this.assertedPersistence.removeCurrentUser()}queue(e){return this.operations=this.operations.then(e,e),this.operations}get assertedPersistence(){return u(this.persistenceManager,this,"internal-error"),this.persistenceManager}_logFramework(e){!e||this.frameworks.includes(e)||(this.frameworks.push(e),this.frameworks.sort(),this.clientVersion=ai(this.config.clientPlatform,this._getFrameworks()))}_getFrameworks(){return this.frameworks}async _getAdditionalHeaders(){var e;let t={"X-Client-Version":this.clientVersion};this.app.options.appId&&(t["X-Firebase-gmpid"]=this.app.options.appId);let r=await((e=this.heartbeatServiceProvider.getImmediate({optional:!0}))===null||e===void 0?void 0:e.getHeartbeatsHeader());r&&(t["X-Firebase-Client"]=r);let i=await this._getAppCheckToken();return i&&(t["X-Firebase-AppCheck"]=i),t}async _getAppCheckToken(){var e;if(E(this.app)&&this.app.settings.appCheckToken)return this.app.settings.appCheckToken;let t=await((e=this.appCheckServiceProvider.getImmediate({optional:!0}))===null||e===void 0?void 0:e.getToken());return t!=null&&t.error&&oo(`Error while retrieving App Check token: ${t.error}`),t==null?void 0:t.token}};function A(n){return I(n)}var Ke=class{constructor(e){this.auth=e,this.observer=null,this.addObserver=fr(t=>this.observer=t)}get next(){return u(this.observer,this.auth,"internal-error"),this.observer.next.bind(this.observer)}};var ht={async loadJS(){throw new Error("Unable to load external scripts")},recaptchaV2Script:"",recaptchaEnterpriseScript:"",gapiScript:""};function bo(n){ht=n}function ci(n){return ht.loadJS(n)}function Ao(){return ht.recaptchaEnterpriseScript}function So(){return ht.gapiScript}function li(n){return`__${n}${Math.floor(Math.random()*1e6)}`}var on=class{constructor(){this.enterprise=new an}ready(e){e()}execute(e,t){return Promise.resolve("token")}render(e,t){return""}},an=class{ready(e){e()}execute(e,t){return Promise.resolve("token")}render(e,t){return""}};var ko="recaptcha-enterprise",_e="NO_RECAPTCHA",Je=class{constructor(e){this.type=ko,this.auth=A(e)}async verify(e="verify",t=!1){async function r(s){if(!t){if(s.tenantId==null&&s._agentRecaptchaConfig!=null)return s._agentRecaptchaConfig.siteKey;if(s.tenantId!=null&&s._tenantRecaptchaConfigs[s.tenantId]!==void 0)return s._tenantRecaptchaConfigs[s.tenantId].siteKey}return new Promise(async(o,c)=>{Yr(s,{clientType:"CLIENT_TYPE_WEB",version:"RECAPTCHA_ENTERPRISE"}).then(a=>{if(a.recaptchaKey===void 0)c(new Error("recaptcha Enterprise site key undefined"));else{let l=new Be(a);return s.tenantId==null?s._agentRecaptchaConfig=l:s._tenantRecaptchaConfigs[s.tenantId]=l,o(l.siteKey)}}).catch(a=>{c(a)})})}function i(s,o,c){let a=window.grecaptcha;Cr(a)?a.enterprise.ready(()=>{a.enterprise.execute(s,{action:e}).then(l=>{o(l)}).catch(()=>{o(_e)})}):c(Error("No reCAPTCHA enterprise script loaded."))}return this.auth.settings.appVerificationDisabledForTesting?new on().execute("siteKey",{action:"verify"}):new Promise((s,o)=>{r(this.auth).then(c=>{if(!t&&Cr(window.grecaptcha))i(c,s,o);else{if(typeof window=="undefined"){o(new Error("RecaptchaVerifier is only supported in browser"));return}let a=Ao();a.length!==0&&(a+=c),ci(a).then(()=>{i(c,s,o)}).catch(l=>{o(l)})}}).catch(c=>{o(c)})})}};async function fe(n,e,t,r=!1,i=!1){let s=new Je(n),o;if(i)o=_e;else try{o=await s.verify(t)}catch{o=await s.verify(t,!0)}let c=Object.assign({},e);if(t==="mfaSmsEnrollment"||t==="mfaSmsSignIn"){if("phoneEnrollmentInfo"in c){let a=c.phoneEnrollmentInfo.phoneNumber,l=c.phoneEnrollmentInfo.recaptchaToken;Object.assign(c,{phoneEnrollmentInfo:{phoneNumber:a,recaptchaToken:l,captchaResponse:o,clientType:"CLIENT_TYPE_WEB",recaptchaVersion:"RECAPTCHA_ENTERPRISE"}})}else if("phoneSignInInfo"in c){let a=c.phoneSignInInfo.recaptchaToken;Object.assign(c,{phoneSignInInfo:{recaptchaToken:a,captchaResponse:o,clientType:"CLIENT_TYPE_WEB",recaptchaVersion:"RECAPTCHA_ENTERPRISE"}})}return c}return r?Object.assign(c,{captchaResp:o}):Object.assign(c,{captchaResponse:o}),Object.assign(c,{clientType:"CLIENT_TYPE_WEB"}),Object.assign(c,{recaptchaVersion:"RECAPTCHA_ENTERPRISE"}),c}async function G(n,e,t,r,i){var s,o;if(i==="EMAIL_PASSWORD_PROVIDER")if(!((s=n._getRecaptchaConfig())===null||s===void 0)&&s.isProviderEnabled("EMAIL_PASSWORD_PROVIDER")){let c=await fe(n,e,t,t==="getOobCode");return r(n,c)}else return r(n,e).catch(async c=>{if(c.code==="auth/missing-recaptcha-token"){console.log(`${t} is protected by reCAPTCHA Enterprise for this project. Automatically triggering the reCAPTCHA flow and restarting the flow.`);let a=await fe(n,e,t,t==="getOobCode");return r(n,a)}else return Promise.reject(c)});else if(i==="PHONE_PROVIDER")if(!((o=n._getRecaptchaConfig())===null||o===void 0)&&o.isProviderEnabled("PHONE_PROVIDER")){let c=await fe(n,e,t);return r(n,c).catch(async a=>{var l;if(((l=n._getRecaptchaConfig())===null||l===void 0?void 0:l.getProviderEnforcementState("PHONE_PROVIDER"))==="AUDIT"&&(a.code==="auth/missing-recaptcha-token"||a.code==="auth/invalid-app-credential")){console.log(`Failed to verify with reCAPTCHA Enterprise. Automatically triggering the reCAPTCHA v2 flow to complete the ${t} flow.`);let d=await fe(n,e,t,!1,!0);return r(n,d)}return Promise.reject(a)})}else{let c=await fe(n,e,t,!1,!0);return r(n,c)}else return Promise.reject(i+" provider is not supported.")}async function Ro(n){let e=A(n),t=await Yr(e,{clientType:"CLIENT_TYPE_WEB",version:"RECAPTCHA_ENTERPRISE"}),r=new Be(t);e.tenantId==null?e._agentRecaptchaConfig=r:e._tenantRecaptchaConfigs[e.tenantId]=r,r.isAnyProviderEnabled()&&new Je(e).verify()}function Tn(n,e){let t=he(n,"auth");if(t.isInitialized()){let i=t.getImmediate(),s=t.getOptions();if(ne(s,e!=null?e:{}))return i;b(i,"already-initialized")}return t.initialize({options:e})}function Po(n,e){let t=(e==null?void 0:e.persistence)||[],r=(Array.isArray(t)?t:[t]).map(x);e!=null&&e.errorMap&&n._updateErrorMap(e.errorMap),n._initializeWithPersistence(r,e==null?void 0:e.popupRedirectResolver)}var J=class{constructor(e,t){this.providerId=e,this.signInMethod=t}toJSON(){return O("not implemented")}_getIdTokenResponse(e){return O("not implemented")}_linkToIdToken(e,t){return O("not implemented")}_getReauthenticationResolver(e){return O("not implemented")}};async function Co(n,e){return _(n,"POST","/v1/accounts:signUp",e)}async function Oo(n,e){return $(n,"POST","/v1/accounts:signInWithPassword",m(n,e))}async function No(n,e){return _(n,"POST","/v1/accounts:sendOobCode",m(n,e))}async function Do(n,e){return No(n,e)}async function Lo(n,e){return $(n,"POST","/v1/accounts:signInWithEmailLink",m(n,e))}async function Mo(n,e){return $(n,"POST","/v1/accounts:signInWithEmailLink",m(n,e))}var Ee=class n extends J{constructor(e,t,r,i=null){super("password",r),this._email=e,this._password=t,this._tenantId=i}static _fromEmailAndPassword(e,t){return new n(e,t,"password")}static _fromEmailAndCode(e,t,r=null){return new n(e,t,"emailLink",r)}toJSON(){return{email:this._email,password:this._password,signInMethod:this.signInMethod,tenantId:this._tenantId}}static fromJSON(e){let t=typeof e=="string"?JSON.parse(e):e;if(t!=null&&t.email&&(t!=null&&t.password)){if(t.signInMethod==="password")return this._fromEmailAndPassword(t.email,t.password);if(t.signInMethod==="emailLink")return this._fromEmailAndCode(t.email,t.password,t.tenantId)}return null}async _getIdTokenResponse(e){switch(this.signInMethod){case"password":let t={returnSecureToken:!0,email:this._email,password:this._password,clientType:"CLIENT_TYPE_WEB"};return G(e,t,"signInWithPassword",Oo,"EMAIL_PASSWORD_PROVIDER");case"emailLink":return Lo(e,{email:this._email,oobCode:this._password});default:b(e,"internal-error")}}async _linkToIdToken(e,t){switch(this.signInMethod){case"password":let r={idToken:t,returnSecureToken:!0,email:this._email,password:this._password,clientType:"CLIENT_TYPE_WEB"};return G(e,r,"signUpPassword",Co,"EMAIL_PASSWORD_PROVIDER");case"emailLink":return Mo(e,{idToken:t,email:this._email,oobCode:this._password});default:b(e,"internal-error")}}_getReauthenticationResolver(e){return this._getIdTokenResponse(e)}};async function ae(n,e){return $(n,"POST","/v1/accounts:signInWithIdp",m(n,e))}var Uo="http://localhost",Y=class n extends J{constructor(){super(...arguments),this.pendingToken=null}static _fromParams(e){let t=new n(e.providerId,e.signInMethod);return e.idToken||e.accessToken?(e.idToken&&(t.idToken=e.idToken),e.accessToken&&(t.accessToken=e.accessToken),e.nonce&&!e.pendingToken&&(t.nonce=e.nonce),e.pendingToken&&(t.pendingToken=e.pendingToken)):e.oauthToken&&e.oauthTokenSecret?(t.accessToken=e.oauthToken,t.secret=e.oauthTokenSecret):b("argument-error"),t}toJSON(){return{idToken:this.idToken,accessToken:this.accessToken,secret:this.secret,nonce:this.nonce,pendingToken:this.pendingToken,providerId:this.providerId,signInMethod:this.signInMethod}}static fromJSON(e){let t=typeof e=="string"?JSON.parse(e):e,{providerId:r,signInMethod:i}=t,s=Le(t,["providerId","signInMethod"]);if(!r||!i)return null;let o=new n(r,i);return o.idToken=s.idToken||void 0,o.accessToken=s.accessToken||void 0,o.secret=s.secret,o.nonce=s.nonce,o.pendingToken=s.pendingToken||null,o}_getIdTokenResponse(e){let t=this.buildRequest();return ae(e,t)}_linkToIdToken(e,t){let r=this.buildRequest();return r.idToken=t,ae(e,r)}_getReauthenticationResolver(e){let t=this.buildRequest();return t.autoCreate=!1,ae(e,t)}buildRequest(){let e={requestUri:Uo,returnSecureToken:!0};if(this.pendingToken)e.pendingToken=this.pendingToken;else{let t={};this.idToken&&(t.id_token=this.idToken),this.accessToken&&(t.access_token=this.accessToken),this.secret&&(t.oauth_token_secret=this.secret),t.providerId=this.providerId,this.nonce&&!this.pendingToken&&(t.nonce=this.nonce),e.postBody=re(t)}return e}};async function Lr(n,e){return _(n,"POST","/v1/accounts:sendVerificationCode",m(n,e))}async function xo(n,e){return $(n,"POST","/v1/accounts:signInWithPhoneNumber",m(n,e))}async function Fo(n,e){let t=await $(n,"POST","/v1/accounts:signInWithPhoneNumber",m(n,e));if(t.temporaryProof)throw pe(n,"account-exists-with-different-credential",t);return t}var Vo={USER_NOT_FOUND:"user-not-found"};async function Ho(n,e){let t=Object.assign(Object.assign({},e),{operation:"REAUTH"});return $(n,"POST","/v1/accounts:signInWithPhoneNumber",m(n,t),Vo)}var ye=class n extends J{constructor(e){super("phone","phone"),this.params=e}static _fromVerification(e,t){return new n({verificationId:e,verificationCode:t})}static _fromTokenResponse(e,t){return new n({phoneNumber:e,temporaryProof:t})}_getIdTokenResponse(e){return xo(e,this._makeVerificationRequest())}_linkToIdToken(e,t){return Fo(e,Object.assign({idToken:t},this._makeVerificationRequest()))}_getReauthenticationResolver(e){return Ho(e,this._makeVerificationRequest())}_makeVerificationRequest(){let{temporaryProof:e,phoneNumber:t,verificationId:r,verificationCode:i}=this.params;return e&&t?{temporaryProof:e,phoneNumber:t}:{sessionInfo:r,code:i}}toJSON(){let e={providerId:this.providerId};return this.params.phoneNumber&&(e.phoneNumber=this.params.phoneNumber),this.params.temporaryProof&&(e.temporaryProof=this.params.temporaryProof),this.params.verificationCode&&(e.verificationCode=this.params.verificationCode),this.params.verificationId&&(e.verificationId=this.params.verificationId),e}static fromJSON(e){typeof e=="string"&&(e=JSON.parse(e));let{verificationId:t,verificationCode:r,phoneNumber:i,temporaryProof:s}=e;return!r&&!t&&!i&&!s?null:new n({verificationId:t,verificationCode:r,phoneNumber:i,temporaryProof:s})}};function Wo(n){switch(n){case"recoverEmail":return"RECOVER_EMAIL";case"resetPassword":return"PASSWORD_RESET";case"signIn":return"EMAIL_SIGNIN";case"verifyEmail":return"VERIFY_EMAIL";case"verifyAndChangeEmail":return"VERIFY_AND_CHANGE_EMAIL";case"revertSecondFactorAddition":return"REVERT_SECOND_FACTOR_ADDITION";default:return null}}function jo(n){let e=ie(se(n)).link,t=e?ie(se(e)).deep_link_id:null,r=ie(se(n)).deep_link_id;return(r?ie(se(r)).link:null)||r||t||e||n}var Ye=class n{constructor(e){var t,r,i,s,o,c;let a=ie(se(e)),l=(t=a.apiKey)!==null&&t!==void 0?t:null,d=(r=a.oobCode)!==null&&r!==void 0?r:null,h=Wo((i=a.mode)!==null&&i!==void 0?i:null);u(l&&d&&h,"argument-error"),this.apiKey=l,this.operation=h,this.code=d,this.continueUrl=(s=a.continueUrl)!==null&&s!==void 0?s:null,this.languageCode=(o=a.lang)!==null&&o!==void 0?o:null,this.tenantId=(c=a.tenantId)!==null&&c!==void 0?c:null}static parseLink(e){let t=jo(e);try{return new n(t)}catch{return null}}};var V=class n{constructor(){this.providerId=n.PROVIDER_ID}static credential(e,t){return Ee._fromEmailAndPassword(e,t)}static credentialWithLink(e,t){let r=Ye.parseLink(t);return u(r,"argument-error"),Ee._fromEmailAndCode(e,r.code,r.tenantId)}};V.PROVIDER_ID="password";V.EMAIL_PASSWORD_SIGN_IN_METHOD="password";V.EMAIL_LINK_SIGN_IN_METHOD="emailLink";var X=class{constructor(e){this.providerId=e,this.defaultLanguageCode=null,this.customParameters={}}setDefaultLanguage(e){this.defaultLanguageCode=e}setCustomParameters(e){return this.customParameters=e,this}getCustomParameters(){return this.customParameters}};var Q=class extends X{constructor(){super(...arguments),this.scopes=[]}addScope(e){return this.scopes.includes(e)||this.scopes.push(e),this}getScopes(){return[...this.scopes]}};var we=class n extends Q{constructor(){super("facebook.com")}static credential(e){return Y._fromParams({providerId:n.PROVIDER_ID,signInMethod:n.FACEBOOK_SIGN_IN_METHOD,accessToken:e})}static credentialFromResult(e){return n.credentialFromTaggedObject(e)}static credentialFromError(e){return n.credentialFromTaggedObject(e.customData||{})}static credentialFromTaggedObject({_tokenResponse:e}){if(!e||!("oauthAccessToken"in e)||!e.oauthAccessToken)return null;try{return n.credential(e.oauthAccessToken)}catch{return null}}};we.FACEBOOK_SIGN_IN_METHOD="facebook.com";we.PROVIDER_ID="facebook.com";var Z=class n extends Q{constructor(){super("google.com"),this.addScope("profile")}static credential(e,t){return Y._fromParams({providerId:n.PROVIDER_ID,signInMethod:n.GOOGLE_SIGN_IN_METHOD,idToken:e,accessToken:t})}static credentialFromResult(e){return n.credentialFromTaggedObject(e)}static credentialFromError(e){return n.credentialFromTaggedObject(e.customData||{})}static credentialFromTaggedObject({_tokenResponse:e}){if(!e)return null;let{oauthIdToken:t,oauthAccessToken:r}=e;if(!t&&!r)return null;try{return n.credential(t,r)}catch{return null}}};Z.GOOGLE_SIGN_IN_METHOD="google.com";Z.PROVIDER_ID="google.com";var Te=class n extends Q{constructor(){super("github.com")}static credential(e){return Y._fromParams({providerId:n.PROVIDER_ID,signInMethod:n.GITHUB_SIGN_IN_METHOD,accessToken:e})}static credentialFromResult(e){return n.credentialFromTaggedObject(e)}static credentialFromError(e){return n.credentialFromTaggedObject(e.customData||{})}static credentialFromTaggedObject({_tokenResponse:e}){if(!e||!("oauthAccessToken"in e)||!e.oauthAccessToken)return null;try{return n.credential(e.oauthAccessToken)}catch{return null}}};Te.GITHUB_SIGN_IN_METHOD="github.com";Te.PROVIDER_ID="github.com";var be=class n extends Q{constructor(){super("twitter.com")}static credential(e,t){return Y._fromParams({providerId:n.PROVIDER_ID,signInMethod:n.TWITTER_SIGN_IN_METHOD,oauthToken:e,oauthTokenSecret:t})}static credentialFromResult(e){return n.credentialFromTaggedObject(e)}static credentialFromError(e){return n.credentialFromTaggedObject(e.customData||{})}static credentialFromTaggedObject({_tokenResponse:e}){if(!e)return null;let{oauthAccessToken:t,oauthTokenSecret:r}=e;if(!t||!r)return null;try{return n.credential(t,r)}catch{return null}}};be.TWITTER_SIGN_IN_METHOD="twitter.com";be.PROVIDER_ID="twitter.com";async function Bo(n,e){return $(n,"POST","/v1/accounts:signUp",m(n,e))}var ce=class n{constructor(e){this.user=e.user,this.providerId=e.providerId,this._tokenResponse=e._tokenResponse,this.operationType=e.operationType}static async _fromIdTokenResponse(e,t,r,i=!1){let s=await B._fromIdTokenResponse(e,r,i),o=Mr(r);return new n({user:s,providerId:o,_tokenResponse:r,operationType:t})}static async _forOperation(e,t,r){await e._updateTokensIfNecessary(r,!0);let i=Mr(r);return new n({user:e,providerId:i,_tokenResponse:r,operationType:t})}};function Mr(n){return n.providerId?n.providerId:"phoneNumber"in n?"phone":null}var cn=class n extends k{constructor(e,t,r,i){var s;super(t.code,t.message),this.operationType=r,this.user=i,Object.setPrototypeOf(this,n.prototype),this.customData={appName:e.name,tenantId:(s=e.tenantId)!==null&&s!==void 0?s:void 0,_serverResponse:t.customData._serverResponse,operationType:r}}static _fromErrorAndOperation(e,t,r,i){return new n(e,t,r,i)}};function ui(n,e,t,r){return(e==="reauthenticate"?t._getReauthenticationResolver(n):t._getIdTokenResponse(n)).catch(s=>{throw s.code==="auth/multi-factor-auth-required"?cn._fromErrorAndOperation(n,s,e,r):s})}async function $o(n,e,t=!1){let r=await ve(n,e._linkToIdToken(n.auth,await n.getIdToken()),t);return ce._forOperation(n,"link",r)}async function di(n,e,t=!1){let{auth:r}=n;if(E(r.app))return Promise.reject(N(r));let i="reauthenticate";try{let s=await ve(n,ui(r,i,e,n),t);u(s.idToken,r,"internal-error");let o=yn(s.idToken);u(o,r,"internal-error");let{sub:c}=o;return u(n.uid===c,r,"user-mismatch"),ce._forOperation(n,i,s)}catch(s){throw(s==null?void 0:s.code)==="auth/user-not-found"&&b(r,"user-mismatch"),s}}async function hi(n,e,t=!1){if(E(n.app))return Promise.reject(N(n));let r="signIn",i=await ui(n,r,e),s=await ce._fromIdTokenResponse(n,r,i);return t||await n._updateCurrentUser(s.user),s}async function fi(n,e){return hi(A(n),e)}async function bn(n,e){return di(I(n),e)}function zo(n,e,t){var r;u(((r=t.url)===null||r===void 0?void 0:r.length)>0,n,"invalid-continue-uri"),u(typeof t.dynamicLinkDomain=="undefined"||t.dynamicLinkDomain.length>0,n,"invalid-dynamic-link-domain"),u(typeof t.linkDomain=="undefined"||t.linkDomain.length>0,n,"invalid-hosting-link-domain"),e.continueUrl=t.url,e.dynamicLinkDomain=t.dynamicLinkDomain,e.linkDomain=t.linkDomain,e.canHandleCodeInApp=t.handleCodeInApp,t.iOS&&(u(t.iOS.bundleId.length>0,n,"missing-ios-bundle-id"),e.iOSBundleId=t.iOS.bundleId),t.android&&(u(t.android.packageName.length>0,n,"missing-android-pkg-name"),e.androidInstallApp=t.android.installApp,e.androidMinimumVersionCode=t.android.minimumVersion,e.androidPackageName=t.android.packageName)}async function pi(n){let e=A(n);e._getPasswordPolicyInternal()&&await e._updatePasswordPolicy()}async function An(n,e,t){let r=A(n),i={requestType:"PASSWORD_RESET",email:e,clientType:"CLIENT_TYPE_WEB"};t&&zo(r,i,t),await G(r,i,"getOobCode",Do,"EMAIL_PASSWORD_PROVIDER")}async function Sn(n,e,t){if(E(n.app))return Promise.reject(N(n));let r=A(n),o=await G(r,{returnSecureToken:!0,email:e,password:t,clientType:"CLIENT_TYPE_WEB"},"signUpPassword",Bo,"EMAIL_PASSWORD_PROVIDER").catch(a=>{throw a.code==="auth/password-does-not-meet-requirements"&&pi(n),a}),c=await ce._fromIdTokenResponse(r,"signIn",o);return await r._updateCurrentUser(c.user),c}function kn(n,e,t){return E(n.app)?Promise.reject(N(n)):fi(I(n),V.credential(e,t)).catch(async r=>{throw r.code==="auth/password-does-not-meet-requirements"&&pi(n),r})}function Rn(n,e,t,r){return I(n).onAuthStateChanged(e,t,r)}function Pn(n){I(n).useDeviceLanguage()}function Cn(n){return I(n).signOut()}async function On(n){return I(n).delete()}function Ur(n,e){return _(n,"POST","/v2/accounts/mfaEnrollment:start",m(n,e))}function qo(n,e){return _(n,"POST","/v2/accounts/mfaEnrollment:finalize",m(n,e))}function Go(n,e){return _(n,"POST","/v2/accounts/mfaEnrollment:start",m(n,e))}function Ko(n,e){return _(n,"POST","/v2/accounts/mfaEnrollment:finalize",m(n,e))}var Xe="__sak";var Qe=class{constructor(e,t){this.storageRetriever=e,this.type=t}_isAvailable(){try{return this.storage?(this.storage.setItem(Xe,"1"),this.storage.removeItem(Xe),Promise.resolve(!0)):Promise.resolve(!1)}catch{return Promise.resolve(!1)}}_set(e,t){return this.storage.setItem(e,JSON.stringify(t)),Promise.resolve()}_get(e){let t=this.storage.getItem(e);return Promise.resolve(t?JSON.parse(t):null)}_remove(e){return this.storage.removeItem(e),Promise.resolve()}get storage(){return this.storageRetriever()}};var Jo=1e3,Yo=10,Ze=class extends Qe{constructor(){super(()=>window.localStorage,"LOCAL"),this.boundEventHandler=(e,t)=>this.onStorageEvent(e,t),this.listeners={},this.localCache={},this.pollTimer=null,this.fallbackToPolling=oi(),this._shouldAllowMigration=!0}forAllChangedKeys(e){for(let t of Object.keys(this.listeners)){let r=this.storage.getItem(t),i=this.localCache[t];r!==i&&e(t,i,r)}}onStorageEvent(e,t=!1){if(!e.key){this.forAllChangedKeys((o,c,a)=>{this.notifyListeners(o,a)});return}let r=e.key;t?this.detachListener():this.stopPolling();let i=()=>{let o=this.storage.getItem(r);!t&&this.localCache[r]===o||this.notifyListeners(r,o)},s=this.storage.getItem(r);yo()&&s!==e.newValue&&e.newValue!==e.oldValue?setTimeout(i,Yo):i()}notifyListeners(e,t){this.localCache[e]=t;let r=this.listeners[e];if(r)for(let i of Array.from(r))i(t&&JSON.parse(t))}startPolling(){this.stopPolling(),this.pollTimer=setInterval(()=>{this.forAllChangedKeys((e,t,r)=>{this.onStorageEvent(new StorageEvent("storage",{key:e,oldValue:t,newValue:r}),!0)})},Jo)}stopPolling(){this.pollTimer&&(clearInterval(this.pollTimer),this.pollTimer=null)}attachListener(){window.addEventListener("storage",this.boundEventHandler)}detachListener(){window.removeEventListener("storage",this.boundEventHandler)}_addListener(e,t){Object.keys(this.listeners).length===0&&(this.fallbackToPolling?this.startPolling():this.attachListener()),this.listeners[e]||(this.listeners[e]=new Set,this.localCache[e]=this.storage.getItem(e)),this.listeners[e].add(t)}_removeListener(e,t){this.listeners[e]&&(this.listeners[e].delete(t),this.listeners[e].size===0&&delete this.listeners[e]),Object.keys(this.listeners).length===0&&(this.detachListener(),this.stopPolling())}async _set(e,t){await super._set(e,t),this.localCache[e]=JSON.stringify(t)}async _get(e){let t=await super._get(e);return this.localCache[e]=JSON.stringify(t),t}async _remove(e){await super._remove(e),delete this.localCache[e]}};Ze.type="LOCAL";var Nn=Ze;var Xo=1e3;function Kt(n){var e,t;let r=n.replace(/[\\^$.*+?()[\]{}|]/g,"\\$&"),i=RegExp(`${r}=([^;]+)`);return(t=(e=document.cookie.match(i))===null||e===void 0?void 0:e[1])!==null&&t!==void 0?t:null}function Jt(n){return`${window.location.protocol==="http:"?"__dev_":"__HOST-"}FIREBASE_${n.split(":")[3]}`}var ln=class{constructor(){this.type="COOKIE",this.listenerUnsubscribes=new Map}_getFinalTarget(e){if(typeof window===void 0)return e;let t=new URL(`${window.location.origin}/__cookies__`);return t.searchParams.set("finalTarget",e),t}async _isAvailable(){var e;return typeof isSecureContext=="boolean"&&!isSecureContext||typeof navigator=="undefined"||typeof document=="undefined"?!1:(e=navigator.cookieEnabled)!==null&&e!==void 0?e:!0}async _set(e,t){}async _get(e){if(!this._isAvailable())return null;let t=Jt(e);if(window.cookieStore){let r=await window.cookieStore.get(t);return r==null?void 0:r.value}return Kt(t)}async _remove(e){if(!this._isAvailable()||!await this._get(e))return;let r=Jt(e);document.cookie=`${r}=;Max-Age=34560000;Partitioned;Secure;SameSite=Strict;Path=/;Priority=High`,await fetch("/__cookies__",{method:"DELETE"}).catch(()=>{})}_addListener(e,t){if(!this._isAvailable())return;let r=Jt(e);if(window.cookieStore){let c=l=>{let d=l.changed.find(p=>p.name===r);d&&t(d.value),l.deleted.find(p=>p.name===r)&&t(null)},a=()=>window.cookieStore.removeEventListener("change",c);return this.listenerUnsubscribes.set(t,a),window.cookieStore.addEventListener("change",c)}let i=Kt(r),s=setInterval(()=>{let c=Kt(r);c!==i&&(t(c),i=c)},Xo),o=()=>clearInterval(s);this.listenerUnsubscribes.set(t,o)}_removeListener(e,t){let r=this.listenerUnsubscribes.get(t);r&&(r(),this.listenerUnsubscribes.delete(t))}};ln.type="COOKIE";var et=class extends Qe{constructor(){super(()=>window.sessionStorage,"SESSION")}_addListener(e,t){}_removeListener(e,t){}};et.type="SESSION";var mi=et;function Qo(n){return Promise.all(n.map(async e=>{try{return{fulfilled:!0,value:await e}}catch(t){return{fulfilled:!1,reason:t}}}))}var tt=class n{constructor(e){this.eventTarget=e,this.handlersMap={},this.boundEventHandler=this.handleEvent.bind(this)}static _getInstance(e){let t=this.receivers.find(i=>i.isListeningto(e));if(t)return t;let r=new n(e);return this.receivers.push(r),r}isListeningto(e){return this.eventTarget===e}async handleEvent(e){let t=e,{eventId:r,eventType:i,data:s}=t.data,o=this.handlersMap[i];if(!(o!=null&&o.size))return;t.ports[0].postMessage({status:"ack",eventId:r,eventType:i});let c=Array.from(o).map(async l=>l(t.origin,s)),a=await Qo(c);t.ports[0].postMessage({status:"done",eventId:r,eventType:i,response:a})}_subscribe(e,t){Object.keys(this.handlersMap).length===0&&this.eventTarget.addEventListener("message",this.boundEventHandler),this.handlersMap[e]||(this.handlersMap[e]=new Set),this.handlersMap[e].add(t)}_unsubscribe(e,t){this.handlersMap[e]&&t&&this.handlersMap[e].delete(t),(!t||this.handlersMap[e].size===0)&&delete this.handlersMap[e],Object.keys(this.handlersMap).length===0&&this.eventTarget.removeEventListener("message",this.boundEventHandler)}};tt.receivers=[];function Dn(n="",e=10){let t="";for(let r=0;r<e;r++)t+=Math.floor(Math.random()*10);return n+t}var un=class{constructor(e){this.target=e,this.handlers=new Set}removeMessageHandler(e){e.messageChannel&&(e.messageChannel.port1.removeEventListener("message",e.onMessage),e.messageChannel.port1.close()),this.handlers.delete(e)}async _send(e,t,r=50){let i=typeof MessageChannel!="undefined"?new MessageChannel:null;if(!i)throw new Error("connection_unavailable");let s,o;return new Promise((c,a)=>{let l=Dn("",20);i.port1.start();let d=setTimeout(()=>{a(new Error("unsupported_event"))},r);o={messageChannel:i,onMessage(h){let p=h;if(p.data.eventId===l)switch(p.data.status){case"ack":clearTimeout(d),s=setTimeout(()=>{a(new Error("timeout"))},3e3);break;case"done":clearTimeout(s),c(p.data.response);break;default:clearTimeout(d),clearTimeout(s),a(new Error("invalid_response"));break}}},this.handlers.add(o),i.port1.addEventListener("message",o.onMessage),this.target.postMessage({eventType:e,eventId:l,data:t},[i.port2])}).finally(()=>{o&&this.removeMessageHandler(o)})}};function D(){return window}function Zo(n){D().location.href=n}function gi(){return typeof D().WorkerGlobalScope!="undefined"&&typeof D().importScripts=="function"}async function ea(){if(!(navigator!=null&&navigator.serviceWorker))return null;try{return(await navigator.serviceWorker.ready).active}catch{return null}}function ta(){var n;return((n=navigator==null?void 0:navigator.serviceWorker)===null||n===void 0?void 0:n.controller)||null}function na(){return gi()?self:null}var _i="firebaseLocalStorageDb",ra=1,nt="firebaseLocalStorage",vi="fbase_key",ee=class{constructor(e){this.request=e}toPromise(){return new Promise((e,t)=>{this.request.addEventListener("success",()=>{e(this.request.result)}),this.request.addEventListener("error",()=>{t(this.request.error)})})}};function ft(n,e){return n.transaction([nt],e?"readwrite":"readonly").objectStore(nt)}function ia(){let n=indexedDB.deleteDatabase(_i);return new ee(n).toPromise()}function dn(){let n=indexedDB.open(_i,ra);return new Promise((e,t)=>{n.addEventListener("error",()=>{t(n.error)}),n.addEventListener("upgradeneeded",()=>{let r=n.result;try{r.createObjectStore(nt,{keyPath:vi})}catch(i){t(i)}}),n.addEventListener("success",async()=>{let r=n.result;r.objectStoreNames.contains(nt)?e(r):(r.close(),await ia(),e(await dn()))})})}async function xr(n,e,t){let r=ft(n,!0).put({[vi]:e,value:t});return new ee(r).toPromise()}async function sa(n,e){let t=ft(n,!1).get(e),r=await new ee(t).toPromise();return r===void 0?null:r.value}function Fr(n,e){let t=ft(n,!0).delete(e);return new ee(t).toPromise()}var oa=800,aa=3,rt=class{constructor(){this.type="LOCAL",this._shouldAllowMigration=!0,this.listeners={},this.localCache={},this.pollTimer=null,this.pendingWrites=0,this.receiver=null,this.sender=null,this.serviceWorkerReceiverAvailable=!1,this.activeServiceWorker=null,this._workerInitializationPromise=this.initializeServiceWorkerMessaging().then(()=>{},()=>{})}async _openDb(){return this.db?this.db:(this.db=await dn(),this.db)}async _withRetries(e){let t=0;for(;;)try{let r=await this._openDb();return await e(r)}catch(r){if(t++>aa)throw r;this.db&&(this.db.close(),this.db=void 0)}}async initializeServiceWorkerMessaging(){return gi()?this.initializeReceiver():this.initializeSender()}async initializeReceiver(){this.receiver=tt._getInstance(na()),this.receiver._subscribe("keyChanged",async(e,t)=>({keyProcessed:(await this._poll()).includes(t.key)})),this.receiver._subscribe("ping",async(e,t)=>["keyChanged"])}async initializeSender(){var e,t;if(this.activeServiceWorker=await ea(),!this.activeServiceWorker)return;this.sender=new un(this.activeServiceWorker);let r=await this.sender._send("ping",{},800);r&&!((e=r[0])===null||e===void 0)&&e.fulfilled&&!((t=r[0])===null||t===void 0)&&t.value.includes("keyChanged")&&(this.serviceWorkerReceiverAvailable=!0)}async notifyServiceWorker(e){if(!(!this.sender||!this.activeServiceWorker||ta()!==this.activeServiceWorker))try{await this.sender._send("keyChanged",{key:e},this.serviceWorkerReceiverAvailable?800:50)}catch{}}async _isAvailable(){try{if(!indexedDB)return!1;let e=await dn();return await xr(e,Xe,"1"),await Fr(e,Xe),!0}catch{}return!1}async _withPendingWrite(e){this.pendingWrites++;try{await e()}finally{this.pendingWrites--}}async _set(e,t){return this._withPendingWrite(async()=>(await this._withRetries(r=>xr(r,e,t)),this.localCache[e]=t,this.notifyServiceWorker(e)))}async _get(e){let t=await this._withRetries(r=>sa(r,e));return this.localCache[e]=t,t}async _remove(e){return this._withPendingWrite(async()=>(await this._withRetries(t=>Fr(t,e)),delete this.localCache[e],this.notifyServiceWorker(e)))}async _poll(){let e=await this._withRetries(i=>{let s=ft(i,!1).getAll();return new ee(s).toPromise()});if(!e)return[];if(this.pendingWrites!==0)return[];let t=[],r=new Set;if(e.length!==0)for(let{fbase_key:i,value:s}of e)r.add(i),JSON.stringify(this.localCache[i])!==JSON.stringify(s)&&(this.notifyListeners(i,s),t.push(i));for(let i of Object.keys(this.localCache))this.localCache[i]&&!r.has(i)&&(this.notifyListeners(i,null),t.push(i));return t}notifyListeners(e,t){this.localCache[e]=t;let r=this.listeners[e];if(r)for(let i of Array.from(r))i(t)}startPolling(){this.stopPolling(),this.pollTimer=setInterval(async()=>this._poll(),oa)}stopPolling(){this.pollTimer&&(clearInterval(this.pollTimer),this.pollTimer=null)}_addListener(e,t){Object.keys(this.listeners).length===0&&this.startPolling(),this.listeners[e]||(this.listeners[e]=new Set,this._get(e)),this.listeners[e].add(t)}_removeListener(e,t){this.listeners[e]&&(this.listeners[e].delete(t),this.listeners[e].size===0&&delete this.listeners[e]),Object.keys(this.listeners).length===0&&this.stopPolling()}};rt.type="LOCAL";var Ln=rt;function Vr(n,e){return _(n,"POST","/v2/accounts/mfaSignIn:start",m(n,e))}function ca(n,e){return _(n,"POST","/v2/accounts/mfaSignIn:finalize",m(n,e))}function la(n,e){return _(n,"POST","/v2/accounts/mfaSignIn:finalize",m(n,e))}var hl=li("rcb"),fl=new K(3e4,6e4);var Fe="recaptcha";async function ua(n,e,t){var r;if(!n._getRecaptchaConfig())try{await Ro(n)}catch{console.log("Failed to initialize reCAPTCHA Enterprise config. Triggering the reCAPTCHA v2 verification.")}try{let i;if(typeof e=="string"?i={phoneNumber:e}:i=e,"session"in i){let s=i.session;if("phoneNumber"in i){u(s.type==="enroll",n,"internal-error");let o={idToken:s.credential,phoneEnrollmentInfo:{phoneNumber:i.phoneNumber,clientType:"CLIENT_TYPE_WEB"}};return(await G(n,o,"mfaSmsEnrollment",async(d,h)=>{if(h.phoneEnrollmentInfo.captchaResponse===_e){u((t==null?void 0:t.type)===Fe,d,"argument-error");let p=await Yt(d,h,t);return Ur(d,p)}return Ur(d,h)},"PHONE_PROVIDER").catch(d=>Promise.reject(d))).phoneSessionInfo.sessionInfo}else{u(s.type==="signin",n,"internal-error");let o=((r=i.multiFactorHint)===null||r===void 0?void 0:r.uid)||i.multiFactorUid;u(o,n,"missing-multi-factor-info");let c={mfaPendingCredential:s.credential,mfaEnrollmentId:o,phoneSignInInfo:{clientType:"CLIENT_TYPE_WEB"}};return(await G(n,c,"mfaSmsSignIn",async(h,p)=>{if(p.phoneSignInInfo.captchaResponse===_e){u((t==null?void 0:t.type)===Fe,h,"argument-error");let S=await Yt(h,p,t);return Vr(h,S)}return Vr(h,p)},"PHONE_PROVIDER").catch(h=>Promise.reject(h))).phoneResponseInfo.sessionInfo}}else{let s={phoneNumber:i.phoneNumber,clientType:"CLIENT_TYPE_WEB"};return(await G(n,s,"sendVerificationCode",async(l,d)=>{if(d.captchaResponse===_e){u((t==null?void 0:t.type)===Fe,l,"argument-error");let h=await Yt(l,d,t);return Lr(l,h)}return Lr(l,d)},"PHONE_PROVIDER").catch(l=>Promise.reject(l))).sessionInfo}}finally{t==null||t._reset()}}async function Yt(n,e,t){u(t.type===Fe,n,"argument-error");let r=await t.verify();u(typeof r=="string",n,"argument-error");let i=Object.assign({},e);if("phoneEnrollmentInfo"in i){let s=i.phoneEnrollmentInfo.phoneNumber,o=i.phoneEnrollmentInfo.captchaResponse,c=i.phoneEnrollmentInfo.clientType,a=i.phoneEnrollmentInfo.recaptchaVersion;return Object.assign(i,{phoneEnrollmentInfo:{phoneNumber:s,recaptchaToken:r,captchaResponse:o,clientType:c,recaptchaVersion:a}}),i}else if("phoneSignInInfo"in i){let s=i.phoneSignInInfo.captchaResponse,o=i.phoneSignInInfo.clientType,c=i.phoneSignInInfo.recaptchaVersion;return Object.assign(i,{phoneSignInInfo:{recaptchaToken:r,captchaResponse:s,clientType:o,recaptchaVersion:c}}),i}else return Object.assign(i,{recaptchaToken:r}),i}var Ae=class n{constructor(e){this.providerId=n.PROVIDER_ID,this.auth=A(e)}verifyPhoneNumber(e,t){return ua(this.auth,e,I(t))}static credential(e,t){return ye._fromVerification(e,t)}static credentialFromResult(e){let t=e;return n.credentialFromTaggedObject(t)}static credentialFromError(e){return n.credentialFromTaggedObject(e.customData||{})}static credentialFromTaggedObject({_tokenResponse:e}){if(!e)return null;let{phoneNumber:t,temporaryProof:r}=e;return t&&r?ye._fromTokenResponse(t,r):null}};Ae.PROVIDER_ID="phone";Ae.PHONE_SIGN_IN_METHOD="phone";function pt(n,e){return e?x(e):(u(n._popupRedirectResolver,n,"argument-error"),n._popupRedirectResolver)}var Se=class extends J{constructor(e){super("custom","custom"),this.params=e}_getIdTokenResponse(e){return ae(e,this._buildIdpRequest())}_linkToIdToken(e,t){return ae(e,this._buildIdpRequest(t))}_getReauthenticationResolver(e){return ae(e,this._buildIdpRequest())}_buildIdpRequest(e){let t={requestUri:this.params.requestUri,sessionId:this.params.sessionId,postBody:this.params.postBody,tenantId:this.params.tenantId,pendingToken:this.params.pendingToken,returnSecureToken:!0,returnIdpCredential:!0};return e&&(t.idToken=e),t}};function da(n){return hi(n.auth,new Se(n),n.bypassAuthState)}function ha(n){let{auth:e,user:t}=n;return u(t,e,"internal-error"),di(t,new Se(n),n.bypassAuthState)}async function fa(n){let{auth:e,user:t}=n;return u(t,e,"internal-error"),$o(t,new Se(n),n.bypassAuthState)}var it=class{constructor(e,t,r,i,s=!1){this.auth=e,this.resolver=r,this.user=i,this.bypassAuthState=s,this.pendingPromise=null,this.eventManager=null,this.filter=Array.isArray(t)?t:[t]}execute(){return new Promise(async(e,t)=>{this.pendingPromise={resolve:e,reject:t};try{this.eventManager=await this.resolver._initialize(this.auth),await this.onExecution(),this.eventManager.registerConsumer(this)}catch(r){this.reject(r)}})}async onAuthEvent(e){let{urlResponse:t,sessionId:r,postBody:i,tenantId:s,error:o,type:c}=e;if(o){this.reject(o);return}let a={auth:this.auth,requestUri:t,sessionId:r,tenantId:s||void 0,postBody:i||void 0,user:this.user,bypassAuthState:this.bypassAuthState};try{this.resolve(await this.getIdpTask(c)(a))}catch(l){this.reject(l)}}onError(e){this.reject(e)}getIdpTask(e){switch(e){case"signInViaPopup":case"signInViaRedirect":return da;case"linkViaPopup":case"linkViaRedirect":return fa;case"reauthViaPopup":case"reauthViaRedirect":return ha;default:b(this.auth,"internal-error")}}resolve(e){F(this.pendingPromise,"Pending promise was never set"),this.pendingPromise.resolve(e),this.unregisterAndCleanUp()}reject(e){F(this.pendingPromise,"Pending promise was never set"),this.pendingPromise.reject(e),this.unregisterAndCleanUp()}unregisterAndCleanUp(){this.eventManager&&this.eventManager.unregisterConsumer(this),this.pendingPromise=null,this.cleanUp()}};var pa=new K(2e3,1e4);async function Mn(n,e,t){if(E(n.app))return Promise.reject(T(n,"operation-not-supported-in-this-environment"));let r=A(n);vn(n,e,X);let i=pt(r,t);return new ke(r,"signInViaPopup",e,i).executeNotNull()}async function Un(n,e,t){let r=I(n);if(E(r.auth.app))return Promise.reject(T(r.auth,"operation-not-supported-in-this-environment"));vn(r.auth,e,X);let i=pt(r.auth,t);return new ke(r.auth,"reauthViaPopup",e,i,r).executeNotNull()}var ke=class n extends it{constructor(e,t,r,i,s){super(e,t,i,s),this.provider=r,this.authWindow=null,this.pollId=null,n.currentPopupAction&&n.currentPopupAction.cancel(),n.currentPopupAction=this}async executeNotNull(){let e=await this.execute();return u(e,this.auth,"internal-error"),e}async onExecution(){F(this.filter.length===1,"Popup operations only handle one event");let e=Dn();this.authWindow=await this.resolver._openPopup(this.auth,this.provider,this.filter[0],e),this.authWindow.associatedEvent=e,this.resolver._originValidation(this.auth).catch(t=>{this.reject(t)}),this.resolver._isIframeWebStorageSupported(this.auth,t=>{t||this.reject(T(this.auth,"web-storage-unsupported"))}),this.pollUserCancellation()}get eventId(){var e;return((e=this.authWindow)===null||e===void 0?void 0:e.associatedEvent)||null}cancel(){this.reject(T(this.auth,"cancelled-popup-request"))}cleanUp(){this.authWindow&&this.authWindow.close(),this.pollId&&window.clearTimeout(this.pollId),this.authWindow=null,this.pollId=null,n.currentPopupAction=null}pollUserCancellation(){let e=()=>{var t,r;if(!((r=(t=this.authWindow)===null||t===void 0?void 0:t.window)===null||r===void 0)&&r.closed){this.pollId=window.setTimeout(()=>{this.pollId=null,this.reject(T(this.auth,"popup-closed-by-user"))},8e3);return}this.pollId=window.setTimeout(e,pa.get())};e()}};ke.currentPopupAction=null;var ma="pendingRedirect",Ve=new Map,hn=class extends it{constructor(e,t,r=!1){super(e,["signInViaRedirect","linkViaRedirect","reauthViaRedirect","unknown"],t,void 0,r),this.eventId=null}async execute(){let e=Ve.get(this.auth._key());if(!e){try{let r=await ga(this.resolver,this.auth)?await super.execute():null;e=()=>Promise.resolve(r)}catch(t){e=()=>Promise.reject(t)}Ve.set(this.auth._key(),e)}return this.bypassAuthState||Ve.set(this.auth._key(),()=>Promise.resolve(null)),e()}async onAuthEvent(e){if(e.type==="signInViaRedirect")return super.onAuthEvent(e);if(e.type==="unknown"){this.resolve(null);return}if(e.eventId){let t=await this.auth._redirectUserForId(e.eventId);if(t)return this.user=t,super.onAuthEvent(e);this.resolve(null)}}async onExecution(){}cleanUp(){}};async function ga(n,e){let t=Ei(e),r=Ii(n);if(!await r._isAvailable())return!1;let i=await r._get(t)==="true";return await r._remove(t),i}async function _a(n,e){return Ii(n)._set(Ei(e),"true")}function va(n,e){Ve.set(n._key(),e)}function Ii(n){return x(n._redirectPersistence)}function Ei(n){return xe(ma,n.config.apiKey,n.name)}function xn(n,e,t){return Ia(n,e,t)}async function Ia(n,e,t){if(E(n.app))return Promise.reject(N(n));let r=A(n);vn(n,e,X),await r._initializationPromise;let i=pt(r,t);return await _a(i,r),i._openRedirect(r,e,"signInViaRedirect")}async function Fn(n,e){return await A(n)._initializationPromise,yi(n,e,!1)}async function yi(n,e,t=!1){if(E(n.app))return Promise.reject(N(n));let r=A(n),i=pt(r,e),o=await new hn(r,i,t).execute();return o&&!t&&(delete o.user._redirectEventId,await r._persistUserIfCurrent(o.user),await r._setRedirectUser(null,e)),o}var Ea=10*60*1e3,fn=class{constructor(e){this.auth=e,this.cachedEventUids=new Set,this.consumers=new Set,this.queuedRedirectEvent=null,this.hasHandledPotentialRedirect=!1,this.lastProcessedEventTime=Date.now()}registerConsumer(e){this.consumers.add(e),this.queuedRedirectEvent&&this.isEventForConsumer(this.queuedRedirectEvent,e)&&(this.sendToConsumer(this.queuedRedirectEvent,e),this.saveEventToCache(this.queuedRedirectEvent),this.queuedRedirectEvent=null)}unregisterConsumer(e){this.consumers.delete(e)}onEvent(e){if(this.hasEventBeenHandled(e))return!1;let t=!1;return this.consumers.forEach(r=>{this.isEventForConsumer(e,r)&&(t=!0,this.sendToConsumer(e,r),this.saveEventToCache(e))}),this.hasHandledPotentialRedirect||!ya(e)||(this.hasHandledPotentialRedirect=!0,t||(this.queuedRedirectEvent=e,t=!0)),t}sendToConsumer(e,t){var r;if(e.error&&!wi(e)){let i=((r=e.error.code)===null||r===void 0?void 0:r.split("auth/")[1])||"internal-error";t.onError(T(this.auth,i))}else t.onAuthEvent(e)}isEventForConsumer(e,t){let r=t.eventId===null||!!e.eventId&&e.eventId===t.eventId;return t.filter.includes(e.type)&&r}hasEventBeenHandled(e){return Date.now()-this.lastProcessedEventTime>=Ea&&this.cachedEventUids.clear(),this.cachedEventUids.has(Hr(e))}saveEventToCache(e){this.cachedEventUids.add(Hr(e)),this.lastProcessedEventTime=Date.now()}};function Hr(n){return[n.type,n.eventId,n.sessionId,n.tenantId].filter(e=>e).join("-")}function wi({type:n,error:e}){return n==="unknown"&&(e==null?void 0:e.code)==="auth/no-auth-event"}function ya(n){switch(n.type){case"signInViaRedirect":case"linkViaRedirect":case"reauthViaRedirect":return!0;case"unknown":return wi(n);default:return!1}}async function wa(n,e={}){return _(n,"GET","/v1/projects",e)}var Ta=/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,ba=/^https?/;async function Aa(n){if(n.config.emulator)return;let{authorizedDomains:e}=await wa(n);for(let t of e)try{if(Sa(t))return}catch{}b(n,"unauthorized-domain")}function Sa(n){let e=Qt(),{protocol:t,hostname:r}=new URL(e);if(n.startsWith("chrome-extension://")){let o=new URL(n);return o.hostname===""&&r===""?t==="chrome-extension:"&&n.replace("chrome-extension://","")===e.replace("chrome-extension://",""):t==="chrome-extension:"&&o.hostname===r}if(!ba.test(t))return!1;if(Ta.test(n))return r===n;let i=n.replace(/\./g,"\\.");return new RegExp("^(.+\\."+i+"|"+i+")$","i").test(r)}var ka=new K(3e4,6e4);function Wr(){let n=D().___jsl;if(n!=null&&n.H){for(let e of Object.keys(n.H))if(n.H[e].r=n.H[e].r||[],n.H[e].L=n.H[e].L||[],n.H[e].r=[...n.H[e].L],n.CP)for(let t=0;t<n.CP.length;t++)n.CP[t]=null}}function Ra(n){return new Promise((e,t)=>{var r,i,s;function o(){Wr(),gapi.load("gapi.iframes",{callback:()=>{e(gapi.iframes.getContext())},ontimeout:()=>{Wr(),t(T(n,"network-request-failed"))},timeout:ka.get()})}if(!((i=(r=D().gapi)===null||r===void 0?void 0:r.iframes)===null||i===void 0)&&i.Iframe)e(gapi.iframes.getContext());else if(!((s=D().gapi)===null||s===void 0)&&s.load)o();else{let c=li("iframefcb");return D()[c]=()=>{gapi.load?o():t(T(n,"network-request-failed"))},ci(`${So()}?onload=${c}`).catch(a=>t(a))}}).catch(e=>{throw He=null,e})}var He=null;function Pa(n){return He=He||Ra(n),He}var Ca=new K(5e3,15e3),Oa="__/auth/iframe",Na="emulator/auth/iframe",Da={style:{position:"absolute",top:"-100px",width:"1px",height:"1px"},"aria-hidden":"true",tabindex:"-1"},La=new Map([["identitytoolkit.googleapis.com","p"],["staging-identitytoolkit.sandbox.googleapis.com","s"],["test-identitytoolkit.sandbox.googleapis.com","t"]]);function Ma(n){let e=n.config;u(e.authDomain,n,"auth-domain-config-required");let t=e.emulator?En(e,Na):`https://${n.config.authDomain}/${Oa}`,r={apiKey:e.apiKey,appName:n.name,v:oe},i=La.get(n.config.apiHost);i&&(r.eid=i);let s=n._getFrameworks();return s.length&&(r.fw=s.join(",")),`${t}?${re(r).slice(1)}`}async function Ua(n){let e=await Pa(n),t=D().gapi;return u(t,n,"internal-error"),e.open({where:document.body,url:Ma(n),messageHandlersFilter:t.iframes.CROSS_ORIGIN_IFRAMES_FILTER,attributes:Da,dontclear:!0},r=>new Promise(async(i,s)=>{await r.restyle({setHideOnLeave:!1});let o=T(n,"network-request-failed"),c=D().setTimeout(()=>{s(o)},Ca.get());function a(){D().clearTimeout(c),i(r)}r.ping(a).then(a,()=>{s(o)})}))}var xa={location:"yes",resizable:"yes",statusbar:"yes",toolbar:"no"},Fa=500,Va=600,Ha="_blank",Wa="http://localhost",st=class{constructor(e){this.window=e,this.associatedEvent=null}close(){if(this.window)try{this.window.close()}catch{}}};function ja(n,e,t,r=Fa,i=Va){let s=Math.max((window.screen.availHeight-i)/2,0).toString(),o=Math.max((window.screen.availWidth-r)/2,0).toString(),c="",a=Object.assign(Object.assign({},xa),{width:r.toString(),height:i.toString(),top:s,left:o}),l=v().toLowerCase();t&&(c=ti(l)?Ha:t),Zr(l)&&(e=e||Wa,a.scrollbars="yes");let d=Object.entries(a).reduce((p,[S,te])=>`${p}${S}=${te},`,"");if(Eo(l)&&c!=="_self")return Ba(e||"",c),new st(null);let h=window.open(e||"",c,d);u(h,n,"popup-blocked");try{h.focus()}catch{}return new st(h)}function Ba(n,e){let t=document.createElement("a");t.href=n,t.target=e;let r=document.createEvent("MouseEvent");r.initMouseEvent("click",!0,!0,window,1,0,0,0,0,!1,!1,!1,!1,1,null),t.dispatchEvent(r)}var $a="__/auth/handler",za="emulator/auth/handler",qa=encodeURIComponent("fac");async function jr(n,e,t,r,i,s){u(n.config.authDomain,n,"auth-domain-config-required"),u(n.config.apiKey,n,"invalid-api-key");let o={apiKey:n.config.apiKey,appName:n.name,authType:t,redirectUrl:r,v:oe,eventId:i};if(e instanceof X){e.setDefaultLanguage(n.languageCode),o.providerId=e.providerId||"",hr(e.getCustomParameters())||(o.customParameters=JSON.stringify(e.getCustomParameters()));for(let[d,h]of Object.entries(s||{}))o[d]=h}if(e instanceof Q){let d=e.getScopes().filter(h=>h!=="");d.length>0&&(o.scopes=d.join(","))}n.tenantId&&(o.tid=n.tenantId);let c=o;for(let d of Object.keys(c))c[d]===void 0&&delete c[d];let a=await n._getAppCheckToken(),l=a?`#${qa}=${encodeURIComponent(a)}`:"";return`${Ga(n)}?${re(c).slice(1)}${l}`}function Ga({config:n}){return n.emulator?En(n,za):`https://${n.authDomain}/${$a}`}var Xt="webStorageSupport",pn=class{constructor(){this.eventManagers={},this.iframes={},this.originValidationPromises={},this._redirectPersistence=mi,this._completeRedirectFn=yi,this._overrideRedirectResult=va}async _openPopup(e,t,r,i){var s;F((s=this.eventManagers[e._key()])===null||s===void 0?void 0:s.manager,"_initialize() not called before _openPopup()");let o=await jr(e,t,r,Qt(),i);return ja(e,o,Dn())}async _openRedirect(e,t,r,i){await this._originValidation(e);let s=await jr(e,t,r,Qt(),i);return Zo(s),new Promise(()=>{})}_initialize(e){let t=e._key();if(this.eventManagers[t]){let{manager:i,promise:s}=this.eventManagers[t];return i?Promise.resolve(i):(F(s,"If manager is not set, promise should be"),s)}let r=this.initAndGetManager(e);return this.eventManagers[t]={promise:r},r.catch(()=>{delete this.eventManagers[t]}),r}async initAndGetManager(e){let t=await Ua(e),r=new fn(e);return t.register("authEvent",i=>(u(i==null?void 0:i.authEvent,e,"invalid-auth-event"),{status:r.onEvent(i.authEvent)?"ACK":"ERROR"}),gapi.iframes.CROSS_ORIGIN_IFRAMES_FILTER),this.eventManagers[e._key()]={manager:r},this.iframes[e._key()]=t,r}_isIframeWebStorageSupported(e,t){this.iframes[e._key()].send(Xt,{type:Xt},i=>{var s;let o=(s=i==null?void 0:i[0])===null||s===void 0?void 0:s[Xt];o!==void 0&&t(!!o),b(e,"internal-error")},gapi.iframes.CROSS_ORIGIN_IFRAMES_FILTER)}_originValidation(e){let t=e._key();return this.originValidationPromises[t]||(this.originValidationPromises[t]=Aa(e)),this.originValidationPromises[t]}get _shouldInitProactively(){return oi()||ei()||wn()}},Vn=pn,ot=class{constructor(e){this.factorId=e}_process(e,t,r){switch(t.type){case"enroll":return this._finalizeEnroll(e,t.credential,r);case"signin":return this._finalizeSignIn(e,t.credential);default:return O("unexpected MultiFactorSessionType")}}},mn=class n extends ot{constructor(e){super("phone"),this.credential=e}static _fromCredential(e){return new n(e)}_finalizeEnroll(e,t,r){return qo(e,{idToken:t,displayName:r,phoneVerificationInfo:this.credential._makeVerificationRequest()})}_finalizeSignIn(e,t){return ca(e,{mfaPendingCredential:t,phoneVerificationInfo:this.credential._makeVerificationRequest()})}},at=class{constructor(){}static assertion(e){return mn._fromCredential(e)}};at.FACTOR_ID="phone";var ct=class{static assertionForEnrollment(e,t){return lt._fromSecret(e,t)}static assertionForSignIn(e,t){return lt._fromEnrollmentId(e,t)}static async generateSecret(e){var t;let r=e;u(typeof((t=r.user)===null||t===void 0?void 0:t.auth)!="undefined","internal-error");let i=await Go(r.user.auth,{idToken:r.credential,totpEnrollmentInfo:{}});return ut._fromStartTotpMfaEnrollmentResponse(i,r.user.auth)}};ct.FACTOR_ID="totp";var lt=class n extends ot{constructor(e,t,r){super("totp"),this.otp=e,this.enrollmentId=t,this.secret=r}static _fromSecret(e,t){return new n(t,void 0,e)}static _fromEnrollmentId(e,t){return new n(t,e)}async _finalizeEnroll(e,t,r){return u(typeof this.secret!="undefined",e,"argument-error"),Ko(e,{idToken:t,displayName:r,totpVerificationInfo:this.secret._makeTotpVerificationInfo(this.otp)})}async _finalizeSignIn(e,t){u(this.enrollmentId!==void 0&&this.otp!==void 0,e,"argument-error");let r={verificationCode:this.otp};return la(e,{mfaPendingCredential:t,mfaEnrollmentId:this.enrollmentId,totpVerificationInfo:r})}},ut=class n{constructor(e,t,r,i,s,o,c){this.sessionInfo=o,this.auth=c,this.secretKey=e,this.hashingAlgorithm=t,this.codeLength=r,this.codeIntervalSeconds=i,this.enrollmentCompletionDeadline=s}static _fromStartTotpMfaEnrollmentResponse(e,t){return new n(e.totpSessionInfo.sharedSecretKey,e.totpSessionInfo.hashingAlgorithm,e.totpSessionInfo.verificationCodeLength,e.totpSessionInfo.periodSec,new Date(e.totpSessionInfo.finalizeEnrollmentTime).toUTCString(),e.totpSessionInfo.sessionInfo,t)}_makeTotpVerificationInfo(e){return{sessionInfo:this.sessionInfo,verificationCode:e}}generateQrCodeUrl(e,t){var r;let i=!1;return(Me(e)||Me(t))&&(i=!0),i&&(Me(e)&&(e=((r=this.auth.currentUser)===null||r===void 0?void 0:r.email)||"unknownuser"),Me(t)&&(t=this.auth.name)),`otpauth://totp/${t}:${e}?secret=${this.secretKey}&issuer=${t}&algorithm=${this.hashingAlgorithm}&digits=${this.codeLength}`}};function Me(n){return typeof n=="undefined"||(n==null?void 0:n.length)===0}var Br="@firebase/auth",$r="1.10.8";var gn=class{constructor(e){this.auth=e,this.internalListeners=new Map}getUid(){var e;return this.assertAuthConfigured(),((e=this.auth.currentUser)===null||e===void 0?void 0:e.uid)||null}async getToken(e){return this.assertAuthConfigured(),await this.auth._initializationPromise,this.auth.currentUser?{accessToken:await this.auth.currentUser.getIdToken(e)}:null}addAuthTokenListener(e){if(this.assertAuthConfigured(),this.internalListeners.has(e))return;let t=this.auth.onIdTokenChanged(r=>{e((r==null?void 0:r.stsTokenManager.accessToken)||null)});this.internalListeners.set(e,t),this.updateProactiveRefresh()}removeAuthTokenListener(e){this.assertAuthConfigured();let t=this.internalListeners.get(e);t&&(this.internalListeners.delete(e),t(),this.updateProactiveRefresh())}assertAuthConfigured(){u(this.auth._initializationPromise,"dependent-sdk-initialized-before-auth")}updateProactiveRefresh(){this.internalListeners.size>0?this.auth._startProactiveRefresh():this.auth._stopProactiveRefresh()}};function Ka(n){switch(n){case"Node":return"node";case"ReactNative":return"rn";case"Worker":return"webworker";case"Cordova":return"cordova";case"WebExtension":return"web-extension";default:return}}function Ja(n){U(new w("auth",(e,{options:t})=>{let r=e.getProvider("app").getImmediate(),i=e.getProvider("heartbeat"),s=e.getProvider("app-check-internal"),{apiKey:o,authDomain:c}=r.options;u(o&&!o.includes(":"),"invalid-api-key",{appName:r.name});let a={apiKey:o,authDomain:c,clientPlatform:n,apiHost:"identitytoolkit.googleapis.com",tokenApiHost:"securetoken.googleapis.com",apiScheme:"https",sdkClientVersion:ai(n)},l=new sn(r,i,s,a);return Po(l,t),l},"PUBLIC").setInstantiationMode("EXPLICIT").setInstanceCreatedCallback((e,t,r)=>{e.getProvider("auth-internal").initialize()})),U(new w("auth-internal",e=>{let t=A(e.getProvider("auth").getImmediate());return(r=>new gn(r))(t)},"PRIVATE").setInstantiationMode("EXPLICIT")),C(Br,$r,Ka(n)),C(Br,$r,"esm2017")}var Ya=5*60,pl=sr("authIdTokenMaxAge")||Ya;function Xa(){var n,e;return(e=(n=document.getElementsByTagName("head"))===null||n===void 0?void 0:n[0])!==null&&e!==void 0?e:document}bo({loadJS(n){return new Promise((e,t)=>{let r=document.createElement("script");r.setAttribute("src",n),r.onload=e,r.onerror=i=>{let s=T("internal-error");s.customData=i,t(s)},r.type="text/javascript",r.charset="UTF-8",Xa().appendChild(r)})},gapiScript:"https://apis.google.com/js/api.js",recaptchaV2Script:"https://www.google.com/recaptcha/api.js",recaptchaEnterpriseScript:"https://www.google.com/recaptcha/enterprise.js?render="});Ja("Browser");var jn=new Map,Ri={activated:!1,tokenObservers:[]},Qa={initialized:!1,enabled:!1};function g(n){return jn.get(n)||Object.assign({},Ri)}function Za(n,e){return jn.set(n,e),jn.get(n)}function It(){return Qa}var Pi="https://content-firebaseappcheck.googleapis.com/v1",ec="exchangeRecaptchaV3Token";var tc="exchangeDebugToken",Ti={OFFSET_DURATION:5*60*1e3,RETRIAL_MIN_WAIT:30*1e3,RETRIAL_MAX_WAIT:16*60*1e3},nc=24*60*60*1e3;var Bn=class{constructor(e,t,r,i,s){if(this.operation=e,this.retryPolicy=t,this.getWaitDuration=r,this.lowerBound=i,this.upperBound=s,this.pending=null,this.nextErrorWaitInterval=i,i>s)throw new Error("Proactive refresh lower bound greater than upper bound!")}start(){this.nextErrorWaitInterval=this.lowerBound,this.process(!0).catch(()=>{})}stop(){this.pending&&(this.pending.reject("cancelled"),this.pending=null)}isRunning(){return!!this.pending}async process(e){this.stop();try{this.pending=new L,this.pending.promise.catch(t=>{}),await rc(this.getNextRun(e)),this.pending.resolve(),await this.pending.promise,this.pending=new L,this.pending.promise.catch(t=>{}),await this.operation(),this.pending.resolve(),await this.pending.promise,this.process(!0).catch(()=>{})}catch(t){this.retryPolicy(t)?this.process(!1).catch(()=>{}):this.stop()}}getNextRun(e){if(e)return this.nextErrorWaitInterval=this.lowerBound,this.getWaitDuration();{let t=this.nextErrorWaitInterval;return this.nextErrorWaitInterval*=2,this.nextErrorWaitInterval>this.upperBound&&(this.nextErrorWaitInterval=this.upperBound),t}}};function rc(n){return new Promise(e=>{setTimeout(e,n)})}var ic={"already-initialized":"You have already called initializeAppCheck() for FirebaseApp {$appName} with different options. To avoid this error, call initializeAppCheck() with the same options as when it was originally called. This will return the already initialized instance.","use-before-activation":"App Check is being used before initializeAppCheck() is called for FirebaseApp {$appName}. Call initializeAppCheck() before instantiating other Firebase services.","fetch-network-error":"Fetch failed to connect to a network. Check Internet connection. Original error: {$originalErrorMessage}.","fetch-parse-error":"Fetch client could not parse response. Original error: {$originalErrorMessage}.","fetch-status-error":"Fetch server returned an HTTP error status. HTTP status: {$httpStatus}.","storage-open":"Error thrown when opening storage. Original error: {$originalErrorMessage}.","storage-get":"Error thrown when reading from storage. Original error: {$originalErrorMessage}.","storage-set":"Error thrown when writing to storage. Original error: {$originalErrorMessage}.","recaptcha-error":"ReCAPTCHA error.","initial-throttle":"{$httpStatus} error. Attempts allowed again after {$time}",throttled:"Requests throttled due to previous {$httpStatus} error. Attempts allowed again after {$time}"},y=new R("appCheck","AppCheck",ic);function bi(n=!1){var e;return n?(e=self.grecaptcha)===null||e===void 0?void 0:e.enterprise:self.grecaptcha}function zn(n){if(!g(n).activated)throw y.create("use-before-activation",{appName:n.name})}function Ci(n){let e=Math.round(n/1e3),t=Math.floor(e/(3600*24)),r=Math.floor((e-t*3600*24)/3600),i=Math.floor((e-t*3600*24-r*3600)/60),s=e-t*3600*24-r*3600-i*60,o="";return t&&(o+=mt(t)+"d:"),r&&(o+=mt(r)+"h:"),o+=mt(i)+"m:"+mt(s)+"s",o}function mt(n){return n===0?"00":n>=10?n.toString():"0"+n}async function qn({url:n,body:e},t){let r={"Content-Type":"application/json"},i=t.getImmediate({optional:!0});if(i){let h=await i.getHeartbeatsHeader();h&&(r["X-Firebase-Client"]=h)}let s={method:"POST",body:JSON.stringify(e),headers:r},o;try{o=await fetch(n,s)}catch(h){throw y.create("fetch-network-error",{originalErrorMessage:h==null?void 0:h.message})}if(o.status!==200)throw y.create("fetch-status-error",{httpStatus:o.status});let c;try{c=await o.json()}catch(h){throw y.create("fetch-parse-error",{originalErrorMessage:h==null?void 0:h.message})}let a=c.ttl.match(/^([\d.]+)(s)$/);if(!a||!a[2]||isNaN(Number(a[1])))throw y.create("fetch-parse-error",{originalErrorMessage:`ttl field (timeToLive) is not in standard Protobuf Duration format: ${c.ttl}`});let l=Number(a[1])*1e3,d=Date.now();return{token:c.token,expireTimeMillis:d+l,issuedAtTimeMillis:d}}function sc(n,e){let{projectId:t,appId:r,apiKey:i}=n.options;return{url:`${Pi}/projects/${t}/apps/${r}:${ec}?key=${i}`,body:{recaptcha_v3_token:e}}}function Oi(n,e){let{projectId:t,appId:r,apiKey:i}=n.options;return{url:`${Pi}/projects/${t}/apps/${r}:${tc}?key=${i}`,body:{debug_token:e}}}var oc="firebase-app-check-database",ac=1,Re="firebase-app-check-store",Ni="debug-token",gt=null;function Di(){return gt||(gt=new Promise((n,e)=>{try{let t=indexedDB.open(oc,ac);t.onsuccess=r=>{n(r.target.result)},t.onerror=r=>{var i;e(y.create("storage-open",{originalErrorMessage:(i=r.target.error)===null||i===void 0?void 0:i.message}))},t.onupgradeneeded=r=>{let i=r.target.result;switch(r.oldVersion){case 0:i.createObjectStore(Re,{keyPath:"compositeKey"})}}}catch(t){e(y.create("storage-open",{originalErrorMessage:t==null?void 0:t.message}))}}),gt)}function cc(n){return Mi(Ui(n))}function lc(n,e){return Li(Ui(n),e)}function uc(n){return Li(Ni,n)}function dc(){return Mi(Ni)}async function Li(n,e){let r=(await Di()).transaction(Re,"readwrite"),s=r.objectStore(Re).put({compositeKey:n,value:e});return new Promise((o,c)=>{s.onsuccess=a=>{o()},r.onerror=a=>{var l;c(y.create("storage-set",{originalErrorMessage:(l=a.target.error)===null||l===void 0?void 0:l.message}))}})}async function Mi(n){let t=(await Di()).transaction(Re,"readonly"),i=t.objectStore(Re).get(n);return new Promise((s,o)=>{i.onsuccess=c=>{let a=c.target.result;s(a?a.value:void 0)},t.onerror=c=>{var a;o(y.create("storage-get",{originalErrorMessage:(a=c.target.error)===null||a===void 0?void 0:a.message}))}})}function Ui(n){return`${n.options.appId}-${n.name}`}var z=new H("@firebase/app-check");async function hc(n){if(ue()){let e;try{e=await cc(n)}catch(t){z.warn(`Failed to read token from IndexedDB. Error: ${t}`)}return e}}function Hn(n,e){return ue()?lc(n,e).catch(t=>{z.warn(`Failed to write token to IndexedDB. Error: ${t}`)}):Promise.resolve()}async function fc(){let n;try{n=await dc()}catch{}if(n)return n;{let e=crypto.randomUUID();return uc(e).catch(t=>z.warn(`Failed to persist debug token to IndexedDB. Error: ${t}`)),e}}function Gn(){return It().enabled}async function Kn(){let n=It();if(n.enabled&&n.token)return n.token.promise;throw Error(`
            Can't get debug token in production mode.
        `)}function pc(){let n=Rt(),e=It();if(e.initialized=!0,typeof n.FIREBASE_APPCHECK_DEBUG_TOKEN!="string"&&n.FIREBASE_APPCHECK_DEBUG_TOKEN!==!0)return;e.enabled=!0;let t=new L;e.token=t,typeof n.FIREBASE_APPCHECK_DEBUG_TOKEN=="string"?t.resolve(n.FIREBASE_APPCHECK_DEBUG_TOKEN):t.resolve(fc())}var mc={error:"UNKNOWN_ERROR"};function gc(n){return Pe.encodeString(JSON.stringify(n),!1)}async function _t(n,e=!1,t=!1){let r=n.app;zn(r);let i=g(r),s=i.token,o;if(s&&!le(s)&&(i.token=void 0,s=void 0),!s){let l=await i.cachedTokenPromise;l&&(le(l)?s=l:await Hn(r,void 0))}if(!e&&s&&le(s))return{token:s.token};let c=!1;if(Gn())try{i.exchangeTokenPromise||(i.exchangeTokenPromise=qn(Oi(r,await Kn()),n.heartbeatServiceProvider).finally(()=>{i.exchangeTokenPromise=void 0}),c=!0);let l=await i.exchangeTokenPromise;return await Hn(r,l),i.token=l,{token:l.token}}catch(l){return l.code==="appCheck/throttled"||l.code==="appCheck/initial-throttle"?z.warn(l.message):t&&z.error(l),Wn(l)}try{i.exchangeTokenPromise||(i.exchangeTokenPromise=i.provider.getToken().finally(()=>{i.exchangeTokenPromise=void 0}),c=!0),s=await g(r).exchangeTokenPromise}catch(l){l.code==="appCheck/throttled"||l.code==="appCheck/initial-throttle"?z.warn(l.message):t&&z.error(l),o=l}let a;return s?o?le(s)?a={token:s.token,internalError:o}:a=Wn(o):(a={token:s.token},i.token=s,await Hn(r,s)):a=Wn(o),c&&Vi(r,a),a}async function _c(n){let e=n.app;zn(e);let{provider:t}=g(e);if(Gn()){let r=await Kn(),{token:i}=await qn(Oi(e,r),n.heartbeatServiceProvider);return{token:i}}else{let{token:r}=await t.getToken();return{token:r}}}function xi(n,e,t,r){let{app:i}=n,s=g(i),o={next:t,error:r,type:e};if(s.tokenObservers=[...s.tokenObservers,o],s.token&&le(s.token)){let c=s.token;Promise.resolve().then(()=>{t({token:c.token}),Ai(n)}).catch(()=>{})}s.cachedTokenPromise.then(()=>Ai(n))}function Fi(n,e){let t=g(n),r=t.tokenObservers.filter(i=>i.next!==e);r.length===0&&t.tokenRefresher&&t.tokenRefresher.isRunning()&&t.tokenRefresher.stop(),t.tokenObservers=r}function Ai(n){let{app:e}=n,t=g(e),r=t.tokenRefresher;r||(r=vc(n),t.tokenRefresher=r),!r.isRunning()&&t.isTokenAutoRefreshEnabled&&r.start()}function vc(n){let{app:e}=n;return new Bn(async()=>{let t=g(e),r;if(t.token?r=await _t(n,!0):r=await _t(n),r.error)throw r.error;if(r.internalError)throw r.internalError},()=>!0,()=>{let t=g(e);if(t.token){let r=t.token.issuedAtTimeMillis+(t.token.expireTimeMillis-t.token.issuedAtTimeMillis)*.5+3e5,i=t.token.expireTimeMillis-5*60*1e3;return r=Math.min(r,i),Math.max(0,r-Date.now())}else return 0},Ti.RETRIAL_MIN_WAIT,Ti.RETRIAL_MAX_WAIT)}function Vi(n,e){let t=g(n).tokenObservers;for(let r of t)try{r.type==="EXTERNAL"&&e.error!=null?r.error(e.error):r.next(e)}catch{}}function le(n){return n.expireTimeMillis-Date.now()>0}function Wn(n){return{token:gc(mc),error:n}}var $n=class{constructor(e,t){this.app=e,this.heartbeatServiceProvider=t}_delete(){let{tokenObservers:e}=g(this.app);for(let t of e)Fi(this.app,t.next);return Promise.resolve()}};function Ic(n,e){return new $n(n,e)}function Ec(n){return{getToken:e=>_t(n,e),getLimitedUseToken:()=>_c(n),addTokenListener:e=>xi(n,"INTERNAL",e),removeTokenListener:e=>Fi(n.app,e)}}var yc="@firebase/app-check",wc="0.10.1";var Tc="https://www.google.com/recaptcha/api.js";function bc(n,e){let t=new L,r=g(n);r.reCAPTCHAState={initialized:t};let i=Ac(n),s=bi(!1);return s?Si(n,e,s,i,t):Rc(()=>{let o=bi(!1);if(!o)throw new Error("no recaptcha");Si(n,e,o,i,t)}),t.promise}function Si(n,e,t,r,i){t.ready(()=>{kc(n,e,t,r),i.resolve(t)})}function Ac(n){let e=`fire_app_check_${n.name}`,t=document.createElement("div");return t.id=e,t.style.display="none",document.body.appendChild(t),e}async function Sc(n){zn(n);let t=await g(n).reCAPTCHAState.initialized.promise;return new Promise((r,i)=>{let s=g(n).reCAPTCHAState;t.ready(()=>{r(t.execute(s.widgetId,{action:"fire_app_check"}))})})}function kc(n,e,t,r){let i=t.render(r,{sitekey:e,size:"invisible",callback:()=>{g(n).reCAPTCHAState.succeeded=!0},"error-callback":()=>{g(n).reCAPTCHAState.succeeded=!1}}),s=g(n);s.reCAPTCHAState=Object.assign(Object.assign({},s.reCAPTCHAState),{widgetId:i})}function Rc(n){let e=document.createElement("script");e.src=Tc,e.onload=n,document.head.appendChild(e)}var vt=class n{constructor(e){this._siteKey=e,this._throttleData=null}async getToken(){var e,t,r;Cc(this._throttleData);let i=await Sc(this._app).catch(o=>{throw y.create("recaptcha-error")});if(!(!((e=g(this._app).reCAPTCHAState)===null||e===void 0)&&e.succeeded))throw y.create("recaptcha-error");let s;try{s=await qn(sc(this._app,i),this._heartbeatServiceProvider)}catch(o){throw!((t=o.code)===null||t===void 0)&&t.includes("fetch-status-error")?(this._throttleData=Pc(Number((r=o.customData)===null||r===void 0?void 0:r.httpStatus),this._throttleData),y.create("initial-throttle",{time:Ci(this._throttleData.allowRequestsAfter-Date.now()),httpStatus:this._throttleData.httpStatus})):o}return this._throttleData=null,s}initialize(e){this._app=e,this._heartbeatServiceProvider=he(e,"heartbeat"),bc(e,this._siteKey).catch(()=>{})}isEqual(e){return e instanceof n?this._siteKey===e._siteKey:!1}};function Pc(n,e){if(n===404||n===403)return{backoffCount:1,allowRequestsAfter:Date.now()+nc,httpStatus:n};{let t=e?e.backoffCount:0,r=pr(t,1e3,2);return{backoffCount:t+1,allowRequestsAfter:Date.now()+r,httpStatus:n}}}function Cc(n){if(n&&Date.now()-n.allowRequestsAfter<=0)throw y.create("throttled",{time:Ci(n.allowRequestsAfter-Date.now()),httpStatus:n.httpStatus})}function Hi(n=qt(),e){n=I(n);let t=he(n,"app-check");if(It().initialized||pc(),Gn()&&Kn().then(i=>console.log(`App Check debug token: ${i}. You will need to add it to your app's App Check settings in the Firebase console for it to work.`)),t.isInitialized()){let i=t.getImmediate(),s=t.getOptions();if(s.isTokenAutoRefreshEnabled===e.isTokenAutoRefreshEnabled&&s.provider.isEqual(e.provider))return i;throw y.create("already-initialized",{appName:n.name})}let r=t.initialize({options:e});return Oc(n,e.provider,e.isTokenAutoRefreshEnabled),g(n).isTokenAutoRefreshEnabled&&xi(r,"INTERNAL",()=>{}),r}function Oc(n,e,t=!1){let r=Za(n,Object.assign({},Ri));r.activated=!0,r.provider=e,r.cachedTokenPromise=hc(n).then(i=>(i&&le(i)&&(r.token=i,Vi(n,{token:i.token})),i)),r.isTokenAutoRefreshEnabled=t&&n.automaticDataCollectionEnabled,!n.automaticDataCollectionEnabled&&t&&z.warn("`isTokenAutoRefreshEnabled` is true but `automaticDataCollectionEnabled` was set to false during `initializeApp()`. This blocks automatic token refresh."),r.provider.initialize(n)}async function Wi(n,e){let t=await _t(n,e);if(t.error)throw t.error;if(t.internalError)throw t.internalError;return{token:t.token}}var Nc="app-check",ki="app-check-internal";function Dc(){U(new w(Nc,n=>{let e=n.getProvider("app").getImmediate(),t=n.getProvider("heartbeat");return Ic(e,t)},"PUBLIC").setInstantiationMode("EXPLICIT").setInstanceCreatedCallback((n,e,t)=>{n.getProvider(ki).initialize()})),U(new w(ki,n=>{let e=n.getProvider("app-check").getImmediate();return Ec(e)},"PUBLIC").setInstantiationMode("EXPLICIT")),C(yc,wc)}Dc();self.MeikoFirebase={initializeApp:zt,initializeAuth:Tn,indexedDBLocalPersistence:Ln,browserLocalPersistence:Nn,browserPopupRedirectResolver:Vn,createUserWithEmailAndPassword:Sn,signInWithEmailAndPassword:kn,sendPasswordResetEmail:An,onAuthStateChanged:Rn,signOut:Cn,reload:dt,useDeviceLanguage:Pn,GoogleAuthProvider:Z,signInWithPopup:Mn,signInWithRedirect:xn,getRedirectResult:Fn,deleteUser:On,reauthenticateWithCredential:bn,reauthenticateWithPopup:Un,EmailAuthProvider:V,initializeAppCheck:Hi,ReCaptchaV3Provider:vt,getAppCheckToken:Wi};})();
/*! Bundled license information:

@firebase/util/dist/index.esm2017.js:
  (**
   * @license
   * Copyright 2017 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/util/dist/index.esm2017.js:
  (**
   * @license
   * Copyright 2017 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/util/dist/index.esm2017.js:
  (**
   * @license
   * Copyright 2017 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/util/dist/index.esm2017.js:
  (**
   * @license
   * Copyright 2022 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/util/dist/index.esm2017.js:
  (**
   * @license
   * Copyright 2017 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)
  (**
   * @license
   * Copyright 2025 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/util/dist/index.esm2017.js:
  (**
   * @license
   * Copyright 2021 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/util/dist/index.esm2017.js:
  (**
   * @license
   * Copyright 2017 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/util/dist/index.esm2017.js:
  (**
   * @license
   * Copyright 2017 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/util/dist/index.esm2017.js:
  (**
   * @license
   * Copyright 2017 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/util/dist/index.esm2017.js:
  (**
   * @license
   * Copyright 2017 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/util/dist/index.esm2017.js:
  (**
   * @license
   * Copyright 2022 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/util/dist/index.esm2017.js:
  (**
   * @license
   * Copyright 2017 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/util/dist/index.esm2017.js:
  (**
   * @license
   * Copyright 2017 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/util/dist/index.esm2017.js:
  (**
   * @license
   * Copyright 2017 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/util/dist/index.esm2017.js:
  (**
   * @license
   * Copyright 2019 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)
  (**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/util/dist/index.esm2017.js:
  (**
   * @license
   * Copyright 2021 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/component/dist/esm/index.esm2017.js:
  (**
   * @license
   * Copyright 2019 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/logger/dist/esm/index.esm2017.js:
  (**
   * @license
   * Copyright 2017 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/app/dist/esm/index.esm2017.js:
  (**
   * @license
   * Copyright 2019 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/app/dist/esm/index.esm2017.js:
  (**
   * @license
   * Copyright 2019 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)
  (**
   * @license
   * Copyright 2023 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/app/dist/esm/index.esm2017.js:
  (**
   * @license
   * Copyright 2019 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/app/dist/esm/index.esm2017.js:
  (**
   * @license
   * Copyright 2021 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)
  (**
   * @license
   * Copyright 2019 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

firebase/app/dist/esm/index.esm.js:
  (**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/auth/dist/esm2017/index-35c79a8a.js:
  (**
   * @license
   * Copyright 2021 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/auth/dist/esm2017/index-35c79a8a.js:
  (**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/auth/dist/esm2017/index-35c79a8a.js:
  (**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/auth/dist/esm2017/index-35c79a8a.js:
  (**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/auth/dist/esm2017/index-35c79a8a.js:
  (**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/auth/dist/esm2017/index-35c79a8a.js:
  (**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/auth/dist/esm2017/index-35c79a8a.js:
  (**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)
  (**
   * @license
   * Copyright 2019 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/auth/dist/esm2017/index-35c79a8a.js:
  (**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)
  (**
   * @license
   * Copyright 2022 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)
  (**
   * @license
   * Copyright 2023 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/auth/dist/esm2017/index-35c79a8a.js:
  (**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/auth/dist/esm2017/index-35c79a8a.js:
  (**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/auth/dist/esm2017/index-35c79a8a.js:
  (**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/auth/dist/esm2017/index-35c79a8a.js:
  (**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/auth/dist/esm2017/index-35c79a8a.js:
  (**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/auth/dist/esm2017/index-35c79a8a.js:
  (**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)
  (**
   * @license
   * Copyright 2019 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/auth/dist/esm2017/index-35c79a8a.js:
  (**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/auth/dist/esm2017/index-35c79a8a.js:
  (**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/auth/dist/esm2017/index-35c79a8a.js:
  (**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/auth/dist/esm2017/index-35c79a8a.js:
  (**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/auth/dist/esm2017/index-35c79a8a.js:
  (**
   * @license
   * Copyright 2019 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/auth/dist/esm2017/index-35c79a8a.js:
  (**
   * @license
   * Copyright 2019 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)
  (**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/auth/dist/esm2017/index-35c79a8a.js:
  (**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/auth/dist/esm2017/index-35c79a8a.js:
  (**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/auth/dist/esm2017/index-35c79a8a.js:
  (**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/auth/dist/esm2017/index-35c79a8a.js:
  (**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/auth/dist/esm2017/index-35c79a8a.js:
  (**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/auth/dist/esm2017/index-35c79a8a.js:
  (**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/auth/dist/esm2017/index-35c79a8a.js:
  (**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/auth/dist/esm2017/index-35c79a8a.js:
  (**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/auth/dist/esm2017/index-35c79a8a.js:
  (**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/auth/dist/esm2017/index-35c79a8a.js:
  (**
   * @license
   * Copyright 2019 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/auth/dist/esm2017/index-35c79a8a.js:
  (**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/auth/dist/esm2017/index-35c79a8a.js:
  (**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/auth/dist/esm2017/index-35c79a8a.js:
  (**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/auth/dist/esm2017/index-35c79a8a.js:
  (**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/auth/dist/esm2017/index-35c79a8a.js:
  (**
   * @license
   * Copyright 2019 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)
  (**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)
  (**
   * @license
   * Copyright 2025 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/auth/dist/esm2017/index-35c79a8a.js:
  (**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)
  (**
   * @license
   * Copyright 2019 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)
  (**
   * @license
   * Copyright 2020 Google LLC.
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/auth/dist/esm2017/index-35c79a8a.js:
  (**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/auth/dist/esm2017/index-35c79a8a.js:
  (**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/auth/dist/esm2017/index-35c79a8a.js:
  (**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)
  (**
   * @license
   * Copyright 2021 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)
  (**
   * @license
   * Copyright 2019 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/auth/dist/esm2017/index-35c79a8a.js:
  (**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/auth/dist/esm2017/index-35c79a8a.js:
  (**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/auth/dist/esm2017/index-35c79a8a.js:
  (**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)
  (**
   * @license
   * Copyright 2020 Google LLC.
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)
  (**
   * @license
   * Copyright 2021 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/app-check/dist/esm/index.esm2017.js:
  (**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/app-check/dist/esm/index.esm2017.js:
  (**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/app-check/dist/esm/index.esm2017.js:
  (**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/app-check/dist/esm/index.esm2017.js:
  (**
   * @license
   * Copyright 2021 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@firebase/app-check/dist/esm/index.esm2017.js:
  (**
   * @license
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *   http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)
*/
