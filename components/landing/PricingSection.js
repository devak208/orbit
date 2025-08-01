'use client'

import React from 'react';
import { Check, Star } from 'lucide-react';
import Link from 'next/link';

const PricingSection = () => {
  const plans = [
    {
      name: 'Starter',
      price: 9,
      period: 'month',
      description: 'Perfect for small teams getting started',
      features: [
        '5 Projects',
        '10GB Storage',
        'Email Support',
        'Basic Analytics',
        '2 Team Members'
      ],
      buttonText: 'Get Started',
      popular: false
    },
    {
      name: 'Pro',
      price: 29,
      period: 'month',
      description: 'Best for growing teams and businesses',
      features: [
        'Unlimited Projects',
        '100GB Storage',
        'Priority Support',
        'Advanced Analytics',
        '10 Team Members',
        'Custom Integrations',
        'API Access'
      ],
      buttonText: 'Get Started',
      popular: true
    },
    {
      name: 'Enterprise',
      price: 99,
      period: 'month',
      description: 'For large organizations with advanced needs',
      features: [
        'Unlimited Everything',
        'Unlimited Storage',
        '24/7 Phone Support',
        'Custom Branding',
        'Unlimited Team Members',
        'Advanced Security',
        'Dedicated Success Manager',
        'Custom Development'
      ],
      buttonText: 'Contact Sales',
      popular: false
    }
  ];

  return (
    <section id="pricing" className="py-24 bg-background">
      <div className="container mx-auto px-6">
        {/* Section header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            Simple, Transparent Pricing
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Choose the plan that fits your team's needs. All plans include a 14-day free trial.
          </p>
        </div>

        {/* Pricing cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan, index) => (
            <div 
              key={index} 
              className={`relative bg-card border rounded-2xl p-8 transition-all duration-300 hover:shadow-xl hover:-translate-y-2 ${
                plan.popular 
                  ? 'border-primary shadow-lg scale-105 ring-2 ring-primary/20' 
                  : 'border-border hover:border-primary/20'
              }`}
            >
              {/* Popular badge */}
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 rounded-full text-sm font-semibold flex items-center space-x-1">
                    <Star className="w-4 h-4" fill="currentColor" />
                    <span>Most Popular</span>
                  </div>
                </div>
              )}

              {/* Plan header */}
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-foreground mb-2">{plan.name}</h3>
                <p className="text-muted-foreground mb-4">{plan.description}</p>
                
                {/* Price */}
                <div className="flex items-baseline justify-center">
                  <span className="text-5xl font-bold text-foreground">${plan.price}</span>
                  <span className="text-muted-foreground ml-2">/{plan.period}</span>
                </div>
              </div>

              {/* Features list */}
              <ul className="space-y-4 mb-8">
                {plan.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex items-center space-x-3">
                    <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <span className="text-muted-foreground">{feature}</span>
                  </li>
                ))}
              </ul>

              {/* CTA button */}
              <Link href="/auth/signup">
                <button 
                  className={`w-full py-3 px-6 rounded-lg font-semibold transition-all duration-200 ${
                    plan.popular
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl'
                      : 'bg-muted text-foreground hover:bg-muted-foreground/10 border border-border hover:border-foreground'
                  }`}
                >
                  {plan.buttonText}
                </button>
              </Link>
            </div>
          ))}
        </div>

        {/* FAQ or additional info */}
        <div className="mt-16 text-center">
          <p className="text-muted-foreground mb-4">
            All plans include our core features. Need something custom?
          </p>
          <button className="text-primary hover:underline font-semibold">
            Contact our sales team
          </button>
        </div>
      </div>
    </section>
  );
};

export default PricingSection;
