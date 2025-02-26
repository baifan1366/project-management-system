'use client'

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchTasks } from '@/lib/redux/features/taskSlice';
import { format } from 'date-fns';
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock } from 'lucide-react';

export default function TaskList({ projectId, teamId }) {
  const t = useTranslations('CreateTask');
  const dispatch = useDispatch();
  const { tasks, status, error } = useSelector((state) => state.tasks);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadTasks = async () => {
      setIsLoading(true);
      try {
        await dispatch(fetchTasks(projectId));
      } catch (error) {
        console.error('Error loading tasks:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (projectId) {
      loadTasks();
    }
  }, [dispatch, projectId]);

  if (isLoading || status === 'loading') {
    return (
      <div className="p-4">
        <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
          <div className="p-6">
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
              <div className="space-y-3">
                <div className="h-3 bg-gray-200 rounded"></div>
                <div className="h-3 bg-gray-200 rounded w-5/6"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 p-4">
          <p>{t('errorLoading')}: {error}</p>
        </div>
      </div>
    );
  }

  const filteredTasks = tasks.filter(task => 
    (!teamId || task.team_id === teamId)
  );

  return (
    <div className="p-4">
      <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
        <div className="p-6">
          <h3 className="text-lg font-medium mb-4">{t('taskList')}</h3>
          <div className="mt-4">
            {filteredTasks.length > 0 ? (
              <div className="space-y-3">
                {filteredTasks.map((task) => (
                  <div 
                    key={task.id} 
                    className="p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-base mb-1">{task.title}</h4>
                        {task.description && (
                          <p className="text-sm text-muted-foreground mb-2">
                            {task.description}
                          </p>
                        )}
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          {task.due_date && (
                            <div className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              <span>{format(new Date(task.due_date), 'yyyy-MM-dd')}</span>
                            </div>
                          )}
                          {task.estimated_time && (
                            <div className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              <span>{task.estimated_time}h</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={task.priority === 'high' ? 'destructive' : task.priority === 'medium' ? 'warning' : 'secondary'}>
                          {task.priority}
                        </Badge>
                        <Badge variant={task.status === 'completed' ? 'success' : 'default'}>
                          {task.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground text-center py-8">
                {t('noTasks')}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}