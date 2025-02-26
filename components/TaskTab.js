'use client';

import { useTranslations } from 'next-intl';
import { Plus, List, LayoutDashboard, LayoutGrid, Calendar, GanttChart } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useState } from 'react';

export default function TaskTab({ onViewChange }) {
  const t = useTranslations('CreateTask');
  const [activeTab, setActiveTab] = useState("list");

  const handleTabChange = (value) => {
    setActiveTab(value);
    onViewChange?.(value);
  };

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange}>
      <TabsList className="border-b-0">
        <TabsTrigger value="list" className="flex items-center gap-1">
          <List className="h-4 w-4" />
          {t('list')}
        </TabsTrigger>
        <TabsTrigger value="dashboard" className="flex items-center gap-1">
          <LayoutDashboard className="h-4 w-4" />
          {t('dashboard')}
        </TabsTrigger>
        <TabsTrigger value="board" className="flex items-center gap-1">
          <LayoutGrid className="h-4 w-4" />
          {t('board')}
        </TabsTrigger>
        <TabsTrigger value="calendar" className="flex items-center gap-1">
          <Calendar className="h-4 w-4" />
          {t('calendar')}
        </TabsTrigger>
        <TabsTrigger value="gantt" className="flex items-center gap-1">
          <GanttChart className="h-4 w-4" />
          {t('gantt')}
        </TabsTrigger>
        <Button variant="ghost" size="icon" className="ml-1 hover:bg-accent hover:text-accent-foreground">
          <Plus className="h-4 w-4" />
        </Button>
      </TabsList>
    </Tabs>
  );
}
