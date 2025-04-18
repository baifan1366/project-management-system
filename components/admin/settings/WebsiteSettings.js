'use client';

import { useState } from 'react';
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import Image from 'next/image';

export default function WebsiteSettings() {
  const [settings, setSettings] = useState({
    siteName: '',
    logo: null,
    favicon: null
  });

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Handle logo upload
      setSettings(prev => ({ ...prev, logo: file }));
    }
  };

  const handleFaviconUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Handle favicon upload
      setSettings(prev => ({ ...prev, favicon: file }));
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4">
        <div className="space-y-2">
          <Label htmlFor="siteName">Website Name</Label>
          <Input
            id="siteName"
            placeholder="Enter website name"
            value={settings.siteName}
            onChange={(e) => setSettings(prev => ({ ...prev, siteName: e.target.value }))}
          />
        </div>

        <div className="space-y-2">
          <Label>Logo</Label>
          <div className="flex items-center gap-4">
            {settings.logo && (
              <div className="relative w-20 h-20">
                <Image
                  src={URL.createObjectURL(settings.logo)}
                  alt="Logo preview"
                  fill
                  className="object-contain"
                />
              </div>
            )}
            <Input
              type="file"
              accept="image/*"
              onChange={handleLogoUpload}
              className="max-w-[300px]"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Favicon</Label>
          <div className="flex items-center gap-4">
            {settings.favicon && (
              <div className="relative w-8 h-8">
                <Image
                  src={URL.createObjectURL(settings.favicon)}
                  alt="Favicon preview"
                  fill
                  className="object-contain"
                />
              </div>
            )}
            <Input
              type="file"
              accept="image/x-icon,image/png"
              onChange={handleFaviconUpload}
              className="max-w-[300px]"
            />
          </div>
        </div>
      </div>

      <Button className="mt-4">
        Save Changes
      </Button>
    </div>
  );
} 