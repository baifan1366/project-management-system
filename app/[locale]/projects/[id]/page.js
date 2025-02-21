'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Plus, Filter, SortAsc, Grid, MoreHorizontal, Share2, Palette } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

export default function TaskList() {
  const t = useTranslations('');
  const router = useRouter();

  return (
    <div className="container mx-auto px-4 py-2">
      <Card className="border-0 bg-background text-foreground">
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => router.push('/projects')}
                className="text-gray-800 mr-4 dark:text-gray-200"
              >
                ←
              </button>
              <h2 className="text-xl font-semibold">Project Name</h2>
              <Button variant="ghost" size="sm">
                Set status
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon">
                <Share2 className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon">
                <Palette className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <Tabs defaultValue="list" className="mt-2">
            <TabsList>
              <TabsTrigger value="list">List</TabsTrigger>
              <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
              <Button variant="ghost" size="icon" className="ml-1">
                <Plus className="h-4 w-4" />
              </Button>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent className="p-0">
          <div className="border-b p-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Add task
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm">
                <Filter className="h-4 w-4 mr-1" />
                Filter
              </Button>
              <Button variant="ghost" size="sm">
                <SortAsc className="h-4 w-4 mr-1" />
                Sort
              </Button>
              <Button variant="ghost" size="sm">
                <Grid className="h-4 w-4 mr-1" />
                Group
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem>Options</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          <div className="p-4 space-y-2">
            <Input placeholder="e.g. Determine project goal" />
            <Input placeholder="e.g. Schedule kickoff meeting" />
            <Input placeholder="e.g. Set final deadline" />
            <Button variant="ghost" className="w-full justify-start" size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Add section
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

