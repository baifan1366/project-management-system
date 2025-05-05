'use client'

import { useState, useEffect, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { 
  FileText, 
  Image, 
  Smile,
  Loader2
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { useGetUser } from '@/lib/hooks/useGetUser'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { format } from 'date-fns'

export default function NotionTools({ 
  isOpen, 
  setIsOpen, 
  teamId, 
  editingPage = null, 
  parentPage = null,
  onPageCreated,
  onPageUpdated
}) {
  const t = useTranslations('Notion')
  const { user: currentUser } = useGetUser()
  
  // State variables
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [icon, setIcon] = useState('')
  const [coverImage, setCoverImage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [pages, setPages] = useState([])
  const [selectedParentId, setSelectedParentId] = useState(null)
  
  // Reset form when dialog opens/closes or editing page changes
  useEffect(() => {
    if (isOpen) {
      if (editingPage) {
        // Editing existing page
        setTitle(editingPage.title || '')
        setContent(editingPage.content ? JSON.stringify(editingPage.content) : '')
        setIcon(editingPage.icon || '')
        setCoverImage(editingPage.cover_image || '')
        setSelectedParentId(editingPage.parent_id || null)
      } else {
        // Creating new page
        setTitle('')
        setContent('')
        setIcon('')
        setCoverImage('')
        setSelectedParentId(parentPage?.id || null)
      }
      
      // Fetch pages for parent selection
      fetchPages()
    }
  }, [isOpen, editingPage, parentPage])
  
  // Fetch pages for parent selection dropdown
  const fetchPages = async () => {
    if (!teamId) return
    
    try {
      const { data, error } = await supabase
        .from('notion_page')
        .select('id, title, parent_id')
        .eq('team_id', teamId)
        .eq('is_archived', false)
        .order('title', { ascending: true })
      
      if (error) throw error
      
      // Don't allow selecting the current page or its descendants as parent
      let filteredPages = data
      if (editingPage) {
        // Function to get all descendant IDs of a page
        const getDescendantIds = (pageId) => {
          const directChildren = data.filter(p => p.parent_id === pageId).map(p => p.id)
          let allDescendants = [...directChildren]
          
          directChildren.forEach(childId => {
            allDescendants = [...allDescendants, ...getDescendantIds(childId)]
          })
          
          return allDescendants
        }
        
        const excludeIds = [editingPage.id, ...getDescendantIds(editingPage.id)]
        filteredPages = data.filter(p => !excludeIds.includes(p.id))
      }
      
      setPages(filteredPages)
    } catch (error) {
      console.error('Error fetching pages:', error)
      toast.error(t('errorFetchingPages'))
    }
  }
  
  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!title.trim()) {
      toast.error(t('titleRequired'))
      return
    }
    
    if (!currentUser) {
      toast.error(t('userNotLoggedIn'))
      return
    }
    
    setIsSubmitting(true)
    
    try {
      // Parse content as JSON if it's a string
      let contentJson = {}
      if (content) {
        try {
          contentJson = typeof content === 'string' ? JSON.parse(content) : content
        } catch (error) {
          // If parsing fails, use text as is
          contentJson = { text: content }
        }
      }
      
      if (editingPage) {
        // Update existing page
        const { error } = await supabase
          .from('notion_page')
          .update({
            title,
            content: contentJson,
            parent_id: selectedParentId,
            icon,
            cover_image: coverImage,
            updated_at: new Date().toISOString(),
            last_edited_by: currentUser.id
          })
          .eq('id', editingPage.id)
        
        if (error) throw error
        
        toast.success(t('pageUpdated'))
        
        if (onPageUpdated) {
          onPageUpdated()
        }
      } else {
        // Create new page
        const { data, error } = await supabase
          .from('notion_page')
          .insert({
            title,
            content: contentJson,
            team_id: teamId,
            parent_id: selectedParentId,
            icon,
            cover_image: coverImage,
            created_by: currentUser.id,
            last_edited_by: currentUser.id
          })
          .select()
        
        if (error) throw error
        
        toast.success(t('pageCreated'))
        
        if (onPageCreated) {
          onPageCreated(data[0])
        }
      }
      
      setIsOpen(false)
    } catch (error) {
      console.error('Error saving page:', error)
      toast.error(editingPage ? t('errorUpdatingPage') : t('errorCreatingPage'))
    } finally {
      setIsSubmitting(false)
    }
  }
  
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {editingPage ? t('editPage') : t('createPage')}
          </DialogTitle>
          <DialogDescription>
            {editingPage ? t('editPageDescription') : t('createPageDescription')}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="title" className="text-right">
                {t('title')} *
              </Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t('pageTitlePlaceholder')}
                className="col-span-3"
                required
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="parent" className="text-right">
                {t('parent')}
              </Label>
              <Select 
                value={selectedParentId?.toString() || ''} 
                onValueChange={(value) => setSelectedParentId(value ? parseInt(value) : null)}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder={t('noParent')} />
                </SelectTrigger>
                <SelectContent>
                  {/* <SelectItem value="">{t('noParent')}</SelectItem> */}
                  {pages.map((page) => (
                    <SelectItem key={page.id} value={page.id.toString()}>
                      {page.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="icon" className="text-right">
                {t('icon')}
              </Label>
              <div className="col-span-3 flex items-center gap-2">
                <Input
                  id="icon"
                  value={icon}
                  onChange={(e) => setIcon(e.target.value)}
                  placeholder={t('iconPlaceholder')}
                  className="flex-1"
                />
                <Button 
                  type="button" 
                  variant="outline" 
                  size="icon"
                  onClick={() => {
                    // Emoji picker would go here in a more complex implementation
                    toast.info(t('emojiPickerNotImplemented'))
                  }}
                >
                  <Smile className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="coverImage" className="text-right">
                {t('coverImage')}
              </Label>
              <div className="col-span-3 flex items-center gap-2">
                <Input
                  id="coverImage"
                  value={coverImage}
                  onChange={(e) => setCoverImage(e.target.value)}
                  placeholder={t('coverImageUrlPlaceholder')}
                  className="flex-1"
                />
                <Button 
                  type="button" 
                  variant="outline" 
                  size="icon"
                  onClick={() => {
                    // Image upload would go here in a more complex implementation
                    toast.info(t('imageUploadNotImplemented'))
                  }}
                >
                  <Image className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="content" className="text-right pt-2">
                {t('content')}
              </Label>
              <Textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={t('contentPlaceholder')}
                className="col-span-3 min-h-40"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setIsOpen(false)}
              disabled={isSubmitting}
            >
              {t('cancel')}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {editingPage ? t('updating') : t('creating')}
                </>
              ) : (
                editingPage ? t('update') : t('create')
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
