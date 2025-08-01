'use client'

import React from 'react';
import { Quote } from 'lucide-react';

const TestimonialsSection = () => {
  const testimonials = [
    {
      name: "Sarah Johnson",
      position: "CEO, TechCorp",
      content: "Orbit has completely transformed how we manage projects. The intuitive interface and powerful features have increased our team's productivity by 200%. It's simply the best tool we've ever used.",
      avatar: "SJ",
      rating: 5
    },
    {
      name: "Mike Chen",
      position: "CTO, StartupInc",
      content: "The automation features are game-changing. What used to take hours now takes minutes. Our development cycles are faster and more efficient than ever before.",
      avatar: "MC",
      rating: 5
    },
    {
      name: "Emily Davis",
      position: "Project Manager, BigCorp",
      content: "Outstanding support and rock-solid reliability. We've migrated all our projects to Orbit and couldn't be happier with the decision. Highly recommended!",
      avatar: "ED",
      rating: 5
    }
  ];

  return (
    <section id="testimonials" className="py-24 bg-muted/30">
      <div className="container mx-auto px-6">
        {/* Section header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            Loved by Teams Worldwide
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Don't just take our word for it. Here's what our customers have to say about Orbit.
          </p>
        </div>

        {/* Testimonials grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {testimonials.map((testimonial, index) => (
            <div 
              key={index} 
              className="bg-card p-8 rounded-2xl border border-border hover:shadow-lg transition-all duration-300 hover:-translate-y-2 relative"
            >
              {/* Quote icon */}
              <Quote className="w-8 h-8 text-primary mb-6 opacity-60" />
              
              {/* Rating stars */}
              <div className="flex mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <svg key={i} className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>

              {/* Testimonial content */}
              <blockquote className="text-muted-foreground mb-6 leading-relaxed italic">
                "{testimonial.content}"
              </blockquote>

              {/* Author info */}
              <div className="flex items-center">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-lg mr-4">
                  {testimonial.avatar}
                </div>
                <div>
                  <h4 className="font-semibold text-foreground">{testimonial.name}</h4>
                  <p className="text-sm text-muted-foreground">{testimonial.position}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Trust indicators */}
        <div className="mt-20 text-center">
          <p className="text-muted-foreground mb-8">Trusted by over 10,000+ teams worldwide</p>
          <div className="flex justify-center items-center space-x-12 opacity-60">
            {/* Company logos placeholder */}
            <div className="text-2xl font-bold text-muted-foreground">TechCorp</div>
            <div className="text-2xl font-bold text-muted-foreground">StartupInc</div>
            <div className="text-2xl font-bold text-muted-foreground">BigCorp</div>
            <div className="text-2xl font-bold text-muted-foreground">InnovateCo</div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
