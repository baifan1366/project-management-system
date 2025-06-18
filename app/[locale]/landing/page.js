"use client";

import { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { supabase } from '@/lib/supabase';
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

// Dynamically import ReactPlayer to avoid SSR issues
const ReactPlayer = dynamic(() => import("react-player/lazy"), { ssr: false });

export default function LandingPage() {
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const sectionsRef = useRef([]);
  const solutionsRef = useRef(null);
  const pricingRef = useRef(null);
  const footerRef = useRef(null);
  const cardsRef = useRef([]);
  const [activeCard, setActiveCard] = useState(1);  // Track active card index
  
  useEffect(() => {
    fetchLandingPageContent();
  }, []);

  // GSAP animations setup for general content
  useEffect(() => {
    if (typeof window === "undefined" || loading || !sections.length) return;

    // Register GSAP plugins
    gsap.registerPlugin(ScrollTrigger);
    
    // Clear any existing ScrollTriggers to prevent memory leaks
    ScrollTrigger.getAll().forEach(trigger => trigger.kill());
    
    // Content animations
    sectionsRef.current.forEach((sectionEl, index) => {
      if (!sectionEl) return;
      
      const contents = sectionEl.querySelectorAll('.content-item');
      if (contents.length === 0) return;
      
      // Create animation for each content item
      contents.forEach((item, i) => {
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
              start: "top 80%", // Trigger when element reaches top 80% of viewport
              end: "bottom 20%", // End when element bottom reaches 20% of viewport
              toggleActions: "play none none reset", // play on enter, reset on exit
              once: false, // Allow animation to replay when scrolling back up

            }
          }
        );
      });
    });

    // Solutions section special animation with improved scroll triggering
    if (solutionsRef.current && cardsRef.current.length > 0) {
      animateCards();
    }
    
    // Pricing section animation
    if (pricingRef.current) {
      const pricingItems = pricingRef.current.querySelectorAll('.content-item');
      if (pricingItems.length > 0) {
        pricingItems.forEach((item, i) => {
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
      }
    }
    
    // Footer animation
    if (footerRef.current) {
      const footerItems = footerRef.current.querySelectorAll('.footer-item');
      if (footerItems.length > 0) {
        footerItems.forEach((item, i) => {
          gsap.fromTo(
            item,
            { opacity: 0, y: 30 },
            {
              opacity: 1,
              y: 0,
              duration: 0.6,
              delay: i * 0.1,
              ease: "power2.out",
              scrollTrigger: {
                trigger: item,
                start: "top 90%",
                toggleActions: "play none none none",
                once: false,
              }
            }
          );
        });
      }
    }

    return () => {
      ScrollTrigger.getAll().forEach(trigger => trigger.kill());
    };
  }, [sections, loading]);

  const animateCards = () => {
    const cards = cardsRef.current.filter(Boolean);
    if (cards.length === 0) return;
    
    // Reset all cards first
    gsap.set(cards, { 
      opacity: 0.6,
      scale: 0.9,
      filter: 'blur(2px)',
      zIndex: 0
    });
    
    // Set the first card as center
    gsap.set(cards[0], { 
      x: '0%',
      opacity: 1,
      scale: 1,
      filter: 'blur(0px)',
      zIndex: 10
    });
    
    // Position second card to the right (if exists)
    if (cards.length >= 2) {
      gsap.set(cards[1], { x: '100%' });
    }
    
    // Position third card to the left (if exists)
    if (cards.length >= 3) {
      gsap.set(cards[2], { x: '-100%' });
    }
    
    // Hide any additional cards off-screen
    for (let i = 3; i < cards.length; i++) {
      gsap.set(cards[i], { x: '-200%' });
    }
  };

  const fetchLandingPageContent = async () => {
    try {
      // First check if promo_banner section exists
      const { data: promoBannerSection, error: promoBannerError } = await supabase
        .from('landing_page_section')
        .select('*')
        .eq('name', 'promo_banner')
        .single();

      if (promoBannerError && promoBannerError.code !== 'PGRST116') {
        // If error is not "no rows returned" then throw it
        throw promoBannerError;
      }

      // If promo_banner section doesn't exist, create it
      if (!promoBannerSection) {
        const { error: createError } = await supabase
          .from('landing_page_section')
          .insert([
            { name: 'promo_banner', sort_order: 0 } // Set sort_order to 0 to ensure it's always first
          ]);

        if (createError) throw createError;
      }

      // Now fetch all sections including the newly created one
      const { data: sectionsData, error: sectionsError } = await supabase
        .from('landing_page_section')
        .select('*, landing_page_content(*)')
        .order('sort_order');

      if (sectionsError) throw sectionsError;

      const sortedSections = sectionsData.map(section => ({
        ...section,
        landing_page_content: section.landing_page_content.sort((a, b) => a.sort_order - b.sort_order)
      }));

      setSections(sortedSections);
    } catch (error) {
      console.error('Error fetching landing page content:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePrevCard = () => {
    if (!cardsRef.current || cardsRef.current.length < 2) return;
    
    const cards = cardsRef.current.filter(Boolean);
    
    // For our logic where first card is in center:
    // Take the last card and move it to the front
    const lastCard = cards.pop();
    cards.unshift(lastCard);
    
    // Reset positions for visual transition
    gsap.to(cards, {
      opacity: 0.6,
      scale: 0.9,
      filter: 'blur(2px)',
      zIndex: 0,
      duration: 0.3
    });
    
    // Set the center card's styling
    gsap.to(cards[0], {
      x: '0%',
      opacity: 1,
      scale: 1,
      filter: 'blur(0px)',
      zIndex: 10,
      duration: 0.5
    });
    
    // Position cards correctly
    if (cards.length >= 2) {
      gsap.to(cards[1], { x: '100%', duration: 0.5 });
    }
    
    if (cards.length >= 3) {
      gsap.to(cards[2], { x: '-100%', duration: 0.5 });
    }
    
    // Update our reference
    cardsRef.current = cards;
  };

  const handleNextCard = () => {
    if (!cardsRef.current || cardsRef.current.length < 2) return;
    
    const cards = cardsRef.current.filter(Boolean);
    
    // For our logic where first card is in center:
    // Take the first card and move it to the end
    const firstCard = cards.shift();
    cards.push(firstCard);
    
    // Reset positions for visual transition
    gsap.to(cards, {
      opacity: 0.6,
      scale: 0.9,
      filter: 'blur(2px)',
      zIndex: 0,
      duration: 0.3
    });
    
    // Set the center card's styling
    gsap.to(cards[0], {
      x: '0%',
      opacity: 1,
      scale: 1,
      filter: 'blur(0px)',
      zIndex: 10,
      duration: 0.5
    });
    
    // Position cards correctly
    if (cards.length >= 2) {
      gsap.to(cards[1], { x: '100%', duration: 0.5 });
    }
    
    if (cards.length >= 3) {
      gsap.to(cards[2], { x: '-100%', duration: 0.5 });
    }
    
    // Update our reference
    cardsRef.current = cards;
  };

  const renderSectionContent = (section) => {
    const contents = section.landing_page_content;
    
    switch (section.name) {
      case 'hero':
        return (
          <div className=" hero flex flex-col items-center text-center ">
            {contents.map((content) => (
              <div key={content.id} className="w-1/2 flex justify-center">
                {renderContent(content)}
              </div>
            ))}
          </div>
        );
      
      case 'features':
        // Group features by pairs (heading+text with image/video)
        const featurePairs = [];
        const headers = contents.filter(c => c.type === 'h2');
        const texts = contents.filter(c => c.type === 'span');
        const media = contents.filter(c => c.type === 'video' || c.type === 'image');
        
        // Create pairs of content (assuming equal numbers or handling mismatches)
        const maxPairs = Math.max(headers.length, texts.length, media.length);
        
        return (
          <div className="flex flex-col gap-28 my-12">
            {/* Render each feature as a full section with alternating layouts */}
            {Array.from({ length: maxPairs }).map((_, index) => {
              const header = headers[index];
              const text = texts[index];
              const mediaItem = media[index];
              const isEven = index % 2 === 0;
              
              return (
                <div key={`feature-${index}`} className="w-3/4 flex flex-col md:flex-row items-center justify-center gap-14 py-6 mx-auto">
                  {/* Text content */}
                  <div className={`w-3/4 md:w-1/2 flex flex-col ${isEven ? 'md:order-1' : 'md:order-2'}`}>
                    {header && (
                      <div className="content-item">
                        {renderContent(header)}
                      </div>
                    )}
                    {text && (
                      <div className="content-item">
                        {renderContent(text)}
                      </div>
                    )}
                  </div>
                  
                  {/* Media content */}
                  <div className={`w-full md:w-1/2 ${isEven ? 'md:order-2' : 'md:order-1'}`}>
                    {mediaItem && (
                      <div className="content-item">
                        {renderContent(mediaItem)}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        );
      
      case 'solutions':
        const solutionCards = contents.filter(c => c.type === 'solution_card');
        
        // Reset cardsRef when cards change
        cardsRef.current = [];
        
        return (
          <div className="flex flex-col items-center" ref={solutionsRef}>
            {contents.filter(c => c.type === 'h2').map(content => (
              <div key={content.id} className="content-item mt-100 text-center">
                {renderContent(content)}
              </div>
            ))}
            
            {solutionCards.length > 0 && (
              <div className="w-full max-w-6xl mx-auto relative overflow-hidden py-8">
                {/* Cards container */}
                <div className="carousel-wrapper relative flex justify-center items-center min-h-[350px]">
                  {solutionCards.map((content, index) => {
                    // Position the first card in the center
                    // For a single card, it should be in the center
                    let position;
                    if (solutionCards.length === 1) {
                      position = 'center';
                    } else if (solutionCards.length === 2) {
                      // For two cards, place first in center, second on right
                      position = index === 0 ? 'center' : 'right';
                    } else {
                      // For 3+ cards, position the first in center, second on right, last on left
                      if (index === 0) {
                        position = 'center';
                      } else if (index === 1) {
                        position = 'right';
                      } else {
                        position = 'left';
                      }
                    }
                    
                    const isCenter = position === 'center';
                    
                    // Apply appropriate styles based on position
                    const baseStyles = "content-item absolute w-full max-w-md transition-all duration-300";
                    const positionStyles = {
                      left: "-translate-x-full opacity-60 scale-90 blur-[2px] z-0",
                      center: "translate-x-0 opacity-100 scale-100 z-10",
                      right: "translate-x-full opacity-60 scale-90 blur-[2px] z-0"
                    };
                    
                    return (
                      <div 
                        key={content.id} 
                        className={`${baseStyles} ${positionStyles[position]}`}
                        ref={el => cardsRef.current[index] = el}
                      >
                        {renderContent(content)}
                      </div>
                    );
                  })}
                </div>
                
                {/* Navigation buttons */}
                <button 
                  onClick={handlePrevCard}
                  className="absolute left-4 md:left-10 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 p-3 rounded-full z-20"
                  aria-label="Previous slide"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                    <polyline points="15 18 9 12 15 6"></polyline>
                  </svg>
                </button>
                
                <button 
                  onClick={handleNextCard}
                  className="absolute right-4 md:right-10 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 p-3 rounded-full z-20"
                  aria-label="Next slide"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                    <polyline points="9 18 15 12 9 6"></polyline>
                  </svg>
                </button>
              </div>
            )}
          </div>
        );
      
      default:
        return (
          <div className="flex flex-col items-center gap-8">
            {contents.map((content) => (
              <div key={content.id} className="content-item">
                {renderContent(content)}
              </div>
            ))}
          </div>
        );
    }
  };

  const renderContent = (content) => {
    switch (content.type) {
      case 'h1':
        return (
          <h1 className="text-5xl md:text-7xl font-bold py-6 bg-clip-text text-transparent bg-gradient-to-r from-white to-purple-400">
            {content.content}
            <div>
              <button className="mt-6 px-6 py-2 text-lg bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-medium rounded-full shadow-md hover:shadow-purple-500/20 transition-all duration-300 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50"
              onClick={() => window.location.href = '/signup'}
              >
                Get Started for Free
              </button>
            </div>
          </h1>
        );
      case 'h2':
        return (
          <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-white to-purple-400">
            {content.content}
          </h2>
        );
      case 'span':
        return (
          <span className="text-gray-300 text-lg">
            {content.content}
          </span>
        );
      case 'video':
        return (
          <div className="relative aspect-video rounded-xl overflow-hidden w-full" style={{minHeight: "300px"}}>
            {/* Glowing border effect */}
            <div className="absolute inset-0 rounded-xl p-[1px] bg-gradient-to-r from-indigo-500/20 via-purple-500/30 to-pink-500/20 shadow-[0_0_15px_rgba(139,92,246,0.3)]"></div>
            
            {/* Video container */}
            <div className="relative z-10 overflow-hidden rounded-xl flex items-center justify-center w-full h-full">
              <ReactPlayer
                url={content.content}
                controls={false}
                playing={true}
                loop={true}
                muted={true}
                width="100%"
                height="100%"
                className="absolute top-0 left-0"

              />
            </div>
          </div>
        );
      case 'image':
        return (
          <div className="relative aspect-video rounded-lg overflow-hidden shadow-2xl">
            <img 
              src={content.content} 
              alt=""
              className="w-full h-full object-cover"
            />
          </div>
        );
      case 'solution_card':
        const cardData = JSON.parse(content.content);
        return (
          <div className="backdrop-blur-md bg-gradient-to-br from-indigo-900/40 to-purple-900/40 border border-indigo-500/20 rounded-2xl shadow-[0_0_15px_rgba(139,92,246,0.3)] p-8 text-white h-full transition-all duration-300 hover:shadow-[0_0_25px_rgba(139,92,246,0.4)] hover:scale-[1.02]">
            <div className="mb-6 flex justify-center">
            </div>
            <h3 className="text-2xl font-bold mb-3 text-center bg-clip-text text-transparent bg-gradient-to-r from-indigo-200 to-purple-200">{cardData.title}</h3>
            <p className="text-indigo-100/80 text-center mb-6">{cardData.description}</p>
            <div className="flex justify-center">
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  // 渲染 promo banner
  const renderPromoBanner = () => {
    const promoBannerSection = sections.find(section => section.name === 'promo_banner');
    

    if (!promoBannerSection || !promoBannerSection.landing_page_content || promoBannerSection.landing_page_content.length === 0) {
      
      return null;
    }

    const bannerContent = promoBannerSection.landing_page_content[0];
    if (!bannerContent) {
      
      return null;
    }

    try {
      const bannerSettings = JSON.parse(bannerContent.content);
      
      
      // 移除 isEnabled 检查，只检查是否有 promo code
      if (!bannerSettings.selectedPromoCode) {
        
        return null;
      }

      return (
        <div style={{ 
          position: 'relative', 
          top: 0, 
          left: 0, 
          right: 0, 
          width: '100%', 
          backgroundColor: '#a855f7', 
          color: 'white', 
          padding: '0.5rem 0', 
          zIndex: 20 
        }} className="shadow-lg">
          <div className="container mx-auto px-4">
            <div className="text-center text-lg font-bold tracking-wide">
              {bannerSettings.selectedPromoCode && (
                <>
                  Special Offer! Use code{' '}
                  <span className="font-black bg-purple-700 px-3 py-1 rounded mx-1">
                    "{bannerSettings.selectedPromoCode}"
                  </span>
                  {' '}for a discount!
                </>
              )}
            </div>
          </div>
        </div>
      );
    } catch (e) {
      console.error('Error parsing promo banner settings:', e);
      return null;
    }
  };

  const promoBanner = renderPromoBanner();
  
  return (
    <>
      {promoBanner}
      <div className="min-h-screen bg-black relative overflow-x-hidden">
        {/* Add padding-top to account for the fixed header and promo banner */}
        <div style={{ width: '100%', paddingTop: promoBanner ? '3rem' : '0' }}>
          {/* Futuristic Grid Background */}
          <div className="absolute inset-0 z-0 overflow-hidden">
            {/* Grid Lines */}
            <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.25)_1px,transparent_1px)] bg-[size:40px_40px]"></div>
            
            {/* Horizontal Lines */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[size:40px_40px]"></div>
            
            {/* Vertical Lines */}
            <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[size:40px_40px]"></div>
            
            {/* Darker Purple-Blue Gradient Overlays */}
            <div className="absolute inset-0 bg-gradient-to-tr from-purple-950/30 via-indigo-950/20 to-blue-950/30"></div>
            <div className="absolute inset-0 bg-gradient-to-bl from-blue-950/20 via-violet-950/20 to-purple-950/30"></div>
            <div className="absolute inset-0 bg-[conic-gradient(from_0deg_at_50%_50%,rgba(58,30,98,0.15)_0%,rgba(67,26,107,0.15)_25%,rgba(30,64,175,0.15)_50%,rgba(79,70,229,0.15)_75%,rgba(58,30,98,0.15)_100%)]"></div>
            
            {/* Animated Gradient Border */}
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-purple-800 to-transparent opacity-25"></div>
            <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-blue-800 to-transparent opacity-25"></div>
            <div className="absolute inset-y-0 left-0 w-px bg-gradient-to-b from-transparent via-indigo-800 to-transparent opacity-25"></div>
            <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-violet-800 to-transparent opacity-25"></div>
            
            {/* Darker Purple-Blue Glowing Orbs */}
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-r from-purple-900/20 to-indigo-900/20 rounded-full filter blur-[100px]"></div>
            <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-gradient-to-r from-blue-900/20 to-indigo-900/20 rounded-full filter blur-[100px]"></div>
            <div className="absolute top-2/3 left-1/3 w-64 h-64 bg-gradient-to-r from-violet-900/20 to-purple-900/20 rounded-full filter blur-[80px]"></div>
            <div className="absolute top-1/3 right-1/3 w-72 h-72 bg-gradient-to-r from-indigo-900/20 to-blue-900/20 rounded-full filter blur-[90px]"></div>
          </div>
          
          <div className="container mx-auto px-4 z-10 relative">
            {sections.map((section, index) => (
              <section
                key={section.id}
                ref={el => sectionsRef.current[index] = el}
                className={`w-full py-10 ${section.name === 'hero'}`}
              >
                {renderSectionContent(section)}
              </section>
            ))}
          </div>

          {/* Pricing Page Redirect section */}
          <section className="w-full mt-0" ref={pricingRef}>
            <div className="flex flex-col items-center text-center content-item">
              <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-white to-purple-400">
                Our Pricing
              </h2>
              <p className="text-gray-300 text-lg mb-8 max-w-2xl">
                Choose the perfect plan for your needs. Start free and scale as you grow.
              </p>
              <button 
                className="px-8 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-medium rounded-full shadow-lg hover:shadow-purple-500/20 transition-all duration-300 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50"
                onClick={() => window.location.href = '/pricing'}
              >
                View Pricing Plans
              </button>
            </div>
            <div className="h-24"></div>
          </section>

          {/* Footer Section */}
          <footer className="w-full py-12 mt-16 border-t border-gray-800" ref={footerRef}>
            <div className="container mx-auto px-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                <div className="mb-8 md:mb-0 footer-item">
                  <h3 className="text-xl font-bold mb-4 text-white">Project Management</h3>
                  <p className="text-gray-400">Simplify your workflow and boost productivity with our intuitive project management solution.</p>
                </div>
                
                <div className="mb-8 md:mb-0 footer-item">
                  <h4 className="text-lg font-semibold mb-4 text-white">Product</h4>
                  <ul className="space-y-2">
                    <li><a href="#" className="text-gray-400 hover:text-purple-400 transition-colors">Features</a></li>
                    <li><a href="#" className="text-gray-400 hover:text-purple-400 transition-colors">Solutions</a></li>
                    <li><a href="#" className="text-gray-400 hover:text-purple-400 transition-colors">Pricing</a></li>
                    <li><a href="#" className="text-gray-400 hover:text-purple-400 transition-colors">Updates</a></li>
                  </ul>
                </div>
                
                <div className="mb-8 md:mb-0 footer-item">
                  <h4 className="text-lg font-semibold mb-4 text-white">Company</h4>
                  <ul className="space-y-2">
                    <li><a href="#" className="text-gray-400 hover:text-purple-400 transition-colors">About</a></li>
                    <li><a href="#" className="text-gray-400 hover:text-purple-400 transition-colors">Blog</a></li>
                    <li><a href="#" className="text-gray-400 hover:text-purple-400 transition-colors">Careers</a></li>
                    <li><a href="#" className="text-gray-400 hover:text-purple-400 transition-colors">Contact</a></li>
                  </ul>
                </div>
                
                <div className="footer-item">
                  <h4 className="text-lg font-semibold mb-4 text-white">Connect</h4>
                  <div className="flex space-x-4">
                    <a href="#" className="text-gray-400 hover:text-purple-400 transition-colors">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>
                    </a>
                    <a href="#" className="text-gray-400 hover:text-purple-400 transition-colors">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"></path></svg>
                    </a>
                    <a href="#" className="text-gray-400 hover:text-purple-400 transition-colors">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
                    </a>
                    <a href="#" className="text-gray-400 hover:text-purple-400 transition-colors">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path><rect x="2" y="9" width="4" height="12"></rect><circle cx="4" cy="4" r="2"></circle></svg>
                    </a>
                  </div>
                </div>
              </div>
              
              <div className="mt-12 pt-8 border-t border-gray-800 flex flex-col md:flex-row justify-between items-center footer-item">
                <p className="text-gray-400 text-sm mb-4 md:mb-0">© 2025 Team Sync Project Management System. All rights reserved.</p>
                <div className="flex space-x-6">
                  <a href="#" className="text-gray-400 hover:text-purple-400 transition-colors text-sm">Privacy Policy</a>
                  <a href="#" className="text-gray-400 hover:text-purple-400 transition-colors text-sm">Terms of Service</a>
                  <a href="#" className="text-gray-400 hover:text-purple-400 transition-colors text-sm">Cookie Policy</a>
                </div>
              </div>
            </div>
          </footer>
        </div>
      </div>
    </>
  );
}
