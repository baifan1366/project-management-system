'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RichEditor } from '@/components/ui/rich-editor';
import { Circle, CheckCircle2, Plus, CircleHelp, MoreHorizontal, ChevronDown, EllipsisVertical, Pin } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function TaskOverview({ projectId, teamId, teamCFId }) {
    const [description, setDescription] = useState('');
    const [expandedSections, setExpandedSections] = useState({
        description: true,
        members: true,
        announcements: true
    });

    const handleDescriptionChange = (html) => {
        setDescription(html);
        // 这里可以添加保存到数据库的逻辑
    };

    const toggleSection = (section) => {
        setExpandedSections(prev => ({
            ...prev,
            [section]: !prev[section]
        }));
    };

    return (
        <div className="flex flex-col gap-1 p-0">
            <Card className="border-transparent shadow-none p-0">
                <CardHeader className="px-2 pb-2 pt-2 flex flex-row items-center justify-start">
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-5 w-5 p-0 mr-2" 
                        onClick={() => toggleSection('description')}
                    >
                        <ChevronDown className={`h-4 w-4 text-muted-foreground pb-0 ${!expandedSections.description ? 'transform rotate-[-90deg]' : ''}`} />
                    </Button>
                    <CardTitle className="text-lg font-medium mr-2 pb-[3px]">Team Description</CardTitle>
                    <CircleHelp className="h-5 w-5 text-muted-foreground pb-[3px]" />
                </CardHeader>
                {expandedSections.description && (
                    <CardContent className="px-2 py-0">
                        <div className="flex flex-col gap-1">
                            <RichEditor 
                                id="task-description" 
                                placeholder="What's the team about?" 
                                className="py-2 px-3 border-transparent shadow-none hover:border-border focus-visible:border-border text-muted-background"
                                value={description}
                                onChange={handleDescriptionChange}
                                minHeight="100px"
                            />
                        </div>
                    </CardContent>
                )}
            </Card>

            <Card className="border-transparent shadow-none p-0">
                <CardHeader className="px-2 pb-2 flex flex-row items-center justify-start">
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-5 w-5 p-0 mr-2" 
                        onClick={() => toggleSection('members')}
                    >
                        <ChevronDown className={`h-4 w-4 text-muted-foreground pb-0 ${!expandedSections.members ? 'transform rotate-[-90deg]' : ''}`} />
                    </Button>
                    <CardTitle className="text-lg font-medium mr-2 pb-[3px]">Members Role</CardTitle>
                </CardHeader>
                {expandedSections.members && (
                    <CardContent className="px-2 py-1 ">
                        <div className="flex items-center justify-start flex-row gap-4 h-full">
                            <div className="flex flex-row gap-2">
                                <Avatar>
                                    <AvatarImage src="https://github.com/shadcn.png" />
                                    <AvatarFallback>CN</AvatarFallback>
                                </Avatar>
                                <div className="flex flex-col gap-0">
                                    <div className=''>
                                        <span className="text-sm font-medium">John Doe</span>
                                    </div>                            
                                    <div className='flex items-center gap-2 mt-0'>
                                        <span className="text-sm text-muted-foreground">Project Manager</span>
                                        <DropdownMenu className="hidden hover:visible">
                                            <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-6 w-6 -mt-0.5">
                                                <MoreHorizontal className="h-3 w-3" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent>
                                            <DropdownMenuItem>Project Manager</DropdownMenuItem>
                                            <DropdownMenuItem>Product Manager</DropdownMenuItem>
                                            <DropdownMenuItem>Developer</DropdownMenuItem>
                                            <DropdownMenuItem>Designer</DropdownMenuItem>
                                            <DropdownMenuItem>Quality Assurance</DropdownMenuItem> 
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </div>
                            </div>
                            <div className="flex flex-row gap-2 cursor-pointer">
                                <Avatar className="bg-muted hover:bg-muted/80 flex items-center justify-center">
                                    <Plus className="h-4 w-4 text-muted-foreground" />
                                </Avatar>
                                <div className="flex flex-col gap-0 justify-center">
                                    <span className="text-sm font-medium text-muted-foreground">Add Member</span>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                )}
            </Card>

            <Card className="border-transparent shadow-none p-0">
                <CardHeader className="px-2 pb-2 flex flex-row items-center justify-start">
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-5 w-5 p-0 mr-2" 
                        onClick={() => toggleSection('announcements')}
                    >
                        <ChevronDown className={`h-4 w-4 text-muted-foreground pb-0 ${!expandedSections.announcements ? 'transform rotate-[-90deg]' : ''}`} />
                    </Button>
                    <CardTitle className="text-lg font-medium mr-2 pb-[3px]">Announcements</CardTitle>
                </CardHeader>
                {expandedSections.announcements && (
                    <CardContent className="px-2 py-1">
                        <div className="flex flex-col gap-1">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead></TableHead>
                                        <TableHead>Discussions</TableHead>
                                        <TableHead>Started By</TableHead>
                                        <TableHead>Last Post</TableHead>
                                        <TableHead className="text-center">Likes</TableHead>
                                        <TableHead className="text-center">Replies</TableHead>
                                        <TableHead></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody> 
                                    <TableRow>
                                        <TableCell className="w-10">
                                            <div className="flex flex-row items-center gap-2">
                                                <Pin className="h-4 w-4 text-muted-foreground" />
                                            </div>
                                        </TableCell>
                                        <TableCell className="w-200">
                                            <div className="flex flex-row items-center gap-2 cursor-pointer hover:underline">                                            
                                                <span className="text-sm font-medium">Team Introduction</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-row items-center gap-2">
                                                <span className="text-sm font-medium">John Doe</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-row items-center gap-2">
                                                <span className="text-sm font-medium">John Doe</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <span className="text-sm font-medium">2</span>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <span className="text-sm font-medium">2</span>
                                        </TableCell>
                                        <TableCell className="w-10">
                                            <div className="flex flex-row items-center gap-2 justify-end">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 p-0">
                                                            <EllipsisVertical className="h-4 w-4 text-muted-foreground" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem>Unpin</DropdownMenuItem>
                                                        <DropdownMenuItem>Delete</DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                )}
            </Card>
        </div>
    );
}