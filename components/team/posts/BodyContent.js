'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { useTranslations } from 'next-intl';

// Empty constants to avoid recreating objects each render
const EMPTY_OBJECT = {};
const EMPTY_ARRAY = [];

export default function BodyContent({ projectId, teamId, teamCFId }) {
    const dispatch = useDispatch();
    const t = useTranslations('PostsView');
    const [posts, setPosts] = useState([]);
    const [isLoaded, setIsLoaded] = useState(false);

    // Load data with useCallback for stable reference
    const loadData = useCallback(async (forceReload = false) => {
        if (!teamId || (isLoaded && !forceReload)) return;
        
        try {
            if (!isLoaded) {
                setIsLoaded(true);
            }
            
            // Set posts data
            setPosts([]);
            
            if (forceReload) {
                console.log('Posts data reload completed');
            }
            
        } catch (error) {
            console.error('Failed to load data:', error);
        }
    }, [teamId, isLoaded]);

    // Automatically load data when component mounts or teamId changes
    useEffect(() => {
        if (teamId) {
            loadData();
        }
    }, [teamId, loadData]);

    // Use useMemo to cache return values
    const returnData = useMemo(() => {
        return {
            loadData,
            posts: posts.length > 0 ? posts : EMPTY_ARRAY,
            isLoaded
        };
    }, [loadData, posts, isLoaded]);

    return returnData;
} 