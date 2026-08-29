require('dotenv').config({ path: '.env.local' });
const { Storage } = require('megajs');

async function test() {
  const storage = new Storage({
    email: process.env.MEGA_EMAIL,
    password: process.env.MEGA_PASSWORD,
  });
  await storage.ready;
  const files = storage.root.children;
  if (files.length > 0) {
    console.log("Keys of first file node:");
    console.log(Object.keys(files[0]));
    console.log("First file node handle/id/uuid:");
    console.log("handle:", files[0].handle);
    console.log("id:", files[0].id);
    console.log("nodeId:", files[0].nodeId);
    console.log("uuid:", files[0].uuid);
  }
}
test().catch(console.error);
