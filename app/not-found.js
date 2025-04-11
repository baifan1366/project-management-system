"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function NotFound() {
  const router = useRouter();
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          router.push("/");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-xl overflow-hidden">
        <div className="p-8">
          <div className="flex justify-center mb-6">
            <Image 
              src="/pengy.webp" 
              alt="404 Penguin" 
              width={150} 
              height={150}
              className="drop-shadow-md rounded-full"
              onError={(e) => {
                e.target.src = "/logo.png";
              }}
            />
          </div>
          
          <h1 className="text-4xl font-bold text-center text-gray-800 mb-2">404</h1>
          <h2 className="text-2xl font-semibold text-center text-gray-700 mb-6">Page Not Found</h2>
          
          <p className="text-gray-600 text-center mb-8">
            Sorry, the page you are looking for does not exist or has been moved.
          </p>
          
          <div className="flex flex-col space-y-4">
            <Link 
              href="/" 
              className="px-6 py-3 bg-blue-600 text-white font-medium rounded-md text-center hover:bg-blue-700 transition-colors duration-300"
            >
              Back to Home
            </Link>
            
            <button 
              onClick={() => router.back()}
              className="px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-md text-center hover:bg-gray-50 transition-colors duration-300"
            >
              Go Back
            </button>
          </div>
          
          <p className="text-sm text-gray-500 text-center mt-6">
            You will be redirected to home page in {countdown} seconds...
          </p>
        </div>
      </div>
    </div>
  );
} 