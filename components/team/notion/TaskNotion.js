'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { 
  FileText, 
  Plus, 
  Search, 
  ChevronRight, 
  ChevronDown, 
  MoreHorizontal, 
  Trash, 
  Edit, 
  Copy,
  Star,
  Loader2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/lib/supabase'
import NotionTools from './NotionTools'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { useGetUser } from '@/lib/hooks/useGetUser'
import { useConfirm } from '@/hooks/use-confirm';
import { getSectionByTeamId } from '@/lib/redux/features/sectionSlice'
import { useDispatch, useSelector } from 'react-redux'
import { createTask, updateTask, deleteTask } from '@/lib/redux/features/taskSlice'
import { getTagByName } from '@/lib/redux/features/tagSlice'
import { getPagesByTeamId, resetPagesState } from '@/lib/redux/features/pageSlice'

export default function TaskNotion({ teamId }) {
  const t = useTranslations('Notion')
  const { user: currentUser } = useGetUser()
  const { confirm } = useConfirm();
  const dispatch = useDispatch();
  
  // 从Redux获取页面数据
  const { pages: reduxPages, status: pagesStatus, error: pagesError } = useSelector(state => state.pages);
  // 从Redux获取部分数据
  const { sections, status: sectionsStatus, error: sectionsError } = useSelector(state => state.sections);

  // State variables
  const [pages, setPages] = useState([])
  const [teamName, setTeamName] = useState('')
  const [teamMembers, setTeamMembers] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [expandedNodes, setExpandedNodes] = useState({})
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedPage, setSelectedPage] = useState(null)
  const [selectedPageId, setSelectedPageId] = useState(null)
  const [pageContent, setPageContent] = useState(null)
  const [isContentLoading, setIsContentLoading] = useState(false)
  const [isCreatePageOpen, setIsCreatePageOpen] = useState(false)
  const [isEditPageOpen, setIsEditPageOpen] = useState(false)
  const [favorites, setFavorites] = useState([])
  const [recentlyViewed, setRecentlyViewed] = useState([])
  const [selectedSectionId, setSelectedSectionId] = useState(null)
  
  // Fetch team details
  useEffect(() => {
    async function fetchTeamDetails() {
      if (!teamId) return
      
      try {
        const { data, error } = await supabase
          .from('team')
          .select('name')
          .eq('id', teamId)
          .single()
        
        if (error) throw error
        
        if (data) {
          setTeamName(data.name)
        }
      } catch (error) {
        console.error('Error fetching team details:', error)
      }
    }
    
    fetchTeamDetails()
  }, [teamId])
  
  // Fetch team members
  useEffect(() => {
    async function fetchTeamMembers() {
      if (!teamId) return
      
      try {
        const { data, error } = await supabase
          .from('user_team')
          .select(`
            user_id,
            role,
            user:user_id (
              id,
              name,
              email,
              avatar_url
            )
          `)
          .eq('team_id', teamId)
        
        if (error) throw error
        
        if (data) {
          const members = data.map(item => ({
            id: item.user.id,
            name: item.user.name,
            email: item.user.email,
            avatar: item.user.avatar_url,
            role: item.role
          }))
          
          setTeamMembers(members)
        }
      } catch (error) {
        console.error('Error fetching team members:', error)
      }
    }
    
    fetchTeamMembers()
  }, [teamId])
  
  // 获取页面数据 - 使用新的流程
  useEffect(() => {
    if (!teamId || !currentUser) return
    
    setIsLoading(true)
    
    // 使用Redux action获取页面
    dispatch(getPagesByTeamId(teamId));
    
    // 获取用户收藏的页面
    const fetchFavorites = async () => {
      try {
        const { data: favoritesData, error: favoritesError } = await supabase
          .from('notion_page_favorite')
          .select('page_id')
          .eq('user_id', currentUser.id)
        
        if (favoritesError) throw favoritesError
        
        setFavorites(favoritesData?.map(f => f.page_id) || [])
      } catch (error) {
        console.error('Error fetching favorites:', error)
      }
    }
    
    fetchFavorites();
    
    // 组件卸载时清理
    return () => {
      dispatch(resetPagesState());
    }
  }, [teamId, currentUser, dispatch])
  
  // 获取团队部分数据
  useEffect(() => {
    if (!teamId) return;
    
    // 使用Redux action获取部分数据
    dispatch(getSectionByTeamId(teamId));
  }, [teamId, dispatch]);
  
  // 当Redux中的页面数据更新时，更新本地状态
  useEffect(() => {
    if (pagesStatus === 'succeeded') {
      if (selectedSectionId) {
        // 如果已选择了section，重新获取该section的页面
        const fetchSectionPages = async () => {
          try {
            const { data: sectionData } = await supabase
              .from('section')
              .select('task_ids')
              .eq('id', selectedSectionId)
              .single();
              
            if (sectionData && sectionData.task_ids && sectionData.task_ids.length > 0) {
              // 获取该section的所有任务的page_id
              const { data: taskData } = await supabase
                .from('task')
                .select('page_id')
                .in('id', sectionData.task_ids)
                .not('page_id', 'is', null);
                
              // 过滤页面数据到该section相关的页面
              if (taskData && taskData.length > 0) {
                const sectionPageIds = taskData.map(t => t.page_id);
                const sectionPages = reduxPages.filter(page => sectionPageIds.includes(page.id));
                setPages(sectionPages);
                
                // 如果有页面但没有选中任何页面，选择第一个根页面
                if (sectionPages.length > 0 && !selectedPageId) {
                  const rootPages = sectionPages.filter(p => !p.parent_id);
                  if (rootPages.length > 0) {
                    setSelectedPageId(rootPages[0].id);
                  }
                }
              } else {
                setPages([]);
                setSelectedPageId(null);
                setSelectedPage(null);
                setPageContent(null);
              }
            } else {
              setPages([]);
              setSelectedPageId(null);
              setSelectedPage(null);
              setPageContent(null);
            }
          } catch (error) {
            console.error('获取section页面失败:', error);
            toast.error(t('errorFetchingData'));
            setPages([]);
            setSelectedPageId(null);
            setSelectedPage(null);
            setPageContent(null);
          }
        };
        
        fetchSectionPages();
      } else {
        setPages(reduxPages || []);
        
        // 如果有页面但没有选中任何页面，选择第一个根页面
        if (reduxPages?.length > 0 && !selectedPageId) {
          const rootPages = reduxPages.filter(p => !p.parent_id);
          if (rootPages.length > 0) {
            setSelectedPageId(rootPages[0].id);
          }
        } else if (reduxPages.length === 0) {
          // 如果没有页面，清空选中的页面
          setSelectedPageId(null);
          setSelectedPage(null);
          setPageContent(null);
        }
      }
      setIsLoading(false);
    } else if (pagesStatus === 'failed') {
      console.error('Error fetching pages:', pagesError);
      toast.error(t('errorFetchingData'));
      setIsLoading(false);
      // 发生错误时也清空选中的页面
      setSelectedPageId(null);
      setSelectedPage(null);
      setPageContent(null);
    }
  }, [pagesStatus, reduxPages, selectedPageId, pagesError, t, selectedSectionId]);
  
  // Fetch selected page content
  useEffect(() => {
    const fetchPageContent = async () => {
      if (!selectedPageId) {
        setPageContent(null)
        setSelectedPage(null)
        return
      }
      
      setIsContentLoading(true)
      
      try {
        // 查询页面基本信息
        const { data: pageData, error: pageError } = await supabase
          .from('notion_page')
          .select('*, created_by(name, avatar_url), last_edited_by(name)')
          .eq('id', selectedPageId)
          .single()
        
        if (pageError) throw pageError
        
        // 查找与此页面关联的任务
        const { data: taskData, error: taskError } = await supabase
          .from('task')
          .select('id, tag_values')
          .eq('page_id', selectedPageId)
          .single()
          
        if (taskError) {
          console.warn('获取关联任务数据失败，可能没有关联任务:', taskError)
        }
        
        // 获取Name和Content标签的ID
        let nameTagId, contentTagId
        try {
          const { data: nameTag } = await supabase
            .from('tag')
            .select('id')
            .eq('name', 'Name')
            .single()
            
          nameTagId = nameTag?.id
          
          const { data: contentTag } = await supabase
            .from('tag')
            .select('id')
            .eq('name', 'Content')
            .single()
            
          contentTagId = contentTag?.id
        } catch (tagError) {
          console.warn('获取标签ID失败:', tagError)
        }
        
        // 从任务tag_values中提取标题和内容
        let title = "无标题";
        let content = { text: "" };
        
        if (taskData && taskData.tag_values && nameTagId) {
          // 提取标题
          if (taskData.tag_values[nameTagId]) {
            title = taskData.tag_values[nameTagId];
          }
          
          // 提取内容
          if (contentTagId && taskData.tag_values[contentTagId]) {
            content = { text: taskData.tag_values[contentTagId] };
          }
        }
        
        // 合并页面数据
        const enrichedPage = {
          ...pageData,
          title, // 使用从tag_values中提取的标题
          content // 使用从tag_values中提取的内容
        };
        
        setSelectedPage(enrichedPage)
        setPageContent(content)
        
        // Add to recently viewed
        // In a full implementation, you might want to store this in the database
        setRecentlyViewed(prev => {
          const filtered = prev.filter(p => p.id !== enrichedPage.id)
          return [enrichedPage, ...filtered].slice(0, 5)
        })
        
        // Expand parent nodes
        let currentParentId = pageData.parent_id
        const newExpandedNodes = { ...expandedNodes }
        
        while (currentParentId) {
          newExpandedNodes[currentParentId] = true
          const parent = pages.find(p => p.id === currentParentId)
          currentParentId = parent?.parent_id
        }
        
        setExpandedNodes(newExpandedNodes)
      } catch (error) {
        console.error('Error fetching page content:', error)
        toast.error(t('errorFetchingPageContent'))
      } finally {
        setIsContentLoading(false)
      }
    }
    
    fetchPageContent()
  }, [selectedPageId, pages, t])
  
  // Build the page hierarchy
  const pageHierarchy = useMemo(() => {
    // Function to build a tree structure
    const buildTree = (items, parentId = null) => {
      // 如果选择了特定的section，需要特殊处理
      if (selectedSectionId) {
        // 对于选择的section内的页面，如果没有父页面或父页面不在当前过滤结果中，
        // 则将其视为根页面
        if (parentId === null) {
          const rootItems = items
            .filter(item => 
              // 无父页面的页面作为根页面
              item.parent_id === null || 
              // 或者父页面不在当前过滤结果中的页面也作为根页面
              !items.some(p => p.id === item.parent_id)
            );
            
            return rootItems.map(item => ({
              ...item,
              children: buildTree(items, item.id)
            }));
        }
      }
      
      const filteredItems = items.filter(item => item.parent_id === parentId);
      
      return filteredItems.map(item => ({
        ...item,
        children: buildTree(items, item.id)
      }));
    }
    
    return buildTree(pages);
  }, [pages, selectedSectionId]);
  
  // Filtered pages for search
  const filteredPages = useMemo(() => {
    if (!searchQuery.trim()) return pageHierarchy
    
    // Filter pages based on search query
    const filtered = pages.filter(page => 
      page.title.toLowerCase().includes(searchQuery.toLowerCase())
    )
    
    // Function to find all parents of a page
    const findParents = (pageId) => {
      const page = pages.find(p => p.id === pageId)
      if (!page || !page.parent_id) return []
      
      const parent = pages.find(p => p.id === page.parent_id)
      if (!parent) return []
      
      return [parent, ...findParents(parent.id)]
    }
    
    // Expand all parents of matching pages
    const newExpandedNodes = { ...expandedNodes }
    filtered.forEach(page => {
      const parents = findParents(page.id)
      parents.forEach(parent => {
        newExpandedNodes[parent.id] = true
      })
    })
    
    setExpandedNodes(newExpandedNodes)
    
    return pageHierarchy
  }, [pageHierarchy, pages, searchQuery, expandedNodes])
  
  // Handler for toggling node expansion
  const toggleNodeExpansion = (pageId) => {
    setExpandedNodes(prev => ({
      ...prev,
      [pageId]: !prev[pageId]
    }))
  }
  
  // Handler for adding/removing favorites
  const toggleFavorite = async (pageId) => {
    if (!currentUser) return
    
    try {
      const isFavorite = favorites.includes(pageId)
      
      if (isFavorite) {
        // Remove from favorites
        const { error } = await supabase
          .from('notion_page_favorite')
          .delete()
          .eq('user_id', currentUser.id)
          .eq('page_id', pageId)
        
        if (error) throw error
        
        setFavorites(prev => prev.filter(id => id !== pageId))
        toast.success(t('removedFromFavorites'))
      } else {
        // Add to favorites
        const { error } = await supabase
          .from('notion_page_favorite')
          .insert({
            user_id: currentUser.id,
            page_id: pageId
          })
        
        if (error) throw error
        
        setFavorites(prev => [...prev, pageId])
        toast.success(t('addedToFavorites'))
      }
    } catch (error) {
      console.error('Error toggling favorite:', error)
      toast.error(t('errorTogglingFavorite'))
    }
  }
  
  // Handler for page deletion
  const handleDeletePage = async (pageId) => {
    try {
      // 创建一个确认对话框
      const confirmResult = confirm({
        title: t('confirmDeletePage'),
        variant: "error",
        description: t('deletePageDescription')
      });
      
      // 定义处理确认结果的函数
      const handleConfirmation = async (isConfirmed) => {
        // 如果用户没有确认，则直接返回
        if (!isConfirmed) {
          return;
        }
        
        // 显示正在删除的提示
        const toastId = toast.loading(t('deletingPage'));
        
        try {
          // 获取所有后代页面
          const getDescendantIds = (pageId) => {
            const directChildren = pages.filter(p => p.parent_id === pageId).map(p => p.id);
            let allDescendants = [...directChildren];
            
            directChildren.forEach(childId => {
              allDescendants = [...allDescendants, ...getDescendantIds(childId)];
            });
            
            return allDescendants;
          };
          
          const descendantIds = getDescendantIds(pageId);
          const allPageIds = [pageId, ...descendantIds];
          
          // 1. 查找与这些页面关联的所有任务
          const { data: relatedTasks, error: tasksError } = await supabase
            .from('task')
            .select('id, page_id')
            .in('page_id', allPageIds);
            
          if (tasksError) throw tasksError;
          
          const taskIds = relatedTasks ? relatedTasks.map(task => task.id) : [];
          
          // 2. 从各个section的task_ids中移除这些任务ID (updateTaskIds)
          if (taskIds.length > 0) {
            // 查询所有包含这些任务ID的section
            const { data: sectionsData, error: sectionsError } = await supabase
              .from('section')
              .select('id, task_ids')
              .eq('team_id', teamId);
              
            if (sectionsError) throw sectionsError;
            
            // 更新每个section的task_ids
            for (const section of sectionsData) {
              if (section.task_ids && section.task_ids.some(id => taskIds.includes(id))) {
                const updatedTaskIds = section.task_ids.filter(id => !taskIds.includes(id));
                
                // 更新数据库中的section记录
                await supabase
                  .from('section')
                  .update({ task_ids: updatedTaskIds })
                  .eq('id', section.id);
                  
                // 同步更新Redux中的数据(可选)
                // 这里可以使用Redux action更新section状态
              }
            }
            
            // 3. 删除与这些页面关联的任务 (deleteTask)
            const { error: deleteTasksError } = await supabase
              .from('task')
              .delete()
              .in('page_id', allPageIds);
              
            if (deleteTasksError) throw deleteTasksError;
            
            // 同步更新Redux状态 - 删除任务
            for (const taskId of taskIds) {
              dispatch(deleteTask(taskId));
            }
          }
          
          // 4. 删除页面收藏记录
          const { error: deleteFavoritesError } = await supabase
            .from('notion_page_favorite')
            .delete()
            .in('page_id', allPageIds);
            
          if (deleteFavoritesError) {
            console.warn('删除收藏记录时出错:', deleteFavoritesError);
          }
          
          // 5. 删除页面记录 (deleteNotionPage)
          const { error: deletePageError } = await supabase
            .from('notion_page')
            .delete()
            .in('id', allPageIds);
            
          if (deletePageError) throw deletePageError;
          
          // 更新UI
          setPages(prev => prev.filter(p => !allPageIds.includes(p.id)));
          
          // 如果删除的页面是当前选中的页面，选择另一个页面
          if (selectedPageId === pageId) {
            const rootPages = pages.filter(p => !p.parent_id && !allPageIds.includes(p.id));
            if (rootPages.length > 0) {
              setSelectedPageId(rootPages[0].id);
            } else {
              setSelectedPageId(null);
            }
          }
          
          // 从收藏中移除已删除的页面
          setFavorites(prev => prev.filter(id => !allPageIds.includes(id)));
          
          // 从最近查看的页面中移除已删除的页面
          setRecentlyViewed(prev => prev.filter(p => !allPageIds.includes(p.id)));
          
          // 更新成功提示
          toast.dismiss(toastId);
          toast.success(t('pageDeleted'));
          
          // 刷新页面列表
          dispatch(getPagesByTeamId(teamId));
        } catch (error) {
          console.error('删除页面过程中出错:', error);
          toast.dismiss(toastId);
          toast.error(t('errorDeletingPage'));
        }
      };
      
      // 检查confirm返回值中是否有确认信息
      if (confirmResult && typeof confirmResult.then === 'function') {
        // 如果confirm返回了一个类Promise对象，使用then处理
        confirmResult.then(handleConfirmation).catch(error => {
          console.error('确认对话框处理出错:', error);
          toast.error(t('errorDeletingPage'));
        });
      } else {
        // 传统处理方式，通过事件监听器处理结果
        document.addEventListener('confirm-dialog-response', (e) => {
          if (e.detail && e.detail.id === confirmResult.id) {
            handleConfirmation(e.detail.confirmed);
          }
        }, { once: true });
      }
    } catch (error) {
      console.error('删除页面过程中出错:', error);
      toast.error(t('errorDeletingPage'));
    }
  };
  
  // Handler for page creation success
  const handlePageCreated = (newPage) => {
    // 使用Redux Action刷新页面列表
    dispatch(getPagesByTeamId(teamId));
    setSelectedPageId(newPage.id)
  }
  
  // Handler for page update success
  const handlePageUpdated = () => {
    // 使用新的Redux Action获取页面
    dispatch(getPagesByTeamId(teamId));
    
    // 同时刷新选中页面内容
    if (selectedPageId) {
      const fetchSelectedPage = async () => {
        try {
          // 获取页面基本信息
          const { data: pageData, error: pageError } = await supabase
            .from('notion_page')
            .select('*, created_by(name, avatar_url), last_edited_by(name)')
            .eq('id', selectedPageId)
            .single()
          
          if (pageError) throw pageError
          
          // 获取任务数据
          const { data: taskData, error: taskError } = await supabase
            .from('task')
            .select('id, tag_values')
            .eq('page_id', selectedPageId)
            .single()
            
          if (taskError) {
            console.warn('获取关联任务数据失败:', taskError)
          }
          
          // 获取Name和Content标签的ID
          let nameTagId, contentTagId
          try {
            const { data: nameTag } = await supabase
              .from('tag')
              .select('id')
              .eq('name', 'Name')
              .single()
              
            nameTagId = nameTag?.id
            
            const { data: contentTag } = await supabase
              .from('tag')
              .select('id')
              .eq('name', 'Content')
              .single()
              
            contentTagId = contentTag?.id
          } catch (tagError) {
            console.warn('获取标签ID失败:', tagError)
          }
          
          // 提取标题和内容
          let title = "无标题";
          let content = { text: "" };
          
          if (taskData && taskData.tag_values && nameTagId) {
            // 提取标题
            if (taskData.tag_values[nameTagId]) {
              title = taskData.tag_values[nameTagId];
            }
            
            // 提取内容
            if (contentTagId && taskData.tag_values[contentTagId]) {
              content = { text: taskData.tag_values[contentTagId] };
            }
          }
          
          // 合并页面数据
          const enrichedPage = {
            ...pageData,
            title,
            content
          };
          
          setSelectedPage(enrichedPage)
          setPageContent(content)
        } catch (error) {
          console.error('Error refreshing selected page:', error)
        }
      }
      
      fetchSelectedPage();
    }
  }
  
  // Recursive function to render the page tree
  const renderPageTree = (nodes, depth = 0) => {
    return nodes.map(node => {
      const isExpanded = expandedNodes[node.id]
      const isFavorite = favorites.includes(node.id)
      const isSelected = selectedPageId === node.id
      const hasChildren = node.children && node.children.length > 0
      const matchesSearch = searchQuery ? node.title.toLowerCase().includes(searchQuery.toLowerCase()) : true
      
      // Skip nodes that don't match search
      if (searchQuery && !matchesSearch && !hasChildren) return null
      
      return (
        <div key={node.id} className="page-tree-node">
          <div 
            className={cn(
              "flex items-center py-1 px-2 rounded-md my-0.5",
              isSelected ? "bg-accent text-accent-foreground" : "hover:bg-accent/50 cursor-pointer",
              depth > 0 && `ml-${depth * 4}`
            )}
          >
            <div 
              className="mr-1 w-4 flex items-center justify-center"
              onClick={(e) => {
                e.stopPropagation()
                if (hasChildren) {
                  toggleNodeExpansion(node.id)
                }
              }}
            >
              {hasChildren ? (
                isExpanded ? (
                  <ChevronDown className="h-3 w-3" />
                ) : (
                  <ChevronRight className="h-3 w-3" />
                )
              ) : (
                <div className="w-3" />
              )}
            </div>
            
            <div 
              className="flex-1 flex items-center truncate"
              onClick={() => setSelectedPageId(node.id)}
            >
              <span className="mr-2 text-lg">
                {node.icon || <FileText className="h-4 w-4" />}
              </span>
              <span className="truncate text-sm">{node.title}</span>
            </div>
            
            <div className="flex items-center">
              {isFavorite && (
                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400 mr-2" />
              )}
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setSelectedPageId(node.id)}>
                    <FileText className="h-4 w-4 mr-2" />
                    {t('open')}
                  </DropdownMenuItem>
                  
                  <DropdownMenuItem 
                    onClick={() => {
                      setSelectedPage(node)
                      setIsEditPageOpen(true)
                    }}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    {t('edit')}
                  </DropdownMenuItem>
                  
                  <DropdownMenuItem
                    onClick={() => toggleFavorite(node.id)}
                  >
                    <Star className="h-4 w-4 mr-2" />
                    {isFavorite ? t('removeFromFavorites') : t('addToFavorites')}
                  </DropdownMenuItem>
                  
                  <DropdownMenuSeparator />
                  
                  <DropdownMenuItem 
                    className="text-destructive"
                    onClick={() => handleDeletePage(node.id)}
                  >
                    <Trash className="h-4 w-4 mr-2" />
                    {t('delete')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          
          {isExpanded && hasChildren && (
            <div className="pl-2">
              {renderPageTree(node.children, depth + 1)}
            </div>
          )}
        </div>
      )
    })
  }
  
  // 处理部分切换
  const handleSectionChange = (sectionId) => {
    setSelectedSectionId(sectionId);
    // 重置选中的页面和页面内容
    setSelectedPageId(null);
    setSelectedPage(null);
    setPageContent(null);
    
    // 清空搜索查询
    setSearchQuery('');
    
    // 也重置所有展开的节点
    setExpandedNodes({});
    
    setIsLoading(true);
    
    // 如果选择了特定部分，重新获取该部分的页面
    if (sectionId) {
      // 获取所选section的任务ID
      const fetchSectionPages = async () => {
        try {
          const { data: sectionData } = await supabase
            .from('section')
            .select('task_ids')
            .eq('id', sectionId)
            .single();
            
          if (sectionData && sectionData.task_ids && sectionData.task_ids.length > 0) {
            // 获取该section的所有任务的page_id
            const { data: taskData } = await supabase
              .from('task')
              .select('page_id')
              .in('id', sectionData.task_ids)
              .not('page_id', 'is', null);
              
            // 过滤页面数据到该section相关的页面
            if (taskData && taskData.length > 0) {
              const sectionPageIds = taskData.map(t => t.page_id);
              const sectionPages = reduxPages.filter(page => sectionPageIds.includes(page.id));
              setPages(sectionPages);
            } else {
              setPages([]);
            }
          } else {
            setPages([]);
          }
        } catch (error) {
          console.error('获取section页面失败:', error);
          toast.error(t('errorFetchingData'));
          setPages([]);
        } finally {
          setIsLoading(false);
        }
      };
      
      fetchSectionPages();
    } else {
      // 如果未选择特定部分，显示所有页面
      setPages(reduxPages || []);
      setIsLoading(false);
    }
  };
  
  // Render loading skeleton
  if (isLoading) {
    return (
      <div className="h-full grid grid-cols-[250px_1fr] gap-4">
        <div className="border-r pr-2">
          <div className="mb-4">
            <Skeleton className="h-8 w-full mb-2" />
            <Skeleton className="h-10 w-full" />
          </div>
          
          <div className="space-y-2">
            {Array(5).fill().map((_, i) => (
              <Skeleton key={i} className="h-6 w-full" />
            ))}
          </div>
        </div>
        
        <div>
          <Skeleton className="h-12 w-2/3 mb-4" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    )
  }
  
  return (
    <div className="h-full grid grid-cols-[250px_1fr] gap-4">
      {/* Left sidebar */}
      <div className="border-r pr-2 overflow-hidden flex flex-col">
        <div className="mb-4">          
          <div className="relative mt-2">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('searchPages')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>
          {/* 只在选中section时显示创建页面按钮 */}
          {selectedSectionId !== null && (
            <Button 
              className="w-full mt-2"
              onClick={() => setIsCreatePageOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              {t('createPage')}
            </Button>
          )}
        </div>
        
        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Favorites section */}
          {favorites.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-medium mb-1 text-muted-foreground">
                {t('favorites')}
              </h3>
              <ScrollArea className="h-24">
                {pages
                  .filter(page => favorites.includes(page.id))
                  .map(page => (
                    <div 
                      key={`fav-${page.id}`}
                      className={cn(
                        "flex items-center py-1 px-2 rounded-md my-0.5",
                        selectedPageId === page.id ? "bg-accent text-accent-foreground" : "hover:bg-accent/50 cursor-pointer"
                      )}
                      onClick={() => setSelectedPageId(page.id)}
                    >
                      <span className="mr-2 text-lg">
                        {page.icon || <FileText className="h-4 w-4" />}
                      </span>
                      <span className="truncate text-sm">{page.title}</span>
                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400 ml-auto" />
                    </div>
                  ))
                }
              </ScrollArea>
            </div>
          )}
          
          {/* All pages section */}
          <div className="flex-1 overflow-hidden">
            <div className="flex items-center justify-between mb-1">
              <DropdownMenu>
                <DropdownMenuTrigger asChild className="rounded-md p-1 hover:bg-accent cursor-pointer">
                  <div className="flex items-center justify-between w-full">
                    <h3 className="text-sm font-medium text-muted-foreground">
                      {t('pages')}：{selectedSectionId 
                          ? sections.find(s => s.id === selectedSectionId)?.name || t('unknown')
                          : t('allSections')}
                    </h3>
                    <ChevronDown className="h-4 w-4 ml-1" />
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleSectionChange(null)}>
                    {t('allSections')}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {sections && sections.length > 0 ? (
                    sections.map(section => (
                      <DropdownMenuItem 
                        key={section.id} 
                        onClick={() => handleSectionChange(section.id)}
                      >
                        {section.name}
                      </DropdownMenuItem>
                    ))
                  ) : (
                    <DropdownMenuItem disabled>
                      {t('noSections')}
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <ScrollArea className="h-[calc(100%-2rem)]">
              {filteredPages.length > 0 ? (
                renderPageTree(filteredPages)
              ) : (
                <div className="py-4 text-center text-muted-foreground">
                  {searchQuery ? t('noSearchResults') : t('noPages')}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>
      </div>
      
      {/* Main content area */}
      <div className="overflow-auto">
        {isContentLoading ? (
          <div className="p-4">
            <Skeleton className="h-12 w-2/3 mb-4" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : selectedPage ? (
          <div className="relative">
            {/* Cover image */}
            {selectedPage.cover_image && (
              <div 
                className="w-full h-48 bg-cover bg-center"
                style={{ backgroundImage: `url(${selectedPage.cover_image})` }}
              />
            )}
            
            <div className="p-4">
              {/* Title and controls */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <span className="text-3xl mr-2">
                    {selectedPage.icon || <FileText className="h-8 w-8" />}
                  </span>
                  <h1 className="text-2xl font-bold">{selectedPage.title}</h1>
                </div>
                
                <div className="flex items-center gap-2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => toggleFavorite(selectedPage.id)}
                        >
                          <Star 
                            className={cn(
                              "h-5 w-5",
                              favorites.includes(selectedPage.id) && "fill-yellow-400 text-yellow-400"
                            )}
                          />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        {favorites.includes(selectedPage.id) ? t('removeFromFavorites') : t('addToFavorites')}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      setIsEditPageOpen(true)
                    }}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => {
                          // Create a new page with this page as parent
                          setIsCreatePageOpen(true)
                        }}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        {t('createSubpage')}
                      </DropdownMenuItem>
                      
                      <DropdownMenuItem>
                        <Copy className="h-4 w-4 mr-2" />
                        {t('duplicate')}
                      </DropdownMenuItem>
                      
                      <DropdownMenuSeparator />
                      
                      <DropdownMenuItem 
                        className="text-red-500 focus:text-red-600"
                        onClick={() => handleDeletePage(selectedPage.id)}
                      >
                        <Trash className="h-4 w-4 mr-2" />
                        {t('delete')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
              
              {/* Page metadata */}
              <div className="flex items-center text-sm text-muted-foreground mb-6">
                <div className="flex items-center">
                  <Avatar className="h-5 w-5 mr-1">
                    <AvatarImage src={selectedPage.created_by?.avatar_url} />
                    <AvatarFallback>{selectedPage.created_by?.name?.[0]}</AvatarFallback>
                  </Avatar>
                  <span>
                    {t('createdBy')} {selectedPage.created_by?.name || t('unknown')} {' '}
                    {selectedPage.created_at && format(new Date(selectedPage.created_at), 'PPP')}
                  </span>
                </div>
                
                {selectedPage.last_edited_by && (
                  <div className="ml-4">
                    • {t('lastEditedBy')} {selectedPage.last_edited_by?.name || t('unknown')} {' '}
                    {selectedPage.updated_at && format(new Date(selectedPage.updated_at), 'PPP')}
                  </div>
                )}
              </div>
              
              {/* Page content */}
              {pageContent ? (
                <div className="prose max-w-none dark:prose-invert">
                  {pageContent.text ? (
                    <pre className="whitespace-pre-wrap font-sans">{pageContent.text}</pre>
                  ) : (
                    <div className="text-muted-foreground italic">
                      {t('noContent')}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-muted-foreground italic">
                  {t('noContent')}
                </div>
              )}
              
              {/* Child pages section */}
              {pages.filter(p => p.parent_id === selectedPage.id).length > 0 && (
                <div className="mt-8">
                  <h2 className="text-xl font-semibold mb-4">{t('subpages')}</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {pages
                      .filter(p => p.parent_id === selectedPage.id)
                      .map(page => (
                        <Card 
                          key={page.id}
                          className="cursor-pointer hover:shadow-md transition-shadow"
                          onClick={() => setSelectedPageId(page.id)}
                        >
                          <CardHeader className="pb-2">
                            <CardTitle className="flex items-center text-lg">
                              <span className="mr-2">
                                {page.icon || <FileText className="h-4 w-4" />}
                              </span>
                              {page.title}
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="text-sm text-muted-foreground">
                            {t('updated')} {format(new Date(page.updated_at), 'PPP')}
                          </CardContent>
                        </Card>
                      ))
                    }
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center p-4">
            <FileText className="h-16 w-16 text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">{t('noPageSelected')}</h2>
            <p className="text-muted-foreground mb-4">{t('selectPageFromSidebar')}</p>
            <Button onClick={() => setIsCreatePageOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              {t('createFirstPage')}
            </Button>
          </div>
        )}
      </div>
      
      {/* Create/Edit page dialogs */}
      <NotionTools
        isOpen={isCreatePageOpen}
        setIsOpen={setIsCreatePageOpen}
        teamId={teamId}
        parentPage={selectedPage}
        onPageCreated={handlePageCreated}
        selectedSectionId={selectedSectionId}
      />
      
      <NotionTools
        isOpen={isEditPageOpen}
        setIsOpen={setIsEditPageOpen}
        teamId={teamId}
        editingPage={selectedPage}
        onPageUpdated={handlePageUpdated}
        selectedSectionId={selectedSectionId}
      />
    </div>
  )
}
