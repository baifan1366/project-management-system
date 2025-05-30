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
import { fetchTeamUsers } from '@/lib/redux/features/teamUserSlice';
import { useGetUser } from '@/lib/hooks/useGetUser';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import MembersRole from './MembersRole';
import Announcements from './Announcements';

export default function TaskOverview({ projectId, teamId, teamCFId, refreshKey }) {
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
    const [isOwner, setIsOwner] = useState(false);
    const { user } = useGetUser();
    const currentUserId = user?.id;
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
            try {
                const team = await dispatch(fetchTeamById(teamId)).unwrap();
                // 确保描述内容适合富文本编辑器格式
                // 如果描述为空或不是HTML格式，进行适当处理
                const description = team[0].description || '';
                
                // 设置描述到状态
                setDescription(description);
                setPendingDescription(description);
            } catch (error) {
                console.error('获取团队数据失败:', error);
            }
        };
        
        fetchTeam();
    }, [teamId, dispatch, refreshKey]);

    useEffect(() => {
        const fetchUserTeams = async () => {
            const userTeamsRaw = await fetchTeamUsers(teamId);
            // 兼容不同返回结构
            const userTeams = Array.isArray(userTeamsRaw) ? userTeamsRaw : userTeamsRaw.data || [];
            const ownerUserIds = userTeams
                .filter(ut => ut.role === 'OWNER')
                .map(ut => ut.user_id);
            setIsOwner(ownerUserIds.includes(currentUserId));
        };
        fetchUserTeams();
    }, [teamId, currentUserId]);

    return (
        <TooltipProvider>
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
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <CircleHelp className="h-5 w-5 text-muted-foreground pb-[3px]" />
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-xs">
                                <div>
                                    <div className="text-sm">                                        
                                        <b>{t('teamDescriptionEdit')}</b>
                                        <ul className="list-disc pl-4 mt-1">
                                            <li>{t('bold')}</li>
                                            <li>{t('italic')}</li>
                                            <li>{t('underline')}</li>
                                            <li>{t('heading')}</li>
                                            <li>{t('paragraph')}</li>
                                            <li>{t('quoteBlock')}</li>
                                            <li>{t('highlight')}</li>
                                            <li>{t('bulletList')}</li>
                                            <li>{t('orderedList')}</li>                                            
                                        </ul>   
                                        <br />
                                        <span className="text-red-500 font-medium">{t('teamDescriptionEditOnlyOwner')}</span>                                                                         
                                    </div>
                                </div>
                            </TooltipContent>
                        </Tooltip>
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
                                {/* only team owner can edit */}
                                <RichEditor 
                                    id="team-description" 
                                    placeholder={t('description')} 
                                    className="py-2 px-4 border-transparent shadow-none hover:border-border focus-visible:border-border text-muted-background"
                                    value={description}
                                    onChange={handleDescriptionChange}
                                    minHeight="100px"
                                    readOnly={!isOwner}
                                />
                                {/* else other member hover the rich editor will show the border effect only */}
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
                            <MembersRole teamId={teamId} />
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
                            <Announcements projectId={projectId} teamId={teamId} />
                        </CardContent>
                    )}
                </Card>
            </div>
        </TooltipProvider>
    );
}