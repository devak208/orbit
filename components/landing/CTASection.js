  'use client'

  import React from 'react';
  import Link from 'next/link';

  const CTASection = () => {
    return (
      <section className="py-24 bg-gradient-to-br from-background via-muted/10 to-muted/20 text-center">
        <div className="container mx-auto px-6 max-w-4xl">
          {/* CTA Title */}
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
            Ready to elevate your team's productivity?
          </h2>

          {/* CTA Subtitle */}
          <p className="text-xl text-muted-foreground mb-12">
            Join thousands of happy customers who are seamlessly collaborating with Orbit.
          </p>

          {/* CTA Actions */}
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link href="/auth/signup">
              <button className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-8 rounded-lg font-semibold shadow-lg hover:from-blue-700 hover:to-purple-700 transform hover:scale-105 transition-all duration-200">
                Start Your Free Trial
              </button>
            </Link>
            <button className="py-3 px-8 border-2 border-primary text-primary font-semibold rounded-lg hover:bg-primary hover:text-white transform hover:scale-105 transition-all duration-200">
              Schedule a Demo
            </button>
          </div>

          {/* Additional Info */}
          <p className="text-sm text-muted-foreground mt-8">
            No credit card required. Start your 14-day free trial now.
          </p>
        </div>
      </section>
    );
  };

  export default CTASection;
