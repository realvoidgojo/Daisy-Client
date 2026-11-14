const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const vm = require('node:vm');
const safety = require('../src/archive-safety.js');
const { planRvrRestore } = require('../src/rvr-restore.js');
const { zipFixture } = require('./zip-fixture.cjs');

test('archive metadata reads are bounded, CRC checked, and override paths are streamed', async t => {
 const root = temporary(t), file = path.join(root, 'pack.zip'), output = path.join(root, 'instance');
 const metadata = Buffer.from('{"files":[]}');
 fs.writeFileSync(file, zipFixture([{name:'modrinth.index.json', data:metadata, method:8}, {name:'overrides/config/test.json', data:'config', method:8}]));
 assert.deepEqual(await safety.readArchiveEntry(file, 'modrinth.index.json'), metadata);
 assert.equal(await safety.readArchiveEntry(file, 'missing.json'), null);
 await assert.rejects(safety.readArchiveEntry(file, 'modrinth.index.json', 2), /size limit/);
 await safety.extractArchive(file, output, { filter:name=>name.startsWith('overrides/'), mapName:name=>name.slice('overrides/'.length) });
 assert.equal(fs.readFileSync(path.join(output, 'config/test.json'), 'utf8'), 'config');
 assert.equal(fs.existsSync(path.join(output, 'modrinth.index.json')), false);
 const corrupt = fs.readFileSync(file); corrupt[30 + Buffer.byteLength('modrinth.index.json')] ^= 1; fs.writeFileSync(file, corrupt);
 await assert.rejects(safety.readArchiveEntry(file, 'modrinth.index.json'));
});

test('actual pack/profile metadata parsers await bounded archive reads and reject unsafe pack paths', async t => {
 const root = temporary(t), file = path.join(root, 'pack.mrpack');
 const source = fs.readFileSync(path.join(__dirname, '../src/main.js'), 'utf8');
 const context = vm.createContext({ path, ...safety, readBoundedFile:require('../src/storage.js').readBoundedFile });
 const profileStart = source.indexOf('async function readModrinthProfileExport(');
 vm.runInContext(source.slice(profileStart, source.indexOf('\nfunction findEndOfCentralDirectory', profileStart)), context);
 const packStart = source.indexOf('const PACK_LOADERS =');
 vm.runInContext(source.slice(packStart, source.indexOf('\n/**', packStart)), context);
 const index = {name:'Fixture', dependencies:{minecraft:'1.21.11','fabric-loader':'0.18.0'}, files:[{path:'mods/test.jar',downloads:['https://example.test/test.jar']}]};
 fs.writeFileSync(file, zipFixture([{name:'modrinth.index.json', data:JSON.stringify(index), method:8}]));
 assert.equal((await context.readModpackArchive(file)).version, '1.21.11');
 assert.equal((await context.readModrinthProfileExport(file)).files[0].path, 'mods/test.jar');
 index.files[0].path = '../escape.jar';
 fs.writeFileSync(file, zipFixture([{name:'modrinth.index.json', data:JSON.stringify(index)}]));
 await assert.rejects(context.readModpackArchive(file), /Unsafe|unsafe/);
});
const unsafe = ['../canary.txt','config/../../canary.txt','..\\canary.txt','C:\\canary.txt','C:canary.txt','/canary.txt','\\\\server\\share\\file','\\\\?\\C:\\file','config/file:stream','config/.. /canary.txt','config/file.','config/NUL.txt','config/COM1.json','config//file','config/./file','config/\0file'];
function temporary(t) { const root=fs.mkdtempSync(path.join(os.tmpdir(),'daisy-archive-test-')); t.after(()=>fs.rmSync(root,{recursive:true,force:true})); return root; }
function harness(t) {
 const root=temporary(t), archive=path.join(root,'archive'), instances=path.join(root,'instances'); fs.mkdirSync(archive); fs.mkdirSync(instances);
 const source=fs.readFileSync(path.join(__dirname,'../src/main.js'),'utf8'), start=source.indexOf('function importRvrArchive('), end=source.indexOf('async function restoreRvrItem(',start);
 const context=vm.createContext({fs,path,crypto,...safety,instancesRootPath:()=>instances,sanitizeFilename:s=>s.replace(/[<>:"/\\|?*]/g,'_'),contentTypeInfo:t=>({folder:t==='mod'?'mods':t==='shader'?'shaderpacks':'resourcepacks',extensions:['.jar','.zip']}),planRvrRestore,isCoreClientMod:()=>false,writeModManifest:(dest,value)=>fs.writeFileSync(path.join(dest,'daisy-mods.json'),JSON.stringify(value)),knownLoader:()=> 'fabric',daisySupportsInstance:()=>({supported:true}),DAISY_FORMAT_ID:'daisy.rvr'});
 vm.runInContext(source.slice(start,end),context);
 return {root,archive,instances,run:()=>context.importRvrArchive(archive,{},'test')};
}
test('cross-platform archive paths reject traversal, roots, devices and Windows aliases',()=>{
 for(const name of unsafe) assert.throws(()=>safety.archiveRelativePath(name),/unsafe/i,name);
 assert.equal(safety.archiveRelativePath('config\\yacl.json5'),'config/yacl.json5');
 assert.equal(safety.archiveRelativePath('mods/',true),'mods');
});
test('actual RVR importer rejects malicious snapshots before creating an instance or touching a canary',t=>{
 const h=harness(t), canary=path.join(h.root,'canary.txt'); fs.writeFileSync(canary,'untouched');
 for(const name of [...unsafe,'mods/evil.jar','daisy-instance.json','__proto__']) {
  fs.writeFileSync(path.join(h.archive,'instance-settings.json'),JSON.stringify(Object.fromEntries([['options.txt','safe'],[name,'escaped']])));
  assert.throws(h.run,undefined,name); assert.equal(fs.readFileSync(canary,'utf8'),'untouched'); assert.deepEqual(fs.readdirSync(h.instances),[]);
 }
});
test('legitimate RVR settings round-trip without changing their bytes',t=>{
 const h=harness(t), snapshot={'options.txt':'fov:70\n','config/yacl.json5':'{ theme: "dark" }','config\\noisium.json':'{}'};
 fs.writeFileSync(path.join(h.archive,'instance-settings.json'),JSON.stringify(snapshot)); const result=h.run();
 for(const [name,data] of Object.entries(snapshot)) assert.equal(fs.readFileSync(path.join(result.instance.path,...name.split(/[\\/]/)),'utf8'),data);
 assert.ok(result.instance.path.startsWith(h.instances+path.sep));
});
test('malformed snapshots are rejected instead of silently imported',t=>{
 const h=harness(t);
 for(const data of ['{bad','[]','null','"string"','{"options.txt":42}']) {
  fs.writeFileSync(path.join(h.archive,'instance-settings.json'),data); assert.throws(h.run); assert.deepEqual(fs.readdirSync(h.instances),[]);
 }
});
test('snapshot writes reject parent junctions/symlinks and do not overwrite existing files or hardlinks',t=>{
 const root=temporary(t), outside=path.join(root,'outside'), destination=path.join(root,'instance'); fs.mkdirSync(outside); fs.mkdirSync(destination);
 const canary=path.join(outside,'yacl.json5'); fs.writeFileSync(canary,'untouched');
 fs.symlinkSync(outside,path.join(destination,'config'),process.platform==='win32'?'junction':'dir');
 assert.throws(()=>safety.writeRvrSettings(destination,safety.planRvrSettings({'config/yacl.json5':'escaped'})),/link/);
 assert.equal(fs.readFileSync(canary,'utf8'),'untouched');
 assert.throws(()=>safety.assertNoArchiveLinks(destination),/link/);
 fs.linkSync(canary,path.join(destination,'options.txt')); assert.throws(()=>safety.archiveTarget(destination,'options.txt'),/link/);
});
test('RVR manifest filenames are validated before existence checks or restoration',()=>{
 for(const file of [...unsafe,'nested/safe.jar','__proto__']) {
  let reads=0; const exists=()=>{reads++;return false;};
  assert.throws(()=>planRvrRestore({mods:{[file]:{source:'modrinth',projectId:'AANobbMI'}}},null,exists)); assert.equal(reads,0);
  assert.throws(()=>planRvrRestore(null,{mods:[{file,projectId:'AANobbMI'}]},exists)); assert.equal(reads,0);
 }
});
test('ZIP metadata preflight accepts normal stored/deflated UTF-8 exports',async t=>{
 const root=temporary(t), file=path.join(root,'export.rvr');
 fs.writeFileSync(file,zipFixture([{name:'mods/',mode:0x41ed},{name:'mods/example.jar',data:'jar'},{name:'instance-settings.json',data:'{"options.txt":"fov:70"}',method:8},{name:'resourcepacks/été.zip',data:'zip'}]));
 await safety.validateArchivePaths(file);
});
test('ZIP metadata preflight rejects unsafe entry names before native extraction',async t=>{
 const root=temporary(t), file=path.join(root,'bad.rvr');
 for(const name of unsafe) {fs.writeFileSync(file,zipFixture([{name,data:'payload'}]));await assert.rejects(safety.validateArchivePaths(file),undefined,name);}
});
test('ZIP preflight rejects links, collisions, local-name mismatch, encryption and malformed directories',async t=>{
 const root=temporary(t), file=path.join(root,'bad.rvr');
 const variants=[
  zipFixture([{name:'link',mode:0xa1ff,data:'../outside'}]),
  zipFixture([{name:'mods/A.jar'},{name:'mods/a.jar'}]),
  zipFixture([{name:'safe.txt',localName:'../bad.txt'}]),
  zipFixture([{name:'safe.txt',flags:0x801}]),
  zipFixture([{name:'safe.txt',extra:Buffer.from([0x75,0x70,0,0])}]),
  zipFixture([{name:'safe.txt',localExtra:Buffer.from([0x75,0x70,0,0])}]),
  Buffer.from('not zip'),zipFixture([{name:'safe.txt'}]).subarray(0,40)
 ];
 const wrongCount=zipFixture([{name:'safe.txt'}]);wrongCount.writeUInt16LE(2,wrongCount.length-12);variants.push(wrongCount);
 for(const buffer of variants) {fs.writeFileSync(file,buffer);await assert.rejects(safety.validateArchivePaths(file));}
});

test('streaming extraction validates CRC and writes only safe verified entries',async t=>{
 const root=temporary(t), source=path.join(root,'safe.rvr'), destination=path.join(root,'output');
 fs.writeFileSync(source,zipFixture([{name:'config/',mode:0x41ed},{name:'config/example.json',data:'{"safe":true}',method:8},{name:'empty.txt',data:''}]));
 await safety.extractArchive(source,destination);
 assert.equal(fs.readFileSync(path.join(destination,'config/example.json'),'utf8'),'{"safe":true}');
 assert.equal(fs.statSync(path.join(destination,'empty.txt')).size,0);
 await assert.rejects(safety.extractArchive(source,destination),/EEXIST/);
 assert.equal(fs.readFileSync(path.join(destination,'config/example.json'),'utf8'),'{"safe":true}');
});
test('streaming extraction rejects a malicious archive before writing any valid preceding entries',async t=>{
 const root=temporary(t), source=path.join(root,'bad.rvr'), destination=path.join(root,'output'), canary=path.join(root,'canary.txt');
 fs.writeFileSync(canary,'safe');fs.writeFileSync(source,zipFixture([{name:'valid.txt',data:'valid'},{name:'../canary.txt',data:'escaped'}]));
 await assert.rejects(safety.extractArchive(source,destination));
 assert.equal(fs.existsSync(destination),false);assert.equal(fs.readFileSync(canary,'utf8'),'safe');
});
test('streaming extraction enforces declared sizes and CRC even when compressed data is corrupt',async t=>{
 const root=temporary(t), source=path.join(root,'bad.zip'), destination=path.join(root,'output');
 for(const mutation of ['crc','size','inflate']) {
  const buffer=zipFixture([{name:'payload.txt',data:'some payload',method:mutation==='inflate'?8:0}]);
  const central=buffer.readUInt32LE(buffer.length-6);
  if(mutation==='crc') buffer.writeUInt32LE(0,central+16);
  if(mutation==='size') buffer.writeUInt32LE(1,central+24);
  if(mutation==='inflate') buffer[30+Buffer.byteLength('payload.txt')]^=255;
  fs.writeFileSync(source,buffer);await assert.rejects(safety.extractArchive(source,destination));
  assert.equal(fs.existsSync(path.join(destination,'payload.txt')),false);
 }
});
test('streaming native extraction reuses verified files and repairs same-size corruption',async t=>{
 const root=temporary(t), source=path.join(root,'natives.jar'), destination=path.join(root,'natives');
 fs.writeFileSync(source,zipFixture([{name:'META-INF/MANIFEST.MF',data:'ignored'},{name:'native.dll',data:'good',method:8}]));
 const options={overwrite:true,skipExisting:true,filter:name=>!name.startsWith('META-INF/')};
 await safety.extractArchive(source,destination,options);
 const native=path.join(destination,'native.dll');const before=fs.statSync(native).mtimeMs;
 await safety.extractArchive(source,destination,options);assert.equal(fs.statSync(native).mtimeMs,before);
 fs.writeFileSync(native,'evil');await safety.extractArchive(source,destination,options);assert.equal(fs.readFileSync(native,'utf8'),'good');
 assert.equal(fs.existsSync(path.join(destination,'META-INF')),false);
});
test('metadata limits reject oversized entries and total expansion before extraction',async t=>{
 const root=temporary(t), source=path.join(root,'large.zip'), destination=path.join(root,'output');
 fs.writeFileSync(source,zipFixture([{name:'a.txt',data:'123456'},{name:'b.txt',data:'123456'}]));
 await assert.rejects(safety.extractArchive(source,destination,{maxEntryBytes:5}),/limit/);
 await assert.rejects(safety.extractArchive(source,destination,{maxTotalBytes:10}),/limit/);
 assert.equal(fs.existsSync(destination),false);
});
