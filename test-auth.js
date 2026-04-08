// Test registration and login
const crypto = require('crypto');

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

console.log('Testing password hashing:');
console.log('Password: test123');
console.log('Hash:', hashPassword('test123'));

// Test with the same password multiple times
console.log('\nConsistency test:');
for (let i = 0; i < 3; i++) {
  console.log(`Hash ${i+1}:`, hashPassword('test123'));
}