console.log("ServiceWorker#D");

self.addEventListener("fetch", (event) => {
  //console.log("SW fetch:", event);
  event.respondWith(cached(event));
});

self.addEventListener('activate', async (eve) => {
  //console.log("activate?");
});

self.addEventListener("install", async (eve) => {
  //console.log("install?")
});

self.addEventListener("message", async (eve) => {
  //console.log("message?")
});

async function recache(req, res) {
  var cache = await caches.open("v1");
  await cache.put(req, res);
};
async function uncache(req){
  var cache = await caches.open("v1");
  await cache.delete(req);
};

function cached(event){ return new Promise(async (resolve) => { try{
  var req = event.request, cache, reply;
  if(cache = await caches.match(req)){ // our cache
    resolve(cache);
    if((+new Date - age) < (1000 * 60 * 60 * 24)){ return } // don't check for upgrade except once a day.
  }
  reply = await fetch(req); // network fetch
  if(!cache){ // if there is no cache, like on first load, boot & cache.
    resolve(reply);
    recache(req, reply.clone()); // Note: Later we may want first load to do an upgrade/integrity check also.
    return;
  }
  
  // do integrity check
  var clone = reply.clone(), text = await clone.text();
  var safe = await compare(clone.url.split("/").pop(), text);
  if(!safe){
    console.log("Updates do not match original source code!");
    throw "unsafe"; return;
  }

  var upgrade = true; // prompt user if want to upgrade
  console.log("ASK USER TO UPGRADE, WE ARE ASSUMING YES IN THIS ALPHA");
  if(!upgrade){ return }

  recache(req, reply.clone());
  console.log("cached??????");
  setTimeout(function(){ age = +new Date }, 9000);
  self.postMessage({upgrade: 1});
  console.log("postMessaged??????");
} catch(err){
  resolve(new Response('Network error happened', {
    status: 408,
    headers: {
      'Content-Type': 'text/plain'
    },
  }))
}})};


var upgrade;
var age = +new Date;
var check = ['https://raw.githubusercontent.com/eraeco/joy/master/the/'];

async function hash(text){
  return btoa(String.fromCharCode.apply(null, new Uint8Array(
    await crypto.subtle.digest('SHA-256', (new TextEncoder()).encode(text))
  )));
}
function compare(name, now) { return new Promise(async (resolve) => {
  //hash file contents
  var sum = await hash(now), c = 0;
  check.forEach(async function(path){
    var origin = await fetch(path + name + "?#!" + (+new Date));
    origin = await origin.text();
    if(await hash(origin) === sum){ c++ }
  });
  console.log("COMPARE?", name, sum, c, check.length);
  if(check.length === c){
    resolve(true);
    return;
  }
  resolve(false);
  return;
})}