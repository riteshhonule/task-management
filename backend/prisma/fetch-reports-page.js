import http from 'http';

http.get('http://localhost:5176/src/pages/Reports.tsx', (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    const lines = data.split('\n');
    console.log("Status Code:", res.statusCode);
    console.log("Serving lines 280 to 325 of Reports.tsx from Vite:");
    for (let i = 279; i < 324 && i < lines.length; i++) {
      console.log(`${i + 1}: ${lines[i]}`);
    }
  });
}).on('error', (err) => {
  console.error("Error fetching from Vite:", err);
});
