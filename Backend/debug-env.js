// debug-env.js
const fs = require('fs');
const path = require('path');

const dotenv = require('dotenv');

console.log('--- Debugging Environment ---');

// 1. قراءة الملف مباشرة
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  console.log(`[File] .env found at: ${envPath}`);
  const fileContent = fs.readFileSync(envPath, 'utf8');
  // البحث يدوياً عن المفتاح في النص
  const match = fileContent.match(/N8N_API_KEY=(.*)/);
  if (match) {
    console.log(
      `[File] Raw value in file starts with: ${match[1].substring(0, 10)}...`,
    );
    console.log(`[File] Raw value length: ${match[1].trim().length}`);
  } else {
    console.log('[File] N8N_API_KEY not found in .env text!');
  }
} else {
  console.log('[File] .env file NOT found!');
}

// 2. تحميل المكتبة ورؤية ما يراه Node.js
dotenv.config();
const runtimeKey = process.env.N8N_API_KEY;

if (runtimeKey) {
  console.log(
    `[Runtime] process.env value starts with: ${runtimeKey.substring(0, 10)}...`,
  );
  console.log(`[Runtime] process.env length: ${runtimeKey.length}`);
} else {
  console.log('[Runtime] N8N_API_KEY is undefined in process.env');
}
console.log('---------------------------');
