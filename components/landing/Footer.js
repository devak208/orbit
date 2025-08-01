'use client'

import React from 'react';
import { Github, Twitter, Linkedin, Mail } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-muted/30 border-t border-border">
      <div className="container mx-auto px-6 py-12">
        {/* Main footer content */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand section */}
          <div className="col-span-1 md:col-span-1">
            <div className="flex items-center space-x-2 mb-4">
              <svg width="32" height="32" viewBox="0 0 32 32" className="text-primary">
                <defs>
                  <radialGradient id="footerLogoGradient" cx="50%" cy="50%">
                    <stop offset="0%" stopColor="#36C7F4" />
                    <stop offset="100%" stopColor="#1E40AF" />
                  </radialGradient>
                </defs>
                <circle cx="16" cy="16" r="12" fill="url(#footerLogoGradient)" />
                <circle cx="16" cy="16" r="8" fill="transparent" stroke="white" strokeWidth="2" opacity="0.8" />
                <line x1="16" y1="4" x2="16" y2="8" stroke="white" strokeWidth="2" opacity="0.6" />
                <line x1="16" y1="24" x2="16" y2="28" stroke="white" strokeWidth="2" opacity="0.6" />
                <line x1="4" y1="16" x2="8" y2="16" stroke="white" strokeWidth="2" opacity="0.6" />
                <line x1="24" y1="16" x2="28" y2="16" stroke="white" strokeWidth="2" opacity="0.6" />
              </svg>
              <span className="text-xl font-bold text-foreground">Orbit</span>
            </div>
            <p className="text-muted-foreground mb-4 max-w-xs">
              Empowering teams to build better products together with next-generation project management.
            </p>
            
            {/* Social links */}
            <div className="flex space-x-4">
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                <Github className="w-5 h-5" />
              </a>
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                <Twitter className="w-5 h-5" />
              </a>
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                <Linkedin className="w-5 h-5" />
              </a>
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                <Mail className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Product section */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">Product</h4>
            <ul className="space-y-2">
              <li><a href="/features" className="text-muted-foreground hover:text-foreground transition-colors">Features</a></li>
              <li><a href="/pricing" className="text-muted-foreground hover:text-foreground transition-colors">Pricing</a></li>
              <li><a href="/integrations" className="text-muted-foreground hover:text-foreground transition-colors">Integrations</a></li>
              <li><a href="/security" className="text-muted-foreground hover:text-foreground transition-colors">Security</a></li>
              <li><a href="/changelog" className="text-muted-foreground hover:text-foreground transition-colors">Changelog</a></li>
            </ul>
          </div>

          {/* Company section */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">Company</h4>
            <ul className="space-y-2">
              <li><a href="/about" className="text-muted-foreground hover:text-foreground transition-colors">About</a></li>
              <li><a href="/careers" className="text-muted-foreground hover:text-foreground transition-colors">Careers</a></li>
              <li><a href="/blog" className="text-muted-foreground hover:text-foreground transition-colors">Blog</a></li>
              <li><a href="/contact" className="text-muted-foreground hover:text-foreground transition-colors">Contact</a></li>
              <li><a href="/press" className="text-muted-foreground hover:text-foreground transition-colors">Press</a></li>
            </ul>
          </div>

          {/* Support section */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">Support</h4>
            <ul className="space-y-2">
              <li><a href="/help" className="text-muted-foreground hover:text-foreground transition-colors">Help Center</a></li>
              <li><a href="/docs" className="text-muted-foreground hover:text-foreground transition-colors">Documentation</a></li>
              <li><a href="/api" className="text-muted-foreground hover:text-foreground transition-colors">API Reference</a></li>
              <li><a href="/status" className="text-muted-foreground hover:text-foreground transition-colors">Status</a></li>
              <li><a href="/community" className="text-muted-foreground hover:text-foreground transition-colors">Community</a></li>
            </ul>
          </div>
        </div>

        {/* Footer bottom */}
        <div className="border-t border-border pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-sm text-muted-foreground mb-4 md:mb-0">
            © 2024 Orbit. All rights reserved.
          </p>
          <div className="flex space-x-6 text-sm">
            <a href="/privacy" className="text-muted-foreground hover:text-foreground transition-colors">
              Privacy Policy
            </a>
            <a href="/terms" className="text-muted-foreground hover:text-foreground transition-colors">
              Terms of Service
            </a>
            <a href="/cookies" className="text-muted-foreground hover:text-foreground transition-colors">
              Cookie Policy
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
