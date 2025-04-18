'use client';

import { useState } from 'react';
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function ThemeSettings() {
  const [settings, setSettings] = useState({
    darkMode: false,
    fontSize: 'medium',
    colorScheme: 'default'
  });

  const fontSizes = [
    { value: 'small', label: 'Small' },
    { value: 'medium', label: 'Medium' },
    { value: 'large', label: 'Large' }
  ];

  const colorSchemes = [
    { value: 'default', label: 'Default' },
    { value: 'blue', label: 'Blue' },
    { value: 'green', label: 'Green' },
    { value: 'purple', label: 'Purple' }
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="darkMode">Dark Mode</Label>
          <Switch
            id="darkMode"
            checked={settings.darkMode}
            onCheckedChange={(checked) => setSettings(prev => ({ ...prev, darkMode: checked }))}
          />
        </div>

        <div className="space-y-2">
          <Label>Font Size</Label>
          <Select
            value={settings.fontSize}
            onValueChange={(value) => setSettings(prev => ({ ...prev, fontSize: value }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select font size" />
            </SelectTrigger>
            <SelectContent>
              {fontSizes.map(size => (
                <SelectItem key={size.value} value={size.value}>
                  {size.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Color Scheme</Label>
          <Select
            value={settings.colorScheme}
            onValueChange={(value) => setSettings(prev => ({ ...prev, colorScheme: value }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select color scheme" />
            </SelectTrigger>
            <SelectContent>
              {colorSchemes.map(scheme => (
                <SelectItem key={scheme.value} value={scheme.value}>
                  {scheme.label}
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