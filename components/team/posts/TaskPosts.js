'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Plus, Filter, Search, SortAsc, Grid3X3, List, Moon, Sun, Bookmark, Heart, MessageSquare, MoreHorizontal, ThumbsUp, Calendar, Clock, Tag, Pin, PinOff, Star, ChevronDown, Pen, Trash2, ChevronUp, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useDispatch, useSelector } from 'react-redux';
import { fetchPostsByTeamId, togglePostPin, updatePost } from '@/lib/redux/features/postsSlice';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import HandlePost from './HandlePost';
import { useConfirm } from '@/hooks/use-confirm';
import { api } from '@/lib/api';
import { RichEditor } from '@/components/ui/rich-editor';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Smile, Paperclip, Check } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import EmojiPicker from '@/components/chat/EmojiPicker';
import { useUserTimezone } from '@/hooks/useUserTimezone';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { fetchCommentsByPostId, fetchCommentById, createComment } from '@/lib/redux/features/commentsSlice';
import AttachFile from './AttachFile';
import { File, FileText } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function TaskPosts({ projectId, teamId, teamCFId }) {
  const t = useTranslations('PostsView');
  const dispatch = useDispatch();
  const params = useParams();
  const user = useSelector(state => state.users.currentUser);
  const [themeColor, setThemeColor] = useState('#64748b')
  const project = useSelector(state => 
    state.projects.projects.find(p => String(p.id) === String(projectId))
  );
  const { confirm } = useConfirm();
  const [userMap, setUserMap] = useState({});
  
  // 使用用户时区钩子
  const { 
    formatToUserTimezone, 
    formatDateToUserTimezone, 
    loading: timeZoneLoading,
    adjustTimeByOffset
  } = useUserTimezone();
  
  // 格式化日期时间的辅助函数，包含错误处理和默认值
  const formatPostDate = (timestamp, options = {}) => {
    if (!timestamp) return '-';
    try {
      return formatDateToUserTimezone(timestamp, options);
    } catch (error) {
      console.error('日期格式化错误:', error);
      return new Date(timestamp).toLocaleDateString();
    }
  };
  
  // 格式化时间的辅助函数
  const formatPostTime = (timestamp) => {
    if (!timestamp) return '-';
    try {
      return formatToUserTimezone(timestamp);
    } catch (error) {
      console.error('时间格式化错误:', error);
      return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
  };
  
  // 获取颜色的十六进制代码
  const getColorHexCode = (colorName) => {
    const colorMap = {
      'red': '#c72c41',
      'orange': '#d76d2b',
      'green': '#008000',
      'blue': '#3b6dbf',
      'purple': '#5c4b8a',
      'pink': '#d83c5e',
      'lightGreen': '#bbf7d0',
      'lightYellow': '#fefcbf',
      'lightCoral': '#f08080',
      'lightOrange': '#ffedd5',
      'peach': '#ffcccb',
      'lightCyan': '#e0ffff',
    };
    
    // 如果是颜色名称，返回对应的十六进制，否则返回原始值（可能已经是十六进制）
    return colorMap[colorName] || colorName;
  };
  
  // State for UI
  const [isLoading, setIsLoading] = useState(true);
  const [posts, setPosts] = useState([]);
  const [viewMode, setViewMode] = useState('list'); // list as default (changed from 'grid')
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState('newest');
  const [selectedSection, setSelectedSection] = useState('all');
  const [sections, setSections] = useState([]);
  const [pinnedPosts, setPinnedPosts] = useState(new Set());
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showInlineEditor, setShowInlineEditor] = useState(false);
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostDescription, setNewPostDescription] = useState('');
  const [newPostContent, setNewPostContent] = useState('');
  const [postType, setPostType] = useState('post'); // 'post' or 'announcement'
  const [isFormValid, setIsFormValid] = useState(false);
  const [expandedPosts, setExpandedPosts] = useState({});
  // 添加防抖定时器引用
  const debounceTimers = useRef({});
  
  // 添加编辑帖子的状态
  const [editingPostId, setEditingPostId] = useState(null);
  const [editPostTitle, setEditPostTitle] = useState('');
  const [editPostDescription, setEditPostDescription] = useState('');
  const [editPostContent, setEditPostContent] = useState('');
  const [isEditFormValid, setIsEditFormValid] = useState(false);
  
  // 添加内联编辑器的引用
  const inlineEditorRef = useRef(null);
  
  // 添加离开编辑器的确认提示状态
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  // 存储用户在提示后想要执行的操作
  const [pendingAction, setPendingAction] = useState(null);
  
  // 添加评论相关状态
  const [openComments, setOpenComments] = useState({});
  const [commentsMap, setCommentsMap] = useState({});
  const [newCommentText, setNewCommentText] = useState('');
  const [activeCommentPostId, setActiveCommentPostId] = useState(null);
  const [commentDialogOpen, setCommentDialogOpen] = useState(false);
  const [commentLoading, setCommentLoading] = useState(false);
  // 添加评论计数状态
  const [commentCounts, setCommentCounts] = useState({});
  
  // 添加请求中状态跟踪
  const [pendingCommentRequests, setPendingCommentRequests] = useState({});
  
  // 添加附件相关状态
  const [showAttachFileDialog, setShowAttachFileDialog] = useState(false);
  const [activeAttachPostId, setActiveAttachPostId] = useState(null);
  const [postAttachments, setPostAttachments] = useState({});
  
  // 添加状态来跟踪新帖子的附件
  const [newPostAttachments, setNewPostAttachments] = useState([]);
  
  // 添加状态来跟踪新帖子的临时附件（还未上传）
  const [newPostTempFiles, setNewPostTempFiles] = useState([]);
  const [isUploadingFiles, setIsUploadingFiles] = useState(false);
  
  // 添加状态来存储帖子的附件
  const [editPostAttachments, setEditPostAttachments] = useState([]);
  
  // 添加状态来跟踪待删除的附件
  const [pendingDeleteAttachments, setPendingDeleteAttachments] = useState([]);
  
  // Hook into data handlers
  const { 
    CreatePost, 
    DeletePost, 
    TogglePostPin, 
    ReactToPost, 
    CommentOnPost 
  } = HandlePost({ teamId });
  
  useEffect(() => {
    if (project?.theme_color) {
      setThemeColor(project.theme_color);
    }
  }, [project]);
  
  // Fetch users for avatars
  const fetchUserById = async (userId) => {
    try {
      // 如果用户ID无效，直接返回
      if (!userId) {
        console.warn('尝试获取无效的用户ID');
        return;
      }
      
      // If already fetched, return from cache
      if (userMap[userId]) return;
      
      const response = await api.users.getById(userId);
      
      if (response.success && response.data) {
        setUserMap(prev => ({
          ...prev,
          [userId]: response.data
        }));
      } else {
        console.warn(`获取用户信息失败: ${userId}`, response);
      }
    } catch (error) {
      console.error(`获取用户失败 (${userId}):`, error);
    }
  };
  
  // Fetch posts
  useEffect(() => {
    async function fetchPosts() {
      if (!teamId) return;
      
      setIsLoading(true);
      
      try {
        // Fetch all posts for this team
        const postsData = await dispatch(fetchPostsByTeamId(teamId)).unwrap();
        
        // Initialize pinned posts
        const initialPinnedPosts = new Set();
        postsData.forEach(post => {
          if (post.is_pinned) {
            initialPinnedPosts.add(post.id);
          }
          
          // Fetch user data for each post creator
          if (post.created_by) {
            fetchUserById(post.created_by);
          }
        });
        setPinnedPosts(initialPinnedPosts);
        
        // Set the posts
        setPosts(postsData);
        
        // 只有当时区信息已加载完成时，才结束加载状态
        if (!timeZoneLoading) {
        setIsLoading(false);
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
        setIsLoading(false);
      }
    }
    
    fetchPosts();
  }, [teamId, dispatch, timeZoneLoading]);
  
  // 监听时区加载状态，当时区加载完成且帖子已加载时结束加载状态
  useEffect(() => {
    if (!timeZoneLoading && posts.length > 0 && isLoading) {
      setIsLoading(false);
    }
  }, [timeZoneLoading, posts.length, isLoading]);
  
  // Toggle pin status for a post
  const togglePinPost = async (postId) => {
    handlePotentialLeave(async () => {
      try {
        // Update pin status in the backend
        const updatedPost = await TogglePostPin(postId);
        
        if (updatedPost) {
          // Update the UI state
          setPinnedPosts(prev => {
            const newPinned = new Set(prev);
            if (updatedPost.is_pinned) {
              newPinned.add(postId);
            } else {
              newPinned.delete(postId);
            }
            return newPinned;
          });
          
          // Update post in the posts array
          setPosts(prev => 
            prev.map(post => 
              post.id === postId 
                ? { ...post, is_pinned: updatedPost.is_pinned } 
                : post
            )
          );
        }
      } catch (error) {
        console.error("Error toggling pin status:", error);
      }
    });
  };
  
  // Filter and sort posts based on current settings
  const filteredAndSortedPosts = posts
    .filter(post => {
      // Apply section filter
      if (selectedSection !== 'all' && post.section_id !== selectedSection) {
        return false;
      }
      
      // Apply search filter (case insensitive)
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          (post.title && post.title.toLowerCase().includes(query)) ||
          (post.description && post.description.toLowerCase().includes(query))
        );
      }
      
      return true;
    })
    .sort((a, b) => {
      // First sort pinned posts to the top
      const aIsPinned = a.is_pinned;
      const bIsPinned = b.is_pinned;
      
      if (aIsPinned && !bIsPinned) return -1;
      if (!aIsPinned && bIsPinned) return 1;
      
      // 调整日期以考虑用户时区
      const dateA = adjustTimeByOffset(a.created_at);
      const dateB = adjustTimeByOffset(b.created_at);
      
      // If both posts have the same pin status, sort by date (oldest at top, newest at bottom)
      // Then apply the selected sort option
      switch (sortOption) {
        case 'newest':
          return dateA - dateB; // 反转：最新的在底部
        case 'oldest':
          return dateB - dateA; // 反转：最旧的在顶部
        case 'alphabetical':
          return a.title.localeCompare(b.title);
        case 'popular':
          // Count total reactions
          const aReactions = Object.values(a.reactions || {}).flat().length;
          const bReactions = Object.values(b.reactions || {}).flat().length;
          return bReactions - aReactions;
        default:
          return dateA - dateB; // 默认最新的在底部
      }
    });
  
  // 验证表单输入
  useEffect(() => {
    const titleValid = newPostTitle.trim().length >= 2 && newPostTitle.trim().length <= 50;
    setIsFormValid(titleValid);
    
    // 验证编辑表单
    const editTitleValid = editPostTitle.trim().length >= 2 && editPostTitle.trim().length <= 50;
    setIsEditFormValid(editTitleValid);
  }, [newPostTitle, newPostDescription, editPostTitle, editPostDescription]);

  // 重置表单
  const resetForm = () => {
    setNewPostTitle('');
    setNewPostDescription('');
    setNewPostContent('');
    setPostType('post');
    setShowCreateDialog(false);
    setShowInlineEditor(false);
    setNewPostAttachments([]); // 重置已上传附件
    setNewPostTempFiles([]); // 重置临时文件
  };

  // Dialog关闭时重置表单
  useEffect(() => {
    if (!showCreateDialog && !showInlineEditor) {
      setNewPostTitle('');
      setNewPostDescription('');
      setNewPostContent('');
      setPostType('post');
    }
  }, [showCreateDialog, showInlineEditor]);

  // Handle post creation - 修改为先上传文件，再创建帖子
  const handleCreatePost = async () => {
    const trimmedTitle = newPostTitle.trim();
    
    if (trimmedTitle.length < 2 || trimmedTitle.length > 50) {
      toast.error(t('titleLengthError'));
      return;
    }
    
    try {
      setIsLoading(true);
      
      // 先上传附件
      let attachments = [];
      
      if (newPostTempFiles.length > 0) {
        toast.loading(t('uploadingFiles') || '正在上传文件...');
        attachments = await uploadAllFiles();
        toast.dismiss();
      }
      
      // 合并之前可能已经上传的附件
      const allAttachments = [...attachments, ...newPostAttachments];
      
      // 创建帖子
      const result = await CreatePost({
        title: trimmedTitle,
        description: showInlineEditor ? newPostContent : newPostDescription,
        type: postType,
        teamId,
        attachments: allAttachments
      });
      
      if (result) {
        // Add new post to the posts array at the end (to show at the bottom)
        setPosts(prev => [...prev, result]);
        // Reset form and close editor
        resetForm();
        toast.success(t('postCreated') || '帖子已创建');
      }
    } catch (error) {
      console.error(t('createPostError'), error);
      toast.error(t('createPostError') || '创建帖子失败');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle reaction
  const handleReaction = async (postId, emoji = 'like') => {
    if (!user?.id) {
      toast.error(t('loginToReact'));
      return;
    }
    
    handlePotentialLeave(async () => {
      try {
        const result = await ReactToPost({ postId, emoji });
        
        if (result) {
          // Update posts array with new reactions
          setPosts(prev => 
            prev.map(post => 
              post.id === postId 
                ? { ...post, reactions: result.reactions } 
                : post
            )
          );
        }
      } catch (error) {
        console.error(t('addReactionError'), error);
      }
    });
  };
  
  // Handle comment
  const handleAddComment = async (postId, content) => {
    if (!user?.id) {
      toast.error(t('loginToComment'));
      return;
    }
    
    if (!content.trim()) {
      toast.error(t('commentRequired'));
      return;
    }
    
    try {
      const result = await CommentOnPost({ postId, content });
      
      if (result) {
        // Update posts array with new comment
        setPosts(prev => 
          prev.map(post => 
            post.id === postId 
              ? { ...post, comments: result.comments } 
              : post
          )
        );
      }
    } catch (error) {
      console.error(t('addCommentError'), error);
    }
  };
  
  // Handle post delete
  const handleDeletePost = async (postId) => {
    handlePotentialLeave(() => {
      confirm({
        title: t('confirmDeleteTitle'),
        description: t('confirmDeleteDescription'),
        variant: 'error',
        confirmText: t('delete'),
        cancelText: t('cancel'),
        onConfirm: async () => {
          try {
            const success = await DeletePost(postId);
            if (success) {
              // Remove from local state
              setPosts(prev => prev.filter(p => p.id !== postId));
              // Remove from pinned posts if it was pinned
              if (pinnedPosts.has(postId)) {
                setPinnedPosts(prev => {
                  const newPinned = new Set(prev);
                  newPinned.delete(postId);
                  return newPinned;
                });
              }
            }
          } catch (error) {
            console.error(t('deletePostError'), error);
          }
        }
      });
    });
  };
  
  // 切换帖子展开/收起状态
  const togglePostExpand = (postId) => {
    handlePotentialLeave(() => {
      setExpandedPosts(prev => ({
        ...prev,
        [postId]: !prev[postId]
      }));
    });
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
  
  // Render loading skeleton
  const renderSkeleton = () => (
    <div className={`grid ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'} gap-4`}>
      {[1, 2, 3, 4, 5, 6].map((item) => (
        <Card key={item} className="flex flex-col h-full min-h-[260px] rounded-lg border transition-all bg-white border-[#E1DFDD] dark:bg-[#2D2C2C] dark:border-[#3B3A39] dark:text-white">
          <CardHeader className="pb-2">
            <div className="flex items-center space-x-2">
              <Skeleton className="h-10 w-10 rounded-full bg-[#F3F2F1] dark:bg-[#3B3A39]" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-24 bg-[#F3F2F1] dark:bg-[#3B3A39]" />
                <Skeleton className="h-3 w-16 bg-[#F3F2F1] dark:bg-[#3B3A39]" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="pb-2 flex-grow">
            <Skeleton className="h-4 w-full mb-2 bg-[#F3F2F1] dark:bg-[#3B3A39]" />
            <Skeleton className="h-4 w-5/6 mb-2 bg-[#F3F2F1] dark:bg-[#3B3A39]" />
            <Skeleton className="h-4 w-4/6 bg-[#F3F2F1] dark:bg-[#3B3A39]" />
          </CardContent>
          <CardFooter>
            <div className="flex justify-between items-center w-full">
              <div className="flex space-x-2">
                <Skeleton className="h-8 w-8 rounded-full bg-[#F3F2F1] dark:bg-[#3B3A39]" />
                <Skeleton className="h-8 w-8 rounded-full bg-[#F3F2F1] dark:bg-[#3B3A39]" />
              </div>
              <Skeleton className="h-4 w-16 bg-[#F3F2F1] dark:bg-[#3B3A39]" />
            </div>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
  
  // 获取帖子评论数量
  const fetchPostCommentCount = async (postId) => {
    try {
      // 如果已经有这个帖子的请求正在进行中，则跳过
      if (pendingCommentRequests[postId]) {
        return commentCounts[postId] || 0;
      }
      
      // 标记该帖子的请求为进行中
      setPendingCommentRequests(prev => ({
        ...prev,
        [postId]: true
      }));
      
      // 如果已经有缓存的评论数据，直接使用它计算数量
      if (commentsMap[postId]) {
        const count = commentsMap[postId].length;
        setCommentCounts(prev => ({
          ...prev,
          [postId]: count
        }));
        
        // 清除请求进行中标记
        setPendingCommentRequests(prev => ({
          ...prev,
          [postId]: false
        }));
        
        return count;
      }
      
      // 通过帖子ID获取评论
      const comments = await dispatch(fetchCommentsByPostId(postId)).unwrap();
      // 计算获取到的评论总数
      const count = comments ? comments.length : 0;
      
      // 更新评论缓存
      if (comments && comments.length > 0) {
        setCommentsMap(prev => ({
          ...prev,
          [postId]: comments
        }));
      }
      
      // 更新评论计数缓存
      setCommentCounts(prev => ({
        ...prev,
        [postId]: count
      }));
      
      // 清除请求进行中标记
      setPendingCommentRequests(prev => ({
        ...prev,
        [postId]: false
      }));
      
      return count;
    } catch (error) {
      console.error(`获取帖子(${postId})评论数量失败:`, error);
      
      // 清除请求进行中标记
      setPendingCommentRequests(prev => ({
        ...prev,
        [postId]: false
      }));
      
      return 0;
    }
  };
  
  // 添加防抖函数用于评论请求
  const debounceCommentRequest = (postId, callback, delay = 300) => {
    // 如果已经有这个帖子的请求计时器，清除它
    if (debounceTimers.current[postId]) {
      clearTimeout(debounceTimers.current[postId]);
    }
    
    // 设置新的计时器
    debounceTimers.current[postId] = setTimeout(() => {
      callback();
      // 完成后清除计时器引用
      delete debounceTimers.current[postId];
    }, delay);
  };
  
  // 获取帖子的评论数量（修改版本）
  const getPostCommentCount = (postId) => {
    // 如果已经有缓存的数量，直接返回
    if (commentCounts[postId] !== undefined) {
      return commentCounts[postId];
    }
    
    // 如果已经有评论数据，直接计算长度
    if (commentsMap[postId]) {
      const count = commentsMap[postId].length;
      // 更新缓存
      setCommentCounts(prev => ({
        ...prev,
        [postId]: count
      }));
      return count;
    }
    
    // 如果还没有缓存的评论数量且没有请求正在进行中，触发异步获取
    if (!pendingCommentRequests[postId] && !debounceTimers.current[postId]) {
      // 使用防抖避免在短时间内多次请求
      debounceCommentRequest(postId, () => {
        fetchPostCommentCount(postId).catch(err => {
          console.error(`获取帖子(${postId})评论计数失败:`, err);
        });
      });
    }
    
    // 如果帖子对象有评论数组，使用它的长度
    const post = posts.find(p => p.id === postId);
    return post?.comments?.length || 0;
  };
  
  // 在帖子加载完成后获取评论数量
  useEffect(() => {
    if (!isLoading && posts.length > 0) {
      const fetchCounts = async () => {
        // 创建一个已请求帖子的集合，避免重复请求
        const requestedPosts = new Set();
        
        // 只获取没有评论计数且没有正在请求的帖子
        const postsWithoutCounts = posts.filter(post => 
          commentCounts[post.id] === undefined && 
          !pendingCommentRequests[post.id] &&
          !debounceTimers.current[post.id] &&
          (!post.comments || post.comments.length > 0) &&
          !requestedPosts.has(post.id)
        );
        
        if (postsWithoutCounts.length > 0) {          
          // 并发获取评论计数，但限制并发数以避免过多请求
          const batchSize = 2; // 减少批量大小，降低并发请求数
          for (let i = 0; i < postsWithoutCounts.length; i += batchSize) {
            const batch = postsWithoutCounts.slice(i, i + batchSize);
            
            // 标记这些帖子为已请求
            batch.forEach(post => requestedPosts.add(post.id));
            
            await Promise.all(batch.map(post => fetchPostCommentCount(post.id)));
            
            // 添加延迟，进一步减少服务器压力
            if (i + batchSize < postsWithoutCounts.length) {
              await new Promise(resolve => setTimeout(resolve, 300));
            }
          }
        }
      };
      
      fetchCounts();
    }
  }, [isLoading, posts]);
  
  // 添加清理定时器的useEffect
  useEffect(() => {
    // 组件卸载时清除所有防抖定时器
    return () => {
      Object.keys(debounceTimers.current).forEach(key => {
        clearTimeout(debounceTimers.current[key]);
      });
    };
  }, []);
  
  // 切换评论展开/收起状态
  const toggleComments = async (postId) => {
    handlePotentialLeave(async () => {
      // 如果评论已经在加载中，则不要重复请求
      if (commentLoading && !commentsMap[postId]) {
        return;
      }
      
      setCommentLoading(true);
      try {
        // 如果评论还未加载，则加载评论
        if (!commentsMap[postId] && !pendingCommentRequests[postId]) {
          // 标记该帖子的请求为进行中
          setPendingCommentRequests(prev => ({
            ...prev,
            [postId]: true
          }));
          
          const comments = await dispatch(fetchCommentsByPostId(postId)).unwrap();
          
          // 更新评论计数
          setCommentCounts(prev => ({
            ...prev,
            [postId]: comments ? comments.length : 0
          }));
          
          // 获取评论中的用户信息
          if (comments && comments.length > 0) {
            for (const comment of comments) {
              if (comment.user_id) {
                // 确保异步加载不会阻塞UI
                fetchUserById(comment.user_id).catch(err => {
                  console.error(`加载评论用户 ${comment.user_id} 信息失败:`, err);
                });
              } else {
                console.warn('评论缺少用户ID:', comment);
              }
            }
          }
          
          setCommentsMap(prev => ({
            ...prev,
            [postId]: comments || []
          }));
          
          // 清除请求进行中标记
          setPendingCommentRequests(prev => ({
            ...prev,
            [postId]: false
          }));
        }
        
        // 切换显示状态
        setOpenComments(prev => ({
          ...prev,
          [postId]: !prev[postId]
        }));
        
        setActiveCommentPostId(postId);
        
        // 无论是什么视图，都打开侧边面板
        setCommentDialogOpen(true);
      } catch (error) {
        console.error("加载评论失败:", error);
        toast.error(t('loadCommentsError') || "加载评论失败");
        
        // 清除请求进行中标记
        setPendingCommentRequests(prev => ({
          ...prev,
          [postId]: false
        }));
      } finally {
        setCommentLoading(false);
      }
    });
  };
  
  // 创建新评论
  const submitComment = async (postId) => {
    if (!newCommentText.trim()) {
      toast.error(t('commentRequired') || "评论内容不能为空");
      return;
    }
    
    try {
      setCommentLoading(true);
      
      // 构建评论数据
      const commentData = {
        post_id: postId,
        text: newCommentText.trim(),
        user_id: user?.id // 确保传递用户ID
      };
            
      // 使用Redux action创建评论
      const result = await dispatch(createComment(commentData)).unwrap();
      
      if (result) {
        // 确保获取评论作者信息
        if (result.user_id) {
          await fetchUserById(result.user_id);
        }
        
        // 更新评论列表
        setCommentsMap(prev => {
          const updatedComments = [...(prev[postId] || []), result];
          
          // 同时更新评论计数
          setCommentCounts(prev => ({
            ...prev,
            [postId]: updatedComments.length
          }));
          
          return {
            ...prev,
            [postId]: updatedComments
          };
        });
        
        // 清空输入框
        setNewCommentText('');
        
        toast.success(t('commentAdded') || "评论已添加");
      }
    } catch (error) {
      console.error("添加评论失败:", error);
      toast.error(t('addCommentError') || "添加评论失败");
    } finally {
      setCommentLoading(false);
    }
  };
  
  // 渲染评论对话框（用于网格视图）
  const renderCommentDialog = () => {
    const activePost = posts.find(post => post.id === activeCommentPostId);
    
    if (!activePost || !commentDialogOpen) return null; // 确保只有当commentDialogOpen为true时才渲染
    
    return (
      <>
        {/* 遮罩层 */}
        <div 
          className="fixed inset-0 bg-black/30 dark:bg-black/50 z-[998]"
          onClick={() => setCommentDialogOpen(false)}
        />
        
        {/* 评论侧边栏 */}
        <div 
          className={`fixed inset-y-0 right-0 max-w-md w-full shadow-xl bg-background dark:bg-[#1F1F1F] border-l border-[#E1DFDD] dark:border-[#3B3A39] transform transition-transform duration-300 ease-in-out z-[999] flex flex-col ${commentDialogOpen ? 'translate-x-0' : 'translate-x-full'}`}
        >
          {/* 顶部标题区域 */}
          <div className="p-4 border-b border-[#E1DFDD] dark:border-[#3B3A39] flex items-center justify-between">
            <div className="flex items-center">
              <MessageSquare className="h-5 w-5 mr-2 flex-shrink-0 text-[#6264A7]" />
              <span className="font-medium text-base">{t('comments') || "评论"}</span>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setCommentDialogOpen(false)}
              className="h-8 w-8 rounded-full hover:bg-[#F5F5F5] dark:hover:bg-[#3B3A39]"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          {/* 帖子信息区域 */}
          <div className="px-4 py-3 border-b border-[#E1DFDD] dark:border-[#3B3A39] bg-accent/30 dark:bg-accent/10">
            <h3 className="text-base font-medium line-clamp-2 break-words">{activePost.title}</h3>
            <div className="mt-2 text-sm text-[#605E5C] dark:text-[#C8C6C4] flex items-center">
              <Avatar className="h-6 w-6 mr-2 border border-[#E1DFDD] dark:border-[#3B3A39]">
                <AvatarImage src={userMap[activePost.created_by]?.avatar_url || "/placeholder-avatar.jpg"} />
                <AvatarFallback style={{ backgroundColor: getColorHexCode(themeColor) }} className="text-white text-xs">
                  {userMap[activePost.created_by]?.name?.substring(0, 2).toUpperCase() || 'UN'}
                </AvatarFallback>
              </Avatar>
              <span className="truncate">
                {userMap[activePost.created_by]?.name || t('unknownUser')} · {formatPostDate(activePost.created_at)}
              </span>
            </div>
          </div>
          
          {/* 评论列表区域 */}
          <div className="flex-grow overflow-y-auto p-4 pb-24">
            {/* 评论数量标题 */}
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-medium text-sm text-[#252423] dark:text-white">
                {commentsMap[activeCommentPostId]?.length > 0 
                  ? `${t('comments') || "评论"} (${commentsMap[activeCommentPostId]?.length})` 
                  : t('noComments') || "暂无评论"}
              </h4>
              {commentLoading && (
                <div className="flex items-center">
                  <svg className="animate-spin h-4 w-4 mr-2 text-[#6264A7]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span className="text-xs text-[#6264A7]">{t('loading') || "加载中..."}</span>
                </div>
              )}
            </div>
            
            {/* 评论列表 */}
            <div className="space-y-3">
              {(commentsMap[activeCommentPostId] || []).map(comment => (
                <div key={comment.id} className="flex space-x-3 bg-background hover:bg-accent/30 dark:hover:bg-accent/10 p-3 rounded-lg transition-colors border border-transparent hover:border-[#E1DFDD] dark:hover:border-[#3B3A39]">
                  <Avatar className="h-8 w-8 border-2 flex-shrink-0">
                    <AvatarImage src={userMap[comment.user_id]?.avatar_url || "/placeholder-avatar.jpg"} />
                    <AvatarFallback style={{ backgroundColor: getColorHexCode(themeColor) }} className="text-white text-xs">
                      {userMap[comment.user_id] ? userMap[comment.user_id].name?.substring(0, 2).toUpperCase() : (comment.user_id?.substring(0, 2) || 'UN')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="font-medium text-sm truncate max-w-[180px] text-[#252423] dark:text-white">
                        {userMap[comment.user_id]?.name || `未知用户 (${comment.user_id?.substring(0, 8) || '无ID'})`}
                      </div>
                      <div className="text-xs text-[#605E5C] dark:text-[#C8C6C4] flex-shrink-0">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="cursor-default">
                                {formatPostTime(comment.created_at)}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent side="bottom">
                              <p>{formatPostDate(comment.created_at, { 
                                year: 'numeric', 
                                month: 'long', 
                                day: 'numeric', 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </div>
                    <div className="text-sm mt-1 break-words whitespace-pre-wrap overflow-wrap-anywhere overflow-x-hidden text-[#252423] dark:text-white">
                      {comment.text}
                    </div>
                  </div>
                </div>
              ))}
              
              {/* 没有评论时显示提示信息 */}
              {(commentsMap[activeCommentPostId]?.length === 0 && !commentLoading) && (
                <div className="text-center py-8">
                  <MessageSquare className="h-10 w-10 mx-auto mb-2 text-[#A19F9D] dark:text-[#605E5C]" />
                  <p className="text-sm text-[#605E5C] dark:text-[#A19F9D]">{t('beFirstToComment') || "成为第一个评论的人"}</p>
                </div>
              )}
            </div>
          </div>
          
          {/* 底部固定的评论输入框 */}
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-background dark:bg-[#1F1F1F] border-t border-[#E1DFDD] dark:border-[#3B3A39] shadow-md">
            <div className="flex space-x-2 items-center">
              <Avatar className="h-8 w-8 border-2 flex-shrink-0">
                <AvatarImage src={user?.avatar_url || "/placeholder-avatar.jpg"} />
                <AvatarFallback style={{ backgroundColor: getColorHexCode(themeColor) }} className="text-white text-xs">
                  {user?.name?.substring(0, 2).toUpperCase() || 'UN'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 flex space-x-2">
                <Input 
                  placeholder={t('addComment') || "添加评论..."}
                  value={newCommentText}
                  onChange={(e) => setNewCommentText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      submitComment(activeCommentPostId);
                    }
                  }}
                  className="flex-1 h-9 text-sm border-[#E1DFDD] dark:border-[#3B3A39] focus-visible:ring-1 focus-visible:ring-[#6264A7]"
                />
                <Button 
                  variant={themeColor}
                  size="sm" 
                  onClick={() => submitComment(activeCommentPostId)}
                  disabled={!newCommentText.trim() || commentLoading}
                  className="h-9 px-3 flex-shrink-0"
                >
                  {commentLoading ? (
                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : t('send') || "发送"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  };
  
  // 修改renderComments函数，简化评论渲染
  const renderComments = (postId) => {
    const comments = commentsMap[postId] || [];
    
    // 列表视图中显示完整评论内容
    return (
      <div className="mt-4 space-y-4">
        <h4 className="font-medium text-sm">
          {comments.length > 0 ? `${t('comments') || "评论"} (${comments.length})` : t('noComments') || "暂无评论"}
        </h4>
        
        {comments.length > 0 && (
          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
            {comments.map(comment => (
              <div key={comment.id} className="flex space-x-2 bg-background hover:bg-accent/50 p-2 rounded-md transition-colors">
                <Avatar className="h-8 w-8 border-2 flex-shrink-0">
                  <AvatarImage src={userMap[comment.user_id]?.avatar_url || "/placeholder-avatar.jpg"} />
                  <AvatarFallback style={{ backgroundColor: getColorHexCode(themeColor) }} className="text-white text-xs">
                    {userMap[comment.user_id] ? userMap[comment.user_id].name?.substring(0, 2).toUpperCase() : (comment.user_id?.substring(0, 2) || 'UN')}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div className="font-medium text-sm truncate max-w-[180px]">
                      {userMap[comment.user_id]?.name || `未知用户 (${comment.user_id?.substring(0, 8) || '无ID'})`}
                    </div>
                    <div className="text-xs text-[#605E5C] dark:text-[#C8C6C4] flex-shrink-0">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="cursor-default">
                              {formatPostTime(comment.created_at)}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="bottom">
                            <p>{formatPostDate(comment.created_at, { 
                              year: 'numeric', 
                              month: 'long', 
                              day: 'numeric', 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>
                  <div className="text-sm mt-1 break-words whitespace-pre-wrap overflow-wrap-anywhere overflow-x-hidden">
                    {comment.text}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* 列表视图下的评论输入框 */}
        <div className="flex space-x-2 mt-4">
          <Avatar className="h-8 w-8 border-2 flex-shrink-0">
            <AvatarImage src={user?.avatar_url || "/placeholder-avatar.jpg"} />
            <AvatarFallback style={{ backgroundColor: getColorHexCode(themeColor) }} className="text-white text-xs">
              {user?.name?.substring(0, 2).toUpperCase() || 'UN'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 flex space-x-2">
            <Input 
              placeholder={t('addComment') || "添加评论..."}
              value={newCommentText}
              onChange={(e) => setNewCommentText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  submitComment(postId);
                }
              }}
              className="flex-1 h-8 text-sm border-[#E1DFDD] dark:border-[#3B3A39]"
            />
            <Button 
              variant={themeColor}
              size="sm" 
              onClick={() => submitComment(postId)}
              disabled={!newCommentText.trim() || commentLoading}
              className="h-8 px-3 flex-shrink-0"
            >
              {commentLoading ? (
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : t('send') || "发送"}
            </Button>
          </div>
        </div>
      </div>
    );
    
  };
  
  // 渲染帖子编辑表单
  const renderEditForm = (post) => (
    <Card 
      className="mb-4 mt-2 overflow-hidden border bg-background border-[#E1DFDD] dark:border-[#3B3A39] dark:text-white"
    >
      <div className="p-4">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center space-x-3 flex-grow">
            <Avatar className="border-2">
              <AvatarImage src={user?.avatar_url || "/placeholder-avatar.jpg"} />
              <AvatarFallback style={{ backgroundColor: getColorHexCode(themeColor) }} className="text-white">
                {user?.name?.substring(0, 2).toUpperCase() || 'UN'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0 w-full max-w-full">
              <div className="grid gap-2">
                <div className="">
                  <div className="relative">
                    <Input
                      id="edit-title"
                      autoFocus
                      placeholder={t('postTitlePlaceholder')}
                      value={editPostTitle}
                      onChange={(e) => setEditPostTitle(e.target.value)}
                      className="text-lg border-border border shadow-none bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-[#252423] dark:text-white w-full focus:border-gray-500 dark:focus:border-white pr-16"
                      maxLength={50}
                    />
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-[#605E5C] dark:text-[#C8C6C4]">
                      <span className="font-medium">
                        {editPostTitle.trim().length}/50
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2 ml-4">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full hover:bg-[#F5F5F5] dark:hover:bg-[#3B3A39]"
              onClick={() => handleDeletePost(post.id)}
            >
              <Trash2 className="h-4 w-4 text-red-500 hover:text-red-600" />
            </Button>
          </div>
        </div>
        
        <div className="border-t pt-4 border-[#E1DFDD] dark:border-[#3B3A39]">
          <div className="grid gap-4">
            <div className="relative mb-6">
              <RichEditor
                placeholder={t('postDescriptionPlaceholder')}
                value={editPostContent}
                onChange={setEditPostContent}
                className="h-[150px] min-h-[150px] max-h-[250px] overflow-y-auto text-[#252423] dark:text-white border-[#E1DFDD] dark:border-[#3B3A39]"
              />
            </div>
            
            {/* 显示现有附件 */}
            {renderAttachments(editPostAttachments)}
          </div>
        </div>
        
        <div className="flex justify-between items-center pt-3 border-t border-[#E1DFDD] dark:border-[#3B3A39]">
          <div className="flex items-center space-x-2">
            <EmojiPicker 
              onEmojiSelect={(emojiData) => setEditPostContent(prev => prev + emojiData.emoji)}
              position="right"
              offset={5}
            />
            
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full hover:bg-[#F5F5F5] dark:hover:bg-[#3B3A39]"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleAttachFile(post.id);
              }}
            >
              <Paperclip className="h-4 w-4 text-[#252423] dark:text-white" />
            </Button>
          </div>
          
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={cancelEditingPost}
              className="rounded-md border-[#E1DFDD] text-[#252423] hover:bg-[#F5F5F5] dark:border-[#3B3A39] dark:text-white dark:hover:bg-[#3B3A39]"
            >
              {t('cancel')}
            </Button>
            <Button
              variant={themeColor}
              size="sm"
              onClick={saveEditedPost}
              disabled={!isEditFormValid || isLoading}
              className="rounded-md min-w-[80px]"
            >
              {isLoading ? 
                t('posting')
              : 
                t('post')
              }
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
  
  // Render inline post editor
  const renderInlineEditor = () => (
    <Card 
      ref={inlineEditorRef}
      className="mb-4 mt-2 overflow-hidden border bg-background border-[#E1DFDD] dark:border-[#3B3A39] dark:text-white"
    >
      <div className="p-4">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center space-x-3 flex-grow">
            <Avatar className="border-2">
              <AvatarImage src={user?.avatar_url || "/placeholder-avatar.jpg"} />
              <AvatarFallback style={{ backgroundColor: getColorHexCode(themeColor) }} className="text-white">
                {user?.name?.substring(0, 2).toUpperCase() || 'UN'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0 w-full max-w-full">
              <div className="grid gap-2">
                <div className="">
                  <div className="relative">
                    <Input
                      id="new-title"
                      autoFocus
                      placeholder={t('postTitlePlaceholder')}
                      value={newPostTitle}
                      onChange={(e) => setNewPostTitle(e.target.value)}
                      className="text-lg border-border border shadow-none bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-[#252423] dark:text-white w-full focus:border-gray-500 dark:focus:border-white pr-16"
                      maxLength={50}
                    />
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-[#605E5C] dark:text-[#C8C6C4]">
                      <span className="font-medium">
                        {newPostTitle.trim().length}/50
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="border-t pt-4 border-[#E1DFDD] dark:border-[#3B3A39]">
          <div className="grid gap-4">
            <div className="relative mb-6">
              <RichEditor
                placeholder={t('postDescriptionPlaceholder')}
                value={newPostContent}
                onChange={setNewPostContent}
                className="h-[150px] min-h-[150px] max-h-[250px] overflow-y-auto text-[#252423] dark:text-white border-[#E1DFDD] dark:border-[#3B3A39]"
              />
            </div>
          </div>
        </div>
        
        <div className="flex justify-between items-center pt-3 border-t border-[#E1DFDD] dark:border-[#3B3A39]">
          <div className="flex items-center space-x-2">
            <EmojiPicker 
              onEmojiSelect={(emojiData) => setNewPostContent(prev => prev + emojiData.emoji)}
              position="right"
              offset={5}
            />
            
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full hover:bg-[#F5F5F5] dark:hover:bg-[#3B3A39]"
              onClick={() => handleAttachFile('new')}
            >
              <Paperclip className="h-4 w-4 text-[#252423] dark:text-white" />
              {newPostTempFiles.length > 0 && (
                <span className="absolute top-0 right-0 h-4 w-4 rounded-full bg-primary text-[10px] flex items-center justify-center text-white">
                  {newPostTempFiles.length}
                </span>
              )}
            </Button>
            
            {/* 显示已选择的文件预览 */}
            {newPostTempFiles.length > 0 && renderSelectedFiles()}
            
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 rounded-md border-[#E1DFDD] hover:bg-[#F5F5F5] dark:border-[#3B3A39] dark:text-white dark:hover:bg-[#3B3A39] flex items-center gap-1 text-[#252423]"
                >
                  <div className="flex items-center gap-1">
                    {postType === 'post' ? (
                      <MessageSquare className="h-4 w-4" />
                    ) : (
                      <MessageSquare className="h-4 w-4 rotate-180" />
                    )}
                    <span>{postType === 'post' ? t('post') : t('announcement')}</span>
                  </div>
                  <ChevronDown className="h-3 w-3 ml-1" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-48 p-0">
                <div className="py-1">
                  <Button
                    variant="ghost"
                    className="w-full justify-start gap-2 rounded-none"
                    onClick={() => setPostType('post')}
                  >
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      <span>{t('post')}</span>
                    </div>
                    {postType === 'post' && <Check className="h-4 w-4 ml-auto" />}
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full justify-start gap-2 rounded-none"
                    onClick={() => setPostType('announcement')}
                  >
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 rotate-180" />
                      <span>{t('announcement')}</span>
                    </div>
                    {postType === 'announcement' && <Check className="h-4 w-4 ml-auto" />}
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>
          
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowInlineEditor(false)}
              className="rounded-md border-[#E1DFDD] text-[#252423] hover:bg-[#F5F5F5] dark:border-[#3B3A39] dark:text-white dark:hover:bg-[#3B3A39]"
            >
              {t('cancel')}
            </Button>
            <Button
              variant={themeColor}
              size="sm"
              onClick={handleCreatePost}
              disabled={!isFormValid || isLoading || isUploadingFiles}
              className="rounded-md min-w-[80px]"
            >
              {isLoading || isUploadingFiles ? 
                t('posting')
              : 
                t('post')
              }
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
  
  // Render grid view of posts
  const renderGridView = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {filteredAndSortedPosts.map((post) => (
        <div key={post.id}>
          {editingPostId === post.id ? (
            renderEditForm(post)
          ) : (
            <Card 
              className={cn(
                "overflow-hidden transition-all hover:shadow-md relative border-[#E1DFDD] hover:bg-accent dark:border-[#3B3A39] dark:text-white flex flex-col h-full min-h-[260px]",
                post.is_pinned && "border-l-4"
              )}
              style={post.is_pinned ? { borderLeftColor: getColorHexCode(themeColor) } : {}}
            >
              <CardHeader className="pb-2 pt-4">
                <div className="flex justify-between items-start">
                  <div className="flex items-center space-x-2">
                    <Avatar className="border-2"> 
                      <AvatarImage src={userMap[post.created_by]?.avatar_url || "/placeholder-avatar.jpg"} />
                      <AvatarFallback style={{ backgroundColor: getColorHexCode(themeColor) }} className="text-white">
                        {post.created_by && userMap[post.created_by] ? userMap[post.created_by].name?.substring(0, 2).toUpperCase() : 'UN'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center">
                        <CardTitle className="text-base font-semibold w-full truncate max-w-48">
                          {post.title || t('noTitle')}
                        </CardTitle>
                      </div>
                      <CardDescription className="text-xs text-[#605E5C] dark:text-[#C8C6C4]">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="cursor-default">
                                {formatPostDate(post.created_at, { year: 'numeric', month: 'short', day: 'numeric', hour: undefined, minute: undefined })}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent side="bottom">
                              <p>{formatPostDate(post.created_at, { 
                                year: 'numeric', 
                                month: 'long', 
                                day: 'numeric', 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </CardDescription>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 rounded-full hover:bg-[#F5F5F5] text-[#252423] dark:hover:bg-[#3B3A39] dark:text-white flex-shrink-0"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent 
                      align="end"
                    >
                      <DropdownMenuItem 
                        className="hover:bg-accent"
                        onClick={() => togglePinPost(post.id)}
                      >
                        {post.is_pinned ? (
                          <>
                            <PinOff className="h-4 w-4 mr-2" />
                            {t('unpin')}
                          </>
                        ) : (
                          <>
                            <Pin className="h-4 w-4 mr-2" />
                            {t('pin')}
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className="hover:bg-accent"
                        onClick={() => startEditingPost(post)}
                      >
                        <Pen className="h-4 w-4 mr-2" />
                        {t('edit')}
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className="hover:bg-accent"
                        onClick={() => handleDeletePost(post.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-2 text-red-500 hover:text-red-600" />
                        <span className="text-red-500 hover:text-red-600">{t('delete')}</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="pb-2 flex-grow">
                <div className={cn(
                  "rich-text-container overflow-hidden relative w-full flex-grow",
                  expandedPosts[post.id] 
                    ? "max-h-full overflow-y-auto" 
                    : "max-h-[80px]"
                )}>
                  {post.description ? (
                    <div className="prose prose-sm max-w-full dark:prose-invert break-words break-all overflow-x-hidden">
                      {renderRichTextContent(post.description)}
                    </div>
                  ) : (
                    <p className="text-sm text-[#605E5C] dark:text-[#C8C6C4]">
                      {t('noDescription')}
                    </p>
                  )}
                </div>
                
                {post.description && typeof post.description === 'string' && post.description.length > 100 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full mt-1 text-xs flex items-center justify-center"
                    onClick={() => togglePostExpand(post.id)}
                  >
                    {expandedPosts[post.id] ? (
                      <>
                        <ChevronUp className="h-3 w-3 ml-1" />
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-3 w-3 ml-1" />
                      </>
                    )}
                  </Button>
                )}
              </CardContent>
              <CardFooter className="pt-2 flex justify-between">
                <div className="flex space-x-2">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 rounded-full hover:bg-[#F5F5F5] dark:hover:bg-[#3B3A39]"
                    onClick={() => handleReaction(post.id, 'like')}
                  >
                    <ThumbsUp className={cn(
                      "h-4 w-4 text-[#252423] dark:text-white", 
                      post.reactions?.like?.includes(user?.id) && "fill-current text-[#6264A7]"
                    )} />
                    {post.reactions?.like?.length > 0 && (
                      <span className={cn(
                        "ml-1 text-xs text-[#252423] dark:text-white", 
                        post.reactions?.like?.includes(user?.id) && "text-[#6264A7]"
                      )}>
                        {post.reactions.like.length}
                      </span>
                    )}
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className={cn(
                      "h-8 w-8 rounded-full hover:bg-[#F5F5F5] dark:hover:bg-[#3B3A39]",
                      openComments[post.id] && "text-[#6264A7]"
                    )}
                    onClick={() => toggleComments(post.id)}
                  >
                    <MessageSquare className={cn(
                      "h-4 w-4 text-[#252423] dark:text-white"
                      
                    )} />
                    {getPostCommentCount(post.id) > 0 && (
                      <span className={cn(
                        "ml-1 text-xs text-[#252423] dark:text-white",
                      )}>
                        {getPostCommentCount(post.id)}
                      </span>
                    )}
                  </Button>
                </div>
                <div className="flex items-center text-xs text-[#605E5C] dark:text-[#C8C6C4]">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center cursor-default">
                          <Clock className="h-3 w-3 mr-1" />
                          {formatPostTime(post.updated_at || post.created_at)}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="bottom">
                        <p>{formatPostDate(post.updated_at || post.created_at, { 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric', 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </CardFooter>
            </Card>
          )}
        </div>
      ))}
      {renderCommentDialog()}
    </div>
  );
  
  // Render list view of posts
  const renderListView = () => (
    <div className="flex flex-col space-y-2">
      {filteredAndSortedPosts.map((post) => (
        <div key={post.id}>
          {editingPostId === post.id ? (
            renderEditForm(post)
          ) : (
            <>
              <Card 
                className={cn(
                  "overflow-hidden overflow-x-auto transition-all hover:shadow-md relative border-[#E1DFDD] hover:bg-accent dark:border-[#3B3A39] dark:text-white",
                  post.is_pinned && "border-l-4"
                )}
                style={post.is_pinned ? { borderLeftColor: getColorHexCode(themeColor) } : {}}
              >
                <div className="flex flex-col md:flex-row p-0 h-full">
                  <div className="flex-grow p-4 flex flex-col">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center space-x-3">
                        <Avatar className="border-2">
                          <AvatarImage src={userMap[post.created_by]?.avatar_url || "/placeholder-avatar.jpg"} />
                          <AvatarFallback style={{ backgroundColor: getColorHexCode(themeColor) }} className="text-white">
                            {post.created_by && userMap[post.created_by] ? userMap[post.created_by].name?.substring(0, 2).toUpperCase() : 'UN'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center">
                            <h3 className="text-base font-semibold truncate max-w-[200px] sm:max-w-[250px] md:max-w-[350px] lg:max-w-[450px] xl:max-w-[550px]">
                              {post.title || t('noTitle')}
                            </h3>
                            {post.is_pinned && (
                              <Pin size={14} style={{ color: getColorHexCode(themeColor) }} className="ml-2 flex-shrink-0" />
                            )}
                          </div>
                          <CardDescription className="text-xs text-[#605E5C] dark:text-[#C8C6C4]">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="cursor-default">
                                    {formatPostDate(post.created_at, { year: 'numeric', month: 'short', day: 'numeric', hour: undefined, minute: undefined })}
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent side="bottom">
                                  <p>{formatPostDate(post.created_at, { 
                                    year: 'numeric', 
                                    month: 'long', 
                                    day: 'numeric', 
                                    hour: '2-digit', 
                                    minute: '2-digit' 
                                  })}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <div className="flex items-center text-xs mr-4 text-[#605E5C] dark:text-[#C8C6C4]">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="flex items-center cursor-default">
                                  <Clock className="h-3 w-3 mr-1" />
                                  {formatPostTime(post.updated_at || post.created_at)}
                                </div>
                              </TooltipTrigger>
                              <TooltipContent side="bottom">
                                <p>{formatPostDate(post.updated_at || post.created_at, { 
                                  year: 'numeric', 
                                  month: 'long', 
                                  day: 'numeric', 
                                  hour: '2-digit', 
                                  minute: '2-digit' 
                                })}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 rounded-full hover:bg-[#F5F5F5] text-[#252423] dark:hover:bg-[#3B3A39] dark:text-white flex-shrink-0"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent 
                            align="end"
                          >
                            <DropdownMenuItem 
                              className="hover:bg-accent"
                              onClick={() => togglePinPost(post.id)}
                            >
                              {post.is_pinned ? (
                                <>
                                  <PinOff className="h-4 w-4 mr-2" />
                                  {t('unpin')}
                                </>
                              ) : (
                                <>
                                  <Pin className="h-4 w-4 mr-2" />
                                  {t('pin')}
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="hover:bg-accent"
                              onClick={() => startEditingPost(post)}
                            >
                              <Pen className="h-4 w-4 mr-2" />
                              {t('edit')}
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="hover:bg-accent"
                              onClick={() => handleDeletePost(post.id)}
                            >
                              <Trash2 className="h-4 w-4 mr-2 text-red-500 hover:text-red-600" />
                              <span className="text-red-500 hover:text-red-600">{t('delete')}</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                    
                    <div className={cn(
                      "rich-text-container overflow-hidden overflow-x-auto relative mt-2 w-full flex-grow",
                      expandedPosts[post.id] 
                        ? "max-h-full overflow-y-auto" 
                        : "max-h-[80px]"
                    )}>
                      {post.description ? (
                        <div className="prose prose-sm max-w-full dark:prose-invert break-words break-all overflow-x-hidden">
                          {renderRichTextContent(post.description)}
                        </div>
                      ) : (
                        <p className="text-sm text-[#605E5C] dark:text-[#C8C6C4]">
                          {t('noDescription')}
                        </p>
                      )}
                    </div>
                    
                    {post.description && typeof post.description === 'string' && post.description.length > 100 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full mt-1 text-xs flex items-center justify-center"
                        onClick={() => togglePostExpand(post.id)}
                      >
                        {expandedPosts[post.id] ? (
                          <>
                            <ChevronUp className="h-3 w-3 ml-1" />
                          </>
                        ) : (
                          <>
                            <ChevronDown className="h-3 w-3 ml-1" />
                          </>
                        )}
                      </Button>
                    )}
                    
                    <div className="flex justify-start items-center mt-auto pt-3">
                      <div className="flex space-x-3">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className={cn(
                            "h-8 px-2 rounded-md flex items-center hover:bg-[#F5F5F5] dark:hover:bg-[#3B3A39]",
                            post.reactions?.like?.includes(user?.id) && "text-[#6264A7]"
                          )}
                          onClick={() => handleReaction(post.id, 'like')}
                        >
                          <ThumbsUp className={cn(
                            "h-4 w-4 mr-1 text-[#252423] dark:text-white", 
                            post.reactions?.like?.includes(user?.id) && "fill-current text-[#6264A7]"
                          )} />
                          <span className={post.reactions?.like?.includes(user?.id) ? "text-[#6264A7]" : ""}>
                            {post.reactions?.like?.length || 0}
                          </span>
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className={cn(
                            "h-8 px-2 rounded-md flex items-center hover:bg-[#F5F5F5] dark:hover:bg-[#3B3A39]",
                            openComments[post.id] && "text-[#6264A7]"
                          )}
                          onClick={() => toggleComments(post.id)}
                        >
                          <MessageSquare className={cn(
                            "h-4 w-4 mr-1 text-[#252423] dark:text-white",
                          )} />
                          <span className={openComments[post.id] ? "text-[#6264A7]" : ""}>
                            {getPostCommentCount(post.id)}
                          </span>
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
              
              {/* 列表视图下展开评论 */}
              {openComments[post.id] && (
                <div className="pl-8 pr-4 py-3 border-l-2 ml-4 bg-background border-[#E1DFDD] dark:border-[#3B3A39] rounded-md">
                  {commentLoading && commentsMap[post.id] === undefined ? (
                    <div className="flex justify-center items-center py-4">
                      <svg className="animate-spin h-5 w-5 text-[#6264A7]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    </div>
                  ) : (
                    renderComments(post.id)
                  )}
                </div>
              )}
            </>
          )}
        </div>
      ))}
    </div>
  );
  
  // 添加滚动效果
  useEffect(() => {
    if (showInlineEditor && inlineEditorRef.current) {
      // 使用setTimeout确保DOM已更新
      setTimeout(() => {
        inlineEditorRef.current.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        });
      }, 100);
    }
  }, [showInlineEditor]);
  
  // 开始编辑帖子
  const startEditingPost = (post) => {
    handlePotentialLeave(async () => {
      setEditingPostId(post.id);
      setEditPostTitle(post.title || '');
      setEditPostDescription(post.description || '');
      setEditPostContent(post.description || '');
      
      // 获取并设置该帖子的附件
      const attachments = await fetchPostAttachments(post.id);
      setEditPostAttachments(attachments);
    });
  };
  
  // 取消编辑帖子
  const cancelEditingPost = () => {
    // 如果有待删除的附件，恢复它们
    if (pendingDeleteAttachments.length > 0) {
      setEditPostAttachments(prev => [...prev, ...pendingDeleteAttachments]);
      setPendingDeleteAttachments([]);
    }
    
    setEditingPostId(null);
    setEditPostTitle('');
    setEditPostDescription('');
    setEditPostContent('');
    setEditPostAttachments([]); // 清空编辑状态的附件
  };
  
  // 保存编辑的帖子 - 更新这部分以包含附件处理
  const saveEditedPost = async () => {
    const trimmedTitle = editPostTitle.trim();
    
    if (trimmedTitle.length < 2 || trimmedTitle.length > 50) {
      toast.error(t('titleLengthError'));
      return;
    }
    
    try {
      setIsLoading(true);
      
      // 如果有待删除的附件，先执行删除操作
      if (pendingDeleteAttachments.length > 0) {
        for (const attachment of pendingDeleteAttachments) {
          // 从attachment表中删除记录
          const { error: deletedAttachmentError } = await supabase
            .from('attachment')
            .delete()
            .eq('id', attachment.id);
          
          if (deletedAttachmentError) throw deletedAttachmentError;
          
          // TODO: 如果需要，这里还可以添加删除存储中的文件
        }
      }
      
      // 准备更新的帖子数据
      const updateData = {
        id: editingPostId,
        title: trimmedTitle,
        description: editPostContent, // 始终使用富文本编辑器的内容
        type: postType,
        team_id: teamId,
        attachment_id: editPostAttachments.map(att => att.id) // 添加附件ID数组
      };
      
      // 使用supabase直接更新帖子，包括附件
      const { data: updatedPost, error } = await supabase
        .from('team_post')
        .update(updateData)
        .eq('id', editingPostId)
        .select()
        .single();
      
      if (error) throw error;
      
      // 重置编辑状态
      cancelEditingPost();
      
      // 清空待删除附件列表
      setPendingDeleteAttachments([]);
      
      // 直接用Redux刷新一次帖子列表，确保数据一致性
      const updatedPosts = await dispatch(fetchPostsByTeamId(teamId)).unwrap();
      
      // 确保使用最新的数据更新本地状态
      setPosts(updatedPosts);
      
      toast.success(t('postUpdated') || '帖子已更新');
    } catch (error) {
      console.error(t('updatePostError') || '更新帖子失败', error);
      toast.error(t('updatePostError') || '更新帖子失败');
    } finally {
      setIsLoading(false);
    }
  };
  
  // 添加离开编辑器的确认提示状态
  const handleConfirmLeave = () => {
    setShowLeaveConfirm(false);
    resetForm();
    
    // 如果有待执行的操作，执行它
    if (typeof pendingAction === 'function') {
      setTimeout(() => {
        pendingAction();
        setPendingAction(null);
      }, 100);
    }
  };
  
  // 取消离开并继续编辑
  const handleCancelLeave = () => {
    setShowLeaveConfirm(false);
    setPendingAction(null);
  };
  
  // 处理可能离开编辑器的操作
  const handlePotentialLeave = (actionCallback) => {
    // 检查是否在编辑帖子
    if (editingPostId !== null) {
      // 如果标题和内容都没有修改，直接执行操作
      const post = posts.find(p => p.id === editingPostId);
      if (post && editPostTitle === post.title && editPostContent === post.description) {
        cancelEditingPost();
        if (typeof actionCallback === 'function') {
          actionCallback();
        }
        return true;
      }
      
      // 如果有修改，显示确认对话框
      setShowLeaveConfirm(true);
      setPendingAction(() => {
        return () => {
          cancelEditingPost();
          if (typeof actionCallback === 'function') {
            actionCallback();
          }
        };
      });
      return false;
    }
    
    if (showInlineEditor) {
      // 如果编辑器打开但标题和内容都为空，直接关闭编辑器并执行操作
      if (!newPostTitle.trim() && !newPostContent.trim()) {
        setShowInlineEditor(false);
        if (typeof actionCallback === 'function') {
          actionCallback();
        }
        return true;
      }
      
      // 如果编辑器有内容，显示确认对话框
      if (newPostTitle.trim() || newPostContent.trim()) {
        setShowLeaveConfirm(true);
        setPendingAction(() => actionCallback);
        return false;
      }
    }
    
    // 如果编辑器没有打开，直接执行操作
    if (typeof actionCallback === 'function') {
      actionCallback();
    }
    return true;
  };
  
  // 修改setViewMode函数调用处理潜在的离开操作
  const handleViewModeChange = (mode) => {
    handlePotentialLeave(() => {
      setViewMode(mode);
      // 关闭评论对话框
      setCommentDialogOpen(false);
    });
  };
  
  // 修改搜索框的onChange处理函数以处理潜在的离开操作
  const handleSearchChange = (e) => {
    const newValue = e.target.value;
    handlePotentialLeave(() => {
      setSearchQuery(newValue);
    });
  };
  
  // 添加处理附件上传的函数
  const handleAttachFile = (postId) => {
    // 如果是新帖子，不要使用handlePotentialLeave，直接打开附件对话框
    if (postId === 'new') {
      setActiveAttachPostId('new');
      setShowAttachFileDialog(true);
      return;
    }
    
    // 如果是编辑中的帖子，也直接打开附件对话框
    if (postId === editingPostId) {
      setActiveAttachPostId(postId);
      setShowAttachFileDialog(true);
      return;
    }
    
    // 对于其他已有帖子，使用原来的逻辑
    handlePotentialLeave(() => {
      // 确保postId有效
      if (postId) {
        setActiveAttachPostId(postId);
        setShowAttachFileDialog(true);
      } else {
        // 如果没有传入postId，使用当前活动的评论帖子ID
        if (activeCommentPostId) {
          setActiveAttachPostId(activeCommentPostId);
          setShowAttachFileDialog(true);
        } else {
          toast.error(t('selectPostFirst') || '请先选择一个帖子');
        }
      }
    });
  };
  
  // 处理文件附加完成后的回调
  const handleFileAttached = async (selectedFiles) => {
    if (selectedFiles && selectedFiles.length > 0) {
      if (activeAttachPostId === 'new') {
        // 如果是添加到新帖子，仅保存文件对象，不立即上传
        setNewPostTempFiles(prev => [...prev, ...selectedFiles]);
        toast.success(t('fileSelected') || '文件已选择，将在发布时上传');
      } else if (activeAttachPostId) {
        // 如果是添加到正在编辑的帖子，判断是否是当前编辑的帖子
        if (activeAttachPostId === editingPostId) {
          try {
            setIsUploadingFiles(true);
            toast.loading(t('uploadingFiles') || '正在上传文件...');
            
            // 上传文件并获取附件记录
            const uploadedAttachments = [];
            for (const fileItem of selectedFiles) {
              const attachmentData = await uploadFile(fileItem);
              if (attachmentData) {
                uploadedAttachments.push(attachmentData);
              }
            }
            
            if (uploadedAttachments.length > 0) {
              // 添加到编辑中帖子的附件列表
              setEditPostAttachments(prev => [...prev, ...uploadedAttachments]);
              
              // 更新帖子的attachment_id字段
              const currentPostAttachmentIds = editPostAttachments.map(att => att.id);
              const newAttachmentIds = [...currentPostAttachmentIds, ...uploadedAttachments.map(att => att.id)];
              
              const { data, error } = await supabase
                .from('team_post')
                .update({
                  attachment_id: newAttachmentIds
                })
                .eq('id', editingPostId);
              
              if (error) throw error;
              
              toast.dismiss();
              toast.success(t('fileAttached') || '文件已添加到帖子');
            }
          } catch (error) {
            console.error("Error uploading files for editing post:", error);
            toast.dismiss();
            toast.error(t('uploadError') || '上传文件失败');
          } finally {
            setIsUploadingFiles(false);
          }
        } else {
          // 现有帖子的处理方式不变，可以直接上传
          setPostAttachments(prev => ({
            ...prev,
            [activeAttachPostId]: [
              ...(prev[activeAttachPostId] || []),
              ...selectedFiles
            ]
          }));
          
          toast.success(t('fileAttached') || '文件已附加到帖子');
        }
      }
    }
  };
  
  // 上传单个文件并返回附件信息
  const uploadFile = async (fileItem) => {
    try {
      // 生成唯一的文件路径
      const timestamp = new Date().getTime();
      const fileName = fileItem.name;
      const uniqueFileName = `${timestamp}_${fileName}`;
      const filePath = `posts/temp/${timestamp}/${uniqueFileName}`;
      
      // 上传文件到Supabase存储
      const { data: storageData, error: storageError } = await supabase.storage
        .from('attachments')
        .upload(filePath, fileItem.file);
      
      if (storageError) throw storageError;
      
      // 获取公共URL
      const { data: publicUrlData } = supabase.storage
        .from('attachments')
        .getPublicUrl(filePath);
        
      const publicUrl = publicUrlData.publicUrl;
      
      // 创建附件记录
      const { data: attachmentData, error: attachmentError } = await supabase
        .from('attachment')
        .insert({
          file_name: fileName,
          file_url: publicUrl,
          uploaded_by: user?.id,
          file_type: fileItem.type,
          size: fileItem.size,
          file_path: filePath
        })
        .select()
        .single();
      
      if (attachmentError) throw attachmentError;
      
      return {
        id: attachmentData.id,
        name: fileName,
        url: publicUrl,
        type: fileItem.type,
        size: fileItem.size
      };
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  };
  
  // 上传所有文件
  const uploadAllFiles = async () => {
    if (!newPostTempFiles || newPostTempFiles.length === 0) {
      return [];
    }
    
    try {
      setIsUploadingFiles(true);
      
      const uploadedAttachments = [];
      // 逐个上传文件
      for (const fileItem of newPostTempFiles) {
        const attachmentData = await uploadFile(fileItem);
        if (attachmentData) {
          uploadedAttachments.push(attachmentData);
        }
      }
      
      // 清理预览URL
      newPostTempFiles.forEach(file => {
        if (file.preview) {
          URL.revokeObjectURL(file.preview);
        }
      });
      
      return uploadedAttachments;
    } catch (error) {
      console.error("Error uploading files:", error);
      toast.error(t('uploadError') || '上传文件时出错');
      return [];
    } finally {
      setIsUploadingFiles(false);
    }
  };
  
  // 添加显示已选择文件的函数
  const renderSelectedFiles = () => {
    if (newPostTempFiles.length === 0) return null;
    
    return (
      <div className="mt-2 space-y-1">
        <p className="text-xs text-[#605E5C] dark:text-[#C8C6C4]">
          {t('selectedFiles') || '已选择的文件'}:
        </p>
        <div className="flex flex-wrap gap-2">
          {newPostTempFiles.map((file, index) => (
            <div
              key={index}
              className="flex items-center bg-accent/50 dark:bg-accent/20 rounded-md px-2 py-1 text-xs"
            >
              {file.type.startsWith('image/') ? (
                <img 
                  src={file.preview} 
                  alt={file.name}
                  className="w-4 h-4 object-cover rounded mr-1"
                />
              ) : file.type.includes('pdf') ? (
                <File className="w-3 h-3 text-red-500 mr-1" />
              ) : file.type.includes('doc') ? (
                <FileText className="w-3 h-3 text-blue-500 mr-1" />
              ) : (
                <File className="w-3 h-3 text-gray-500 mr-1" />
              )}
              <span className="truncate max-w-[100px]">{file.name}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-4 w-4 rounded-full ml-1 hover:bg-accent"
                onClick={() => removeSelectedFile(index)}
              >
                <X className="h-2 w-2" />
              </Button>
            </div>
          ))}
        </div>
      </div>
    );
  };
  
  // 移除已选择但未上传的文件
  const removeSelectedFile = (index) => {
    setNewPostTempFiles(prev => {
      const newFiles = [...prev];
      
      // 释放预览URL
      if (newFiles[index]?.preview) {
        URL.revokeObjectURL(newFiles[index].preview);
      }
      
      newFiles.splice(index, 1);
      return newFiles;
    });
  };
  
  // 获取帖子附件的函数
  const fetchPostAttachments = async (postId) => {
    try {
      // 首先获取帖子详情，查看attachment_id字段
      const { data: post, error: postError } = await supabase
        .from('team_post')
        .select('attachment_id')
        .eq('id', postId)
        .single();
      
      if (postError) throw postError;
      
      // 如果没有附件，直接返回空数组
      if (!post.attachment_id || !Array.isArray(post.attachment_id) || post.attachment_id.length === 0) {
        return [];
      }
      
      // 获取附件详情
      const { data: attachments, error: attachmentsError } = await supabase
        .from('attachment')
        .select('*')
        .in('id', post.attachment_id);
      
      if (attachmentsError) throw attachmentsError;
      
      return attachments || [];
    } catch (error) {
      console.error("Error fetching post attachments:", error);
      toast.error(t('errorFetchingAttachments') || '获取附件失败');
      return [];
    }
  };
  
  // 添加渲染已上传附件的函数
  const renderAttachments = (attachments) => {
    if (!attachments || attachments.length === 0) return null;
    
    return (
      <div className="mt-3 space-y-1">
        <p className="text-xs text-[#605E5C] dark:text-[#C8C6C4]">
          {t('attachedFiles') || '已附加的文件'}:
        </p>
        <div className="flex flex-wrap gap-2 mb-2">
          {attachments.map((file, index) => (
            <div
              key={file.id}
              className="flex items-center bg-accent/50 dark:bg-accent/20 rounded-md px-2 py-1 text-xs"
            >
              {file.file_type?.startsWith('image/') ? (
                <img 
                  src={file.file_url} 
                  alt={file.file_name}
                  className="w-4 h-4 object-cover rounded mr-1"
                />
              ) : file.file_type?.includes('pdf') ? (
                <File className="w-3 h-3 text-red-500 mr-1" />
              ) : file.file_type?.includes('doc') ? (
                <FileText className="w-3 h-3 text-blue-500 mr-1" />
              ) : (
                <File className="w-3 h-3 text-gray-500 mr-1" />
              )}
              <a 
                href={file.file_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="truncate max-w-[100px] hover:underline"
              >
                {file.file_name}
              </a>
              <Button
                variant="ghost"
                size="icon"
                className="h-4 w-4 rounded-full ml-1 hover:bg-accent"
                onClick={() => removeAttachment(file.id, index)}
              >
                <X className="h-2 w-2" />
              </Button>
            </div>
          ))}
        </div>
        
        {/* 显示待删除的附件 */}
        {pendingDeleteAttachments.length > 0 && (
          <div className="mt-2">
            <p className="text-xs text-[#605E5C] dark:text-[#C8C6C4]">
              {t('pendingDeleteFiles') || '待删除的文件'} ({pendingDeleteAttachments.length}):
            </p>
            <div className="flex flex-wrap gap-2 mt-1">
              {pendingDeleteAttachments.map((file, index) => (
                <div
                  key={file.id}
                  className="flex items-center bg-red-100 dark:bg-red-900/20 rounded-md px-2 py-1 text-xs"
                >
                  {file.file_type?.startsWith('image/') ? (
                    <img 
                      src={file.file_url} 
                      alt={file.file_name}
                      className="w-4 h-4 object-cover rounded mr-1 opacity-50"
                    />
                  ) : file.file_type?.includes('pdf') ? (
                    <File className="w-3 h-3 text-red-300 mr-1" />
                  ) : file.file_type?.includes('doc') ? (
                    <FileText className="w-3 h-3 text-blue-300 mr-1" />
                  ) : (
                    <File className="w-3 h-3 text-gray-300 mr-1" />
                  )}
                  <span className="truncate max-w-[100px] line-through text-gray-500">
                    {file.file_name}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-4 w-4 rounded-full ml-1 hover:bg-red-200 dark:hover:bg-red-800"
                    onClick={() => restoreAttachment(index)}
                    title={t('restoreFile') || '恢复文件'}
                  >
                    <ChevronUp className="h-2 w-2" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };
  
  // 移除附件的函数
  const removeAttachment = async (attachmentId, index) => {
    try {
      // 从当前显示的附件列表中移除
      const newAttachments = [...editPostAttachments];
      const removedAttachment = newAttachments.splice(index, 1)[0];
      setEditPostAttachments(newAttachments);
      
      // 添加到待删除列表，稍后在保存时处理
      setPendingDeleteAttachments(prev => [...prev, removedAttachment]);
      
      toast.success(t('attachmentMarkedForRemoval') || '附件已标记为删除，将在保存时执行');
    } catch (error) {
      console.error("Error marking attachment for removal:", error);
      toast.error(t('errorRemovingAttachment') || '移除附件失败');
    }
  };
  
  // 添加恢复已标记为删除的附件的函数
  const restoreAttachment = (index) => {
    try {
      // 从待删除列表中移除
      const newPendingDelete = [...pendingDeleteAttachments];
      const restoredAttachment = newPendingDelete.splice(index, 1)[0];
      setPendingDeleteAttachments(newPendingDelete);
      
      // 添加回附件列表
      setEditPostAttachments(prev => [...prev, restoredAttachment]);
      
      toast.success(t('attachmentRestored') || '附件已恢复');
    } catch (error) {
      console.error("Error restoring attachment:", error);
      toast.error(t('errorRestoringAttachment') || '恢复附件失败');
    }
  };
  
  return (
    <div className="container mx-auto pb-6 text-[#252423] dark:text-white">
      {/* 添加确认对话框 */}
      <AlertDialog open={showLeaveConfirm} onOpenChange={setShowLeaveConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('unsavedChanges')}</AlertDialogTitle>
            <AlertDialogDescription>
              {editingPostId !== null 
                ? (t('unsavedEditChangesDescription'))
                : (t('unsavedChangesDescription'))}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelLeave}>{t('continueEditing') || '继续编辑'}</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmLeave}>{t('discardChanges') || '放弃更改'}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
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
        .rich-text-container {
          width: 100%;
          max-width: 100%;
          overflow-x: hidden;
          height: auto;
        }
        .prose {
          max-width: 100%;
          overflow-wrap: break-word;
          word-break: break-word;
        }
        .rich-editor-container {
          display: flex;
          flex-direction: column;
          height: auto;
        }
        
        /* 添加评论文本样式 */
        .whitespace-pre-wrap {
          white-space: pre-wrap;
        }
        .overflow-wrap-anywhere {
          overflow-wrap: anywhere;
          word-break: break-word;
        }
        .break-words {
          word-break: break-word;
        }
      `}</style>
      
      {/* Header */}
      <div className="sticky top-0 z-10 px-4 py-3 mb-4 shadow-sm border-b bg-background border-[#E1DFDD] dark:border-[#3B3A39]">
        <div className="flex flex-col md:flex-row justify-between bg-background items-start md:items-center gap-4">
          <div className="flex flex-col sm:flex-row gap-3 w-full bg-background">
            {viewMode === 'grid' ? (
              <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogTrigger asChild>
                  <Button 
                    variant={themeColor}
                    size="icon"
                    className="rounded-md transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent 
                  onPointerDownOutside={(e) => e.preventDefault()}
                  onEscapeKeyDown={(e) => e.preventDefault()}
                  className="sm:max-w-[650px]"
                >
                  <DialogHeader>
                    <div className="flex justify-between items-center"> 
                      <DialogTitle>{t('createNewPost')}</DialogTitle>
                      <div className="flex items-center space-x-2">
                        {/* <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-full hover:bg-[#F5F5F5] dark:hover:bg-[#3B3A39]"
                          onClick={resetForm}
                        >
                          <Trash2 className="h-4 w-4 text-[#252423] dark:text-white" />
                        </Button> */}
                      </div> 
                    </div>
                    <DialogDescription className="text-[#605E5C] dark:text-[#C8C6C4]">
                      {t('createPostDescription')}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="title" className="font-medium">{t('title')}</Label>
                      <div className="mb-3">
                        <div className="relative">
                          <Input
                            id="title"
                            placeholder={t('postTitlePlaceholder')}
                            value={newPostTitle}
                            onChange={(e) => setNewPostTitle(e.target.value)}
                            className="border border-[#E1DFDD] text-[#252423] dark:border-[#3B3A39] dark:text-white w-full pr-16"
                            maxLength={50}
                          />
                          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-[#605E5C] dark:text-[#C8C6C4] bg-background px-1">
                            <span className="font-medium">
                              {newPostTitle.trim().length}/50
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="description" className="font-medium">{t('description')}</Label>
                      <div className="mb-3">
                        <RichEditor
                          id="description"
                          placeholder={t('postDescriptionPlaceholder')}
                          value={newPostDescription}
                          onChange={setNewPostDescription}
                          className="h-[135px] min-h-[135px] max-h-[250px] overflow-y-auto border border-[#E1DFDD] text-[#252423] dark:border-[#3B3A39] dark:text-white"
                        />
                        <div className="mt-2 flex justify-between items-center">
                        <div className="flex items-center space-x-2">
                            
                            <EmojiPicker 
                              onEmojiSelect={(emojiData) => setNewPostDescription(prev => prev + emojiData.emoji)}
                              position="right"
                              offset={5}
                            />
                            
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 rounded-full hover:bg-[#F5F5F5] dark:hover:bg-[#3B3A39]"
                              onClick={() => handleAttachFile('new')}
                            >
                              <Paperclip className="h-4 w-4 text-[#252423] dark:text-white" />
                            </Button>
                          </div>
                        </div>
                        
                        {/* 显示已选择的文件预览 */}
                        {newPostTempFiles.length > 0 && (
                          <div className="mt-2">
                            {renderSelectedFiles()}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <DialogFooter className="flex w-full justify-between items-center">                    
                    <div className="mr-auto">                      
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 rounded-md border-[#E1DFDD] hover:bg-[#F5F5F5] dark:border-[#3B3A39] dark:text-white dark:hover:bg-[#3B3A39] flex items-center gap-1 text-[#252423]"
                          >
                            <div className="flex items-center gap-1">
                              {postType === 'post' ? (
                                <MessageSquare className="h-4 w-4" />
                              ) : (
                                <MessageSquare className="h-4 w-4 rotate-180" />
                              )}
                              <span>{postType === 'post' ? t('post') : t('announcement')}</span>
                            </div>
                            <ChevronDown className="h-3 w-3 ml-1" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-48 p-0">
                          <div className="py-1">
                            <Button
                              variant="ghost"
                              className="w-full justify-start gap-2 rounded-none"
                              onClick={() => setPostType('post')}
                            >
                              <div className="flex items-center gap-2">
                                <MessageSquare className="h-4 w-4" />
                                <span>{t('post')}</span>
                              </div>
                              {postType === 'post' && <Check className="h-4 w-4 ml-auto" />}
                            </Button>
                            <Button
                              variant="ghost"
                              className="w-full justify-start gap-2 rounded-none"
                              onClick={() => setPostType('announcement')}
                            >
                              <div className="flex items-center gap-2">
                                <MessageSquare className="h-4 w-4 rotate-180" />
                                <span>{t('announcement')}</span>
                              </div>
                              {postType === 'announcement' && <Check className="h-4 w-4 ml-auto" />}
                            </Button>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="flex space-x-2">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => setShowCreateDialog(false)}
                        className="border-[#E1DFDD] dark:border-[#3B3A39]"
                      >
                        {t('cancel')}
                      </Button>
                      <Button 
                        variant={themeColor}
                        type="submit" 
                        onClick={handleCreatePost}
                        disabled={!isFormValid}
                        className="min-w-[80px]"
                      >
                        {t('post')}
                      </Button>
                    </div>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            ) : (
              <Button 
                variant={themeColor}
                size="icon"
                className="rounded-md transition-colors"
                onClick={() => setShowInlineEditor(true)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            )}
            <div className="relative flex-grow">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#8A8886] dark:text-[#979593]" />
              <Input
                placeholder={t('searchPosts')}
                value={searchQuery}
                onChange={handleSearchChange}
                className="pl-9 rounded-md border bg-background border-[#E1DFDD] text-[#252423] placeholder:text-[#8A8886] focus-visible:ring-offset-white dark:border-[#3B3A39] dark:text-white dark:placeholder:text-[#979593]"
              />
            </div>
            <div className="flex items-center gap-2 sm:ml-auto">
              <Button
                variant={viewMode === 'list' ? themeColor : "outline"}
                size="icon"
                onClick={() => handleViewModeChange('list')}
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'grid' ? themeColor : "outline"}
                size="icon"
                onClick={() => handleViewModeChange('grid')}
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Content */}
      <div className="px-4">
        {isLoading ? (
          renderSkeleton()
        ) : (
          <div className="mt-4">            
            {posts.length === 0 && !showInlineEditor ? (
              <div className="text-center py-12 border rounded-md bg-background border-[#E1DFDD] text-[#252423] dark:border-[#3B3A39] dark:text-white">
                <div className="mx-auto flex flex-col items-center">
                  <MessageSquare className="h-12 w-12 mb-4 text-[#8A8886] dark:text-[#979593]" />
                  <h3 className="text-lg font-medium mb-1">{t('noPosts')}</h3>
                  <p className="text-sm max-w-sm mb-4 text-[#605E5C] dark:text-[#C8C6C4]">
                    {t('noPostsDescription')}
                  </p>
                  <Button 
                    onClick={() => viewMode === 'list' ? setShowInlineEditor(true) : setShowCreateDialog(true)}
                    variant={themeColor}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    {t('createFirstPost')}
                  </Button>
                </div>
              </div>
            ) : (
              viewMode === 'grid' ? renderGridView() : renderListView()
            )}
            {viewMode === 'list' && showInlineEditor && renderInlineEditor()}

          </div>
        )}
      </div>
      
      {/* 附加文件对话框 */}
      <AttachFile
        isOpen={showAttachFileDialog}
        onClose={() => {
          setShowAttachFileDialog(false);
          // 不要关闭内联编辑器或主对话框
        }}
        postId={activeAttachPostId}
        teamId={teamId}
        onFileAttached={handleFileAttached}
      />
    </div>
  );
}