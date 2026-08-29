const { Storage } = require('megajs');
require('dotenv').config({ path: '.env.local' });

async function main() {
  console.log('Logging in...');
  const storage = new Storage({
    email: process.env.MEGA_EMAIL,
    password: process.env.MEGA_PASSWORD,
    autologin: true,
    autoload: true
  });

  await storage.ready;
  console.log('Storage ready.');
  console.log('Root children count:', storage.root?.children?.length);
  
  if (!storage.root?.children || storage.root.children.length === 0) {
    console.log('Files list empty, keys might be in storage.files?');
    console.log('Object.keys(storage.files).length:', Object.keys(storage.files || {}).length);
  }
}

main().catch(console.error);
