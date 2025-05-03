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

export default function TaskNotion({ teamId }) {
  const t = useTranslations('Notion')
  const { user: currentUser } = useGetUser()
  
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
  
  // Fetch pages and favorites
  useEffect(() => {
    const fetchData = async () => {
      if (!teamId || !currentUser) return
      
      setIsLoading(true)
      
      try {
        // Fetch all pages for this team
        const { data: pagesData, error: pagesError } = await supabase
          .from('notion_page')
          .select(`
            id, 
            title, 
            icon, 
            cover_image, 
            parent_id, 
            created_by, 
            created_at,
            updated_at,
            last_edited_by
          `)
          .eq('team_id', teamId)
          .eq('is_archived', false)
          .order('order_index', { ascending: true })
          .order('title', { ascending: true })
        
        if (pagesError) throw pagesError
        
        // Fetch user's favorites
        const { data: favoritesData, error: favoritesError } = await supabase
          .from('notion_page_favorite')
          .select('page_id')
          .eq('user_id', currentUser.id)
        
        if (favoritesError) throw favoritesError
        
        setPages(pagesData || [])
        setFavorites(favoritesData?.map(f => f.page_id) || [])
        
        // If we have pages but none is selected, select the first root page
        if (pagesData?.length > 0 && !selectedPageId) {
          const rootPages = pagesData.filter(p => !p.parent_id)
          if (rootPages.length > 0) {
            setSelectedPageId(rootPages[0].id)
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error)
        toast.error(t('errorFetchingData'))
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchData()
  }, [teamId, currentUser, t])
  
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
        const { data, error } = await supabase
          .from('notion_page')
          .select('*, created_by(name, avatar_url), last_edited_by(name)')
          .eq('id', selectedPageId)
          .single()
        
        if (error) throw error
        
        setSelectedPage(data)
        setPageContent(data.content)
        
        // Add to recently viewed
        // In a full implementation, you might want to store this in the database
        setRecentlyViewed(prev => {
          const filtered = prev.filter(p => p.id !== data.id)
          return [data, ...filtered].slice(0, 5)
        })
        
        // Expand parent nodes
        let currentParentId = data.parent_id
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
      return items
        .filter(item => item.parent_id === parentId)
        .map(item => ({
          ...item,
          children: buildTree(items, item.id)
        }))
    }
    
    return buildTree(pages)
  }, [pages])
  
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
    if (!window.confirm(t('confirmDeletePage'))) return
    
    try {
      // Get all descendant pages
      const getDescendantIds = (pageId) => {
        const directChildren = pages.filter(p => p.parent_id === pageId).map(p => p.id)
        let allDescendants = [...directChildren]
        
        directChildren.forEach(childId => {
          allDescendants = [...allDescendants, ...getDescendantIds(childId)]
        })
        
        return allDescendants
      }
      
      const descendantIds = getDescendantIds(pageId)
      
      // Delete the page and all its descendants
      const { error } = await supabase
        .from('notion_page')
        .update({ is_archived: true })
        .in('id', [pageId, ...descendantIds])
      
      if (error) throw error
      
      // Update UI
      setPages(prev => prev.filter(p => p.id !== pageId && !descendantIds.includes(p.id)))
      
      // If the deleted page is the selected one, select another page
      if (selectedPageId === pageId) {
        const rootPages = pages.filter(p => !p.parent_id && p.id !== pageId && !descendantIds.includes(p.id))
        if (rootPages.length > 0) {
          setSelectedPageId(rootPages[0].id)
        } else {
          setSelectedPageId(null)
        }
      }
      
      toast.success(t('pageDeleted'))
    } catch (error) {
      console.error('Error deleting page:', error)
      toast.error(t('errorDeletingPage'))
    }
  }
  
  // Handler for page creation success
  const handlePageCreated = (newPage) => {
    setPages(prev => [...prev, newPage])
    setSelectedPageId(newPage.id)
  }
  
  // Handler for page update success
  const handlePageUpdated = () => {
    // Refresh pages
    const fetchPages = async () => {
      if (!teamId) return
      
      try {
        const { data, error } = await supabase
          .from('notion_page')
          .select(`
            id, 
            title, 
            icon, 
            cover_image, 
            parent_id, 
            created_by, 
            created_at,
            updated_at,
            last_edited_by
          `)
          .eq('team_id', teamId)
          .eq('is_archived', false)
          .order('order_index', { ascending: true })
          .order('title', { ascending: true })
        
        if (error) throw error
        
        setPages(data || [])
        
        // Also refresh the selected page content
        if (selectedPageId) {
          const { data: pageData, error: pageError } = await supabase
            .from('notion_page')
            .select('*, created_by(name, avatar_url), last_edited_by(name)')
            .eq('id', selectedPageId)
            .single()
          
          if (!pageError) {
            setSelectedPage(pageData)
            setPageContent(pageData.content)
          }
        }
      } catch (error) {
        console.error('Error refreshing pages:', error)
      }
    }
    
    fetchPages()
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
          <h2 className="text-lg font-semibold mb-2 flex items-center">
            <FileText className="mr-2 h-5 w-5" />
            {teamName} {t('knowledgeBase')}
          </h2>
          
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('searchPages')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>
          
          <Button 
            className="w-full mt-2"
            onClick={() => setIsCreatePageOpen(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            {t('createPage')}
          </Button>
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
            <h3 className="text-sm font-medium mb-1 text-muted-foreground">
              {t('pages')}
            </h3>
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
                    onClick={() => {
                      setIsEditPageOpen(true)
                    }}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    {t('edit')}
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
                        className="text-destructive"
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
                    <div>{JSON.stringify(pageContent, null, 2)}</div>
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
      />
      
      <NotionTools
        isOpen={isEditPageOpen}
        setIsOpen={setIsEditPageOpen}
        teamId={teamId}
        editingPage={selectedPage}
        onPageUpdated={handlePageUpdated}
      />
    </div>
  )
}
