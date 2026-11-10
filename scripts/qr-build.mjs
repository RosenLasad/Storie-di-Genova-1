import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
const require=createRequire(import.meta.url);
export async function build(){
 const {build: bundle}=await import('esbuild');
 await mkdir('public/vendor',{recursive:true});
 await bundle({entryPoints:[require.resolve('qrcode/lib/browser.js')],bundle:true,platform:'browser',format:'iife',globalName:'QRCode',outfile:'public/vendor/qrcode.js',minify:true});
 await writeFile('public/vendor/README.txt','QR code generati localmente con node-qrcode (MIT). Nessun URL viene inviato a servizi QR esterni.');
}
