// Rule-based energy scanner (shared by backend endpoints).
export type Severity = 'Critical' | 'High' | 'Medium' | 'Low';
export type RawFinding = {
  title: string;
  rule: string;
  severity: Severity;
  filePath: string;
  lineNumber: number;
  codeSnippet: string;
  explanation: string;
  energyWeight: number;
};

export const WEIGHTS: Record<Severity, number> = { Critical: 8, High: 5, Medium: 2.5, Low: 1 };
export const CODE_EXT = /\.(js|jsx|ts|tsx|mjs|cjs|py|java|go|tf|ya?ml)$|(^|\/)Dockerfile[^/]*$/i;

const LOOP = /^\s*(for\s*\(|for\s+\w+.*\s+in\s+|for\s+\w+\s*:?=|while\s*\(|while\s+\w|.*\.forEach\(|.*\.map\(\s*(async\s*)?\()/;
const DB_CALL = /(\.find(One|ById|Unique|First)?\(|\.query\(|\.execute\(|\bSELECT\s|objects\.(get|filter)\(|session\.query\(|db\.\w+\.find|await\s+fetch\(|requests\.get\(|axios\.get\()/i;

function snippet(lines: string[], i: number, before = 1, after = 3) {
  return lines.slice(Math.max(0, i - before), Math.min(lines.length, i + after + 1)).join('\n');
}
const indent = (s: string) => s.match(/^\s*/)?.[0].length ?? 0;

export function scanFile(path: string, content: string): RawFinding[] {
  const out: RawFinding[] = [];
  const lines = content.split('\n');
  const add = (i: number, f: Omit<RawFinding, 'filePath' | 'lineNumber' | 'codeSnippet' | 'energyWeight'>, snip?: string) =>
    out.push({ ...f, filePath: path, lineNumber: i + 1, codeSnippet: (snip ?? snippet(lines, i)).slice(0, 1500), energyWeight: WEIGHTS[f.severity] });
  const isDocker = /Dockerfile/i.test(path);
  const isInfra = /\.(tf|ya?ml)$/i.test(path);

  lines.forEach((line, i) => {
    if (line.length > 400) return;
    if (isDocker) {
      const m = line.match(/^\s*FROM\s+([^\s]+)/i);
      if (m && !/(alpine|slim|distroless|scratch|busybox|chainguard|-min)/i.test(m[1]) && !/\bAS\s+build/i.test(line))
        add(i, { title: `Oversized base image (${m[1]})`, rule: 'Oversized Container', severity: 'Medium', explanation: 'Full OS base images are hundreds of MB larger than slim/alpine/distroless variants, costing energy on every pull, build and cold start.' }, line);
      return;
    }
    if (isInfra) {
      const it = line.match(/(instance_type|machine_type|vm_size|size)\s*[:=]\s*"?([\w.-]*(\d{1,2}xlarge|metal|highmem-(16|32|64)|standard-(16|32|64)|Standard_[DE](16|32|64)))/i);
      if (it) add(i, { title: `Large instance type: ${it[2]}`, rule: 'Overprovisioned Infrastructure', severity: 'High', explanation: 'Very large instances usually run at low utilisation; right-sizing or autoscaling cuts idle power draw.' }, line);
      const cpu = line.match(/^\s*cpu:\s*"?(\d+)(m)?"?/);
      if (cpu && !cpu[2] && Number(cpu[1]) >= 4) add(i, { title: `High CPU request (${cpu[1]} cores)`, rule: 'Overprovisioned Infrastructure', severity: 'Medium', explanation: 'Large fixed CPU requests reserve capacity that often sits idle. Start smaller and use a Horizontal Pod Autoscaler.' }, line);
      const mem = line.match(/^\s*memory:\s*"?(\d+)Gi/);
      if (mem && Number(mem[1]) >= 8) add(i, { title: `High memory request (${mem[1]}Gi)`, rule: 'Overprovisioned Infrastructure', severity: 'Medium', explanation: 'Reserved memory keeps nodes powered even when unused. Size requests to observed usage.' }, line);
      const rep = line.match(/^\s*replicas:\s*(\d+)/);
      if (rep && Number(rep[1]) >= 6) add(i, { title: `${rep[1]} fixed replicas`, rule: 'Overprovisioned Infrastructure', severity: 'Low', explanation: 'A fixed high replica count runs at peak size 24/7. Autoscale to demand instead.' }, line);
      return;
    }
    // Code rules
    if (LOOP.test(line)) {
      const base = indent(line);
      for (let j = i + 1; j < Math.min(lines.length, i + 7); j++) {
        if (lines[j].trim() && indent(lines[j]) <= base && j > i + 1) break;
        if (DB_CALL.test(lines[j])) {
          add(i, { title: 'Query or network call inside a loop (N+1)', rule: 'N+1 Query', severity: 'Critical', explanation: 'Each iteration makes a separate database or network round trip, so CPU and I/O grow with every row. Batch the lookups into one call.' }, snippet(lines, i, 0, j - i + 1));
          break;
        }
        if (LOOP.test(lines[j]) && indent(lines[j]) > base && !/\.map\(/.test(lines[j])) {
          add(i, { title: 'Nested loop (O(n²) work)', rule: 'Inefficient Loop', severity: 'High', explanation: 'A loop inside a loop does quadratic work. Use a Map/Set/dict lookup to make it linear.' }, snippet(lines, i, 0, j - i + 2));
          break;
        }
      }
    }
    const si = line.match(/setInterval\([\s\S]*,\s*(\d+)\s*\)/);
    if (si && Number(si[1]) < 2000) add(i, { title: `Polling every ${si[1]}ms`, rule: 'Busy Polling', severity: 'High', explanation: 'Short polling intervals keep CPUs and radios awake. Use websockets, server-sent events or a longer back-off.' });
    const sl = line.match(/(time\.sleep|asyncio\.sleep|Thread\.sleep|time\.Sleep)\(\s*([\d.]+)/);
    if (sl && /while/.test(lines.slice(Math.max(0, i - 4), i).join('\n'))) {
      const v = Number(sl[2]);
      const ms = /Thread\.sleep/.test(sl[1]) ? v : v * 1000;
      if (ms < 2000) add(i, { title: 'Tight polling loop', rule: 'Busy Polling', severity: 'High', explanation: 'A loop that sleeps briefly and re-checks wastes CPU wake-ups. Switch to an event, queue or longer back-off.' }, snippet(lines, i, 3, 1));
    }
    if (/^\s*while\s*\(\s*true\s*\)\s*\{?\s*$|^\s*while\s+True\s*:/.test(line) && !/sleep|await|wait|recv|get\(/i.test(lines.slice(i, i + 6).join('\n')))
      add(i, { title: 'Busy-wait infinite loop', rule: 'Busy Polling', severity: 'Critical', explanation: 'An infinite loop with no wait spins a CPU core at 100%. Block on an event or add a back-off.' });
    if (/(import\s+(\w+|\*\s+as\s+\w+)\s+from\s+['"](lodash|moment|rxjs)['"]|require\(['"](lodash|moment)['"]\))/.test(line))
      add(i, { title: 'Whole-library import', rule: 'Heavy Dependency', severity: 'Medium', explanation: 'Importing a whole utility library ships far more code than needed, costing energy on every download and parse. Import only the functions you use or use a lighter alternative (e.g. date-fns).' }, line);
    if (/\bSELECT\s+\*\s+FROM\b/i.test(line) && !/LIMIT/i.test(line))
      add(i, { title: 'SELECT * without LIMIT', rule: 'Unbounded Memory', severity: 'Medium', explanation: 'Loading every column and row moves far more data than needed. Select the columns you use and paginate.' }, line);
    if (/(\.objects\.all\(\)|\.findAll\(\s*\)|\.find\(\s*\{\s*\}\s*\)|readFileSync\(|\.read\(\)\s*$|\.readlines\(\))/.test(line))
      add(i, { title: 'Loads everything into memory', rule: 'Unbounded Memory', severity: 'Low', explanation: 'Reading a whole table or file at once grows memory with data size. Stream or paginate instead.' }, line);
    if (/compression\s*[:=]\s*false|gzip\s*[:=]\s*false/i.test(line))
      add(i, { title: 'Compression disabled', rule: 'Uncompressed Assets', severity: 'Medium', explanation: 'Uncompressed responses send 3–10× more bytes over the network. Enable gzip or brotli.' }, line);
  });
  return out.slice(0, 15);
}

export function scoreFor(totalWeight: number, files: number) {
  const penalty = (totalWeight / Math.max(1, Math.sqrt(files))) * 6;
  return Math.max(5, Math.min(100, Math.round(100 - penalty)));
}
export function energyFor(totalWeight: number, files: number) {
  return Math.round((20 + files * 0.8 + totalWeight * 4) * 10) / 10;
}

function parseTar(buf: Uint8Array) {
  const dec = new TextDecoder();
  const str = (o: number, n: number) => dec.decode(buf.subarray(o, o + n)).replace(/\0.*$/s, '');
  const out: { path: string; size: number; data: Uint8Array }[] = [];
  let off = 0;
  let longName = '';
  while (off + 512 <= buf.length) {
    const name = str(off, 100);
    if (!name) break;
    const size = parseInt(str(off + 124, 12).trim() || '0', 8);
    const type = str(off + 156, 1);
    const prefix = str(off + 345, 155);
    const data = buf.subarray(off + 512, off + 512 + size);
    if (type === 'L') longName = dec.decode(data).replace(/\0.*$/s, '');
    else if (type === '0' || type === '') {
      const full = longName || (prefix ? `${prefix}/${name}` : name);
      out.push({ path: full.split('/').slice(1).join('/'), size, data });
      longName = '';
    } else longName = '';
    off += 512 + Math.ceil(size / 512) * 512;
  }
  return out;
}

export async function fetchRepo(owner: string, repo: string, branch?: string) {
  const ref = branch || 'HEAD';
  const res = await fetch(`https://codeload.github.com/${owner}/${repo}/tar.gz/${encodeURIComponent(ref)}`, { headers: { 'User-Agent': 'GreenCode-Auditor' } });
  if (res.status === 404) throw new Error(branch ? `Repository or branch "${branch}" not found. Make sure the repo is public.` : 'Repository not found. Make sure it exists and is public.');
  if (!res.ok || !res.body) throw new Error(`GitHub returned ${res.status}. Please try again.`);
  const len = Number(res.headers.get('content-length') || 0);
  if (len > 80_000_000) throw new Error('This repository is too large to scan (over 80 MB).');
  const tar = new Uint8Array(await new Response(res.body.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer());
  const entries = parseTar(tar).filter((e) => e.path && !/(^|\/)(node_modules|vendor|dist|build|\.git)\/|\.min\./.test(e.path));
  const dec = new TextDecoder();
  const files = entries.filter((e) => CODE_EXT.test(e.path) && e.size < 200_000).slice(0, 200).map((e) => ({ path: e.path, content: dec.decode(e.data) }));
  const bigAssets = entries.filter((e) => /\.(png|jpe?g|gif|bmp|tiff?)$/i.test(e.path) && e.size > 500_000).slice(0, 10).map((e) => ({ path: e.path, size: e.size }));
  return { fullName: `${owner}/${repo}`, branch: branch || 'default', files, bigAssets };
}

export function parseGithubUrl(url: string) {
  const m = url.trim().match(/^https?:\/\/(www\.)?github\.com\/([\w.-]+)\/([\w.-]+?)(\.git)?(\/.*)?$/i);
  if (!m) return null;
  return { owner: m[2], repo: m[3] };
}
