'use client';

import { Button } from "@/components/ui/button";
import { useConfirm } from "@/hooks/use-confirm";
import { useTranslations } from "next-intl";

export function ConfirmExample() {
  const { confirm } = useConfirm();
  const t = useTranslations('common.confirmDialog');

  const handleBasicConfirm = () => {
    confirm({
      title: t('confirmAction'),
      description: t('confirmActionDesc'),
      confirmText: t('confirm'),
      cancelText: t('cancel'),
      onConfirm: () => {
        
      },
      onCancel: () => {
        
      }
    });
  };

  const handleDeleteConfirm = () => {
    confirm({
      title: t('deleteConfirm'),
      description: t('deleteConfirmDesc'),
      variant: "error",
      confirmText: t('delete'),
      cancelText: t('cancel'),
      onConfirm: () => {
        
      }
    });
  };

  const handleWarningConfirm = () => {
    confirm({
      title: t('warning'),
      description: t('warningDesc'),
      variant: "warning",
      confirmText: t('continue'),
      cancelText: t('cancel'),
      onConfirm: () => {
        
      }
    });
  };

  const handleSuccessConfirm = () => {
    confirm({
      title: t('success'),
      description: t('successDesc'),
      variant: "success",
      confirmText: t('continue'),
      cancelText: t('finish'),
      onConfirm: () => {
        
      },
      onCancel: () => {
        
      }
    });
  };

  const handleQuestionConfirm = () => {
    confirm({
      title: t('question'),
      description: t('questionDesc'),
      variant: "question",
      confirmText: t('save'),
      cancelText: t('discard'),
      onConfirm: () => {
        
      },
      onCancel: () => {
        
      }
    });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
      <div className="border rounded-lg p-4 flex flex-col items-center">
        <h3 className="text-lg font-medium mb-4">基本确认框</h3>
        <p className="text-sm text-muted-foreground mb-4 text-center">
          最基本的确认对话框，用于一般性确认操作
        </p>
        <Button onClick={handleBasicConfirm}>显示基本确认框</Button>
      </div>

      <div className="border rounded-lg p-4 flex flex-col items-center">
        <h3 className="text-lg font-medium mb-4">删除确认框</h3>
        <p className="text-sm text-muted-foreground mb-4 text-center">
          用于删除操作的确认，使用红色警示
        </p>
        <Button variant="destructive" onClick={handleDeleteConfirm}>显示删除确认框</Button>
      </div>

      <div className="border rounded-lg p-4 flex flex-col items-center">
        <h3 className="text-lg font-medium mb-4">警告确认框</h3>
        <p className="text-sm text-muted-foreground mb-4 text-center">
          用于警告用户操作可能存在风险
        </p>
        <Button variant="outline" onClick={handleWarningConfirm}>显示警告确认框</Button>
      </div>

      <div className="border rounded-lg p-4 flex flex-col items-center">
        <h3 className="text-lg font-medium mb-4">成功确认框</h3>
        <p className="text-sm text-muted-foreground mb-4 text-center">
          操作成功后的下一步确认
        </p>
        <Button variant="outline" className="border-green-500 text-green-500 hover:bg-green-50" onClick={handleSuccessConfirm}>显示成功确认框</Button>
      </div>

      <div className="border rounded-lg p-4 flex flex-col items-center">
        <h3 className="text-lg font-medium mb-4">问题确认框</h3>
        <p className="text-sm text-muted-foreground mb-4 text-center">
          询问用户问题的确认框
        </p>
        <Button variant="outline" className="border-blue-500 text-blue-500 hover:bg-blue-50" onClick={handleQuestionConfirm}>显示问题确认框</Button>
      </div>
    </div>
  );
} 