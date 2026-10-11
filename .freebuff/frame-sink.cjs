// Temporary helper: accepts base64 JPEG bodies posted from the local dev page and
// writes them into public/media/music. Used once to extract video-frame posters.
const http = require('http')
const fs = require('fs')
const path = require('path')

const target = path.join(process.cwd(), 'public', 'media', 'music')

http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', '*')
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }
  const name = path.basename(req.url)
  if (req.method !== 'POST' || !/^[A-Za-z0-9._-]+$/.test(name)) { res.writeHead(400); res.end(); return; }
  const chunks = []
  req.on('data', (chunk) => chunks.push(chunk))
  req.on('end', () => {
    const buffer = Buffer.from(Buffer.concat(chunks).toString('utf8'), 'base64')
    fs.writeFileSync(path.join(target, name), buffer)
    res.writeHead(200); res.end('wrote ' + buffer.length)
  })
}).listen(8791, '127.0.0.1', () => console.log('frame sink ready on 8791'))
