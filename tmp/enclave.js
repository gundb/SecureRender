;(function(sr){
/* WITHOUT SECURE RENDER, BROWSERS SAVE USER DATA TO THE APPLICATION'S DOMAIN.
THIS MEANS THE DOMAIN'S OWNER CAN ACCESS YOUR DATA. SECURE RENDER FIXES THIS.
SECURE RENDER CREATES A SECURITY CONTEXT UNDER THE USER INSTEAD, NOT THE APP.
APPLICATION LOGIC IS THEN RUN IN A THIRD CONTEXT, ISOLATED FROM ALL DOMAINS.

THIS CODE IS USED AS BOTH A BROWSER EXTENSION AND A POLYFILL SHIM FOR WEBSITE APPS.
IF THIS CODE IS RUNNING INSIDE THE BROWSER: USER DATA IS SAVED AND PROTECTED THERE.
ELSE WARNING: UNTIL BROWSERS SUPPORT THIS, A USER CONTEXT IS SHIMMED UNDER THE POLYFILL,
WHILE THIS IS MORE SECURE THAN APP OWNERS HAVING ACCESS TO DATA, IT STILL HAS RISKS.
TO LEARN MORE ABOUT THESE LIMITATIONS, PLEASE READ SECURERENDER.ORG

HOW SECURE RENDER WORKS: APP -> [ IFRAME SHIELD -> [SECURE RENDER] <-> USER DATA ]
AN APP ONLY EVER FEEDS IN VIEW LOGIC. DATA IS NEVER SENT BACK UP! */
sr = {ext: ((window.browser||window.chrome)||'').runtime};

//try{ !sr.ext && navigator.serviceWorker.register('./service.js'); }catch(e){ console.log(e) };

(function start(i){
  // TODO: talk to cloudflare about enforcing integrity meanwhile?
  i = sr.i = document.createElement('iframe');
  i.className = 'SecureRender';
  i.style = "position: fixed; border: 0; width: 100%; height: 100%; top: 0; left: 0; right: 0; bottom: 0;";
  i.sandbox = 'allow-scripts allow-popups allow-downloads allow-pointer-lock';
  i.csp = "script-src 'self' 'unsafe-inline'; default-src data: blob: mediastream: filesystem:; style-src 'self' 'unsafe-inline'; child-src 'self' blob:; worker-src blob: 'self';"; // 'unsafe-inline' let's us boot SR in localStorage polyfill mode, we then turn OFF 'unsafe-inline'.
  sr.send = function(msg){ i.contentWindow.postMessage(msg, '*') } // TODO: AUDIT! THIS LOOKS SCARY, BUT '/' NOT WORK FOR SANDBOX 'null' ORIGIN. IS THERE ANYTHING BETTER?
  document.body.appendChild(i);
  if(sr.ext){ return i.src = "./sandbox.html" } // extension
  if(i.doc = localStorage.sandbox){ return i.srcdoc = i.doc } // cached polyfill prevents remote attack
  i.src = "./sandbox.html";
  ;(async function(){
    var html = await (await fetch('./sandbox.html')).text();
    var js = await (await fetch('./sandbox.js')).text();
    localStorage.sandbox = html.replace('script src="./sandbox.js">', "script>"+js);
  }());
}());

window.onmessage = function(eve){
  eve.preventDefault();
  eve.stopImmediatePropagation();
  var msg = eve.data, tmp, u;
  //console.log("ENCLAVE ONMESSAGE", msg);
  if(!msg){ return }
  //if(eve.origin !== location.origin){ console.log('meow?',eve); return }
  if(eve.source !== sr.i.contentWindow){ return sr.send(msg) }
  tmp = sr.how[msg.how];
  if(!tmp){ return }
  tmp(msg, eve);
};

sr.how = {
  // localStorage is not async, so here is a quick async version for testing.
  localStore: function(msg, eve){ var u;
    if(nope[msg.get]){ return } // prevent reserved keys being modified, use better approach in future.

    if(u !== msg.put){
      //localStorage.setItem(msg.get, JSON.stringify(msg.put));
      store.put(msg.get, JSON.stringify(msg.put), function(err,ack){ console.log("eIdb.put", err, ack) });
    } else
    if(msg.get){
      store.get(msg.get, function(err,data){ console.log("eIdb.get", err, data);
      sr.send({to: msg.via, ack: msg.ack, ask: [JSON.parse(data)], how: 'localStore'});
      });
    }

    return;
    if(u !== msg.put){
      localStorage.setItem(msg.get, JSON.stringify(msg.put));
    } else
    if(msg.get){
      sr.send({to: msg.via, ack: msg.ack, ask: [JSON.parse(localStorage.getItem(msg.get))], how: 'localStore'});
    }
  }
}
function nope(){}; nope.sandbox = 1;

window.addEventListener('storage', function(msg){
  console.log("encPass:", msg);
  sr.send({to: 1, get: msg.key, put: JSON.parse(msg.newValue), how: 'localStore'});
});

!sr.ext && navigator.serviceWorker.addEventListener("message", function(msg){
  console.log("SW message:", msg);
  msg = msg.data;
  if(msg.upgrade){
    console.log("upgrading sandbox!");
    localStorage.sandbox = '';
    return;
  }
});












var store = Store();

function Store(opt){
  opt = opt || {};
  opt.file = String(opt.file || 'sr');
  var store = Store[opt.file], db = null, u;
  store = function(){};

  store.start = function(){
    var o = indexedDB.open(opt.file, 1);
    o.onupgradeneeded = function(eve){ (eve.target.result).createObjectStore(opt.file) }
    o.onsuccess = function(){ db = o.result }
    o.onerror = function(eve){ console.log(eve||1); }
  }; store.start();

  store.put = function(key, data, cb){
    if(!db){ setTimeout(function(){ store.put(key, data, cb) },1); return }
    var tx = db.transaction([opt.file], 'readwrite');
    var obj = tx.objectStore(opt.file);
    var req = obj.put(data, ''+key);
    req.onsuccess = obj.onsuccess = tx.onsuccess = function(){ cb(null, 1) }
    req.onabort = obj.onabort = tx.onabort = function(eve){ cb(eve||'put.tx.abort') }
    req.onerror = obj.onerror = tx.onerror = function(eve){ cb(eve||'put.tx.error') }
  }

  store.get = function(key, cb){
    if(!db){ setTimeout(function(){ store.get(key, cb) },9); return }
    var tx = db.transaction([opt.file], 'readonly');
    var obj = tx.objectStore(opt.file);
    var req = obj.get(''+key);
    req.onsuccess = function(){ cb(null, req.result) }
    req.onabort = function(eve){ cb(eve||4) }
    req.onerror = function(eve){ cb(eve||5) }
  }
  setInterval(function(){ db && db.close(); db = null; store.start() }, 1000 * 15); // reset webkit bug?
  return store;
}




}());