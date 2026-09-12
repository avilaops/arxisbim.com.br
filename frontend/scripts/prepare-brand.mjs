// Optimize the supplied originals without redrawing the Arxis identity.
import fs from 'node:fs/promises'
import path from 'node:path'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const sharp = require(process.env.ARXIS_SHARP_MODULE || 'sharp')
const base = path.resolve(import.meta.dirname, '../..')
const sources = path.join(base, 'assets/social-media/cronograma-360-dias/2026-09-12')
const website = path.join(base, 'assets/website/2026-09-12')
const target = path.join(base, 'frontend/public')
for (const folder of ['images/brand','images/editorial','fonts']) await fs.mkdir(path.join(target, folder), {recursive:true})
await fs.copyFile(path.join(sources,'originais/6-Foto-7.jpg'),path.join(target,'images/brand/arxis-logo.jpg'))
await fs.copyFile(path.join(sources,'lote-01/assets/Montserrat-Variable.ttf'),path.join(target,'fonts/Montserrat-Variable.ttf'))
await fs.copyFile(path.join(sources,'lote-01/assets/OFL.txt'),path.join(target,'fonts/OFL.txt'))
const images = [
 ['arxis-avatar',path.join(sources,'originais/4-Foto-4.jpg'),'brand',800],
 ['arquitetura',path.join(sources,'lote-01/assets/arquitetura.png'),'editorial',1440],
 ['modelo-bim',path.join(sources,'lote-01/assets/modelo-bim.png'),'editorial',1254],
 ['ifc',path.join(website,'originais/ifc.png'),'editorial',1440],
 ['revisao',path.join(website,'originais/revisao.png'),'editorial',1440],
]
for (const [name, source, folder, width] of images) {
 await sharp(source).resize({width,withoutEnlargement:true}).webp({quality:84}).toFile(path.join(target,`images/${folder}/${name}.webp`))
}
for (const size of [96,180,192,512]) {
 await sharp(path.join(sources,'originais/5-Foto-5.jpg')).resize(size,size,{fit:'contain',background:'#ffffff'}).png().toFile(path.join(target,`images/brand/arxis-icon-${size}.png`))
}
console.log('Arxis original identity and editorial web assets prepared.')
