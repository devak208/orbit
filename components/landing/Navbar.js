'use client'

import React, { useState } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import Link from 'next/link';
import { Sun, Moon, Menu, X } from 'lucide-react';

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="container mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
            <svg width="32" height="32" viewBox="0 0 32 32" className="text-primary">
              <defs>
                <radialGradient id="navLogoGradient" cx="50%" cy="50%">
                  <stop offset="0%" stopColor="#36C7F4" />
                  <stop offset="100%" stopColor="#1E40AF" />
                </radialGradient>
              </defs>
              <circle cx="16" cy="16" r="12" fill="url(#navLogoGradient)" />
              <circle cx="16" cy="16" r="8" fill="transparent" stroke="white" strokeWidth="2" opacity="0.8" />
              <line x1="16" y1="4" x2="16" y2="8" stroke="white" strokeWidth="2" opacity="0.6" />
              <line x1="16" y1="24" x2="16" y2="28" stroke="white" strokeWidth="2" opacity="0.6" />
              <line x1="4" y1="16" x2="8" y2="16" stroke="white" strokeWidth="2" opacity="0.6" />
              <line x1="24" y1="16" x2="28" y2="16" stroke="white" strokeWidth="2" opacity="0.6" />
            </svg>
            <span className="text-xl font-bold text-foreground">Orbit</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors duration-200">
              Features
            </a>
            <a href="#pricing" className="text-muted-foreground hover:text-foreground transition-colors duration-200">
              Pricing
            </a>
            <a href="#testimonials" className="text-muted-foreground hover:text-foreground transition-colors duration-200">
              Testimonials
            </a>
            <Link href="/auth/signin" className="text-muted-foreground hover:text-foreground transition-colors duration-200">
              Sign In
            </Link>
          </div>
          
          {/* Desktop Actions */}
          <div className="hidden md:flex items-center space-x-4">
            <button 
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-muted transition-colors duration-200"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? (
                <Sun className="w-5 h-5 text-muted-foreground hover:text-foreground" />
              ) : (
                <Moon className="w-5 h-5 text-muted-foreground hover:text-foreground" />
              )}
            </button>
            
            <Link href="/auth/signup">
              <button className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all duration-200 transform hover:scale-105">
                Get Started
              </button>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button 
            className="md:hidden p-2 rounded-lg hover:bg-muted transition-colors duration-200"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Toggle menu"
          >
            {isMenuOpen ? (
              <X className="w-6 h-6 text-foreground" />
            ) : (
              <Menu className="w-6 h-6 text-foreground" />
            )}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-border">
            <div className="flex flex-col space-y-4">
              <a 
                href="#features" 
                className="text-muted-foreground hover:text-foreground transition-colors duration-200 py-2"
                onClick={() => setIsMenuOpen(false)}
              >
                Features
              </a>
              <a 
                href="#pricing" 
                className="text-muted-foreground hover:text-foreground transition-colors duration-200 py-2"
                onClick={() => setIsMenuOpen(false)}
              >
                Pricing
              </a>
              <a 
                href="#testimonials" 
                className="text-muted-foreground hover:text-foreground transition-colors duration-200 py-2"
                onClick={() => setIsMenuOpen(false)}
              >
                Testimonials
              </a>
              <Link 
                href="/auth/signin" 
                className="text-muted-foreground hover:text-foreground transition-colors duration-200 py-2"
                onClick={() => setIsMenuOpen(false)}
              >
                Sign In
              </Link>
              
              <div className="flex items-center justify-between pt-4 border-t border-border">
                <button 
                  onClick={toggleTheme}
                  className="flex items-center space-x-2 p-2 rounded-lg hover:bg-muted transition-colors duration-200"
                  aria-label="Toggle theme"
                >
                  {theme === 'dark' ? (
                    <Sun className="w-5 h-5 text-muted-foreground" />
                  ) : (
                    <Moon className="w-5 h-5 text-muted-foreground" />
                  )}
                  <span className="text-sm text-muted-foreground">
                    {theme === 'dark' ? 'Light' : 'Dark'} Mode
                  </span>
                </button>
                
                <Link href="/auth/signup" onClick={() => setIsMenuOpen(false)}>
                  <button className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 rounded-lg font-semibold">
                    Get Started
                  </button>
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
