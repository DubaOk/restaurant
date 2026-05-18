const pex = (id) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=200`;

const unsplash = (id) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=200&q=80`;

async function check(label, url) {
  const res = await fetch(url, { redirect: 'follow' });
  const ok = res.ok && (res.headers.get('content-type') || '').includes('image');
  return { ok, status: res.status };
}

async function main() {
  const pexIds = [
    5938, 376464, 1279330, 248444, 725991, 2232, 1640777, 958545, 1267320, 699953,
    941861, 2074130, 3535383, 361184, 2993478, 2097090, 842571, 3033958, 1199957,
    1639562, 674268, 1095550, 958545, 1437267, 2673356, 2233348, 541216, 696218,
  ];
  const okPex = [];
  for (const id of pexIds) {
    const { ok } = await check('pex', pex(id));
    if (ok) okPex.push(id);
  }
  console.log('pexels ok:', okPex.length, okPex.join(', '));
}

main();
