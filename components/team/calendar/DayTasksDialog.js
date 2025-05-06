import React from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useTranslations } from 'next-intl'
import { format } from 'date-fns'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ChevronRight } from 'lucide-react'

export default function DayTasksDialog({ isOpen, setIsOpen, date, tasks, teamMembers, onTaskClick }) {
  const t = useTranslations('Calendar')

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-md" onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>
            {t('tasksFor')} {format(date, 'yyyy-MM-dd')}
          </DialogTitle>
          <DialogDescription/>
        </DialogHeader>
        
        <ScrollArea className="max-h-[60vh] mt-4">
          <div className="space-y-2">
            {tasks.map((task) => {
              const assignee = task.assigneeId ? teamMembers.find(m => m.id === task.assigneeId) : null
              
              return (
                <div
                  key={task.id}
                  className="p-3 rounded-lg border hover:bg-accent/5 cursor-pointer transition-colors"
                  onClick={() => onTaskClick(task)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium">{task.name}</h4>
                    </div>
                    
                    <div className="flex items-center">
                      {assignee && (
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={assignee.avatar} alt={assignee.name} />
                          <AvatarFallback>
                            {assignee.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      )}
                      <ChevronRight className="h-4 w-4 ml-2 text-muted-foreground" />
                    </div>
                  </div>
                </div>
              )
            })}
            
            {tasks.length === 0 && (
              <div className="text-center text-muted-foreground py-8">
                {t('noTasksForThisDay')}
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
} 