"use client";

import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { 
  PlayCircle, 
  CheckCircle2, 
  Settings, 
  Download, 
  FileSpreadsheet,
  BarChart3
} from 'lucide-react';

const AgileTools = ({ currentSprint, onStartSprint, onCompleteSprint }) => {
  const t = useTranslations('Agile');
  const [isExporting, setIsExporting] = useState(false);

  // 导出冲刺报告
  const handleExportReport = async () => {
    try {
      setIsExporting(true);
      // 在实际应用中，这里应该调用API导出报告
      await new Promise(resolve => setTimeout(resolve, 1000)); // 模拟API调用
      // 实际应用中，这里应该提供下载链接
      
      setIsExporting(false);
    } catch (error) {
      console.error('导出报告失败', error);
      setIsExporting(false);
    }
  };

  // 根据当前冲刺状态显示不同的操作按钮
  const renderSprintActionButton = () => {
    if (!currentSprint) {
      return null;
    }

    if (currentSprint.status === 'in_progress') {
      return (
        <Button 
          variant="default" 
          size="sm" 
          className="mr-2"
          onClick={() => onCompleteSprint(currentSprint.id)}
        >
          <CheckCircle2 className="w-4 h-4 mr-1" />
          {t('completeSprint')}
        </Button>
      );
    }

    if (currentSprint.status === 'planning') {
      return (
        <Button 
          variant="default" 
          size="sm" 
          className="mr-2"
          onClick={() => onStartSprint(currentSprint.id)}
        >
          <PlayCircle className="w-4 h-4 mr-1" />
          {t('startSprint')}
        </Button>
      );
    }

    return null;
  };

  return (
    // <div className="flex items-center space-x-2">
    //   {renderSprintActionButton()}

    //   <DropdownMenu>
    //     <DropdownMenuTrigger asChild>
    //       <Button variant="outline" size="sm">
    //         <Settings className="w-4 h-4 mr-1" />
    //         {t('tools')}
    //       </Button>
    //     </DropdownMenuTrigger>
    //     <DropdownMenuContent align="end">
    //       <DropdownMenuItem onClick={handleExportReport} disabled={isExporting}>
    //         <Download className="w-4 h-4 mr-2" />
    //         {t('exportReport')}
    //       </DropdownMenuItem>
    //       <DropdownMenuItem>
    //         <FileSpreadsheet className="w-4 h-4 mr-2" />
    //         {t('exportTaskList')}
    //       </DropdownMenuItem>
    //       <DropdownMenuItem>
    //         <BarChart3 className="w-4 h-4 mr-2" />
    //         {t('sprintStatistics')}
    //       </DropdownMenuItem>
    //     </DropdownMenuContent>
    //   </DropdownMenu>
    // </div>
    <></>
  );
};

export default AgileTools;
