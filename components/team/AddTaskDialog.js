'use client'

import { Button } from '../ui/button';

export default function AddTaskDialog({ taskColor, showTaskForm, setShowTaskForm, newTask, setNewTask, handleAddTask }) {
  const handleTaskInputChange = (e) => {
    const { name, value } = e.target;
    setNewTask(prev => ({
      ...prev,
      [name]: value
    }));
  }

  if (!showTaskForm) return null;
  
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      <div className="p-4 bg-white rounded-md shadow-lg w-full max-w-md">
        <h2 className="text-lg font-bold mb-4 text-black">添加新任务</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">任务名称</label>
            <input
              type="text"
              name="text"
              value={newTask.text}
              onChange={handleTaskInputChange}
              className="w-full border rounded-md p-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">开始日期</label>
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
            <label className="block text-sm font-medium mb-1">持续天数</label>
            <input
              type="number"
              name="duration"
              value={newTask.duration}
              min="1"
              onChange={handleTaskInputChange}
              className="w-full border rounded-md p-2"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button 
              variant={taskColor}
              onClick={() => setShowTaskForm(false)}
            >
              取消
            </Button>
            <Button 
              onClick={handleAddTask}
              variant={taskColor}
            >
              保存
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
