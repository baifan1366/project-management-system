'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Plus, Filter, Search, SortAsc, Grid3X3, List, Moon, Sun, Bookmark, Heart, MessageSquare, MoreHorizontal, ThumbsUp, Calendar, Clock, Tag, Pin, PinOff, Star, ChevronDown, Pen, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useDispatch, useSelector } from 'react-redux';
import { fetchAllTasks } from '@/lib/redux/features/taskSlice';
import { fetchPostsByTeamId, togglePostPin } from '@/lib/redux/features/postsSlice';
import { getSectionByTeamId } from '@/lib/redux/features/sectionSlice';
import { getTagByName } from '@/lib/redux/features/tagSlice';
import { fetchTeamUsers } from '@/lib/redux/features/teamUserSlice';
import BodyContent from './BodyContent';
import HandleTask from './HandleTask';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';


export default function TaskPosts({ projectId, teamId, teamCFId }) {
  const t = useTranslations('PostsView');
  const dispatch = useDispatch();
  const params = useParams();
  const user = useSelector(state => state.users.currentUser);
  
  // State for UI
  const [isLoading, setIsLoading] = useState(true);
  const [posts, setPosts] = useState([]);
  const [viewMode, setViewMode] = useState('grid'); // grid or list
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState('newest');
  const [selectedSection, setSelectedSection] = useState('all');
  const [sections, setSections] = useState([]);
  const [pinnedPosts, setPinnedPosts] = useState(new Set());

  // State for tag IDs
  const [tagIdName, setTagIdName] = useState(null);
  const [tagIdDueDate, setTagIdDueDate] = useState(null);
  const [tagIdAssignee, setTagIdAssignee] = useState(null);
  const [tagIdDescription, setTagIdDescription] = useState(null);
  
  // Hook into data handlers
  const { loadData } = BodyContent({ projectId, teamId, teamCFId });
  const { 
    CreatePost, 
    UpdatePost, 
    DeletePost, 
    TogglePostPin, 
    ReactToPost, 
    CommentOnPost 
  } = HandleTask({ teamId });
  
  // Fetch tag IDs for mapping data
  useEffect(() => {
    async function fetchTagIds() {
      try {
        // Get Name tag ID
        const nameTag = await dispatch(getTagByName("Name")).unwrap();
        if (nameTag) {
          setTagIdName(nameTag);
        }
        
        // Get DueDate tag ID
        const dueDateTag = await dispatch(getTagByName("Due Date")).unwrap();
        if (dueDateTag) {
          setTagIdDueDate(dueDateTag);
        }
        
        // Get Assignee tag ID
        const assigneeTag = await dispatch(getTagByName("Assignee")).unwrap();
        if (assigneeTag) {
          setTagIdAssignee(assigneeTag);
        }
        
        // Get Description tag ID
        const descriptionTag = await dispatch(getTagByName("Description")).unwrap();
        if (descriptionTag) {
          setTagIdDescription(descriptionTag);
        }
      } catch (error) {
        console.error('Failed to fetch tag IDs:', error);
      }
    }
    
    fetchTagIds();
  }, [dispatch]);
  
  // Fetch sections and posts
  useEffect(() => {
    async function fetchSectionsAndPosts() {
      if (!teamId) return;
      
      setIsLoading(true);
      
      try {
        // Get sections for this team
        const sectionsData = await dispatch(getSectionByTeamId(teamId)).unwrap();
        setSections(sectionsData);
        
        // Fetch all posts for this team
        const postsData = await dispatch(fetchPostsByTeamId(teamId)).unwrap();
        
        // Initialize pinned posts
        const initialPinnedPosts = new Set();
        postsData.forEach(post => {
          if (post.is_pinned) {
            initialPinnedPosts.add(post.id);
          }
        });
        setPinnedPosts(initialPinnedPosts);
        
        // Set the posts
        setPosts(postsData);
        setIsLoading(false);
      } catch (error) {
        console.error('Failed to fetch data:', error);
        setIsLoading(false);
      }
    }
    
    fetchSectionsAndPosts();
  }, [teamId, dispatch]);
  
  // Toggle pin status for a post
  const togglePinPost = async (postId) => {
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
      }
    } catch (error) {
      console.error("Error toggling pin status:", error);
    }
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
      
      // Then apply the selected sort option
      switch (sortOption) {
        case 'newest':
          return new Date(b.created_at) - new Date(a.created_at);
        case 'oldest':
          return new Date(a.created_at) - new Date(b.created_at);
        case 'alphabetical':
          return a.title.localeCompare(b.title);
        case 'popular':
          // Count total reactions
          const aReactions = Object.values(a.reactions || {}).flat().length;
          const bReactions = Object.values(b.reactions || {}).flat().length;
          return bReactions - aReactions;
        default:
          return 0;
      }
    });

  // Handle post creation
  const handleCreatePost = () => {
    // Implementation for creating a new post
    console.log('Create new post');
    // Here you would typically open a modal or navigate to a form
  };
  
  // Handle reaction
  const handleReaction = async (postId, emoji = 'like') => {
    if (!user?.id) {
      toast.error('Please sign in to react to posts');
      return;
    }
    
    try {
      await ReactToPost({ postId, emoji });
    } catch (error) {
      console.error('Error adding reaction:', error);
    }
  };
  
  // Handle comment
  const handleAddComment = async (postId, content) => {
    if (!user?.id) {
      toast.error('Please sign in to comment');
      return;
    }
    
    if (!content.trim()) {
      toast.error('Comment cannot be empty');
      return;
    }
    
    try {
      await CommentOnPost({ postId, content });
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };
  
  // Handle post delete
  const handleDeletePost = async (postId) => {
    if (confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
      try {
        const success = await DeletePost(postId);
        if (success) {
          // Remove from local state
          setPosts(prev => prev.filter(p => p.id !== postId));
        }
      } catch (error) {
        console.error('Error deleting post:', error);
      }
    }
  };
  
  // Render loading skeleton
  const renderSkeleton = () => (
    <div className={`grid ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'} gap-4`}>
      {[1, 2, 3, 4, 5, 6].map((item) => (
        <Card key={item} className="h-[320px] rounded-lg border transition-all bg-white border-[#E1DFDD] dark:bg-[#2D2C2C] dark:border-[#3B3A39] dark:text-white">
          <CardHeader className="pb-2">
            <div className="flex items-center space-x-2">
              <Skeleton className="h-10 w-10 rounded-full bg-[#F3F2F1] dark:bg-[#3B3A39]" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-24 bg-[#F3F2F1] dark:bg-[#3B3A39]" />
                <Skeleton className="h-3 w-16 bg-[#F3F2F1] dark:bg-[#3B3A39]" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="pb-2">
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
  
  // Render grid view of posts
  const renderGridView = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {filteredAndSortedPosts.map((post) => (
        <Card 
          key={post.id} 
          className={cn(
            "overflow-hidden transition-all hover:shadow-md relative bg-white border-[#E1DFDD] hover:bg-[#F5F5F5] dark:bg-[#2D2C2C] dark:border-[#3B3A39] dark:text-white dark:hover:bg-[#3B3A39]",
            post.is_pinned && "border-l-4 border-l-[#6264A7]"
          )}
        >
          {post.is_pinned && (
            <div className="absolute top-2 right-2 rounded-full p-1 bg-[#F5F5F5] dark:bg-[#3B3A39]">
              <Pin size={14} className="text-[#6264A7]" />
            </div>
          )}
          <CardHeader className="pb-2 pt-4">
            <div className="flex justify-between items-start">
              <div className="flex items-center space-x-2">
                <Avatar className="border-2 border-[#6264A7]">
                  <AvatarImage src="/avatar-placeholder.png" />
                  <AvatarFallback className="bg-[#6264A7] text-white">
                    {post.created_by ? post.created_by.substring(0, 2).toUpperCase() : 'UN'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-base font-semibold">
                    {post.title || 'Untitled'}
                  </CardTitle>
                  <CardDescription className="text-xs text-[#605E5C] dark:text-[#C8C6C4]">
                    {sections.find(s => s.id === post.section_id)?.name || 'Uncategorized'} • {new Date(post.created_at).toLocaleDateString()}
                  </CardDescription>
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 rounded-full hover:bg-[#F5F5F5] text-[#252423] dark:hover:bg-[#3B3A39] dark:text-white"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent 
                  align="end"
                  className="bg-white border-[#E1DFDD] dark:bg-[#2D2C2C] dark:border-[#3B3A39] dark:text-white"
                >
                  <DropdownMenuItem 
                    className="hover:bg-[#F5F5F5] dark:hover:bg-[#3B3A39]"
                    onClick={() => togglePinPost(post.id)}
                  >
                    {post.is_pinned ? (
                      <>
                        <PinOff className="h-4 w-4 mr-2" />
                        Unpin
                      </>
                    ) : (
                      <>
                        <Pin className="h-4 w-4 mr-2" />
                        Pin to top
                      </>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    className="hover:bg-[#F5F5F5] dark:hover:bg-[#3B3A39]"
                  >
                    <Pen className="h-4 w-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    className="hover:bg-[#F5F5F5] dark:hover:bg-[#3B3A39]"
                    onClick={() => handleDeletePost(post.id)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardHeader>
          <CardContent className="pb-2">
            <p className="text-sm line-clamp-4 min-h-[80px] text-[#605E5C] dark:text-[#C8C6C4]">
              {post.description || 'No description provided.'}
            </p>
            {post.tags && post.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {post.tags.map((tag, idx) => (
                  <Badge 
                    key={idx} 
                    variant="outline" 
                    className="text-xs px-2 py-0 rounded-full bg-[#F3F2F1] text-[#252423] border-[#E1DFDD] dark:bg-[#3B3A39] dark:text-white dark:border-[#3B3A39]"
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
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
                className="h-8 w-8 rounded-full hover:bg-[#F5F5F5] dark:hover:bg-[#3B3A39]"
              >
                <MessageSquare className="h-4 w-4 text-[#252423] dark:text-white" />
                {post.comments?.length > 0 && (
                  <span className="ml-1 text-xs text-[#252423] dark:text-white">
                    {post.comments.length}
                  </span>
                )}
              </Button>
            </div>
            <div className="flex items-center text-xs text-[#605E5C] dark:text-[#C8C6C4]">
              <Clock className="h-3 w-3 mr-1" />
              {new Date(post.updated_at || post.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
  
  // Render list view of posts
  const renderListView = () => (
    <div className="flex flex-col space-y-2">
      {filteredAndSortedPosts.map((post) => (
        <Card 
          key={post.id} 
          className={cn(
            "overflow-hidden transition-all hover:shadow-md relative bg-white border-[#E1DFDD] hover:bg-[#F5F5F5] dark:bg-[#2D2C2C] dark:border-[#3B3A39] dark:text-white dark:hover:bg-[#3B3A39]",
            post.is_pinned && "border-l-4 border-l-[#6264A7]"
          )}
        >
          <div className="flex flex-col md:flex-row p-0">
            <div className="flex-grow p-4">
              <div className="flex justify-between items-start">
                <div className="flex items-center space-x-3">
                  <Avatar className="border-2 border-[#6264A7]">
                    <AvatarImage src="/avatar-placeholder.png" />
                    <AvatarFallback className="bg-[#6264A7] text-white">
                      {post.created_by ? post.created_by.substring(0, 2).toUpperCase() : 'UN'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center">
                      <h3 className="text-base font-semibold">{post.title || 'Untitled'}</h3>
                      {post.is_pinned && (
                        <Pin size={14} className="text-[#6264A7] ml-2" />
                      )}
                    </div>
                    <p className="text-xs text-[#605E5C] dark:text-[#C8C6C4]">
                      {sections.find(s => s.id === post.section_id)?.name || 'Uncategorized'} • {new Date(post.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center">
                  <div className="flex items-center text-xs mr-4 text-[#605E5C] dark:text-[#C8C6C4]">
                    <Clock className="h-3 w-3 mr-1" />
                    {new Date(post.updated_at || post.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 rounded-full hover:bg-[#F5F5F5] text-[#252423] dark:hover:bg-[#3B3A39] dark:text-white"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent 
                      align="end"
                      className="bg-white border-[#E1DFDD] dark:bg-[#2D2C2C] dark:border-[#3B3A39] dark:text-white"
                    >
                      <DropdownMenuItem 
                        className="hover:bg-[#F5F5F5] dark:hover:bg-[#3B3A39]"
                        onClick={() => togglePinPost(post.id)}
                      >
                        {post.is_pinned ? (
                          <>
                            <PinOff className="h-4 w-4 mr-2" />
                            Unpin
                          </>
                        ) : (
                          <>
                            <Pin className="h-4 w-4 mr-2" />
                            Pin to top
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className="hover:bg-[#F5F5F5] dark:hover:bg-[#3B3A39]"
                      >
                        <Pen className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className="hover:bg-[#F5F5F5] dark:hover:bg-[#3B3A39]"
                        onClick={() => handleDeletePost(post.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
              
              <p className="text-sm mt-2 line-clamp-2 text-[#605E5C] dark:text-[#C8C6C4]">
                {post.description || 'No description provided.'}
              </p>
              
              {post.tags && post.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {post.tags.map((tag, idx) => (
                    <Badge 
                      key={idx} 
                      variant="outline" 
                      className="text-xs px-2 py-0 rounded-full bg-[#F3F2F1] text-[#252423] border-[#E1DFDD] dark:bg-[#3B3A39] dark:text-white dark:border-[#3B3A39]"
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
              
              <div className="flex justify-start items-center mt-3">
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
                    className="h-8 px-2 rounded-md flex items-center hover:bg-[#F5F5F5] dark:hover:bg-[#3B3A39]"
                  >
                    <MessageSquare className="h-4 w-4 mr-1 text-[#252423] dark:text-white" />
                    <span>{post.comments?.length || 0}</span>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
  
  return (
    <div className="container mx-auto pb-6 bg-[#F3F2F1] text-[#252423] dark:bg-[#201F1F] dark:text-white">
      {/* Header */}
      <div className="sticky top-0 z-10 px-4 py-3 mb-4 shadow-sm bg-white border-b border-[#E1DFDD] dark:bg-[#201F1F] dark:border-[#3B3A39]">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center">
            <h1 className="text-xl font-semibold">{t('posts')}</h1>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <div className="relative flex-grow">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#8A8886] dark:text-[#979593]" />
              <Input
                placeholder={t('searchPosts')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 rounded-md border bg-white border-[#E1DFDD] text-[#252423] placeholder:text-[#8A8886] focus-visible:ring-[#6264A7] focus-visible:ring-offset-white dark:bg-[#201F1F] dark:border-[#3B3A39] dark:text-white dark:placeholder:text-[#979593] dark:focus-visible:ring-[#6264A7] dark:focus-visible:ring-offset-[#201F1F]"
              />
            </div>
            
            <Button 
              onClick={handleCreatePost} 
              className="gap-1 text-white rounded-md bg-[#6264A7] hover:bg-[#5B5FC7] transition-colors"
            >
              <Plus className="h-4 w-4" />
              {t('newPost')}
            </Button>
          </div>
        </div>
      </div>
      
      {/* Controls bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 px-4 gap-4">
        <div className="flex flex-wrap gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline" 
                size="sm" 
                className="gap-1 rounded-md border bg-white border-[#E1DFDD] text-[#252423] hover:bg-[#F5F5F5] hover:text-[#252423] dark:bg-[#2D2C2C] dark:border-[#3B3A39] dark:text-white dark:hover:bg-[#3B3A39] dark:hover:text-white"
              >
                <Filter className="h-4 w-4" />
                {selectedSection === 'all' ? t('filter') : sections.find(s => s.id === selectedSection)?.name || t('filter')}
                <ChevronDown className="h-3 w-3 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="rounded-md border shadow-md bg-white border-[#E1DFDD] text-[#252423] dark:bg-[#2D2C2C] dark:border-[#3B3A39] dark:text-white"
            >
              <DropdownMenuItem 
                className={cn(
                  "rounded-sm hover:bg-[#F5F5F5] dark:hover:bg-[#3B3A39]",
                  selectedSection === 'all' && "bg-[#6264A7] text-white"
                )}
                onClick={() => setSelectedSection('all')}
              >
                {t('allSections')}
              </DropdownMenuItem>
              {sections.map((section) => (
                <DropdownMenuItem 
                  key={section.id}
                  className={cn(
                    "rounded-sm hover:bg-[#F5F5F5] dark:hover:bg-[#3B3A39]",
                    selectedSection === section.id && "bg-[#6264A7] text-white"
                  )}
                  onClick={() => setSelectedSection(section.id)}
                >
                  {section.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline" 
                size="sm" 
                className="gap-1 rounded-md border bg-white border-[#E1DFDD] text-[#252423] hover:bg-[#F5F5F5] hover:text-[#252423] dark:bg-[#2D2C2C] dark:border-[#3B3A39] dark:text-white dark:hover:bg-[#3B3A39] dark:hover:text-white"
              >
                <SortAsc className="h-4 w-4" />
                {t(sortOption)}
                <ChevronDown className="h-3 w-3 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="rounded-md border shadow-md bg-white border-[#E1DFDD] text-[#252423] dark:bg-[#2D2C2C] dark:border-[#3B3A39] dark:text-white"
            >
              {['newest', 'oldest', 'alphabetical', 'popular'].map((option) => (
                <DropdownMenuItem 
                  key={option}
                  className={cn(
                    "rounded-sm hover:bg-[#F5F5F5] dark:hover:bg-[#3B3A39]",
                    sortOption === option && "bg-[#6264A7] text-white"
                  )}
                  onClick={() => setSortOption(option)}
                >
                  {t(option)}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setViewMode('grid')}
            className={cn(
              "rounded-md border",
              viewMode === 'grid' 
                ? "bg-[#6264A7] text-white border-[#6264A7]" 
                : "bg-white border-[#E1DFDD] text-[#252423] hover:bg-[#F5F5F5] dark:bg-[#2D2C2C] dark:border-[#3B3A39] dark:text-white dark:hover:bg-[#3B3A39]"
            )}
          >
            <Grid3X3 className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setViewMode('list')}
            className={cn(
              "rounded-md border",
              viewMode === 'list' 
                ? "bg-[#6264A7] text-white border-[#6264A7]" 
                : "bg-white border-[#E1DFDD] text-[#252423] hover:bg-[#F5F5F5] dark:bg-[#2D2C2C] dark:border-[#3B3A39] dark:text-white dark:hover:bg-[#3B3A39]"
            )}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      {/* Content */}
      <div className="px-4">
        {isLoading ? (
          renderSkeleton()
        ) : (
          <div className="mt-4">
            {posts.length === 0 ? (
              <div className="text-center py-12 border rounded-md bg-white border-[#E1DFDD] text-[#252423] dark:bg-[#2D2C2C] dark:border-[#3B3A39] dark:text-white">
                <div className="mx-auto flex flex-col items-center">
                  <MessageSquare className="h-12 w-12 mb-4 text-[#8A8886] dark:text-[#979593]" />
                  <h3 className="text-lg font-medium mb-1">{t('noPosts')}</h3>
                  <p className="text-sm max-w-sm mb-4 text-[#605E5C] dark:text-[#C8C6C4]">
                    {t('noPostsDescription')}
                  </p>
                  <Button 
                    onClick={handleCreatePost}
                    className="gap-1 text-white bg-[#6264A7] hover:bg-[#5B5FC7] transition-colors"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    {t('createFirstPost')}
                  </Button>
                </div>
              </div>
            ) : (
              viewMode === 'grid' ? renderGridView() : renderListView()
            )}
          </div>
        )}
      </div>
    </div>
  );
} 