const { photo, DEMO_RESTAURANTS } = require('../prisma/demo-data');

async function check(url) {
  const res = await fetch(url, { redirect: 'follow' });
  return res.ok && (res.headers.get('content-type') || '').includes('image');
}

async function main() {
  const ids = new Set();
  for (const r of DEMO_RESTAURANTS) {
    r.images.forEach((id) => ids.add(id));
    r.menu.forEach((m) => {
      if (m.image) ids.add(m.image);
    });
  }
  const bad = [];
  for (const id of ids) {
    if (!(await check(photo(id, 100)))) bad.push(id);
  }
  if (bad.length) {
    console.error('Broken Pexels IDs:', bad.join(', '));
    process.exit(1);
  }
  console.log(`OK: ${ids.size} unique photos verified.`);
}

main();
