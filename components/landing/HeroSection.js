'use client'

import React, { useEffect, useRef } from 'react';
import Link from 'next/link';

const HeroSection = () => {
  const logoRef = useRef(null);
  const particlesRef = useRef([]);

  useEffect(() => {
    // Simple animation for the logo
    const logo = logoRef.current;
    if (logo) {
      logo.style.animation = 'pulse 3s ease-in-out infinite';
    }

    // Create floating particles effect
    const createParticles = () => {
      for (let i = 0; i < 20; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.cssText = `
          position: absolute;
          width: 4px;
          height: 4px;
          background: #36C7F4;
          border-radius: 50%;
          opacity: 0.6;
          animation: float ${3 + Math.random() * 4}s ease-in-out infinite;
          animation-delay: ${Math.random() * 2}s;
          left: ${Math.random() * 100}%;
          top: ${Math.random() * 100}%;
        `;
        document.querySelector('.hero-particles')?.appendChild(particle);
        particlesRef.current.push(particle);
      }
    };

    createParticles();

    return () => {
      particlesRef.current.forEach(particle => particle.remove());
    };
  }, []);

  return (
    <section className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20 overflow-hidden pt-16">
      {/* Background particles */}
      <div className="hero-particles absolute inset-0 pointer-events-none"></div>
      
      {/* Hero content */}
      <div className="container mx-auto px-6 text-center z-10">
        {/* Animated logo */}
        <div className="mb-8 flex justify-center">
          <svg 
            ref={logoRef}
            width="200" 
            height="200" 
            viewBox="0 0 200 200" 
            className="text-primary hover:scale-110 transition-transform duration-500 cursor-pointer"
          >
            <defs>
              <radialGradient id="logoGradient" cx="50%" cy="50%">
                <stop offset="0%" stopColor="#36C7F4" />
                <stop offset="100%" stopColor="#1E40AF" />
              </radialGradient>
            </defs>
            <g>
              {/* Central circle */}
              <circle 
                cx="100" 
                cy="100" 
                r="30" 
                fill="url(#logoGradient)" 
                className="animate-pulse"
              />
              
              {/* Radiating lines */}
              <g className="animate-spin" style={{transformOrigin: '100px 100px', animationDuration: '20s'}}>
                <line x1="100" y1="100" x2="160" y2="100" stroke="#36C7F4" strokeWidth="3" opacity="0.8" />
                <line x1="100" y1="100" x2="140" y2="60" stroke="#36C7F4" strokeWidth="2" opacity="0.6" />
                <line x1="100" y1="100" x2="140" y2="140" stroke="#36C7F4" strokeWidth="2" opacity="0.6" />
                <line x1="100" y1="100" x2="100" y2="40" stroke="#36C7F4" strokeWidth="2" opacity="0.4" />
                <line x1="100" y1="100" x2="60" y2="60" stroke="#36C7F4" strokeWidth="2" opacity="0.4" />
                <line x1="100" y1="100" x2="60" y2="140" stroke="#36C7F4" strokeWidth="2" opacity="0.4" />
              </g>
              
              {/* Outer ring */}
              <circle 
                cx="100" 
                cy="100" 
                r="50" 
                fill="none" 
                stroke="#36C7F4" 
                strokeWidth="2" 
                opacity="0.3"
                className="animate-ping"
                style={{animationDuration: '4s'}}
              />
            </g>
          </svg>
        </div>

        {/* Main heading */}
        <h1 className="text-6xl md:text-8xl font-bold text-foreground mb-6 leading-tight">
          Welcome to
          <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600">
            Orbit
          </span>
        </h1>

        {/* Subheading */}
        <p className="text-xl md:text-2xl text-muted-foreground mb-12 max-w-3xl mx-auto leading-relaxed">
          The next-generation project management platform that empowers teams to build extraordinary products together.
        </p>

        {/* CTA buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link href="/auth/signup">
            <button className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-purple-700 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl">
              Get Started Free
            </button>
          </Link>
          <button className="px-8 py-4 border-2 border-muted-foreground text-foreground font-semibold rounded-lg hover:bg-muted hover:border-foreground transform hover:scale-105 transition-all duration-200">
            Schedule Demo
          </button>
        </div>

        {/* Feature highlights */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          <div className="flex items-center justify-center space-x-2 text-muted-foreground">
            <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            <span>Free 14-day trial</span>
          </div>
          <div className="flex items-center justify-center space-x-2 text-muted-foreground">
            <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            <span>No credit card required</span>
          </div>
          <div className="flex items-center justify-center space-x-2 text-muted-foreground">
            <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            <span>Setup in minutes</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
