const fs = require('node:fs');
const zlib = require('node:zlib');
function crc32(data) {
 let crc = 0xffffffff;
 for (const byte of data) { crc ^= byte; for (let i=0;i<8;i++) crc=(crc>>>1)^((crc&1)?0xedb88320:0); }
 return (crc^0xffffffff)>>>0;
}
function zipFixture(entries) {
 const parts=[], directory=[]; let offset=0;
 for (const entry of entries) {
  const name=Buffer.from(entry.name), localName=Buffer.from(entry.localName || entry.name);
  const data=Buffer.from(entry.data || ''), method=entry.method ?? 0, flags=entry.flags ?? 0x800;
  const body=method===8?zlib.deflateRawSync(data):data;
  const localExtra=entry.localExtra || Buffer.alloc(0), extra=entry.extra || Buffer.alloc(0);
  const local=Buffer.alloc(30); local.writeUInt32LE(0x04034b50); local.writeUInt16LE(20,4); local.writeUInt16LE(flags,6); local.writeUInt16LE(method,8);
  local.writeUInt32LE(crc32(data),14); local.writeUInt32LE(body.length,18); local.writeUInt32LE(data.length,22); local.writeUInt16LE(localName.length,26); local.writeUInt16LE(localExtra.length,28);
  const central=Buffer.alloc(46); central.writeUInt32LE(0x02014b50); central.writeUInt16LE((3<<8)|20,4); central.writeUInt16LE(20,6);
  central.writeUInt16LE(flags,8); central.writeUInt16LE(method,10); central.writeUInt32LE(crc32(data),16); central.writeUInt32LE(body.length,20); central.writeUInt32LE(data.length,24);
  central.writeUInt16LE(name.length,28); central.writeUInt16LE(extra.length,30); central.writeUInt32LE(((entry.mode ?? 0x81a4)<<16)>>>0,38); central.writeUInt32LE(offset,42);
  const piece=Buffer.concat([local,localName,localExtra,body]); parts.push(piece); offset+=piece.length; directory.push(central,name,extra);
 }
 const central=Buffer.concat(directory), end=Buffer.alloc(22); end.writeUInt32LE(0x06054b50); end.writeUInt16LE(entries.length,8); end.writeUInt16LE(entries.length,10); end.writeUInt32LE(central.length,12); end.writeUInt32LE(offset,16);
 return Buffer.concat([...parts,central,end]);
}
module.exports={zipFixture};
