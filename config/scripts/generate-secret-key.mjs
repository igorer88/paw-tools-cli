import crypto from 'node:crypto';

const secretKey = crypto.randomBytes(32).toString('hex');
console.log(secretKey);
