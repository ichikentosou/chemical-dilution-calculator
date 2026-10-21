// Run: node tests/calculator.test.cjs (Node.js built-ins only)
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const html = fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8');
const script = html.split('<script>')[1].split('</script>')[0];
const context = vm.createContext({});
// Load actual pure functions without running DOM initialization.
vm.runInContext(script.slice(0,script.indexOf('for (const [id,items]')),context);
const calc = (...args) => context.calculateMixture(...args);
let checks=0;
const check = (name,fn) => {fn();checks++;console.log('PASS',name);};
check('6%, 200ppm, 10L: 300x and exact volume conservation',()=>{
 const r=calc('ppm',6,200,10);
 assert.equal(r.ratio,300); assert.equal(r.ratio-1,299);
 assert.ok(Math.abs(r.stockL*1000-33.3333333333)<1e-8);
 assert.equal(r.stockL+r.waterL,10);
 assert.equal(context.amount(r.stockL),'33.3 mL');
 assert.equal(context.waterAmount(r.waterL,10),'9.967 L');
});
check('100x: 1:99 and 100mL+9.9L',()=>{
 const r=calc('dilution',NaN,100,10);
 assert.equal(r.stockL,0.1);assert.equal(r.waterL,9.9);assert.equal(r.ratio-1,99);
});
check('ppm and dilution modes agree',()=>{
 for (const ratio of [1,1.5,100,300,1200]) {
  const a=calc('ppm',12,120000/ratio,20),b=calc('dilution',NaN,ratio,20);
  assert.ok(Math.abs(a.stockL-b.stockL)<1e-12);assert.ok(Math.abs(a.waterL-b.waterL)<1e-12);
 }
});
check('powder: 8g per liter of water gives 80g in 10L water',()=>{
 const r=calc('gram',NaN,8,10);assert.equal(r.grams,80);assert.equal(r.waterL,10);assert.equal(r.totalL,undefined);
});
check('invalid, zero, negative and overflow inputs fail',()=>{
 for(const bad of [NaN,0,-1,Infinity]) {
  for(const mode of ['ppm','dilution','gram']) {
   assert.ok(calc(mode,6,200,bad).error);assert.ok(calc(mode,6,bad,10).error);
  }
  assert.ok(calc('ppm',bad,200,10).error);
 }
 assert.ok(calc('ppm',101,200,10).error);assert.ok(calc('ppm',6,60001,10).error);
 assert.ok(calc('dilution',NaN,0.5,10).error);assert.ok(calc('gram',NaN,1e308,10).error);
});
check('very small amounts never display zero',()=>{
 for(const ml of [0.03,0.00001,1e-10])assert.notEqual(context.amount(ml/1000),'0 mL');
 const r=calc('dilution',NaN,1e6,10);
 assert.notEqual(context.waterAmount(r.waterL,10),'10 L');
});
check('1x uses no water',()=>{const r=calc('dilution',NaN,1,5);assert.equal(r.stockL,5);assert.equal(r.waterL,0);});
console.log(`${checks} calculation regression groups passed.`);
