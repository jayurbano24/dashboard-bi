fetch('http://localhost:3000/api/test-orderry')
  .then(res => res.json())
  .then(data => require('fs').writeFileSync('test-output.json', JSON.stringify(data, null, 2)))
  .catch(console.error);
