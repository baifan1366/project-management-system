import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useTranslations } from 'next-intl';

export function ProfileDialog({ isOpen, onClose }) {
  const t = useTranslations();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('profile.title')}</DialogTitle>
          <DialogDescription>{t('profile.description')}</DialogDescription>
        </DialogHeader>
        <div className="mt-4">
          <p>{t('profile.email')}: user@example.com</p>
          <p>{t('profile.language')}: English</p>
          <p>{t('profile.theme')}: Dark</p>
        </div>
      </DialogContent>
    </Dialog>
  );
} 