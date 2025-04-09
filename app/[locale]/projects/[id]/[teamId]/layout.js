'use client';

export default function TeamLayout({ children }) {
  return (
    <div className="h-screen w-full overflow-hidden">
      <div className="h-full w-full px-4 overflow-auto">
        {children}
      </div>
    </div>
  );
}
