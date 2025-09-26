#!/usr/bin/env node

/**
 * Railway Entry Point
 * 
 * This file exists at the root level so Railway can find it easily.
 * It sets up the correct working directory and starts the actual server.
 */

console.log('🚀 Railway Entry Point - Starting Meal Management Server...');
console.log('📁 Current working directory:', process.cwd());

const fs = require('fs');
const path = require('path');

// Check if we're in the right directory structure
const serverDir = path.join(__dirname, 'server');
console.log('🔍 Looking for server directory at:', serverDir);

if (fs.existsSync(serverDir)) {
    console.log('✅ Server directory found');
    
    // Change to server directory for proper relative imports
    process.chdir(serverDir);
    console.log('📁 Changed working directory to:', process.cwd());
    
    // Import and run the server
    console.log('🎯 Starting the actual server...');
    try {
        require('./server.js');
        console.log('✅ Server import completed');
    } catch (error) {
        console.error('💥 Error starting server:', error);
        process.exit(1);
    }
} else {
    console.error('❌ Server directory not found!');
    console.log('📂 Available files/directories:');
    try {
        fs.readdirSync('.').forEach(item => {
            const isDir = fs.statSync(item).isDirectory();
            console.log(`   ${isDir ? '📁' : '📄'} ${item}`);
        });
    } catch (error) {
        console.error('Error reading directory:', error.message);
    }
    process.exit(1);
}