import React from 'react';

export function AnimatedBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
      {/* Floating gradient orbs */}
      <div className="absolute top-[10%] left-[15%] w-[400px] h-[400px] bg-gradient-to-br from-blue-200/30 to-indigo-200/30 rounded-full blur-3xl animate-float-1"></div>
      <div className="absolute top-[60%] right-[20%] w-[350px] h-[350px] bg-gradient-to-br from-indigo-100/40 to-blue-100/40 rounded-full blur-3xl animate-float-2"></div>
      <div className="absolute bottom-[20%] left-[40%] w-[300px] h-[300px] bg-gradient-to-br from-blue-100/35 to-indigo-100/35 rounded-full blur-3xl animate-float-3"></div>
      
      {/* Rotating gradient bars */}
      <div className="absolute top-1/4 left-1/3 w-[500px] h-[2px] bg-gradient-to-r from-transparent via-blue-300/20 to-transparent animate-rotate-slow origin-center"></div>
      <div className="absolute bottom-1/3 right-1/4 w-[400px] h-[2px] bg-gradient-to-r from-transparent via-indigo-300/20 to-transparent animate-rotate-reverse origin-center"></div>
      
      {/* Pulsing circles */}
      <div className="absolute top-[30%] right-[30%] w-32 h-32 border border-blue-200/30 rounded-full animate-pulse-ring"></div>
      <div className="absolute bottom-[40%] left-[25%] w-24 h-24 border border-indigo-200/30 rounded-full animate-pulse-ring-delayed"></div>
      
      {/* Mesh gradient overlay */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-100/50 via-transparent to-indigo-100/50 animate-gradient-shift"></div>
      </div>
    </div>
  );
}