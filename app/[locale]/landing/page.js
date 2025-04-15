"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

// Dynamically import ReactPlayer to avoid SSR issues
const ReactPlayer = dynamic(() => import("react-player/lazy"), { ssr: false });

export default function landingPage() {
  // Create refs for the elements we want to observe
  const h1Ref = useRef(null);
  const tab1Ref = useRef(null);
  const tab2Ref = useRef(null);
  const section2Ref = useRef(null);
  const section3Ref = useRef(null);
  const carouselRef = useRef(null);
  const carouselTrackRef = useRef(null);
  const [activeSlide, setActiveSlide] = useState(1);
  const [isAnimating, setIsAnimating] = useState(false);
  const [slideDirection, setSlideDirection] = useState(null);
  
  // Define carousel content
  const carouselContent = [
    {
      id: 1,
      title: "AI Assistant",
      content: "Powerful AI chatbots that integrate with your business systems.",
      color: "from-purple-600 to-indigo-700"
    },
    {
      id: 2,
      title: "Workflow",
      content: "Automate complex business processes with intelligent workflows.",
      color: "from-blue-600 to-cyan-700"
    },
    {
      id: 3,
      title: "Analytics",
      content: "Turn your data into actionable insights with AI-powered analytics.",
      color: "from-emerald-600 to-teal-700"
    },
    {
      id: 4,
      title: "Content",
      content: "Generate high-quality content at scale for marketing and communications.",
      color: "from-rose-600 to-pink-700"
    },
    {
      id: 5,
      title: "Integration",
      content: "Connect all your business tools with our seamless integration platform.",
      color: "from-amber-600 to-orange-700"
    }
  ];

  useEffect(() => {
    // Register ScrollTrigger plugin
    gsap.registerPlugin(ScrollTrigger);

    // GSAP animation for h1 element
    gsap.fromTo(
      h1Ref.current,
      {
        opacity: 0,
        y: 40,
      },
      {
        opacity: 1,
        y: 0,
        duration: 1,
        ease: "power3.inOut",
        scrollTrigger: {
          trigger: h1Ref.current,
          start: "top 50%",
          toggleActions: "play reverse play",
        },
      }
    );

    // GSAP animation for tab elements
    const tabs = [tab1Ref.current, tab2Ref.current];
    gsap.fromTo(
      tabs,
      {
        opacity: 0,
        y: 30,
      },
      {
        opacity: 1,
        y: 0,
        duration: 0.7,
        ease: "power2.out",
        scrollTrigger: {
          trigger: tabs,
          start: "top 90%",
          toggleActions: "play reverse play",
        },
      }
    );

    // GSAP animation for section 2
    if (section2Ref.current) {
      gsap.fromTo(
        section2Ref.current.querySelectorAll("h2, span"),
        {
          opacity: 0,
        },
        {
          opacity: 1,
          duration: 0.8,
          stagger: 0.1,
          ease: "power2.out",
          scrollTrigger: {
            trigger: section2Ref.current,
            start: "top 0%",
            toggleActions: "play",
          },
        }
      );
    }

    // GSAP animation for section 3
    if (section3Ref.current) {
      gsap.fromTo(
        section3Ref.current.querySelectorAll("h2, span"),
        {
          opacity: 0,
        },
        {
          opacity: 1,
          duration: 0.8,
          stagger: 0.1,
          ease: "power2.out",
          scrollTrigger: {
            trigger: section3Ref.current,
            start: "top 50%",
            toggleActions: "play",
          },
        }
      );
    }

    // GSAP animation for carousel
    if (carouselRef.current) {
      gsap.fromTo(
        carouselRef.current.querySelectorAll(".carousel-item"),
        {
          opacity: 0,
          y: 30,
        },
        {
          opacity: 1,
          y: 0,
          duration: 1.0,
          stagger: 0.2,
          ease: "power3.out",
          scrollTrigger: {
            trigger: carouselRef.current,
            start: "top 70%",
            toggleActions: "play",
          },
        }
      );
    }

    // Cleanup function
    return () => {
      ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
    };
  }, []);
  
  // Effect for carousel slide animations
  useEffect(() => {
    if (!carouselTrackRef.current || !slideDirection) return;
    
    setIsAnimating(true);
    
    // Animate the track for slide transition with more fluid movement
    gsap.to(
      carouselTrackRef.current,
      {
        duration: 0.8,
        ease: "power2.inOut",
        onComplete: () => {
          setIsAnimating(false);
          setSlideDirection(null);
        }
      }
    );
    
    // Get all carousel cards
    const cards = carouselTrackRef.current.querySelectorAll('.carousel-card');
    
    // More fluid, circular animation for each card
    gsap.fromTo(
      cards,
      {
        x: slideDirection === 'right' ? -50 : 50,
        opacity: 0.7,
        scale: 0.85
      },
      {
        x: 0,
        opacity: function(i) {
          // Center card (index 1) has full opacity
          return i === 1 ? 1 : 0.8;
        },
        scale: function(i) {
          // Center card (index 1) has full scale
          return i === 1 ? 1 : 0.95;
        },
        duration: 0.8,
        stagger: {
          each: 0.1,
          from: slideDirection === 'right' ? 'start' : 'end'
        },
        ease: "power3.out"
      }
    );
    
  }, [activeSlide, slideDirection]);

  const nextSlide = () => {
    if (isAnimating) return;
    setSlideDirection('right');
    setActiveSlide((prev) => (prev === carouselContent.length ? 1 : prev + 1));
  };

  const prevSlide = () => {
    if (isAnimating) return;
    setSlideDirection('left');
    setActiveSlide((prev) => (prev === 1 ? carouselContent.length : prev - 1));
  };

  const goToSlide = (slideNumber) => {
    if (isAnimating || slideNumber === activeSlide) return;
    setSlideDirection(slideNumber > activeSlide ? 'right' : 'left');
    setActiveSlide(slideNumber);
  };

  // Helper function to get visible slides array with wrap around
  const getVisibleSlides = () => {
    const totalSlides = carouselContent.length;
    
    // Calculate previous and next slide indexes with wrap around
    const prevSlide = activeSlide === 1 ? totalSlides : activeSlide - 1;
    const nextSlide = activeSlide === totalSlides ? 1 : activeSlide + 1;
    
    // Return array of slide indexes to display
    return [prevSlide, activeSlide, nextSlide];
  };

  return (
    // Update the big div to prevent horizontal overflow
    <div className="min-h-screen bg-black relative overflow-x-hidden">
      {/*container*/}
      <div className="container mx-auto px-4 z-10 flex flex-col items-center gap-10">
        {/*section 1*/}
        <section className="mb-20">
          <div className="text-center mb-12">
            <h1
              ref={h1Ref}
              className="text-5xl md:text-7xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-white to-purple-400 mt-12"
            >
              Build Your Ultimate
              <br />
              AI Agent Workforce.
            </h1>
          </div>
          <div className="flex flex-col items-center text-center">
            {/*tabs conatainer*/}
            <div className="flex flex-row gap-8 mb-10">
              {/*tab item*/}
              <div ref={tab1Ref} className="flex flex-col items-center">
                <div className="h-10 w-10 bg-purple-900 rounded-full flex items-center justify-center mb-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5z" />
                  </svg>
                </div>
                <span className="text-xs">AI Chat</span>
              </div>

              {/*tab item*/}
              <div ref={tab2Ref} className="flex flex-col items-center">
                <div className="h-10 w-10 bg-purple-900 rounded-full flex items-center justify-center mb-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5z" />
                  </svg>
                </div>
                <span className="text-xs">AI Automation</span>
              </div>
            </div>
            {/* Video Section */}
            <div className="w-full max-w-4xl">
              <div className="relative aspect-video rounded-lg overflow-hidden">
                <ReactPlayer
                  url="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
                  width="100%"
                  height="100%"
                  style={{ borderRadius: "12px" }}
                  controls
                />
              </div>
            </div>
          </div>
        </section>

        {/*section 2*/}
        <section ref={section2Ref} className="w-full py-16">
          <div className="flex flex-row items-center justify-between gap-8">
            <div className="w-1/2 text-center flex flex-col justify-center">
              <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-white to-purple-400">
                Advanced Features
              </h2>
              <span>Hey hey hey</span>
            </div>

            {/* Video Section */}
            <div className="w-1/2">
              <div className="relative aspect-video rounded-lg overflow-hidden">
                <ReactPlayer
                  url="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
                  width="100%"
                  height="100%"
                  style={{ borderRadius: "12px" }}
                  controls
                />
              </div>
            </div>
          </div>
        </section>

        {/*section 3*/}
        <section ref={section3Ref} className="w-full py-16">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            {/* Video Left*/}
            <div className="w-1/2">
              <div className="relative aspect-video rounded-lg overflow-hidden shadow-2xl">
                <ReactPlayer
                  url="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
                  width="100%"
                  height="100%"
                  style={{ borderRadius: "12px" }}
                  controls
                />
              </div>
            </div>

            {/* Text Right*/}
            <div className="w-1/2 text-center flex flex-col justify-center">
              <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-white to-purple-400">
                Advanced Features
              </h2>
              <span>Hey hey hey</span>
            </div>
          </div>
        </section>

        {/*section 4*/}
        <section ref={carouselRef} className="w-full py-16 mb-20">
          <h2 className="text-4xl md:text-5xl font-bold mb-10 text-center bg-clip-text text-transparent bg-gradient-to-r from-white to-purple-400">
            Our Solutions
          </h2>

          {/* Change w-screen to w-full to prevent overflow */}
          <div className="relative w-full overflow-hidden py-16">
            {/* Add absolute positioned nav buttons */}
            <button
              onClick={prevSlide}
              disabled={isAnimating}
              className="absolute left-8 top-1/2 -translate-y-1/2 z-30 p-3 focus:outline-none"
              aria-label="Previous slide"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-white/70 hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            
            <button
              onClick={nextSlide}
              disabled={isAnimating}
              className="absolute right-8 top-1/2 -translate-y-1/2 z-30 p-3 focus:outline-none"
              aria-label="Next slide"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-white/70 hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
            
            <div ref={carouselTrackRef} className="flex justify-center items-center transition-all duration-800 ease-in-out">
              {getVisibleSlides().map((slideIndex, i) => {
                const slide = carouselContent[slideIndex - 1];
                const isActive = slideIndex === activeSlide;
                
                // Position cards differently based on their position in carousel
                let position = '';
                if (i === 0) position = 'origin-right -translate-x-4';
                if (i === 2) position = 'origin-left translate-x-4';
                
                return (
                  <div
                    key={slide.id}
                    className={`carousel-card transform transition-all duration-1000 bg-gradient-to-b ${slide.color} rounded-xl shadow-xl mx-4 overflow-hidden ${position}
                      ${isActive 
                        ? 'w-[40%] h-96 z-10 opacity-100 scale-100' 
                        : 'w-[25%] h-80 opacity-75 scale-90 blur-[2px]'
                      }
                    `}
                  >
                    {/* Show content in all cards (active and inactive) */}
                    <div className="flex flex-col items-center justify-center h-full p-8 text-white">
                      <h3 className={`${isActive ? 'text-3xl' : 'text-2xl'} font-bold mb-4 text-center`}>{slide.title}</h3>
                      {isActive ? (
                        <p className="text-center text-lg">{slide.content}</p>
                      ) : (
                        <p className="text-center text-sm opacity-90 overflow-hidden max-h-12">{slide.content.length > 60 ? `${slide.content.substring(0, 60)}...` : slide.content}</p>
                      )}
                      {isActive && (
                        <button className="mt-8 px-6 py-2 bg-white text-gray-900 rounded-full hover:bg-gray-100 transition-colors font-medium">
                          Learn More
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* Carousel Indicators */}
            <div className="flex justify-center items-center mt-10">
              <div className="flex gap-3">
                {carouselContent.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => goToSlide(item.id)}
                    className={`relative w-3 h-3 rounded-full transition-all duration-300 ease-in-out
                      ${activeSlide === item.id 
                        ? "bg-purple-500 scale-125" 
                        : "bg-gray-400 hover:bg-gray-300"
                      }
                    `}
                    aria-label={`Go to slide ${item.id}`}
                    disabled={isAnimating}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
