const fs = require('fs');
const url = 'exp://192.168.1.214:8081';
const html = `<!DOCTYPE html>
<html>
<body style="background:#fff;text-align:center;font-family:sans-serif;padding:40px">
  <h2>Scan with Expo Go</h2>
  <canvas id="c"></canvas>
  <p style="font-size:16px;color:#555;margin-top:16px">${url}</p>
  <script src="https://cdn.jsdelivr.net/npm/qrcode/build/qrcode.min.js"></script>
  <script>QRCode.toCanvas(document.getElementById('c'), '${url}', { width: 300 }, function(e){ if(e) console.error(e); });</script>
</body>
</html>`;
fs.writeFileSync('qr.html', html);
console.log('done');
