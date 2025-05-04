'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
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
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import { format } from 'date-fns'
import { CalendarIcon, UserPlus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { useGetUser } from '@/lib/hooks/useGetUser'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'

export default function CalendarTools({ 
  isOpen,
  setIsOpen,
  selectedDate,
  teamId,
  teamMembers = [],
  onTaskCreated
}) {
  const t = useTranslations('Calendar')
  const { user: currentUser } = useGetUser()
  
  // Form state
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [dueDate, setDueDate] = useState(selectedDate || new Date())
  const [priority, setPriority] = useState('MEDIUM')
  const [status, setStatus] = useState('PENDING')
  const [selectedAssignees, setSelectedAssignees] = useState([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [sections, setSections] = useState([])
  const [selectedSection, setSelectedSection] = useState(null)
  
  // Fetch team sections
  useEffect(() => {
    async function fetchSections() {
      if (!teamId) return
      
      try {
        const { data, error } = await supabase
          .from('section')
          .select('id, name')
          .eq('team_id', teamId)
        
        if (error) throw error
        
        if (data) {
          setSections(data)
          if (data.length > 0) {
            setSelectedSection(data[0].id)
          }
        }
      } catch (error) {
        console.error('Error fetching sections:', error)
      }
    }
    
    fetchSections()
  }, [teamId])
  
  // Set selected date when it changes
  useEffect(() => {
    if (selectedDate) {
      setDueDate(selectedDate)
    }
  }, [selectedDate])
  
  // Reset form state when dialog opens
  useEffect(() => {
    if (isOpen) {
      setTitle('')
      setDescription('')
      setDueDate(selectedDate || new Date())
      setPriority('MEDIUM')
      setStatus('PENDING')
      setSelectedAssignees([])
      setIsSubmitting(false)
    }
  }, [isOpen, selectedDate])

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!title.trim()) {
      toast.error(t('titleRequired'))
      return
    }
    
    if (!selectedSection) {
      toast.error(t('sectionRequired'))
      return
    }
    
    if (!currentUser) {
      toast.error(t('userNotLoggedIn'))
      return
    }
    
    setIsSubmitting(true)
    
    try {
      // Create task with tag values
      const { data: taskData, error: taskError } = await supabase
        .from('task')
        .insert({
          tag_values: {
            title,
            description,
            due_date: format(dueDate, 'yyyy-MM-dd'),
            priority,
            status,
            assignees: selectedAssignees
          },
          created_by: currentUser.id
        })
        .select()
      
      if (taskError) throw taskError
      
      // Get the task ID from the newly created task
      const taskId = taskData[0].id
      
      // Get the current section
      const { data: sectionData, error: sectionError } = await supabase
        .from('section')
        .select('task_ids')
        .eq('id', selectedSection)
        .single()
      
      if (sectionError) throw sectionError
      
      // Add the new task ID to the section's task_ids array
      const updatedTaskIds = [...(sectionData.task_ids || []), taskId]
      
      // Update the section with the new task_ids array
      const { error: updateError } = await supabase
        .from('section')
        .update({ task_ids: updatedTaskIds })
        .eq('id', selectedSection)
      
      if (updateError) throw updateError
      
      toast.success(t('taskCreated'))
      
      // Call the onTaskCreated callback
      if (typeof onTaskCreated === 'function') {
        onTaskCreated()
      }
      
      setIsOpen(false)
    } catch (error) {
      console.error('Error creating task:', error)
      toast.error(t('errorCreatingTask'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleToggleAssignee = (userId) => {
    setSelectedAssignees(prev => {
      if (prev.includes(userId)) {
        return prev.filter(id => id !== userId)
      }
      return [...prev, userId]
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{t('createTask')}</DialogTitle>
          <DialogDescription>
            {t('createTaskDescription')}
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
                placeholder={t('taskTitlePlaceholder')}
                className="col-span-3"
                required
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="section" className="text-right">
                {t('section')} *
              </Label>
              <Select 
                value={selectedSection?.toString() || ''} 
                onValueChange={(value) => setSelectedSection(parseInt(value))}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder={t('selectSection')} />
                </SelectTrigger>
                <SelectContent>
                  {sections.map((section) => (
                    <SelectItem key={section.id} value={section.id.toString()}>
                      {section.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="description" className="text-right pt-2">
                {t('description')}
              </Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t('taskDescriptionPlaceholder')}
                className="col-span-3 min-h-24"
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="dueDate" className="text-right">
                {t('dueDate')}
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "col-span-3 justify-start text-left font-normal",
                      !dueDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dueDate ? format(dueDate, 'PPP') : <span>{t('selectDate')}</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={dueDate}
                    onSelect={(date) => setDueDate(date || new Date())}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="priority" className="text-right">
                {t('priority')}
              </Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder={t('selectPriority')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">{t('low')}</SelectItem>
                  <SelectItem value="MEDIUM">{t('medium')}</SelectItem>
                  <SelectItem value="HIGH">{t('high')}</SelectItem>
                  <SelectItem value="URGENT">{t('urgent')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="status" className="text-right">
                {t('status')}
              </Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder={t('selectStatus')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PENDING">{t('pending')}</SelectItem>
                  <SelectItem value="IN_PROGRESS">{t('inProgress')}</SelectItem>
                  <SelectItem value="COMPLETED">{t('completed')}</SelectItem>
                  <SelectItem value="CANCELLED">{t('cancelled')}</SelectItem>
                  <SelectItem value="ON_HOLD">{t('onHold')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-4 items-start gap-4">
              <Label className="text-right pt-2">
                {t('assignees')}
              </Label>
              <div className="col-span-3">
                <div className="flex flex-wrap gap-2 mb-2">
                  {selectedAssignees.length === 0 ? (
                    <div className="text-sm text-muted-foreground italic">
                      {t('noAssignees')}
                    </div>
                  ) : (
                    selectedAssignees.map(userId => {
                      const member = teamMembers.find(m => m.id === userId)
                      return member ? (
                        <Badge 
                          key={userId} 
                          variant="secondary"
                          className="flex items-center gap-1"
                        >
                          <Avatar className="h-4 w-4">
                            <AvatarImage src={member.avatar} alt={member.name} />
                            <AvatarFallback className="text-[8px]">{member.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <span className="max-w-24 truncate">{member.name}</span>
                          <button 
                            type="button"
                            className="ml-1 text-muted-foreground hover:text-foreground"
                            onClick={() => handleToggleAssignee(userId)}
                          >
                            ×
                          </button>
                        </Badge>
                      ) : null
                    })
                  )}
                </div>
                
                <div className="border rounded-md">
                  <ScrollArea className="h-32">
                    <div className="p-2 space-y-1">
                      {teamMembers.map(member => (
                        <div 
                          key={member.id} 
                          className={cn(
                            "flex items-center gap-2 p-1.5 rounded cursor-pointer",
                            selectedAssignees.includes(member.id) 
                              ? "bg-accent" 
                              : "hover:bg-muted"
                          )}
                          onClick={() => handleToggleAssignee(member.id)}
                        >
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={member.avatar} alt={member.name} />
                            <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div className="text-sm">{member.name}</div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              </div>
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
            <Button 
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? t('creating') : t('create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
