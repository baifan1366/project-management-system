'use client'

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { useTranslations } from "next-intl";

export default function AddTaskDialog({ taskColor, showTaskForm, setShowTaskForm, newTask, setNewTask, handleAddTask }) {
  const t  = useTranslations('CreateTask');
  const handleTaskInputChange = (e) => {
    const { name, value } = e.target;
    setNewTask(prev => ({
      ...prev,
      [name]: value
    }));
  }
  
  return (
    <Dialog open={showTaskForm} onOpenChange={setShowTaskForm}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-black">{t('addNewTask')}</DialogTitle>
          <DialogDescription>
            {t('pleaseFillInTheFollowingInformationToCreateANewTask')}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div>
            <label className="block text-sm font-medium mb-1">{t('taskName')}</label>
            <input
              type="text"
              name="text"
              value={newTask.text}
              onChange={handleTaskInputChange}
              className="w-full border rounded-md p-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{t('startDate')}</label>
            <input
              type="date"
              name="start_date"
              value={newTask.start_date instanceof Date 
                ? newTask.start_date.toISOString().split('T')[0] 
                : newTask.start_date}
              onChange={handleTaskInputChange}
              className="w-full border rounded-md p-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{t('duration')}</label>
            <input
              type="number"
              name="duration"
              value={newTask.duration}
              min="1"
              onChange={handleTaskInputChange}
              className="w-full border rounded-md p-2"
            />
          </div>
        </div>
        
        <DialogFooter className="flex justify-end gap-2">
          <Button 
            variant={taskColor}
            onClick={() => setShowTaskForm(false)}
          >
            {t('cancel')}
          </Button>
          <Button 
            onClick={handleAddTask}
            variant={taskColor}
          >
            {t('add')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
