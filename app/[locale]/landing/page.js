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
              markers: false // Set to true for debugging
            }
          }
        );
      });
    });

    // Solutions section special animation with improved scroll triggering
    if (solutionsRef.current && cardsRef.current.length > 0) {
      animateCards();
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
          <div className=" herooo flex flex-col items-center text-center ">
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
          <div className="flex flex-col gap-24">
            {/* Render each feature as a full section with alternating layouts */}
            {Array.from({ length: maxPairs }).map((_, index) => {
              const header = headers[index];
              const text = texts[index];
              const mediaItem = media[index];
              const isEven = index % 2 === 0;
              
              return (
                <div key={`feature-${index}`} className="w-full flex flex-col md:flex-row items-center justify-between gap-12">
                  {/* Text content */}
                  <div className={`w-full md:w-1/2 flex flex-col ${isEven ? 'md:order-1' : 'md:order-2'}`}>
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
                
                {/* Slide indicators */}
                {/* <div className="flex justify-center mt-6 space-x-2">
                  {Array.from({ length: solutionCards.length }).map((_, i) => (
                    <div 
                      key={i} 
                      className={`h-2 w-2 rounded-full transition-all ${i === 1 ? 'bg-white' : 'bg-white/30'}`}
                    />
                  ))}
                </div> */}
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
          <div className="relative aspect-video rounded-lg overflow-hidden shadow-2xl">
            <ReactPlayer
              url={content.content}
              controls={false}  // 👈 disables all default controls
              playing={true}     // autoplay if needed
              loop={true}        // optional
              muted={true}     
              width="100%"
              height="100%"
              style={{ borderRadius: "12px" }}
            />
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
          <div className="bg-gradient-to-b from-[#1e9e6a] to-[#0d8c5c] rounded-xl shadow-xl p-8 text-white h-full">
            <h3 className="text-2xl font-bold mb-4 text-center">{cardData.title}</h3>
            <p className="text-gray-100 text-center mb-6">{cardData.description}</p>
            <div className="flex justify-center">
              <button className="px-6 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors">
                Learn More
              </button>
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

  return (
    <div className="min-h-screen bg-black relative overflow-x-hidden">
      <div className="container mx-auto px-4 z-10">
        {sections.map((section, index) => (
          <section
            key={section.id}
            ref={el => sectionsRef.current[index] = el}
            className={`w-full py-16 ${section.name === 'hero'}`}
          >
            {renderSectionContent(section)}
          </section>
        ))}
      </div>
    </div>
  );
}
