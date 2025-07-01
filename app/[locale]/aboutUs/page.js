'use client';
import { useTranslations } from 'next-intl';
import { PricingHeader } from '@/components/PricingHeader';
import { useEffect, useState, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Code, Terminal, Laptop } from 'lucide-react';

export default function AboutUsPage() {
  const t = useTranslations('AboutUs');
  const teamSectionRef = useRef(null);
  const missionRef = useRef(null);
  const historyRef = useRef(null);
  const valuesRef = useRef(null);
  
  useEffect(() => {
    if (typeof window === "undefined") return;
    
    // Register GSAP plugins
    gsap.registerPlugin(ScrollTrigger);
    
    // Clear any existing ScrollTriggers to prevent memory leaks
    ScrollTrigger.getAll().forEach(trigger => trigger.kill());
    
    // Animate sections
    const sections = [missionRef, historyRef, valuesRef, teamSectionRef];
    
    sections.forEach((sectionRef) => {
      if (!sectionRef.current) return;
      
      const contentItems = sectionRef.current.querySelectorAll('.content-item');
      
      contentItems.forEach((item, i) => {
        gsap.fromTo(
          item,
          { opacity: 0, y: 50 },
          {
            opacity: 1,
            y: 0,
            duration: 0.8,
            delay: i * 0.1,
            ease: "power3.out",
            scrollTrigger: {
              trigger: item,
              start: "top 80%",
              end: "bottom 20%",
              toggleActions: "play none none reset",
              once: false
            }
          }
        );
      });
    });
    
    return () => {
      ScrollTrigger.getAll().forEach(trigger => trigger.kill());
    };
  }, []);

  const teamMembers = [
    {
      name: "Mr. She",
      icon: <Code size={48} className="text-pink-500" />
    },
    {
      name: "Mr. Tan",
      icon: <Terminal size={48} className="text-pink-500" />
    },
    {
      name: "Ms. Chong",
      icon: <Laptop size={48} className="text-pink-500" />
    }
  ];

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-4xl mx-auto py-12 px-4">
        <h1 className="text-4xl font-bold text-center mb-12">{t('title')}</h1>
        
        {/* Mission Section */}
        <section ref={missionRef} className="mb-16">
          <div className="content-item">
            <h2 className="text-3xl font-bold mb-6 text-pink-500">{t('mission.title')}</h2>
            <p className="text-lg mb-6">
              {t('mission.description1')}
            </p>
            <p className="text-lg">
              {t('mission.description2')}
            </p>
          </div>
        </section>
        
        {/* History Section */}
        <section ref={historyRef} className="mb-16">
          <div className="content-item">
            <h2 className="text-3xl font-bold mb-6 text-pink-500">{t('story.title')}</h2>
            <p className="text-lg mb-6">
              {t('story.description1')}
            </p>
            <p className="text-lg">
              {t('story.description2')}
            </p>
          </div>
        </section>
        
        {/* Values Section */}
        <section ref={valuesRef} className="mb-16">
          <div className="content-item">
            <h2 className="text-3xl font-bold mb-6 text-pink-500">{t('values.title')}</h2>
            
            <div className="grid md:grid-cols-2 gap-8 mt-8">
              <div className="bg-gray-900 p-6 rounded-lg">
                <h3 className="text-xl font-semibold mb-3">{t('values.innovation.title')}</h3>
                <p>{t('values.innovation.description')}</p>
              </div>
              
              <div className="bg-gray-900 p-6 rounded-lg">
                <h3 className="text-xl font-semibold mb-3">{t('values.collaboration.title')}</h3>
                <p>{t('values.collaboration.description')}</p>
              </div>
              
              <div className="bg-gray-900 p-6 rounded-lg">
                <h3 className="text-xl font-semibold mb-3">{t('values.simplicity.title')}</h3>
                <p>{t('values.simplicity.description')}</p>
              </div>
              
              <div className="bg-gray-900 p-6 rounded-lg">
                <h3 className="text-xl font-semibold mb-3">{t('values.reliability.title')}</h3>
                <p>{t('values.reliability.description')}</p>
              </div>
            </div>
          </div>
        </section>
        
        {/* Team Section */}
        <section ref={teamSectionRef} className="mb-16">
          <div className="content-item">
            <h2 className="text-3xl font-bold mb-6 text-pink-500">{t('team.title')}</h2>
            <p className="text-lg mb-8">
              {t('team.description')}
            </p>
            
            <div className="grid md:grid-cols-3 gap-8">
              {teamMembers.map((member, index) => (
                <div key={index} className="bg-gray-900 p-6 rounded-lg text-center">
                  <div className="w-32 h-32 rounded-full bg-gray-800 mx-auto mb-4 overflow-hidden relative flex items-center justify-center">
                    {member.icon}
                  </div>
                  <h3 className="text-xl font-semibold">{member.name}</h3>
                  <p className="text-gray-400 mb-2">Development Team</p>
                </div>
              ))}
            </div>
          </div>
        </section>
        
        {/* Contact Section */}
        <section className="text-center mb-16">
          <div className="content-item">
            <h2 className="text-3xl font-bold mb-6 text-pink-500">{t('contact.title')}</h2>
            <p className="text-lg mb-6">
              {t('contact.description')}
            </p>
            <div className="flex justify-center">
              <Link 
                href="/contactUs" 
                className="bg-pink-600 hover:bg-pink-700 text-white font-bold py-3 px-8 rounded-lg transition-colors"
              >
                {t('contact.button')}
              </Link>
            </div>
          </div>
        </section>
        
        {/* Location Section */}
        <section className="mb-16">
          <div className="content-item">
            <h2 className="text-3xl font-bold mb-6 text-pink-500">{t('location.title')}</h2>
            <div className="bg-gray-900 p-6 rounded-lg">
              <h3 className="text-xl font-semibold mb-2">{t('location.university')}</h3>
              <p>{t('location.address')}</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
} 