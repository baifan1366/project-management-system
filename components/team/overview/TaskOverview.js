'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RichEditor } from '@/components/ui/rich-editor';
import { Circle, CheckCircle2, Plus, CircleHelp, MoreHorizontal, ChevronDown, EllipsisVertical, Pin, Save } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useTranslations } from 'next-intl';
import TeamDescription from './TeamDescription';
import { useToast } from '@/hooks/use-toast';
import { fetchTeamById } from '@/lib/redux/features/teamSlice';
import { useDispatch } from 'react-redux';

export default function TaskOverview({ projectId, teamId, teamCFId }) {
    const t = useTranslations('TeamOverview');
    const [description, setDescription] = useState('');
    const [expandedSections, setExpandedSections] = useState({
        description: true,
        members: true,
        announcements: true
    });
    const [isEditing, setIsEditing] = useState(false);
    const [pendingDescription, setPendingDescription] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();
    const dispatch = useDispatch();
    
    const { updateTeamDescription } = TeamDescription({ teamId });

    const handleDescriptionChange = (html) => {
        setPendingDescription(html);
        setIsEditing(true);
    };
    
    const handleSaveDescription = async () => {
        try {
            setIsLoading(true);            
            // 确保传入的是完整的HTML字符串以保留所有格式
            const result = await updateTeamDescription({ description: pendingDescription });
            
            if (result) {
                // 更新成功后更新本地状态
                setDescription(pendingDescription);
                setIsEditing(false);
                toast({
                    title: t('saveSuccess'),
                    description: t('teamDescriptionUpdated'),
                    variant: "success",
                });
            } else {
                toast({
                    title: t('saveError'),
                    description: t('failedToUpdateDescription'),
                    variant: "destructive",
                });
            }
        } catch (error) {
            console.error('保存团队描述时出错:', error);
            toast({
                title: t('saveError'),
                description: t('failedToUpdateDescription'),
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    const toggleSection = (section) => {
        setExpandedSections(prev => ({
            ...prev,
            [section]: !prev[section]
        }));
    };

    useEffect(() => {
        const fetchTeam = async () => {
            const team = await dispatch(fetchTeamById(teamId)).unwrap();
            // 确保描述内容适合富文本编辑器格式
            // 如果描述为空或不是HTML格式，进行适当处理
            const description = team[0].description || '';
            
            // 设置描述到状态
            setDescription(description);
            setPendingDescription(description);
            console.log(team[0].description);
        };
        fetchTeam();
    }, [teamId, dispatch]);

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
                    <CardTitle className="text-lg font-medium mr-2 pb-[3px]">{t('teamDescription')}</CardTitle>
                    <CircleHelp className="h-5 w-5 text-muted-foreground pb-[3px]" />
                    {isEditing && (
                        <Button 
                            variant="outline" 
                            size="sm" 
                            className="ml-auto" 
                            onClick={handleSaveDescription}
                            disabled={isLoading}
                        >
                            <Save className="h-4 w-4 mr-1" />
                            {isLoading ? t('saving') : t('save')}
                        </Button>
                    )}
                </CardHeader>
                {expandedSections.description && (
                    <CardContent className="px-2 py-0">
                        <div className="flex flex-col gap-1 p-0">
                            <RichEditor 
                                id="team-description" 
                                placeholder={t('description')} 
                                className="py-2 px-4 border-transparent shadow-none hover:border-border focus-visible:border-border text-muted-background"
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
                    <CardTitle className="text-lg font-medium mr-2 pb-[3px]">{t('membersRole')}</CardTitle>
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
                                        <span className="text-sm text-muted-foreground">{t('owner')}</span>
                                        <DropdownMenu className="hidden hover:visible">
                                            <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-6 w-6 -mt-0.5">
                                                <MoreHorizontal className="h-3 w-3" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent>
                                            <DropdownMenuItem>{t('owner')}</DropdownMenuItem>
                                            <DropdownMenuItem>{t('editor')}</DropdownMenuItem>
                                            <DropdownMenuItem>{t('checker')}</DropdownMenuItem>
                                            <DropdownMenuItem>{t('viewer')}</DropdownMenuItem>
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
                                    <span className="text-sm font-medium text-muted-foreground">{t('addMember')}</span>
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
                    <CardTitle className="text-lg font-medium mr-2 pb-[3px]">{t('announcements')}</CardTitle>
                </CardHeader>
                {expandedSections.announcements && (
                    <CardContent className="px-2 py-1">
                        <div className="flex flex-col gap-1">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{t('discussions')}</TableHead>
                                        <TableHead>{t('startedBy')}</TableHead>
                                        <TableHead>{t('lastPost')}</TableHead>
                                        <TableHead className="text-center">{t('likes')}</TableHead>
                                        <TableHead className="text-center">{t('replies')}</TableHead>
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
                                                        <DropdownMenuItem>{t('unpin')}</DropdownMenuItem>
                                                        <DropdownMenuItem>{t('delete')}</DropdownMenuItem>
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