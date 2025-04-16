'use client'

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Plus, Text, Hash, Fingerprint, CircleCheck, SquareCheck, Calendar, User, Sigma, Timer, Clock3, Pen, ClipboardList, Tag } from "lucide-react"
import { useState, useRef, useEffect } from "react"
import { useDispatch } from "react-redux"
import { getTags, resetTagsStatus } from '@/lib/redux/features/teamCFSlice'
import CreateTagDialog from './TagDialog'
import { fetchAllTags } from '@/lib/redux/features/tagSlice'
import { useTranslations } from 'next-intl'

export default function TagPopover({ isOpen, onClose, projectId, teamId, teamCFId, onTagsUpdated }) {
    const t = useTranslations('CreateTag')
    const [isPopoverOpen, setPopoverOpen] = useState(false);
    const [isTagDialogOpen, setTagDialogOpen] = useState(false);
    const [tags, setTags] = useState([]);
    const [tagTypes, setTagTypes] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const dispatch = useDispatch();
    const isTagRequestInProgress = useRef(false);
    const hasLoadedTags = useRef(false);
    
    const handleOpenTagDialog = () => {
        setTagDialogOpen(true);
        setPopoverOpen(false);
    };
    
    // 加载标签数据
    const loadTag = async () => {
        if (!teamId || !teamCFId || isTagRequestInProgress.current) return;
        
        try {
            isTagRequestInProgress.current = true;
            // 始终从服务器获取最新数据
            await dispatch(getTags({ teamId, teamCFId })).unwrap();
            hasLoadedTags.current = true;
        } catch (error) {
            console.error('加载标签失败:', error);
            hasLoadedTags.current = false;
        } finally {
            isTagRequestInProgress.current = false;
        }
    };
    
    const handleCloseTagDialog = () => {
        setTagDialogOpen(false);
        
        // 在对话框关闭后强制重新加载数据
        setTimeout(() => {
            // 重置标签加载状态
            hasLoadedTags.current = false;
            isTagRequestInProgress.current = false;
            
            // 重置Redux状态
            dispatch(resetTagsStatus());
            
            // 重新加载标签数据
            loadTag().then(() => {
                // 通知父组件标签已更新
                if (onTagsUpdated) {
                    onTagsUpdated();
                }
                
                // 刷新标签列表
                fetchTags();
            });
        }, 100);
    };
    
    const fetchTags = async () => {
        setIsLoading(true);
        try {
            const tagsData = await dispatch(fetchAllTags()).unwrap();
            const uniqueTypes = [...new Set(tagsData.map(tag => tag.type))]
            if(uniqueTypes.length > 0) {
                setTagTypes(uniqueTypes)
            }
            setTags(tagsData)
        } catch (error) {
            console.error('获取标签失败:', error);
        } finally {
            setIsLoading(false);
        }
    }

    const getTypeIcon = (type) => {
        const iconMap = {
            'TEXT': <Text className="w-4 h-4 mr-2 text-gray-500" />,
            'NUMBER': <Hash className="w-4 h-4 mr-2 text-gray-500" />,
            'ID': <Fingerprint className="w-4 h-4 mr-2 text-gray-500" />,
            'SINGLE-SELECT': <CircleCheck className="w-4 h-4 mr-2 text-gray-500" />,
            'MULTI-SELECT': <SquareCheck className="w-4 h-4 mr-2 text-gray-500" />,
            'DATE': <Calendar className="w-4 h-4 mr-2 text-gray-500" />,
            'PEOPLE': <User className="w-4 h-4 mr-2 text-gray-500" />,
            'FORMULA': <Sigma className="w-4 h-4 mr-2 text-gray-500" />,
            'TIME-TRACKING': <Timer className="w-4 h-4 mr-2 text-gray-500" />,
            'PROJECTS': <ClipboardList className="w-4 h-4 mr-2 text-gray-500" />,
            'TAGS': <Tag className="w-4 h-4 mr-2 text-gray-500" />,
            'COMPLETED-ON': <Clock3 className="w-4 h-4 mr-2 text-gray-500" />,
            'LAST-MODIFIED-ON': <Pen className="w-4 h-4 mr-2 text-gray-500" />,
            'CREATED-AT': <Clock3 className="w-4 h-4 mr-2 text-gray-500" />,
            'CREATED-BY': <User className="w-4 h-4 mr-2 text-gray-500" />
        }
        return iconMap[type] || null
    }

    useEffect(() => {
        fetchTags();
    }, []);

    return (
        <>
            <Popover open={isPopoverOpen} onOpenChange={(open) => {
                setPopoverOpen(open);
                if (open) {
                    fetchTags(); // 打开弹窗时重新获取标签
                }
                if (!open) onClose && onClose(false);
            }}>
                <PopoverTrigger asChild>
                    <Button 
                        onClick={() => setPopoverOpen(true)} 
                        variant="ghost"
                        size="sm"
                    >
                        <Plus className="w-4 h-4"/>
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto h-80 p-1 flex flex-col">
                    <div className="flex-1 overflow-auto">
                        <h1 className="text-sm font-bold py-2 px-3">Field types</h1>
                        {/* fetch all tags */}
                        {isLoading ? (
                            <p className="text-sm text-gray-500 py-2 px-3">Loading...</p>
                        ) : tagTypes.length > 0 ? (
                            tagTypes.map(type => (
                                <div key={type} className="flex items-center py-1 px-3 hover:bg-gray-100 rounded-md cursor-pointer">
                                    {getTypeIcon(type)}
                                    <p className="text-sm">{t(type)}</p>
                                </div>
                            ))
                        ) : (
                            <p className="text-sm text-gray-500 py-2 px-3">暂无标签</p>
                        )}
                    </div>
                    {/* create tag dialog */}
                    <div className="border-t border-gray-200 bg-background w-full mt-auto">
                        <Button     
                            onClick={handleOpenTagDialog}
                            variant="ghost"
                            size="sm"
                            className="flex items-center justify-center w-full mt-1"
                        >
                            <Plus className="w-4 h-4"/>
                        </Button>
                    </div>
                </PopoverContent>
            </Popover>
            
            {isTagDialogOpen && (
                <CreateTagDialog 
                    isOpen={isTagDialogOpen} 
                    onClose={handleCloseTagDialog}
                    projectId={projectId}
                    teamId={teamId}
                    teamCFId={teamCFId}
                />
            )}
        </>
    )
}