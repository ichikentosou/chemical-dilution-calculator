// Run: node tests/mightybest-state.test.cjs
// Controller/DOM-state checks with a minimal DOM adapter; not a browser/layout test.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const html = fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8');
const element = (value='') => ({get value(){return String(value);}, set value(next){value=String(next);}, textContent:'', hidden:false, disabled:false,
 checked:false, dataset:{}, listeners:{}, attrs:{}, classList:{toggle(){}},
 addEventListener(type,handler){this.listeners[type]=handler;},
 setAttribute(name,value){this.attrs[name]=value;},
 appendChild(child){if(!this.value)this.value=child.value;},focus(){},scrollIntoView(){}});
const nodes = new Map();
for(const match of html.matchAll(/<[^>]*\bid="([^"]+)"[^>]*>/g)) {
 const initial=match[0].match(/\bvalue="([^"]*)"/);
 nodes.set(match[1],element(initial?initial[1]:''));
}
const radios=[20,15,10].map(n=>element(String(n)));
const volumes=[5,10,20].map(n=>Object.assign(element(),{dataset:{liters:String(n)}}));
const document={getElementById:id=>{assert.ok(nodes.has(id),`Missing ${id}`);return nodes.get(id);},
 createElement:()=>element(),querySelectorAll:selector=>{
  if(selector==='[data-liters]')return volumes;
  if(selector==='input[name="mightyDilution"]')return radios;
  throw Error(`Unexpected selector ${selector}`);
 }};
nodes.get('volumeUnit').value='L';
const context=vm.createContext({document});
vm.runInContext(html.split('<script>')[1].split('</script>')[0],context);
const node=id=>nodes.get(id);
const set=(id,value,event='input')=>{node(id).value=String(value);node(id).listeners[event]();};
const preset=id=>set('presetSelect',id,'change');
const choose=ratio=>{const r=radios.find(r=>Number(r.value)===ratio);radios.forEach(x=>x.checked=x===r);r.listeners.change();};
const outputs=()=>['outConc','outWater','outTotal','outRatio','outProportion'].map(id=>node(id).textContent);
const blank=()=>assert.deepEqual(outputs(),['–','–','–','–','–']);
let checks=0;
const check=(name,fn)=>{fn();checks++;console.log('PASS',name);};
check('initial Mighty state ignores prior ppm and hides free input',()=>{
 preset('mightybest');blank();
 assert.equal(node('targetConc').disabled,true);assert.equal(node('targetField').hidden,true);
 assert.equal(node('mightyDilutionField').hidden,false);assert.equal(node('mightyDilutionField').disabled,false);
 assert.ok(radios.every(r=>!r.checked));assert.match(node('inputError').textContent,/希釈倍率を選んでください/);
});
check('three displayed 10L recipes match the specification',()=>{
 const expected={10:['約 1 L','約 9 L','10 L','10 倍','1：9'],
 15:['約 666.7 mL','約 9.333 L','10 L','15 倍','1：14'],
 20:['約 500 mL','約 9.5 L','10 L','20 倍','1：19']};
 for(const ratio of [10,15,20]){choose(ratio);assert.deepEqual(outputs(),expected[ratio]);}
});
check('volume buttons and L/mL conversion retain selected ratio and material',()=>{
 set('materialSelect','metal','change');choose(15);
 for(const b of volumes){b.listeners.click();assert.equal(node('outRatio').textContent,'15 倍');assert.equal(node('materialSelect').value,'metal');}
 set('volumeUnit','mL','change');assert.equal(Number(node('totalVol').value),20000);
 assert.equal(node('outTotal').textContent,'20 L');
 set('volumeUnit','L','change');assert.equal(Number(node('totalVol').value),20);
 set('totalVol',5);choose(10);assert.equal(Number(node('totalVol').value),5);assert.equal(node('materialSelect').value,'metal');
});
check('area input applies 12L at 15x without supplying a default coverage',()=>{
 assert.equal(node('coverageInput').value,'');choose(15);
 set('areaInput',120);set('coverageInput',100);node('applyAreaBtn').listeners.click();
 assert.deepEqual(outputs(),['約 800 mL','約 11.2 L','12 L','15 倍','1：14']);
});
check('invalid volumes clear previous results',()=>{
 for(const bad of ['',0,-1,'1e309']){set('totalVol',bad);blank();}
 set('totalVol',10);assert.equal(node('outRatio').textContent,'15 倍');
});
check('switching from each old preset resets selection; old calculations still work',()=>{
 const expected={naj6:'300 倍',naj12:'600 倍',neutral:'50 倍',sesqui:'8 g'};
 for(const id of Object.keys(expected)){
  preset(id);assert.equal(node('outRatio').textContent,expected[id]);
  assert.equal(node('targetField').hidden,false);assert.equal(node('targetConc').disabled,false);
  assert.equal(node('mightyDilutionField').hidden,true);
  preset('mightybest');blank();assert.ok(radios.every(r=>!r.checked));choose(15);
 }
});
check('Mighty evidence and drying warning are scoped to that product',()=>{
 assert.equal(node('mightyEvidence').hidden,false);assert.equal(node('genericEvidence').hidden,true);
 assert.equal(node('mightyDryingWarning').hidden,false);
 preset('neutral');assert.equal(node('mightyEvidence').hidden,true);
 assert.equal(node('genericEvidence').hidden,false);assert.equal(node('mightyDryingWarning').hidden,true);
 set('targetConc',5);assert.equal(node('outRatio').textContent,'5 倍');
});
console.log(`${checks} controller state groups passed (layout/keyboard require browser QA).`);
