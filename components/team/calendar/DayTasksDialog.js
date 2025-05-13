import React from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useTranslations } from 'next-intl'
import { format, isBefore, startOfDay } from 'date-fns'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ChevronRight, Lock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

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
              // 检查任务是否在过去
              const isPastTask = task.dueDate && isBefore(new Date(task.dueDate), startOfDay(new Date()))
              
              return (
                <div
                  key={task.id}
                  className="p-3 rounded-lg border hover:bg-accent/5 cursor-pointer transition-colors"
                  onClick={() => onTaskClick(task)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center">
                        <h4 className="font-medium">{task.name}</h4>
                        {isPastTask && (
                          <Badge variant="outline" className="ml-2 bg-gray-100 text-gray-500 flex items-center">
                            <Lock className="h-3 w-3 mr-1" />
                            {t('pastTask')}
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center">
                      {/* 分配人 */}
                      <div className="flex flex-wrap gap-1">
                        {task.assigneeId ? (
                          Array.isArray(task.assigneeId) ? (
                            // 处理多个分配人
                            task.assigneeId.map((id, idx) => {
                              const assignee = teamMembers.find(m => m.id === id);
                              return assignee ? (
                                <Avatar key={idx} className="h-6 w-6 text-xs">
                                  <AvatarImage src={assignee.avatar} alt={assignee.name} />
                                  <AvatarFallback>
                                    {assignee.name.charAt(0).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                              ) : null;
                            })
                          ) : (
                            // 处理单个分配人
                            (() => {
                              const assignee = teamMembers.find(m => m.id === task.assigneeId);
                              return assignee ? (
                                <Avatar className="h-6 w-6 text-xs">
                                  <AvatarImage src={assignee.avatar} alt={assignee.name} />
                                  <AvatarFallback>
                                    {assignee.name.charAt(0).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                              ) : null;
                            })()
                          )
                        ) : null}
                      </div>
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