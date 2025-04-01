'use client'

import { useTranslations } from 'next-intl';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Plus } from 'lucide-react';
import CreateTagDialog from './TagDialog';
import { getTags } from '@/lib/redux/features/teamCFSlice';
import { debounce } from 'lodash';

export default function TaskList({ projectId, teamId, teamCFId }) {
  const t = useTranslations('CreateTask');
  const dispatch = useDispatch();
  const { tags, loading: reduxLoading } = useSelector((state) => state.teamCF);
  const [isDialogOpen, setDialogOpen] = useState(false);
  const hasLoadedRef = useRef(false);

  const loadTag = useCallback(async () => {
    if (reduxLoading || !teamId || !teamCFId || hasLoadedRef.current) {
      return;
    }
    try {
      // const result = await dispatch(getTags({ teamId, teamCFId })).unwrap();
      // console.log('Tags loaded:', result);
      hasLoadedRef.current = true;
    } catch (error) {
      console.error('Error loading tags:', error);
    }
  }, [teamId, teamCFId, dispatch, reduxLoading]);

  const debouncedLoadTag = useCallback(
    debounce(() => {
      hasLoadedRef.current = false;
      loadTag();
    }, 300),
    [loadTag]
  );

  useEffect(() => {
    if (teamId && teamCFId) {
      loadTag();
    }
  }, [teamId, teamCFId]);

  return (
    <div className="p-4">
      <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
        <button 
          onClick={() => setDialogOpen(true)} 
          className="flex items-center w-full px-4 py-2 text-foreground hover:bg-accent/50 transition-colors mt-2"
        >
          <Plus size={16} className="text-muted-foreground" />
        </button>
        <div className="mt-4">
            <div className="space-y-3">
                <div 
                  className="p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-base mb-1">name</h4>
                      <p className="text-sm text-muted-foreground mb-2">
                        description
                      </p>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          <span>2025-03-31</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          <span>1h</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="default">
                        tag
                      </Badge>
                      <Badge variant="default">
                        tag
                      </Badge>
                    </div>
                  </div>
                </div>
            </div>
        </div>
        <CreateTagDialog 
          isOpen={isDialogOpen} 
          onClose={() => {
            setDialogOpen(false);
          }} 
          projectId={projectId}
          teamId={teamId}
          teamCFId={teamCFId}
        />
      </div>
    </div>
  );
}