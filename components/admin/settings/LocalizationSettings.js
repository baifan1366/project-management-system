'use client';

import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default function LocalizationSettings() {
  const [settings, setSettings] = useState({
    language: 'en',
    timezone: 'UTC',
    dateFormat: 'YYYY-MM-DD'
  });

  const languages = [
    { value: 'en', label: 'English' },
    { value: 'zh', label: '中文' },
    { value: 'es', label: 'Español' }
  ];

  const timezones = [
    { value: 'UTC', label: 'UTC' },
    { value: 'Asia/Shanghai', label: 'China Standard Time' },
    { value: 'America/New_York', label: 'Eastern Time' }
  ];

  const dateFormats = [
    { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' },
    { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
    { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' }
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4">
        <div className="space-y-2">
          <Label>Default Language</Label>
          <Select
            value={settings.language}
            onValueChange={(value) => setSettings(prev => ({ ...prev, language: value }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select language" />
            </SelectTrigger>
            <SelectContent>
              {languages.map(lang => (
                <SelectItem key={lang.value} value={lang.value}>
                  {lang.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Timezone</Label>
          <Select
            value={settings.timezone}
            onValueChange={(value) => setSettings(prev => ({ ...prev, timezone: value }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select timezone" />
            </SelectTrigger>
            <SelectContent>
              {timezones.map(tz => (
                <SelectItem key={tz.value} value={tz.value}>
                  {tz.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Date Format</Label>
          <Select
            value={settings.dateFormat}
            onValueChange={(value) => setSettings(prev => ({ ...prev, dateFormat: value }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select date format" />
            </SelectTrigger>
            <SelectContent>
              {dateFormats.map(format => (
                <SelectItem key={format.value} value={format.value}>
                  {format.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Button className="mt-4">
        Save Changes
      </Button>
    </div>
  );
} 