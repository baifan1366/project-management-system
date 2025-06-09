//from team_post table
//get type == announcement
//filter by team_id
//sort by created_at asc
'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchPostsByTeamId, togglePostPin, deletePost, updatePost } from '@/lib/redux/features/postsSlice';
import { fetchCommentsByPostId } from '@/lib/redux/features/commentsSlice';
import { fetchUserById } from '@/lib/redux/features/usersSlice';
import { useTranslations } from 'next-intl';
import { formatDistanceToNow } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Pin, MoreVertical, Edit, Eye } from 'lucide-react';
import { useGetUser } from '@/lib/hooks/useGetUser';
import { useUserTimezone } from '@/hooks/useUserTimezone';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { RichEditor } from '@/components/ui/rich-editor';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Smile, Paperclip } from 'lucide-react';
import { toast } from 'sonner';
import { Skeleton } from "@/components/ui/skeleton";
import EmojiPicker from '@/components/chat/EmojiPicker';

export default function Announcements({ projectId, teamId }) {
  const t = useTranslations('TeamOverview');
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [announcements, setAnnouncements] = useState([]);
  const [commentCounts, setCommentCounts] = useState({});
  const users = useSelector(state => state.users.users);
  const { user } = useGetUser();
  const { adjustTimeByOffset, utcOffset } = useUserTimezone();
  const currentUser = user?.id;
  const [team, setTeam] = useState(null);
  const [isFormValid, setIsFormValid] = useState(false);
  const project = useSelector(state => {
    const projects = state.projects?.projects || [];
    // 确保projectId被转换为相同类型进行比较（数字）
    const projectIdNum = parseInt(projectId, 10);
    return projects.find(p => p.id === projectIdNum);
  });
  
  // 对话框状态
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [projectThemeColor, setProjectThemeColor] = useState('primary');

  // 分页状态
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5; // 每页显示5条公告
  
  useEffect(() => {
    async function loadAnnouncements() {
      if (!teamId) {
        setError('团队ID不能为空');
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        const posts = await dispatch(fetchPostsByTeamId(teamId)).unwrap();
        
        // 筛选公告类型的帖子
        const teamAnnouncements = posts.filter(
          post => post.type === 'announcement' && 
          post.team_id === parseInt(teamId, 10)
        ).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        
        // 获取每个帖子作者的信息
        for (const post of teamAnnouncements) {
          if (post.created_by) {
            dispatch(fetchUserById(post.created_by));
          }
        }
        
        // 获取团队信息
        try {
          const response = await fetch(`/api/teams?id=${teamId}`);
          if (response.ok) {
            const teamData = await response.json();
            setTeam(teamData);
          }
        } catch (err) {
          console.error('获取团队信息时出错:', err);
        }
        
        setAnnouncements(teamAnnouncements);
        setError(null);
      } catch (err) {
        console.error('获取公告时出错:', err);
        setError(err.message || '加载公告时出错');
      } finally {
        setLoading(false);
      }
    }
    
    loadAnnouncements();
  }, [teamId, dispatch]);
  
  // 验证表单输入
  useEffect(() => {
    const titleValid = editTitle.trim().length >= 2 && editTitle.length <= 50;
    setIsFormValid(titleValid);
  }, [editTitle]);
  
  // 添加新的useEffect设置项目主题颜色
  useEffect(() => {
    if (project && project.theme_color) {
      setProjectThemeColor(project.theme_color);
    } else {
      // 如果项目没有主题颜色，设置默认值
      setProjectThemeColor('primary');
    }
  }, [project]);
  
  // 格式化日期
  const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
      // 获取用户时区偏移量（小时）
      const getHourOffset = (utcOffsetStr) => {
        if (!utcOffsetStr || typeof utcOffsetStr !== 'string') return 0;
        const match = utcOffsetStr.match(/^UTC([+-])(\d+)$/);
        if (!match) return 0;
        const sign = match[1] === '+' ? 1 : -1;
        return sign * parseInt(match[2], 10);
      };

      // 计算原始时间与当前时间的真实差值（考虑时区变化）
      const postDate = new Date(dateString);
      const userOffset = getHourOffset(utcOffset); // 当前用户时区
      
      // 获取用户当前时区下的"现在"时间
      const nowInUserTimezone = new Date();
      
      // 将发布时间调整为用户当前时区
      const postDateInUserTimezone = new Date(postDate);
      // 由于发布时间存储为UTC，先转换为UTC+0下的时间，再加上用户当前时区偏移
      postDateInUserTimezone.setTime(postDate.getTime() + userOffset * 60 * 60 * 1000);
      
      // 使用调整后的日期计算相对时间
      return formatDistanceToNow(postDateInUserTimezone, { 
        addSuffix: true,
        locale: enUS
      });
    } catch (e) {
      console.error('日期格式化错误:', e);
      return dateString;
    }
  };
  
  // 获取用户名
  const getUserName = (userId) => {
    if (!userId) return '未知用户';
    const user = users.find(u => u.id === userId);
    if (user) {
      return user.name || user.email || userId.substring(0, 8);
    }
    return userId.substring(0, 8); // 如果还没获取到用户信息，则显示ID的一部分
  };
  
  // 计算评论数
  const getCommentCount = (post) => {
    // 如果已经有缓存的数量，直接返回
    if (commentCounts[post.id] !== undefined) {
      return commentCounts[post.id];
    }
    
    // 避免在渲染中调用可能导致状态更新的函数
    // 使用setTimeout将fetchCommentCount调用移到下一个事件循环
    setTimeout(() => {
      fetchCommentCount(post.id);
    }, 0);
    
    // 在异步加载完成前，先返回帖子上的评论ID数组长度作为默认值
    return post.comment_id && Array.isArray(post.comment_id) ? post.comment_id.length : 0;
  };
  
  // 异步获取评论数量
  const fetchCommentCount = useCallback(async (postId) => {
    try {
      // 通过帖子ID获取评论
      const comments = await dispatch(fetchCommentsByPostId(postId)).unwrap();
      // 计算获取到的评论总数
      const count = comments ? comments.length : 0;
      
      // 更新评论计数缓存
      setCommentCounts(prev => ({
        ...prev,
        [postId]: count
      }));
      
      return count;
    } catch (error) {
      console.error(`获取帖子(${postId})评论数量失败:`, error);
      return 0;
    }
  }, [dispatch]);
  
  // 计算点赞数
  const getReactionCount = (post) => {
    if (!post.reactions) return 0;
    return Object.values(post.reactions).reduce((total, userIds) => 
      total + (Array.isArray(userIds) ? userIds.length : 0), 0);
  };

  // 修改handleTogglePin函数，使用useCallback包裹
  const handleTogglePin = useCallback(async (postId) => {
    try {
      const result = await dispatch(togglePostPin(postId)).unwrap();
      
      // 更新本地数据
      setAnnouncements(prev => 
        prev.map(announcement => 
          announcement.id === postId 
            ? { ...announcement, is_pinned: result.is_pinned } 
            : announcement
        )
      );
      
      // 成功消息使用setTimeout包装
      setTimeout(() => {
        toast.success(result.is_pinned ? t('announcementPinned') : t('announcementUnpinned'));
      }, 0);
    } catch (err) {
      console.error('置顶/取消置顶公告时出错:', err);
      // 错误消息使用setTimeout包装
      setTimeout(() => {
        toast.error(t('announcementPinError'));
      }, 0);
    }
  }, [dispatch, t]);

  // 修改handleDelete函数，使用useCallback包裹
  const handleDelete = useCallback(async (postId) => {
    try {
      await dispatch(deletePost(postId)).unwrap();
      
      // 从本地数据中移除
      setAnnouncements(prev => 
        prev.filter(announcement => announcement.id !== postId)
      );
      
      // 成功消息使用setTimeout包装
      setTimeout(() => {
        toast.success(t('announcementDeleted'));
      }, 0);
    } catch (err) {
      console.error('删除公告时出错:', err);
      // 错误消息使用setTimeout包装
      setTimeout(() => {
        toast.error(t('announcementDeleteError'));
      }, 0);
    }
  }, [dispatch, t]);

  // 使用useMemo计算是否有编辑权限
  const hasEditPermission = useMemo(() => {
    return (team && currentUser && team[0]?.created_by === currentUser);
  }, [team, currentUser]);
  
  // 修改openAnnouncementDialog函数，使用useCallback包裹
  const openAnnouncementDialog = useCallback((announcement) => {
    setSelectedAnnouncement(announcement);
    setEditTitle(announcement.title || '');
    setEditContent(announcement.description || '');
    setIsEditing(false);
    setDialogOpen(true);
  }, []);
  
  // 修改toggleEditMode函数，使用useCallback包裹
  const toggleEditMode = useCallback(() => {
    setIsEditing(!isEditing);
  }, [isEditing]);
  
  // 修改cancelEdit函数，使用useCallback包裹
  const cancelEdit = useCallback(() => {
    setEditTitle(selectedAnnouncement?.title || '');
    setEditContent(selectedAnnouncement?.description || '');
    setIsEditing(false);
  }, [selectedAnnouncement]);
  
  // 保存编辑的公告
  const saveAnnouncementEdit = async () => {
    if (!selectedAnnouncement) return;
    
    const trimmedTitle = editTitle.trim();
    
    if (trimmedTitle.length < 2 || trimmedTitle.length > 50) {
      // 将toast调用放在setTimeout中以避免在渲染周期中更新状态
      setTimeout(() => {
        toast.error(t('titleLengthError') || '标题长度必须在2-50个字符之间');
      }, 0);
      return;
    }
    
    try {
      setIsSaving(true);
      // 使用Redux action进行更新
      const updateData = {
        id: selectedAnnouncement.id,
        title: trimmedTitle,
        description: editContent,
        team_id: parseInt(teamId, 10)
      };
      
      const updatedPost = await dispatch(updatePost(updateData)).unwrap();
      
      if (updatedPost) {
        // 更新本地公告列表
        setAnnouncements(prev => 
          prev.map(announcement => 
            announcement.id === selectedAnnouncement.id 
              ? { ...announcement, title: trimmedTitle, description: editContent, updated_at: new Date().toISOString() } 
              : announcement
          )
        );
        
        // 更新选中的公告
        setSelectedAnnouncement(prev => ({ ...prev, title: trimmedTitle, description: editContent }));
        setIsEditing(false);
        
        // 将toast移到setTimeout中
        setTimeout(() => {
          toast.success(t('updateSuccess') || '公告更新成功');
        }, 0);
      } else {
        throw new Error('保存失败');
      }
    } catch (err) {
      console.error('更新公告时出错:', err);
      // 将toast移到setTimeout中
      setTimeout(() => {
        toast.error(t('updateFailed') || '更新公告失败');
      }, 0);
    } finally {
      setIsSaving(false);
    }
  };
  
  // 处理富文本内容显示
  const renderRichTextContent = (content) => {
    // 确保content是有效的字符串，防止渲染错误
    if (!content || typeof content !== 'string') {
      return <div className="rich-content w-full overflow-x-hidden break-all"></div>;
    }
    
    // 确保内容被正确解析为HTML
    // 如果内容包含HTML标签但未被正确解析，可能需要解码实体
    let htmlContent = content;
    
    // 对内容进行额外的处理，确保HTML实体被正确解码
    try {
      // 处理可能被编码的HTML实体
      const textarea = document.createElement('textarea');
      textarea.innerHTML = content;
      htmlContent = textarea.value;
    } catch (error) {
      console.error('Error decoding HTML content:', error);
    }
    
    return (
      <div 
        className="rich-content w-full overflow-x-hidden break-all" 
        dangerouslySetInnerHTML={{ __html: htmlContent }} 
      />
    );
  };

  // 分页处理
  const totalPages = Math.ceil(announcements.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, announcements.length);
  const currentAnnouncements = announcements.slice(startIndex, endIndex);
  
  // 修改handlePageChange函数，使用useCallback包裹
  const handlePageChange = useCallback((page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  }, [totalPages]);
  
  // 生成页码数组，用于分页控件
  const generatePagination = () => {
    const pages = [];
    const maxDisplayPages = 5; // 最多显示5个页码
    
    let startPage = Math.max(1, currentPage - Math.floor(maxDisplayPages / 2));
    let endPage = Math.min(totalPages, startPage + maxDisplayPages - 1);
    
    // 调整开始页，确保显示maxDisplayPages页
    if (endPage - startPage + 1 < maxDisplayPages) {
      startPage = Math.max(1, endPage - maxDisplayPages + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    
    return pages;
  };

  // 使用useEffect处理toast提示，而不是在render函数中直接调用
  useEffect(() => {
    if (error) {
      toast.error(t('loadingError') || '加载公告时出错');
    }
  }, [error, t]);

  if (loading) {
    return (
      <div className="flex flex-col gap-1">
        <div className="rounded-md border">
          <Table className="w-full">
            <TableHeader className="bg-muted/50">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[50%] font-medium text-md">{t('discussions')}</TableHead>
                <TableHead className="font-medium text-md">{t('startedBy')}</TableHead>
                <TableHead className="font-medium text-md">{t('lastPost')}</TableHead>
                <TableHead className="text-center font-medium text-md">{t('likes')}</TableHead>
                <TableHead className="text-center font-medium text-md">{t('replies')}</TableHead>
                <TableHead className="w-[60px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[1, 2, 3, 4, 5].map((item) => (
                <TableRow key={item} className="hover:bg-muted/20">
                  <TableCell className="py-3">
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-4 w-4 rounded-full" />
                      <Skeleton className="h-5 w-[200px]" />
                    </div>
                  </TableCell>
                  <TableCell className="py-3">
                    <Skeleton className="h-5 w-[80px]" />
                  </TableCell>
                  <TableCell className="py-3">
                    <Skeleton className="h-5 w-[100px]" />
                  </TableCell>
                  <TableCell className="py-3 text-center">
                    <Skeleton className="h-5 w-[30px] mx-auto" />
                  </TableCell>
                  <TableCell className="py-3 text-center">
                    <Skeleton className="h-5 w-[30px] mx-auto" />
                  </TableCell>
                  <TableCell className="py-3">
                    <div className="flex justify-end">
                      <Skeleton className="h-8 w-8 rounded-full" />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="p-4 text-center text-red-500">{t('error')}</div>;
  }

  if (announcements.length === 0) {
    return <div className="p-4 text-center text-muted-foreground">{t('noAnnouncements')}</div>;
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="rounded-md border">
        <Table className="w-full">
          <TableHeader className="bg-muted/50">
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[50%] font-medium text-md">{t('discussions')}</TableHead>
              <TableHead className="font-medium text-md">{t('startedBy')}</TableHead>
              <TableHead className="font-medium text-md">{t('lastPost')}</TableHead>
              <TableHead className="text-center font-medium text-md">{t('likes')}</TableHead>
              <TableHead className="text-center font-medium text-md">{t('replies')}</TableHead>
              <TableHead className="w-[60px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentAnnouncements.map((announcement) => (
              <TableRow key={announcement.id} className="hover:bg-muted/20">
                <TableCell className="py-3">
                  <div className="flex items-center gap-2">
                    {announcement.is_pinned && (
                      <Pin className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span 
                      className="font-medium text-sm hover:underline cursor-pointer"
                      onClick={() => openAnnouncementDialog(announcement)}
                    >
                      {announcement.title}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="py-3 text-sm">
                  {getUserName(announcement.created_by)}
                </TableCell>
                <TableCell className="py-3 text-sm">
                  {formatDate(announcement.updated_at)}
                </TableCell>
                <TableCell className="py-3 text-center">
                  <span className="text-sm">{getReactionCount(announcement)}</span>
                </TableCell>
                <TableCell className="py-3 text-center">
                  <span className="text-sm">{getCommentCount(announcement)}</span>
                </TableCell>
                <TableCell className="py-3">
                  {hasEditPermission && (
                    <div className="flex justify-end">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 p-0">
                            <MoreVertical className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {announcement.is_pinned ? (
                            <DropdownMenuItem onClick={() => handleTogglePin(announcement.id)}>
                              {t('unpin')}
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={() => handleTogglePin(announcement.id)}>
                              {t('pin')}
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => handleDelete(announcement.id)}>
                            <span className="text-red-500 hover:text-red-600">{t('delete')}</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      
      {/* 分页控件 */}
      {totalPages > 1 && (
        <div className="flex justify-center mt-4">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious 
                  onClick={() => handlePageChange(currentPage - 1)}
                  className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
              
              {generatePagination().map(page => (
                <PaginationItem key={page}>
                  <PaginationLink 
                    isActive={page === currentPage}
                    onClick={() => handlePageChange(page)}
                    className="cursor-pointer"
                  >
                    {page}
                  </PaginationLink>
                </PaginationItem>
              ))}
              
              <PaginationItem>
                <PaginationNext 
                  onClick={() => handlePageChange(currentPage + 1)}
                  className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
      
      {/* 公告详情对话框 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[650px] p-6">
          <DialogHeader>
            <DialogTitle>
              {isEditing ? 
                <div className="relative">
                  <Input 
                    value={editTitle} 
                    onChange={(e) => setEditTitle(e.target.value)} 
                    className="mt-1 pr-16"
                    maxLength={50}
                  />
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-[#605E5C] dark:text-[#C8C6C4]">
                    <span className="font-medium">
                      {editTitle.trim().length}/50
                    </span>
                  </div>
                </div> : 
                selectedAnnouncement?.title
              }
            </DialogTitle>
            <DialogDescription className="flex items-center justify-between">
              <span>
                {getUserName(selectedAnnouncement?.created_by)} • {formatDate(selectedAnnouncement?.created_at)}
              </span>
              {hasEditPermission && !isEditing && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={toggleEditMode} 
                  className="flex items-center gap-1"
                >
                  <Edit className="h-4 w-4" />
                  {t('edit')}
                </Button>
              )}
              {!hasEditPermission && (
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Eye className="h-4 w-4" />
                  {t('viewOnly')}
                </div>
              )}
              
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-2">
            {isEditing ? (
              <div className="">
                <RichEditor
                  placeholder={t('placeholder')}
                  value={editContent}
                  onChange={setEditContent}
                  className="h-[135px] mb-5 min-h-[135px] max-h-[250px] overflow-y-auto border border-[#E1DFDD] text-[#252423] dark:border-[#3B3A39] dark:text-white"
                />
                <div className="flex justify-between mt-5">
                  <div className="flex items-center space-x-2">
                    <EmojiPicker 
                      onEmojiSelect={(emojiData) => setEditContent(prev => prev + emojiData.emoji)}
                      position="right"
                      offset={5}
                      className="z-999"
                    />
                    
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-full hover:bg-[#F5F5F5] dark:hover:bg-[#3B3A39]"
                    >
                      <Paperclip className="h-4 w-4 text-[#252423] dark:text-white" />
                    </Button>
                  </div>
                  {isEditing && (
                    <div className="flex items-center space-x-2">
                      <Button 
                        variant="outline" 
                        onClick={cancelEdit}
                        className="border-[#E1DFDD] text-[#252423] hover:bg-[#F5F5F5] dark:border-[#3B3A39] dark:text-white dark:hover:bg-[#3B3A39]"
                        disabled={isSaving}
                      >
                        {t('cancel')}
                      </Button>
                      <Button 
                        onClick={saveAnnouncementEdit}
                        disabled={!isFormValid || isSaving}
                        variant={projectThemeColor}
                      >
                        {isSaving ? (
                          <div className="flex items-center">
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            {t('saving') || '保存中'}
                          </div>
                        ) : (
                          t('save')
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="prose prose-sm max-w-full dark:prose-invert break-words overflow-x-hidden">
                {renderRichTextContent(selectedAnnouncement?.description)}
              </div>
            )}
          </div>
          
        </DialogContent>
      </Dialog>
      
      <style jsx global>{`
        .rich-content img {
          max-width: 100%;
          height: auto;
        }
        .rich-content pre {
          white-space: pre-wrap;
          overflow-x: auto;
          max-width: 100%;
        }
        .rich-content blockquote {
          border-left: 4px solid #e5e7eb;
          padding-left: 1rem;
          margin-left: 0;
          margin-right: 0;
          font-style: italic;
          color: #6b7280;
        }
        .dark .rich-content blockquote {
          border-left-color: #4b5563;
          color: #9ca3af;
        }
        .rich-content * {
          max-width: 100%;
          overflow-wrap: break-word;
          word-wrap: break-word;
          word-break: break-word;
        }
      `}</style>
    </div>
  );
}
