// Test registration and login via HTTP
const http = require('http');

function makeRequest(path, method = 'POST', data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const response = JSON.parse(body);
          resolve({ status: res.statusCode, data: response });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function testAuth() {
  console.log('Testing registration...');
  const registerResult = await makeRequest('/api/auth/register', 'POST', {
    username: 'testuser',
    password: 'testpass123',
    fullName: 'Test User'
  });
  console.log('Register result:', registerResult);

  console.log('\nTesting login...');
  const loginResult = await makeRequest('/api/auth/login', 'POST', {
    username: 'testuser',
    password: 'testpass123'
  });
  console.log('Login result:', loginResult);
}

testAuth().catch(console.error);