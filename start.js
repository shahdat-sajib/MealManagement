#!/usr/bin/env node

// Railway Debug & Startup Script
console.log('🚀 Starting Meal Management Server...');
console.log('📁 Working directory:', process.cwd());
console.log('� __dirname:', __dirname);
console.log('🔍 process.argv:', process.argv);

const fs = require('fs');
const path = require('path');

try {
    console.log('📂 Root directory contents:');
    const rootContents = fs.readdirSync('.');
    rootContents.forEach(item => {
        const itemPath = path.join('.', item);
        const isDir = fs.statSync(itemPath).isDirectory();
        console.log(`   ${isDir ? '📁' : '📄'} ${item}`);
    });

    // Look for server directory
    const serverDir = path.join('.', 'server');
    console.log('\n🔍 Checking for server directory:', serverDir);
    
    if (fs.existsSync(serverDir)) {
        console.log('✅ Server directory found!');
        console.log('📂 Server directory contents:');
        const serverContents = fs.readdirSync(serverDir);
        serverContents.forEach(item => {
            console.log(`   📄 ${item}`);
        });

        const serverFile = path.join(serverDir, 'server.js');
        console.log('\n🔍 Checking for server.js:', serverFile);
        
        if (fs.existsSync(serverFile)) {
            console.log('✅ server.js found! Starting server...');
            
            // Set working directory to server folder for proper imports
            process.chdir(serverDir);
            console.log('📁 Changed working directory to:', process.cwd());
            
            // Start the server using full path
            require(path.join(process.cwd(), 'server.js'));
        } else {
            console.error('❌ server.js not found in server directory!');
            process.exit(1);
        }
    } else {
        console.error('❌ Server directory not found!');
        console.log('Available directories:');
        rootContents
            .filter(item => fs.statSync(item).isDirectory())
            .forEach(dir => console.log(`   📁 ${dir}`));
        process.exit(1);
    }
} catch (error) {
    console.error('💥 Error during startup:', error);
    process.exit(1);
}