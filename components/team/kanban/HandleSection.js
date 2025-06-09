'use client';

import { useDispatch } from 'react-redux';
import { createSection, updateSection, deleteSection } from '@/lib/redux/features/sectionSlice';
import { useTranslations } from 'next-intl';
import { useGetUser } from '@/lib/hooks/useGetUser';
import { useConfirm } from '@/hooks/use-confirm';
import { useSelector } from 'react-redux';

export default function HandleSection({ teamId, onSectionChange }) {
    const dispatch = useDispatch();
    const t = useTranslations('CreateTask');
    const tConfirm = useTranslations('confirmation');
    const { user } = useGetUser();
    const { confirm } = useConfirm();
    const sectionInfo = useSelector((state) => state.sections?.sections || []);

    const CreateSection = async (sectionData) => {        
        try {
            if (!sectionData.name || !sectionData.name.trim()) {
                console.error('分区名称不能为空');
                return;
            }
            
            const result = await dispatch(createSection({
                teamId,
                sectionData: {
                    teamId: teamId,
                    sectionName: sectionData.name.trim(),
                    createdBy: user?.id
                }
            })).unwrap();
                        
            if (onSectionChange) {
                onSectionChange();
            }
            
            return result;
        } catch (error) {
            console.error('创建分区失败:', error);
        }
    }

    const UpdateSection = async (sectionId, editingTitle) => {        
        try {
            const numericSectionId = Number(sectionId);
            
            if (isNaN(numericSectionId)) {
                console.error('无效的分区ID:', sectionId);
                return;
            }
            
            const currentSections = sectionInfo.map(s => ({ id: s.id, name: s.name }));
            
            const result = await dispatch(updateSection({
                sectionId: numericSectionId,
                teamId,
                sectionData: editingTitle
            })).unwrap();
                        
            if (onSectionChange) {
                onSectionChange();
            }
        } catch (error) {
            console.error('更新分区失败:', error);
        }
    }
    
    const DeleteSection = (columnId) => {
        let sectionToDelete = null;
        
        for (let i = 0; i < sectionInfo.length; i++) {
            const section = sectionInfo[i];
            if (section.id == columnId) {
                sectionToDelete = section;
                break;
            }
        }
                
        confirm({
            title: tConfirm('confirmDeleteSection'),
            description: `${tConfirm('section')} "${sectionToDelete.name || sectionToDelete.title}" ${tConfirm('willBeDeleted')}`,
            variant: 'error',
            onConfirm: () => {
                dispatch(deleteSection({teamId, sectionId: sectionToDelete.id}))
                .then(() => {
                    if (onSectionChange) {
                        onSectionChange();
                    }
                });
            }
        });
    }
    
    return {
        CreateSection,
        UpdateSection,
        DeleteSection
    };
}