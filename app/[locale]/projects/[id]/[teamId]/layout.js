'use client';

export default function TeamLayout({ children }) {
  return (
    <div className="flex flex-col h-screen">
      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </div>
  );
}
