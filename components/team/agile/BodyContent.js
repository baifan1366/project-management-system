"use client";

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

const BodyContent = ({ children, title, loading = false }) => {
  const [isLoading, setIsLoading] = useState(loading);
  
  useEffect(() => {
    setIsLoading(loading);
  }, [loading]);

  if (isLoading) {
    return (
      <Card className="w-full p-6">
        <div className="space-y-4">
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </Card>
    );
  }
  
  return (
    <Card className="w-full p-4">
      {title && <h3 className="text-xl font-semibold mb-4">{title}</h3>}
      <div className="space-y-4">
        {children}
      </div>
    </Card>
  );
};

export default BodyContent;
