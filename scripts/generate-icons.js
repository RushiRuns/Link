import sharp from 'sharp';
import pngToIco from 'png-to-ico';
import fs from 'fs';
import path from 'path';

async function generate() {
  const svgPath = path.resolve('src/assets/logo.svg');
  const buildDir = path.resolve('build');
  const publicDir = path.resolve('public');
  
  if (!fs.existsSync(buildDir)) fs.mkdirSync(buildDir);
  if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir);

  const pngPath = path.resolve(buildDir, 'icon.png');
  const icoPath = path.resolve(buildDir, 'icon.ico');
  const publicPngPath = path.resolve(publicDir, 'icon.png');
  const publicIcoPath = path.resolve(publicDir, 'icon.ico');

  try {
    // Generate 256x256 PNG for electron-builder and window icon
    const pngBuffer = await sharp(svgPath)
      .resize(256, 256)
      .png()
      .toBuffer();
      
    fs.writeFileSync(pngPath, pngBuffer);
    fs.writeFileSync(publicPngPath, pngBuffer);
    console.log('Generated PNG icons');

    // Generate ICO from the PNG
    const icoBuffer = await pngToIco(pngPath);
    fs.writeFileSync(icoPath, icoBuffer);
    fs.writeFileSync(publicIcoPath, icoBuffer);
    console.log('Generated ICO icons');
    
  } catch (err) {
    console.error('Error generating icons:', err);
    process.exit(1);
  }
}

generate();
