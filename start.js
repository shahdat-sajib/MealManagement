#!/usr/bin/env node

// Railway startup script - launches the server
console.log('🚀 Starting Meal Management Server...');
console.log('📁 Working directory:', process.cwd());
console.log('📂 Directory contents:', require('fs').readdirSync('.'));

// Check if server directory exists
const fs = require('fs');
const path = require('path');

const serverDir = path.join(__dirname, 'server');
const serverFile = path.join(serverDir, 'server.js');

if (fs.existsSync(serverDir)) {
    console.log('✅ Server directory found');
    console.log('📂 Server contents:', fs.readdirSync(serverDir));
    
    if (fs.existsSync(serverFile)) {
        console.log('✅ Server file found, starting...');
        // Start the server by requiring the full path
        require(serverFile);
    } else {
        console.error('❌ server.js not found in server directory!');
        process.exit(1);
    }
} else {
    console.error('❌ Server directory not found!');
    console.log('📂 Available directories:', fs.readdirSync('.').filter(item => 
        fs.statSync(item).isDirectory()
    ));
    process.exit(1);
}