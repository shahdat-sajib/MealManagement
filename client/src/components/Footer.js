import React from 'react';

const Footer = () => {
  return (
    <footer className="bg-gradient-to-r from-slate-900 via-purple-900 to-slate-900 text-white">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col items-center justify-center space-y-4">
          {/* Developer Credit */}
          <div className="text-center">
            <p className="text-gray-300 mb-2 text-sm">
              Crafted with <span className="text-red-400 animate-pulse">♥</span> by
            </p>
            
            <a
              href="https://shahdat.netlify.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="group relative inline-flex items-center justify-center"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-pink-400 rounded-lg blur opacity-30 group-hover:opacity-50 transition-opacity duration-300"></div>
              
              <div className="relative bg-gradient-to-r from-purple-600 to-pink-600 px-8 py-3 rounded-lg border border-purple-400/20 backdrop-blur-sm group-hover:scale-105 transition-all duration-300 ease-out">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                    </svg>
                  </div>
                  
                  <div className="text-left">
                    <div className="text-white font-semibold text-lg group-hover:text-yellow-200 transition-colors duration-300">
                      Md. Shahdat Hosain
                    </div>
                    <div className="text-purple-200 text-sm opacity-80 group-hover:opacity-100 transition-opacity duration-300">
                      Full Stack Developer
                    </div>
                  </div>
                  
                  <svg className="w-4 h-4 text-white/60 group-hover:text-white group-hover:translate-x-1 transition-all duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </div>
              </div>
            </a>
          </div>

          {/* Bottom Section */}
          <div className="text-center pt-4 border-t border-white/10 w-full">
            <div className="flex items-center justify-center text-sm text-gray-400">
              <div className="flex items-center space-x-2">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                </svg>
                <span>© 2025 All rights reserved</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-400 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-pink-400 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-blob animation-delay-2000"></div>
      </div>
    </footer>
  );
};

export default Footer;