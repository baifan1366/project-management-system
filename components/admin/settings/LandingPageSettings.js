'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { supabase } from '@/lib/supabase';
import { FaChevronDown, FaChevronUp } from 'react-icons/fa';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { X } from 'lucide-react';

export default function LandingPageSettings() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [sections, setSections] = useState([]);
  const [featuresCount, setFeaturesCount] = useState(1);
  const [cardsCount, setCardsCount] = useState(1);
  const [isCollapsed, setIsCollapsed] = useState({
    hero: true,
    features: true,
    solutions: true,
    promoBanner: true
  });
  const [dragActive, setDragActive] = useState(false);
  
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const [navigateUrl, setNavigateUrl] = useState('');
  
  const [lastSaveTime, setLastSaveTime] = useState(Date.now());
  const [showSaveReminder, setShowSaveReminder] = useState(false);
  const [showFullScreenReminder, setShowFullScreenReminder] = useState(false);
  
  const [deletedItems, setDeletedItems] = useState({
    features: [],
    solutionCards: []
  });
  
  // Create refs
  const fileInputRefHero = useRef(null);
  const fileInputRefHeroImage = useRef(null);
  
  // Feature refs - create a fixed number of refs that won't change
  const featureVideoRefs = useRef([]);
  const featureImageRefs = useRef([]);

  // Format states for each section
  const [heroSection, setHeroSection] = useState({
    h1: '',
    mediaType: 'image',
    mediaUrl: '',
    mediaFile: null
  });

  const [featuresSection, setFeaturesSection] = useState({
    features: [
      { h2: '', span: '', mediaType: 'video', mediaFile: null, mediaUrl: null }
    ]
  });

  const [solutionsSection, setSolutionsSection] = useState({
    h2: '',
    cards: [
      { title: '', content: '' }
    ]
  });
  
  // Track unsaved changes
  const [unsavedChanges, setUnsavedChanges] = useState({
    heroH1: false,
    heroMedia: false,
    features: [], // Array of objects with h2, span, media status
    solutionsH2: false,
    solutionsCards: [], // Array of booleans for each card
    promoBanner: false // Add this line
  });
  
  // Store original data to compare for changes
  const [originalData, setOriginalData] = useState({
    hero: null,
    features: null,
    solutions: null,
    promoBanner: null
  });

  // Add state for promo banner section
  const [promoBannerSection, setPromoBannerSection] = useState({
    isEnabled: false,
    selectedPromoCode: ''
  });

  // Add state for available promo codes
  const [availablePromoCodes, setAvailablePromoCodes] = useState([]);

  useEffect(() => {
    fetchSections();
    fetchPromoCodes(); // Add this line
  }, []);

  // Toggle section collapse state
  const toggleSection = (section) => {
    setIsCollapsed(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const fetchSections = async () => {
    try {
      setLoading(true);
      
      // Check if sections exist
      const { data: sectionsData, error: sectionsError } = await supabase
        .from('landing_page_section')
        .select('*')
        .order('sort_order');

      if (sectionsError) throw sectionsError;

      // If no sections exist, create them
      if (!sectionsData || sectionsData.length < 3) {
        await initializeSections();
        return; // Fetch will be called again after initialization
      }

      // Fetch sections with content
      const { data: sectionsWithContent, error: contentError } = await supabase
        .from('landing_page_section')
        .select('*, landing_page_content(*)')
        .order('sort_order');

      if (contentError) throw contentError;

      setSections(sectionsWithContent);
      
      // Populate form state from fetched data
      populateFormState(sectionsWithContent);
    } catch (error) {
      console.error('Error fetching landing page content:', error);
      toast.error("Failed to load landing page settings");
    } finally {
      setLoading(false);
    }
  };

  const initializeSections = async () => {
    try {
      // Create the three main sections
      const { data: sectionsData, error: sectionsError } = await supabase
        .from('landing_page_section')
        .insert([
          { name: 'hero', sort_order: 1 },
          { name: 'features', sort_order: 2 },
          { name: 'solutions', sort_order: 3 }
        ])
        .select();

      if (sectionsError) throw sectionsError;

      // Sample content matching the provided SQL example
      if (sectionsData && sectionsData.length === 3) {
        const heroId = sectionsData.find(s => s.name === 'hero')?.id;
        const featuresId = sectionsData.find(s => s.name === 'features')?.id;
        const solutionsId = sectionsData.find(s => s.name === 'solutions')?.id;

        // Insert initial content
        await supabase
          .from('landing_page_content')
          .insert([
            // Hero section
            { section_id: heroId, type: 'h1', content: 'Build Your Ultimate AI Agent Workforce', sort_order: 1 },
            
            // Features section
            { section_id: featuresId, type: 'h2', content: 'Advanced Features', sort_order: 1 },
            { section_id: featuresId, type: 'span', content: 'Discover our powerful features that help you work smarter', sort_order: 2 },
            
            // Solutions section
            { section_id: solutionsId, type: 'h2', content: 'Our Solutions', sort_order: 1 },
            { 
              section_id: solutionsId, 
              type: 'solution_card', 
              content: JSON.stringify({
                title: 'Workflow',
                description: 'Automate your workflows with AI'
              }), 
              sort_order: 2 
            }
          ]);
      }

      // Fetch sections again after initialization
      fetchSections();
      toast.success("Landing page sections initialized successfully");
    } catch (error) {
      console.error('Error initializing landing page sections:', error);
      toast.error("Failed to initialize landing page sections");
    }
  };

  const populateFormState = (sectionsData) => {
    if (!sectionsData || !Array.isArray(sectionsData)) {
      console.error("Invalid sections data:", sectionsData);
      return;
    }

    // Populate hero section
    const heroData = sectionsData.find(section => section.name === 'hero');
    if (heroData && heroData.landing_page_content) {
      const h1Content = heroData.landing_page_content.find(content => content.type === 'h1');
      const mediaContent = heroData.landing_page_content.find(content => 
        content.type === 'video' || content.type === 'image'
      );
      
      const heroState = {
        h1: h1Content?.content || '',
        mediaType: mediaContent?.type || 'video',
        mediaUrl: mediaContent?.content || null,
        mediaFile: null
      };
      
      setHeroSection(heroState);
      
      // Store original data for change detection
      setOriginalData(prev => ({
        ...prev,
        hero: { ...heroState }
      }));
      
      // Reset unsaved changes
      setUnsavedChanges(prev => ({
        ...prev,
        heroH1: false,
        heroMedia: false
      }));
    }

    // Populate features section
    const featuresData = sectionsData.find(section => section.name === 'features');
    if (featuresData && featuresData.landing_page_content) {
      const h2Contents = featuresData.landing_page_content.filter(content => content.type === 'h2');
      const spanContents = featuresData.landing_page_content.filter(content => content.type === 'span');
      const mediaContents = featuresData.landing_page_content.filter(content => 
        content.type === 'video' || content.type === 'image'
      );
      
      const features = [];
      const maxCount = Math.max(
        h2Contents?.length || 0, 
        spanContents?.length || 0, 
        mediaContents?.length || 0
      );
      
      for (let i = 0; i < Math.max(1, maxCount); i++) {
        features.push({
          h2: h2Contents[i]?.content || '',
          span: spanContents[i]?.content || '',
          mediaType: mediaContents[i]?.type || 'video',
          mediaUrl: mediaContents[i]?.content || null,
          mediaFile: null
        });
      }
      
      // Update this part to set initial state with just one feature if none exist
      if (!features.length) {
        features.push({
          h2: '',
          span: '',
          mediaType: 'video',
          mediaUrl: null,
          mediaFile: null
        });
      }
      
      setFeaturesSection({ features });
      setFeaturesCount(features.length);
      
      // Store original data for change detection
      setOriginalData(prev => ({
        ...prev,
        features: JSON.parse(JSON.stringify(features))
      }));
      
      // Initialize unsaved changes tracking for features
      setUnsavedChanges(prev => ({
        ...prev,
        features: features.map(() => ({ h2: false, span: false, media: false }))
      }));
    }

    // Populate solutions section
    const solutionsData = sectionsData.find(section => section.name === 'solutions');
    if (solutionsData && solutionsData.landing_page_content) {
      const h2Content = solutionsData.landing_page_content.find(content => content.type === 'h2');
      const cardContents = solutionsData.landing_page_content.filter(content => content.type === 'solution_card');
      
      const cards = [];
      if (cardContents && cardContents.length > 0) {
        for (const card of cardContents) {
          try {
            const cardData = JSON.parse(card.content);
            cards.push({
              title: cardData.title || '',
              content: cardData.description || ''
            });
          } catch (e) {
            cards.push({ title: '', content: '' });
          }
        }
      }
      
      // Ensure at least one card exists
      if (cards.length === 0) {
        cards.push({ title: '', content: '' });
      }
      
      const solutionsState = {
        h2: h2Content?.content || '',
        cards
      };
      
      setSolutionsSection(solutionsState);
      setCardsCount(cards.length);
      
      // Store original data for change detection
      setOriginalData(prev => ({
        ...prev,
        solutions: JSON.parse(JSON.stringify(solutionsState))
      }));
      
      // Initialize unsaved changes tracking for solutions
      setUnsavedChanges(prev => ({
        ...prev,
        solutionsH2: false,
        solutionsCards: cards.map(() => false)
      }));
    }

    // Populate promo banner section
    const promoBannerData = sectionsData.find(section => section.name === 'promo_banner');
    if (promoBannerData && promoBannerData.landing_page_content) {
      const bannerContent = promoBannerData.landing_page_content[0];
      let bannerSettings = {
        isEnabled: false,
        selectedPromoCode: ''
      };
      
      if (bannerContent) {
        try {
          bannerSettings = JSON.parse(bannerContent.content);
        } catch (e) {
          console.error('Error parsing promo banner settings:', e);
        }
      }
      
      setPromoBannerSection(bannerSettings);
      
      // Store original data for change detection
      setOriginalData(prev => ({
        ...prev,
        promoBanner: { ...bannerSettings }
      }));
      
      // Reset unsaved changes
      setUnsavedChanges(prev => ({
        ...prev,
        promoBanner: false
      }));
    }
  };

  const handleMediaUpload = async (file, section, index = null) => {
    if (!file) return null;
    
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
      const filePath = `${section}/${fileName}`;
      
      // Use the same bucket name for both upload and URL retrieval
      const bucketName = 'landing-page-media';
      
      const { error } = await supabase.storage
        .from(bucketName)
        .upload(filePath, file, { 
          upsert: true,
          contentType: file.type
        });
        
      if (error) throw error;
      
      // Get the public URL from the same bucket
      const { data: { publicUrl } } = supabase.storage
        .from(bucketName)
        .getPublicUrl(filePath);
        
      return publicUrl;
    } catch (error) {
      console.error('Error uploading media:', error);
      toast.error("Failed to upload media file: " + error.message);
      return null;
    }
  };

  const handleHeroMediaChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const mediaType = file.type.startsWith('video/') ? 'video' : 'image';
      setHeroSection(prev => ({ 
        ...prev, 
        mediaFile: file,
        mediaType
      }));
      
      // Mark media as changed
      setUnsavedChanges(prev => ({
        ...prev,
        heroMedia: true
      }));
      
      if (mediaType === 'video') {
        toast.success("Video is ready to be uploaded");
      } else {
        toast.success(`Image is ready to be uploaded`);
      }
    }
  };

  const handleFeatureMediaChange = (e, index) => {
    const file = e.target.files[0];
    if (file) {
      const mediaType = file.type.startsWith('video/') ? 'video' : 'image';
      setFeaturesSection(prev => {
        const features = [...prev.features];
        features[index] = { 
          ...features[index], 
          mediaFile: file,
          mediaType
        };
        return { ...prev, features };
      });
      
      // Mark media as changed
      const updatedFeatureChanges = [...unsavedChanges.features];
      if (updatedFeatureChanges[index]) {
        updatedFeatureChanges[index].media = true;
      } else {
        updatedFeatureChanges[index] = { h2: false, span: false, media: true };
      }
      
      setUnsavedChanges(prev => ({
        ...prev,
        features: updatedFeatureChanges
      }));
      
      if (mediaType === 'video') {
        toast.success("Video is ready to be uploaded");
      } else {
        toast.success(`Image for feature ${index + 1} is ready to be uploaded`);
      }
    }
  };

  const addFeature = () => {
    setFeaturesSection(prev => ({
      ...prev,
      features: [
        ...prev.features,
        { h2: '', span: '', mediaType: 'video', mediaFile: null, mediaUrl: null }
      ]
    }));
    
    const newIndex = featuresCount;
    setFeaturesCount(prev => prev + 1);
    
    // Mark the new feature as having unsaved changes
    setUnsavedChanges(prev => {
      const updatedFeatures = [...prev.features];
      // Add a new entry for the new feature
      updatedFeatures[newIndex] = { h2: true, span: true, media: true };
      return {
        ...prev,
        features: updatedFeatures
      };
    });
    
    toast.success("A new feature section has been added.");
  };

  const removeFeature = (index) => {
    handleDeleteFeature(index);
    toast.success(`Feature ${index + 1} has been marked for deletion. Save changes to confirm.`);
  };

  const addCard = () => {
    setSolutionsSection(prev => ({
      ...prev,
      cards: [
        ...prev.cards,
        { title: '', content: '' }
      ]
    }));
    
    const newIndex = cardsCount;
    setCardsCount(prev => prev + 1);
    
    // Mark the new card as having unsaved changes
    setUnsavedChanges(prev => {
      const updatedCards = [...prev.solutionsCards];
      // Add a new entry for the new card
      updatedCards[newIndex] = true;
      return {
        ...prev,
        solutionsCards: updatedCards
      };
    });
    
    toast.success("A new solution card has been added.");
  };

  const removeCard = (index) => {
    // 不直接删除，而是标记为已删除
    handleDeleteSolutionCard(index);
    toast.success(`Solution card ${index + 1} has been marked for deletion. Save changes to confirm.`);
  };

  // 检查是否有未保存的更改
  const hasUnsavedChanges = useMemo(() => {
    if (!originalData) return false;
    
    // 检查 promo banner 的变化
    const hasPromoBannerChanges = originalData.promoBanner ? (
      originalData.promoBanner.isEnabled !== promoBannerSection.isEnabled ||
      originalData.promoBanner.selectedPromoCode !== promoBannerSection.selectedPromoCode
    ) : true;
    
    return (
      unsavedChanges.heroH1 || 
      unsavedChanges.heroMedia || 
      unsavedChanges.features.some(f => f.h2 || f.span || f.media) || 
      unsavedChanges.solutionsH2 || 
      unsavedChanges.solutionsCards.some(c => c) ||
      deletedItems.features.length > 0 ||
      deletedItems.solutionCards.length > 0 ||
      hasPromoBannerChanges
    );
  }, [unsavedChanges, originalData, deletedItems, promoBannerSection]);

  const handleDeleteFeature = (index) => {
    setDeletedItems(prev => ({
      ...prev,
      features: [...prev.features, index]
    }));
    
    setHasUnsavedChanges(true);
  };

  const handleDeleteSolutionCard = (index) => {
    setDeletedItems(prev => ({
      ...prev,
      solutionCards: [...prev.solutionCards, index]
    }));
    
    setHasUnsavedChanges(true);
  };

  const handleRestoreFeature = (index) => {
    setDeletedItems(prev => ({
      ...prev,
      features: prev.features.filter(i => i !== index)
    }));
  };

  const handleRestoreSolutionCard = (index) => {
    setDeletedItems(prev => ({
      ...prev,
      solutionCards: prev.solutionCards.filter(i => i !== index)
    }));
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      
      // Check if sections exist
      if (!sections || sections.length < 3) {
        await initializeSections();
        toast.info("Landing page sections initialized");
        return;
      }
      
      // Find section IDs
      const heroSectionData = sections.find(s => s.name === 'hero');
      const featuresSectionData = sections.find(s => s.name === 'features');
      const solutionsSectionData = sections.find(s => s.name === 'solutions');
      const promoBannerData = sections.find(s => s.name === 'promo_banner');
      
      if (!heroSectionData || !featuresSectionData || !solutionsSectionData || !promoBannerData) {
        throw new Error('Required sections not found');
      }
      
      // First, delete all existing content
      const { error: deleteError } = await supabase
        .from('landing_page_content')
        .delete()
        .in('section_id', [heroSectionData.id, featuresSectionData.id, solutionsSectionData.id, promoBannerData.id]);
        
      if (deleteError) throw deleteError;
      
      // Process hero section
      const heroContents = [];
      
      // Upload hero media if new file is selected
      let heroMediaUrl = null;
      if (heroSection.mediaFile) {
        heroMediaUrl = await handleMediaUpload(heroSection.mediaFile, 'hero');
      } else {
        heroMediaUrl = heroSection.mediaUrl;
      }
      
      // Add h1 content
      if (heroSection.h1) {
        heroContents.push({
          section_id: heroSectionData.id,
          type: 'h1',
          content: heroSection.h1,
          sort_order: 1
        });
      }
      
      // Add media content
      if (heroMediaUrl) {
        heroContents.push({
          section_id: heroSectionData.id,
          type: heroSection.mediaType,
          content: heroMediaUrl,
          sort_order: 2
        });
      }
      
      // Process features section
      const featureContents = [];
      
      if (featuresSection.features && Array.isArray(featuresSection.features)) {

        const activeFeatures = featuresSection.features.filter((_, index) => 
          !deletedItems.features.includes(index)
        );
        
        for (let i = 0; i < activeFeatures.length; i++) {
          const feature = activeFeatures[i];
          
          // Upload feature media if new file is selected
          let featureMediaUrl = null;
          if (feature.mediaFile) {
            featureMediaUrl = await handleMediaUpload(feature.mediaFile, 'features', i);
          } else {
            featureMediaUrl = feature.mediaUrl;
          }
          
          // Add h2 content
          if (feature.h2) {
            featureContents.push({
              section_id: featuresSectionData.id,
              type: 'h2',
              content: feature.h2,
              sort_order: i * 3 + 1
            });
          }
          
          // Add span content
          if (feature.span) {
            featureContents.push({
              section_id: featuresSectionData.id,
              type: 'span',
              content: feature.span,
              sort_order: i * 3 + 2
            });
          }
          
          // Add media content
          if (featureMediaUrl) {
            featureContents.push({
              section_id: featuresSectionData.id,
              type: feature.mediaType,
              content: featureMediaUrl,
              sort_order: i * 3 + 3
            });
          }
        }
      }
      
      // Process solutions section
      const solutionContents = [];
      
      // Add h2 content
      if (solutionsSection.h2) {
        solutionContents.push({
          section_id: solutionsSectionData.id,
          type: 'h2',
          content: solutionsSection.h2,
          sort_order: 1
        });
      }
      
      // Add card contents
      if (solutionsSection.cards && Array.isArray(solutionsSection.cards)) {
        const activeCards = solutionsSection.cards.filter((_, index) => 
          !deletedItems.solutionCards.includes(index)
        );
        
        for (let i = 0; i < activeCards.length; i++) {
          const card = activeCards[i];
          
          if (card.title || card.content) {
            const cardData = JSON.stringify({
              title: card.title,
              description: card.content
            });
            
            solutionContents.push({
              section_id: solutionsSectionData.id,
              type: 'solution_card',
              content: cardData,
              sort_order: i + 2
            });
          }
        }
      }
      
      // Process promo banner section
      const promoBannerContents = [];
      
      // Always save promo banner settings, even when disabled
      promoBannerContents.push({
        section_id: promoBannerData.id,
        type: 'promo_banner',
        content: JSON.stringify({
          isEnabled: promoBannerSection.isEnabled,
          selectedPromoCode: promoBannerSection.selectedPromoCode
        }),
        sort_order: 1
      });
      
      // Insert all content
      const allContents = [...heroContents, ...featureContents, ...solutionContents, ...promoBannerContents];
      
      if (allContents.length > 0) {
        const { error: insertError } = await supabase
          .from('landing_page_content')
          .insert(allContents);
          
        if (insertError) throw insertError;
      }
      
      toast.success("Landing page settings saved successfully");
      
      const updatedFeatures = featuresSection.features.filter((_, index) => 
        !deletedItems.features.includes(index)
      );
      
      const updatedCards = solutionsSection.cards.filter((_, index) => 
        !deletedItems.solutionCards.includes(index)
      );
      
      setFeaturesSection(prev => ({ ...prev, features: updatedFeatures }));
      setSolutionsSection(prev => ({ ...prev, cards: updatedCards }));
      
      // Update original data with current state to reset change detection
      setOriginalData({
        hero: { ...heroSection },
        features: JSON.parse(JSON.stringify(updatedFeatures)),
        solutions: {
          h2: solutionsSection.h2,
          cards: JSON.parse(JSON.stringify(updatedCards))
        },
        promoBanner: { ...promoBannerSection }
      });
      
      // Reset all unsaved changes flags
      setUnsavedChanges({
        heroH1: false,
        heroMedia: false,
        features: updatedFeatures.map(() => ({ h2: false, span: false, media: false })),
        solutionsH2: false,
        solutionsCards: updatedCards.map(() => false),
        promoBanner: false
      });
      
      setDeletedItems({
        features: [],
        solutionCards: []
      });
      setLastSaveTime(Date.now());
      if (navigateUrl) {
        window.location.href = navigateUrl;
      }
      
      fetchSections(); // Refresh data
      
    } catch (error) {
      console.error('Error saving landing page settings:', error);
      toast.error("Failed to save landing page settings: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle drag events
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  // Handle drop event
  const handleDrop = (e, type, fileType, index = null) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const isCorrectFileType = fileType === 'video' 
        ? file.type.startsWith('video/') 
        : file.type.startsWith('image/');

      if (!isCorrectFileType) {
        toast.error(`Please upload a ${fileType} file.`);
        return;
      }
      
      if (type === 'hero') {
        setHeroSection(prev => ({ 
          ...prev, 
          mediaFile: file,
          mediaType: fileType
        }));
        
        // Mark media as changed
        setUnsavedChanges(prev => ({
          ...prev,
          heroMedia: true
        }));
        
        if (fileType === 'video') {
          toast.success("Video is ready to be uploaded");
        } else {
          toast.success(`Imageis ready to be uploaded`);
        }
      } else if (type === 'feature' && index !== null) {
        setFeaturesSection(prev => {
          const features = [...prev.features];
          features[index] = { 
            ...features[index], 
            mediaFile: file,
            mediaType: fileType
          };
          return { ...prev, features };
        });
        
        // Mark media as changed
        const updatedFeatureChanges = [...unsavedChanges.features];
        if (updatedFeatureChanges[index]) {
          updatedFeatureChanges[index].media = true;
        } else {
          updatedFeatureChanges[index] = { h2: false, span: false, media: true };
        }
        
        setUnsavedChanges(prev => ({
          ...prev,
          features: updatedFeatureChanges
        }));
        
        if (fileType === 'video') {
          toast.success("Video is ready to be uploaded");
        } else {
          toast.success(`Image for feature ${index + 1} is ready to be uploaded`);
        }
      }
    }
  };

  // Trigger file input click
  const onButtonClick = (ref) => {
    if (ref && ref.current) {
      ref.current.click();
    }
  };

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = "You have unsaved changes, are you sure you want to leave?";
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasUnsavedChanges]);
  
  const handleConfirmNavigation = () => {
    setShowUnsavedModal(false);
    if (navigateUrl) {
      window.location.href = navigateUrl;
    }
  };

  const handleCancelNavigation = () => {
    setShowUnsavedModal(false);
    setNavigateUrl('');
  };

  const handleLinkClick = (e) => {
    if (hasUnsavedChanges) {
      const target = e.target.closest('a');
      if (target && target.href) {
        e.preventDefault();
        e.stopPropagation();
        setNavigateUrl(target.href);
        setShowUnsavedModal(true);
      }
    }
  };

  useEffect(() => {

    document.addEventListener('click', handleLinkClick, true);
    
    return () => {
      document.removeEventListener('click', handleLinkClick, true);
    };
  }, [hasUnsavedChanges]);

  useEffect(() => {
    const handleKeyDown = (e) => {

      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault(); 
        if (hasUnsavedChanges) {
          handleSave();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [hasUnsavedChanges]);

  // Handle browser history navigation (back/forward buttons)
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };

    // Handle browser history navigation (back/forward buttons)
    const handlePopState = (e) => {
      if (hasUnsavedChanges) {
        // Prevent the navigation
        e.preventDefault();
        // Show the modal
        setShowUnsavedModal(true);
        // Store the URL we were trying to navigate to
        const targetUrl = document.location.href;
        setNavigateUrl(targetUrl);
        
        // Push the current URL back to the history to prevent navigation
        window.history.pushState(null, '', window.location.href);
      }
    };

    // Add event listeners
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('popstate', handlePopState);

    // Initial push to history stack to enable popstate detection
    window.history.pushState(null, '', window.location.href);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [hasUnsavedChanges]);
  

  const closeFullScreenReminder = () => {
    setShowFullScreenReminder(false);
  };
  
  const saveAndCloseReminder = async () => {
    await handleSave();
    setShowFullScreenReminder(false);
  };

  // Update fetchPromoCodes function to match database schema
  const fetchPromoCodes = async () => {
    try {
      const now = new Date().toISOString();
      const { data: promoCodes, error } = await supabase
        .from('promo_code')
        .select('*')
        .eq('is_active', true)
        .lte('start_date', now)
        .or(`end_date.gt.${now},end_date.is.null`)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      
      setAvailablePromoCodes(promoCodes || []);
    } catch (error) {
      console.error('Error fetching promo codes:', error);
      toast.error("Failed to load promo codes");
    }
  };

  return (
    <div className="space-y-10 min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="sticky top-0 z-50 bg-white dark:bg-gray-900 py-4 border-b mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold">Landing Page Settings</h1>
        <div className="flex items-center gap-4">
          {hasUnsavedChanges && (
            <span className="text-amber-500 font-medium flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Unsaved Changes
            </span>
          )}
          <Button 
            onClick={handleSave} 
            disabled={loading || !hasUnsavedChanges}
            className={`px-6 py-2 text-lg ${hasUnsavedChanges ? 'bg-green-600 hover:bg-green-700 animate-pulse' : ''}`}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                </svg>
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>
      
      {/* Hero Section */}
      <div className="space-y-4">
        <div 
          className="flex justify-between items-center py-3 px-4 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white rounded-lg cursor-pointer shadow-md" 
          onClick={() => toggleSection('hero')}
        >
          <h2 className="text-xl font-bold flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Hero Section
          </h2>
          <button className="p-1 rounded-full hover:bg-indigo-700 transition-colors">
            {isCollapsed.hero ? <FaChevronDown /> : <FaChevronUp />}
          </button>
        </div>
        
        {!isCollapsed.hero && (
          <Card className="p-6 shadow-lg bg-white dark:bg-gray-800 border-t-4 border-indigo-500">
            <div className="space-y-6">
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg" style={{ 
                  borderColor: unsavedChanges.heroH1 ? 'rgb(34, 197, 94)' : '', 
                  borderWidth: unsavedChanges.heroH1 ? '2px' : '',
                  borderStyle: unsavedChanges.heroH1 ? 'solid' : '',
                  padding: unsavedChanges.heroH1 ? '8px' : ''
                }}>
                <Label htmlFor="hero-title" className="text-gray-700 dark:text-gray-300 text-sm font-medium mb-1 block">Main Heading (H1):</Label>
                <Input
                  id="hero-title"
                  placeholder="Enter your main headline here..."
                  value={heroSection.h1}
                  onChange={(e) => {
                    const newValue = e.target.value;
                    setHeroSection(prev => ({ ...prev, h1: newValue }));
                    // Check if value is different from original
                    let isChanged = true; // Default to true if originalData.hero doesn't exist yet
                    
                    if (originalData.hero) {
                      isChanged = originalData.hero.h1 !== newValue;
                    }
                    
                    setUnsavedChanges(prev => ({ ...prev, heroH1: isChanged }));
                  }}
                  className="mt-1 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
                />
              </div>
              
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg" style={{ 
                  borderColor: unsavedChanges.heroMedia ? 'rgb(34, 197, 94)' : '', 
                  borderWidth: unsavedChanges.heroMedia ? '2px' : '',
                  borderStyle: unsavedChanges.heroMedia ? 'solid' : ''
                }}>
                <Label className="text-gray-700 dark:text-gray-300 text-sm font-medium mb-3 block">Hero Media:</Label>
                <Tabs 
                  defaultValue="video" 
                  value={heroSection.mediaType} 
                  onValueChange={(value) => setHeroSection(prev => ({ ...prev, mediaType: value }))}
                  className="mt-1"
                >
                  <TabsList className="w-full bg-gray-100 dark:bg-gray-800 p-1">
                    <TabsTrigger value="video" className="flex-1 data-[state=active]:bg-indigo-500 data-[state=active]:text-white">Video</TabsTrigger>
                    <TabsTrigger value="image" className="flex-1 data-[state=active]:bg-indigo-500 data-[state=active]:text-white">Image</TabsTrigger>
                  </TabsList>

                  <TabsContent value="video" className="space-y-4 mt-4">
                    <div className="bg-indigo-50 dark:bg-gray-800 p-4 rounded-lg border border-dashed border-indigo-300 dark:border-gray-600">
                      <label 
                        className={`flex flex-col items-center justify-center w-full h-24 px-4 transition bg-white dark:bg-gray-700 border-2 ${dragActive ? "border-indigo-500 dark:border-indigo-400" : "border-gray-300 dark:border-gray-600"} border-dashed rounded-md appearance-none cursor-pointer hover:border-indigo-500 dark:hover:border-indigo-400 focus:outline-none`}
                        onDragEnter={(e) => handleDrag(e)}
                        onDragLeave={(e) => handleDrag(e)}
                        onDragOver={(e) => handleDrag(e)}
                        onDrop={(e) => handleDrop(e, 'hero', 'video')}
                        onClick={() => onButtonClick(fileInputRefHero)}
                      >
                        <span className="flex items-center space-x-2">
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                          <span className="font-medium text-gray-600 dark:text-gray-300">
                            Drop files to upload or <span className="text-indigo-600 dark:text-indigo-400 underline">browse</span>
                          </span>
                        </span>
                        <Input
                          type="file"
                          accept="video/*"
                          onChange={handleHeroMediaChange}
                          className="hidden"
                          ref={fileInputRefHero}
                        />
                      </label>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
                        Recommended: MP4 format, 16:9 ratio, max 10MB
                      </p>
                    </div>
                    {(heroSection.mediaFile || heroSection.mediaUrl) && (
                      <div className="mt-4 border rounded-lg overflow-hidden">
                        <video
                          controls
                          className="max-w-full h-auto rounded-lg"
                          src={heroSection.mediaFile ? URL.createObjectURL(heroSection.mediaFile) : heroSection.mediaUrl}
                        />
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="image" className="space-y-4 mt-4">
                    <div className="bg-indigo-50 dark:bg-gray-800 p-4 rounded-lg border border-dashed border-indigo-300 dark:border-gray-600">
                      <label 
                        className={`flex flex-col items-center justify-center w-full h-24 px-4 transition bg-white dark:bg-gray-700 border-2 ${dragActive ? "border-indigo-500 dark:border-indigo-400" : "border-gray-300 dark:border-gray-600"} border-dashed rounded-md appearance-none cursor-pointer hover:border-indigo-500 dark:hover:border-indigo-400 focus:outline-none`}
                        onDragEnter={(e) => handleDrag(e)}
                        onDragLeave={(e) => handleDrag(e)}
                        onDragOver={(e) => handleDrag(e)}
                        onDrop={(e) => handleDrop(e, 'hero', 'image')}
                        onClick={() => onButtonClick(fileInputRefHeroImage)}
                      >
                        <span className="flex items-center space-x-2">
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span className="font-medium text-gray-600 dark:text-gray-300">
                            Drop image to upload or <span className="text-indigo-600 dark:text-indigo-400 underline">browse</span>
                          </span>
                        </span>
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={handleHeroMediaChange}
                          className="hidden"
                          ref={fileInputRefHeroImage}
                        />
                      </label>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
                        Recommended: JPG or PNG, 1920x1080px, max 5MB
                      </p>
                    </div>
                    {(heroSection.mediaFile || heroSection.mediaUrl) && (
                      <div className="mt-4 border rounded-lg overflow-hidden">
                        <img
                          className="max-w-full h-auto rounded-lg"
                          src={heroSection.mediaFile ? URL.createObjectURL(heroSection.mediaFile) : heroSection.mediaUrl}
                          alt="Hero image"
                        />
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          </Card>
        )}
      </div>
      
      {/* Features Section */}
      <div className="space-y-4">
        <div 
          className="flex justify-between items-center py-3 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg cursor-pointer shadow-md" 
          onClick={() => toggleSection('features')}
        >
          <h2 className="text-xl font-bold flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
            Features Section
          </h2>
          <button className="p-1 rounded-full hover:bg-indigo-700 transition-colors">
            {isCollapsed.features ? <FaChevronDown /> : <FaChevronUp />}
          </button>
        </div>
        
        {!isCollapsed.features && (
          <Card className="p-6 shadow-lg bg-white dark:bg-gray-800 border-t-4 border-purple-500">
            <div className="space-y-8">
              {featuresSection.features && featuresSection.features.map((feature, index) => (
                <div 
                  key={index} 
                  className={`p-6 border rounded-lg relative bg-gradient-to-br from-slate-800 to-slate-900 text-white shadow-lg ${deletedItems.features.includes(index) ? 'opacity-50' : ''}`}
                  style={{ 
                    borderColor: unsavedChanges.features[index]?.h2 || 
                                unsavedChanges.features[index]?.span || 
                                unsavedChanges.features[index]?.media ? 'rgb(34, 197, 94)' : 'rgb(229, 231, 235)', 
                    borderWidth: unsavedChanges.features[index]?.h2 || 
                                unsavedChanges.features[index]?.span || 
                                unsavedChanges.features[index]?.media ? '2px' : '1px',
                    borderStyle: 'solid'
                  }}
                >
                  {deletedItems.features.includes(index) && (
                    <div className="absolute inset-0 bg-red-900 bg-opacity-20 flex items-center justify-center z-10 rounded-lg">
                      <div className="bg-red-800 text-white px-4 py-2 rounded-md flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Marked for deletion
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="ml-2 text-xs border-white hover:bg-red-700"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRestoreFeature(index);
                          }}
                        >
                          Restore
                        </Button>
                      </div>
                    </div>
                  )}
                  
                  <h3 className="font-medium mb-4 flex items-center text-purple-300">
                    <span className="w-7 h-7 bg-purple-600 rounded-full inline-flex items-center justify-center mr-2 text-sm">
                      {index + 1}
                    </span>
                    Feature {index + 1}
                  </h3>
                  
                  {index >= 1 && (
                    <Button 
                      variant="destructive" 
                      size="sm" 
                      className="absolute top-2 right-2 rounded-full w-7 h-7 p-0 flex items-center justify-center bg-red-500 hover:bg-red-600" 
                      onClick={() => removeFeature(index)}
                    >
                      &times;
                    </Button>
                  )}
                  
                  <div className="space-y-6">
                    <div style={{ 
                      borderColor: unsavedChanges.features[index]?.h2 ? 'rgb(34, 197, 94)' : '', 
                      borderWidth: unsavedChanges.features[index]?.h2 ? '2px' : '',
                      borderStyle: unsavedChanges.features[index]?.h2 ? 'solid' : '',
                      padding: unsavedChanges.features[index]?.h2 ? '8px' : '',
                      borderRadius: unsavedChanges.features[index]?.h2 ? '6px' : ''
                    }}>
                      <Label htmlFor={`feature-h2-${index}`} className="text-gray-300 text-sm font-medium mb-1 block">Feature Title (H2):</Label>
                      <Input
                        id={`feature-h2-${index}`}
                        placeholder="Advanced Features"
                        value={feature.h2}
                        onChange={(e) => {
                          const newValue = e.target.value;
                          const updatedFeatures = [...featuresSection.features];
                          updatedFeatures[index].h2 = newValue;
                          setFeaturesSection({ ...featuresSection, features: updatedFeatures });
                          
                          // Check if value is different from original
                          let isChanged = true; // Default to true for new features
                          
                          if (originalData.features && 
                              originalData.features[index]) {
                            isChanged = originalData.features[index].h2 !== newValue;
                          }
                          
                          // Update unsaved changes for this specific feature
                          const updatedFeatureChanges = [...unsavedChanges.features];
                          if (updatedFeatureChanges[index]) {
                            updatedFeatureChanges[index].h2 = isChanged;
                          } else {
                            updatedFeatureChanges[index] = { h2: isChanged, span: false, media: false };
                          }
                          
                          setUnsavedChanges(prev => ({
                            ...prev,
                            features: updatedFeatureChanges
                          }));
                        }}
                        className="mt-1 bg-slate-700 border-slate-600 text-white placeholder-gray-400"
                      />
                    </div>
                    
                    <div style={{ 
                      borderColor: unsavedChanges.features[index]?.span ? 'rgb(34, 197, 94)' : '', 
                      borderWidth: unsavedChanges.features[index]?.span ? '2px' : '',
                      borderStyle: unsavedChanges.features[index]?.span ? 'solid' : '',
                      padding: unsavedChanges.features[index]?.span ? '8px' : '',
                      borderRadius: unsavedChanges.features[index]?.span ? '6px' : ''
                    }}>
                      <Label htmlFor={`feature-span-${index}`} className="text-gray-300 text-sm font-medium mb-1 block">Feature Description:</Label>
                      <Input
                        id={`feature-span-${index}`}
                        placeholder="Discover our powerful features that help you work smarter"
                        value={feature.span}
                        onChange={(e) => {
                          const newValue = e.target.value;
                          const updatedFeatures = [...featuresSection.features];
                          updatedFeatures[index].span = newValue;
                          setFeaturesSection({ ...featuresSection, features: updatedFeatures });
                          
                          // Check if value is different from original
                          let isChanged = true; // Default to true for new features
                          
                          if (originalData.features && 
                              originalData.features[index]) {
                            isChanged = originalData.features[index].span !== newValue;
                          }
                          
                          // Update unsaved changes for this specific feature
                          const updatedFeatureChanges = [...unsavedChanges.features];
                          if (updatedFeatureChanges[index]) {
                            updatedFeatureChanges[index].span = isChanged;
                          } else {
                            updatedFeatureChanges[index] = { h2: false, span: isChanged, media: false };
                          }
                          
                          setUnsavedChanges(prev => ({
                            ...prev,
                            features: updatedFeatureChanges
                          }));
                        }}
                        className="mt-1 bg-slate-700 border-slate-600 text-white placeholder-gray-400"
                      />
                    </div>
                    
                    <div style={{ 
                      borderColor: unsavedChanges.features[index]?.media ? 'rgb(34, 197, 94)' : '', 
                      borderWidth: unsavedChanges.features[index]?.media ? '2px' : '',
                      borderStyle: unsavedChanges.features[index]?.media ? 'solid' : '',
                      padding: unsavedChanges.features[index]?.media ? '8px' : '',
                      borderRadius: unsavedChanges.features[index]?.media ? '6px' : ''
                    }}>
                      <Label className="text-gray-300 text-sm font-medium mb-1 block">Feature Media:</Label>
                      <Tabs 
                        defaultValue="video" 
                        value={feature.mediaType}
                        onValueChange={(value) => {
                          const updatedFeatures = [...featuresSection.features];
                          updatedFeatures[index] = { 
                            ...updatedFeatures[index],
                            mediaType: value
                          };
                          setFeaturesSection({ ...featuresSection, features: updatedFeatures });
                          
                          // Mark media as changed if type is different from original
                          // For newly added features, originalData might not have this feature
                          let isChanged = true; // Default to true for new features
                          
                          if (originalData.features && 
                              originalData.features[index]) {
                            isChanged = originalData.features[index].mediaType !== value || 
                                       !!feature.mediaFile;
                          }
                          
                          // Update unsaved changes for this specific feature
                          const updatedFeatureChanges = [...unsavedChanges.features];
                          if (updatedFeatureChanges[index]) {
                            updatedFeatureChanges[index].media = isChanged;
                          } else {
                            updatedFeatureChanges[index] = { h2: false, span: false, media: isChanged };
                          }
                          
                          setUnsavedChanges(prev => ({
                            ...prev,
                            features: updatedFeatureChanges
                          }));
                        }} 
                        className="mt-1"
                      >
                        <TabsList className="w-full bg-slate-800 p-1">
                          <TabsTrigger value="video" className="flex-1 data-[state=active]:bg-purple-600 data-[state=active]:text-white">Video</TabsTrigger>
                          <TabsTrigger value="image" className="flex-1 data-[state=active]:bg-purple-600 data-[state=active]:text-white">Image</TabsTrigger>
                        </TabsList>
                        
                        <TabsContent value="video" className="space-y-4 mt-4">
                          <div className="bg-slate-700 p-4 rounded-lg border border-dashed border-slate-500">
                            <label 
                              className={`flex flex-col items-center justify-center w-full h-24 px-4 transition bg-slate-800 border-2 ${dragActive ? "border-purple-500" : "border-slate-600"} border-dashed rounded-md appearance-none cursor-pointer hover:border-purple-500 focus:outline-none`}
                              onDragEnter={(e) => handleDrag(e)}
                              onDragLeave={(e) => handleDrag(e)}
                              onDragOver={(e) => handleDrag(e)}
                              onDrop={(e) => handleDrop(e, 'feature', 'video', index)}
                              onClick={() => onButtonClick(featureVideoRefs.current[index])}
                            >
                              <span className="flex items-center space-x-2">
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                </svg>
                                <span className="font-medium text-gray-300">
                                  Drop video to upload or <span className="text-purple-400 underline">browse</span>
                                </span>
                              </span>
                              <Input
                                type="file"
                                accept="video/*"
                                onChange={(e) => handleFeatureMediaChange(e, index)}
                                className="hidden"
                                ref={el => featureVideoRefs.current[index] = el}
                              />
                            </label>
                            <p className="text-xs text-gray-400 mt-2 text-center">
                              Recommended: MP4 format, 16:9 ratio, max 5MB
                            </p>
                          </div>
                          {(feature.mediaFile || feature.mediaUrl) && (
                            <div className="mt-4 border border-slate-600 rounded-lg overflow-hidden">
                              <video
                                controls
                                className="max-w-full h-auto rounded-lg"
                                src={feature.mediaFile ? URL.createObjectURL(feature.mediaFile) : feature.mediaUrl}
                              />
                            </div>
                          )}
                        </TabsContent>
                        
                        <TabsContent value="image" className="space-y-4 mt-4">
                          <div className="bg-slate-700 p-4 rounded-lg border border-dashed border-slate-500">
                            <label 
                              className={`flex flex-col items-center justify-center w-full h-24 px-4 transition bg-slate-800 border-2 ${dragActive ? "border-purple-500" : "border-slate-600"} border-dashed rounded-md appearance-none cursor-pointer hover:border-purple-500 focus:outline-none`}
                              onDragEnter={(e) => handleDrag(e)}
                              onDragLeave={(e) => handleDrag(e)}
                              onDragOver={(e) => handleDrag(e)}
                              onDrop={(e) => handleDrop(e, 'feature', 'image', index)}
                              onClick={() => onButtonClick(featureImageRefs.current[index])}
                            >
                              <span className="flex items-center space-x-2">
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                <span className="font-medium text-gray-300">
                                  Drop image to upload or <span className="text-purple-400 underline">browse</span>
                                </span>
                              </span>
                              <Input
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleFeatureMediaChange(e, index)}
                                className="hidden"
                                ref={el => featureImageRefs.current[index] = el}
                              />
                            </label>
                            <p className="text-xs text-gray-400 mt-2 text-center">
                              Recommended: JPG or PNG, 800x600px, max 2MB
                            </p>
                          </div>
                          {(feature.mediaFile || feature.mediaUrl) && (
                            <div className="mt-4 border border-slate-600 rounded-lg overflow-hidden">
                              <img
                                className="max-w-full h-auto rounded-lg"
                                src={feature.mediaFile ? URL.createObjectURL(feature.mediaFile) : feature.mediaUrl}
                                alt={`Feature ${index + 1} image`}
                              />
                            </div>
                          )}
                        </TabsContent>
                      </Tabs>
                    </div>
                  </div>
                </div>
              ))}
              
              <Button 
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium flex items-center justify-center gap-2" 
                onClick={addFeature}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 3a1 1 0 00-1 1v5H4a1 1 0 100 2h5v5a1 1 0 102 0v-5h5a1 1 0 100-2h-5V4a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                Add A New Feature
              </Button>
            </div>
          </Card>
        )}
      </div>
      
      {/* Solutions Section */}
      <div className="space-y-4">
        <div 
          className="flex justify-between items-center py-3 px-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg cursor-pointer shadow-md" 
          onClick={() => toggleSection('solutions')}
        >
          <h2 className="text-xl font-bold flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            Solution Section
          </h2>
          <button className="p-1 rounded-full hover:bg-purple-700 transition-colors">
            {isCollapsed.solutions ? <FaChevronDown /> : <FaChevronUp />}
          </button>
        </div>
        
        {!isCollapsed.solutions && (
          <Card className="p-6 shadow-lg bg-white dark:bg-gray-800 border-t-4 border-blue-500">
            <div className="space-y-6">
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg" style={{ 
                  borderColor: unsavedChanges.solutionsH2 ? 'rgb(34, 197, 94)' : '', 
                  borderWidth: unsavedChanges.solutionsH2 ? '2px' : '',
                  borderStyle: unsavedChanges.solutionsH2 ? 'solid' : '',
                  padding: unsavedChanges.solutionsH2 ? '8px' : ''
                }}>
                <Label htmlFor="solution-title" className="text-gray-700 dark:text-gray-300 text-sm font-medium">Section Title (H2):</Label>
                <Input
                  id="solution-title"
                  placeholder="Our Solutions"
                  value={solutionsSection.h2}
                  onChange={(e) => {
                    const newValue = e.target.value;
                    setSolutionsSection(prev => ({ ...prev, h2: newValue }));
                    
                    // Check if value is different from original
                    let isChanged = true; // Default to true if originalData.solutions doesn't exist yet
                    
                    if (originalData.solutions) {
                      isChanged = originalData.solutions.h2 !== newValue;
                    }
                    
                    setUnsavedChanges(prev => ({
                      ...prev,
                      solutionsH2: isChanged
                    }));
                  }}
                  className="mt-1 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
                />
              </div>
              
              <div className="space-y-8 mt-6">
                {solutionsSection.cards && solutionsSection.cards.map((card, index) => (
                  <div 
                    key={index} 
                    className={`p-6 border rounded-lg relative bg-slate-800 text-white shadow-lg ${deletedItems.solutionCards.includes(index) ? 'opacity-50' : ''}`}
                    style={{ 
                      borderColor: unsavedChanges.solutionsCards[index] ? 'rgb(34, 197, 94)' : 'rgb(229, 231, 235)', 
                      borderWidth: unsavedChanges.solutionsCards[index] ? '2px' : '1px',
                      borderStyle: 'solid'
                    }}
                  >
                    {deletedItems.solutionCards.includes(index) && (
                      <div className="absolute inset-0 bg-red-900 bg-opacity-20 flex items-center justify-center z-10 rounded-lg">
                        <div className="bg-red-800 text-white px-4 py-2 rounded-md flex items-center gap-2">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Marked for deletion
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="ml-2 text-xs border-white hover:bg-red-700"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRestoreSolutionCard(index);
                            }}
                          >
                            Restore
                          </Button>
                        </div>
                      </div>
                    )}
                    
                    <h3 className="font-medium mb-4 flex items-center text-blue-300">
                      <span className="w-7 h-7 bg-blue-600 rounded-full inline-flex items-center justify-center mr-2 text-sm">
                        {index + 1}
                      </span>
                      Card {index + 1}
                    </h3>
                    
                    {index >= 1 && (
                      <Button
                        variant="destructive"
                        size="sm"
                        className="absolute top-2 right-2 rounded-full w-7 h-7 p-0 flex items-center justify-center bg-red-500 hover:bg-red-600" 
                        onClick={() => removeCard(index)}
                      >
                        &times;
                      </Button>
                    )}
                    
                    <div className="space-y-6">
                      <div style={{ 
                        borderColor: unsavedChanges.solutionsCards[index] ? 'rgb(34, 197, 94)' : '', 
                        borderWidth: unsavedChanges.solutionsCards[index] ? '2px' : '',
                        borderStyle: unsavedChanges.solutionsCards[index] ? 'solid' : '',
                        padding: unsavedChanges.solutionsCards[index] ? '8px' : '',
                        borderRadius: unsavedChanges.solutionsCards[index] ? '6px' : ''
                      }}>
                        <Label htmlFor={`card-title-${index}`} className="text-gray-300 text-sm font-medium mb-1 block">Card Title:</Label>
                        <Input
                          id={`card-title-${index}`}
                          placeholder="Workflow"
                          value={card.title}
                          onChange={(e) => {
                            const newValue = e.target.value;
                            const updatedCards = [...solutionsSection.cards];
                            updatedCards[index].title = newValue;
                            setSolutionsSection({ ...solutionsSection, cards: updatedCards });
                            
                            // Check if either title or content is different from original
                            let isChanged = true; // Default to true for new cards
                            
                            if (originalData.solutions && 
                                originalData.solutions.cards && 
                                originalData.solutions.cards[index]) {
                              isChanged = originalData.solutions.cards[index].title !== newValue || 
                                         originalData.solutions.cards[index].content !== card.content;
                            }
                            
                            // Update unsaved changes for this specific card
                            const updatedCardChanges = [...unsavedChanges.solutionsCards];
                            updatedCardChanges[index] = isChanged;
                            
                            setUnsavedChanges(prev => ({
                              ...prev,
                              solutionsCards: updatedCardChanges
                            }));
                          }}
                          className="mt-1 bg-slate-700 border-slate-600 text-white placeholder-gray-400"
                        />
                      
                        <Label htmlFor={`card-content-${index}`} className="text-gray-300 text-sm font-medium mb-1 block mt-3">Card Content:</Label>
                        <Input
                          id={`card-content-${index}`}
                          placeholder="Automate your workflows with AI"
                          value={card.content}
                          onChange={(e) => {
                            const newValue = e.target.value;
                            const updatedCards = [...solutionsSection.cards];
                            updatedCards[index].content = newValue;
                            setSolutionsSection({ ...solutionsSection, cards: updatedCards });
                            
                            // Check if either title or content is different from original
                            let isChanged = true; // Default to true for new cards
                            
                            if (originalData.solutions && 
                                originalData.solutions.cards && 
                                originalData.solutions.cards[index]) {
                              isChanged = originalData.solutions.cards[index].title !== card.title || 
                                         originalData.solutions.cards[index].content !== newValue;
                            }
                            
                            // Update unsaved changes for this specific card
                            const updatedCardChanges = [...unsavedChanges.solutionsCards];
                            updatedCardChanges[index] = isChanged;
                            
                            setUnsavedChanges(prev => ({
                              ...prev,
                              solutionsCards: updatedCardChanges
                            }));
                          }}
                          className="mt-1 bg-slate-700 border-slate-600 text-white placeholder-gray-400"
                        />
                      </div>
                    </div>
                  </div>
                ))}
                
                <Button 
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium flex items-center justify-center gap-2" 
                  onClick={addCard}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 3a1 1 0 00-1 1v5H4a1 1 0 100 2h5v5a1 1 0 102 0v-5h5a1 1 0 100-2h-5V4a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  Add A New Card
                </Button>
              </div>
            </div>
          </Card>
        )}
      </div>
      
      {/* Promo Banner Section */}
      <div className="space-y-4">
        <div 
          className="flex justify-between items-center py-3 px-4 bg-gradient-to-r from-pink-600 to-rose-600 text-white rounded-lg cursor-pointer shadow-md" 
          onClick={() => toggleSection('promoBanner')}
        >
          <h2 className="text-xl font-bold flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
            </svg>
            Promo Banner
          </h2>
          <button className="p-1 rounded-full hover:bg-rose-700 transition-colors">
            {isCollapsed.promoBanner ? <FaChevronDown /> : <FaChevronUp />}
          </button>
        </div>
        
        {!isCollapsed.promoBanner && (
          <Card className="p-6 shadow-lg bg-white dark:bg-gray-800 border-t-4 border-rose-500">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <Label htmlFor="enable-banner" className="text-lg font-medium">Enable Promo Banner</Label>
                <input
                  type="checkbox"
                  id="enable-banner"
                  checked={promoBannerSection.isEnabled}
                  onChange={(e) => {
                    const newValue = e.target.checked;
                    setPromoBannerSection(prev => ({ ...prev, isEnabled: newValue }));
                    
                    // Check if value is different from original
                    let isChanged = true; // Default to true if originalData.promoBanner doesn't exist yet
                    if (originalData.promoBanner) {
                      isChanged = originalData.promoBanner.isEnabled !== newValue ||
                                originalData.promoBanner.selectedPromoCode !== promoBannerSection.selectedPromoCode;
                    }
                    
                    setUnsavedChanges(prev => ({ ...prev, promoBanner: isChanged }));
                  }}
                  className="h-6 w-6 rounded border-gray-300 text-rose-600 focus:ring-rose-500"
                />
              </div>
              
              {promoBannerSection.isEnabled && (
                <div className="space-y-6">
                  <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                    <Label htmlFor="promo-code" className="text-gray-700 dark:text-gray-300 text-sm font-medium mb-2 block">
                      Select Active Promo Code
                    </Label>
                    <select
                      id="promo-code"
                      value={promoBannerSection.selectedPromoCode}
                      onChange={(e) => {
                        const newValue = e.target.value;
                        setPromoBannerSection(prev => ({ ...prev, selectedPromoCode: newValue }));
                        
                        // Check if value is different from original
                        let isChanged = true; // Default to true if originalData.promoBanner doesn't exist yet
                        if (originalData.promoBanner) {
                          isChanged = originalData.promoBanner.selectedPromoCode !== newValue ||
                                    originalData.promoBanner.isEnabled !== promoBannerSection.isEnabled;
                        }
                        
                        setUnsavedChanges(prev => ({ ...prev, promoBanner: isChanged }));
                      }}
                      className="w-full mt-1 rounded-md border border-gray-300 bg-white py-2 px-3 shadow-sm focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                    >
                      <option value="">Select a promo code...</option>
                      {availablePromoCodes.map(code => (
                        <option key={code.id} value={code.code}>
                          {code.code} - {code.description} ({code.discount_value}{code.discount_type === 'PERCENTAGE' ? '%' : '$'} off)
                          {code.max_uses && ` - ${code.max_uses - code.current_uses} uses remaining`}
                        </option>
                      ))}
                    </select>
                    {promoBannerSection.selectedPromoCode && (
                      <div className="mt-2">
                        {availablePromoCodes.find(code => code.code === promoBannerSection.selectedPromoCode)?.max_uses && (
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Uses remaining: {
                              availablePromoCodes.find(code => code.code === promoBannerSection.selectedPromoCode)?.max_uses -
                              availablePromoCodes.find(code => code.code === promoBannerSection.selectedPromoCode)?.current_uses
                            }
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {promoBannerSection.selectedPromoCode && (
                    <div className="mt-4 p-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
                      <h3 className="text-lg font-medium mb-3">Preview</h3>
                      <div className="p-4 rounded-md text-center bg-purple-500 text-white">
                        <div className="text-lg font-bold tracking-wide">
                          {availablePromoCodes.find(code => code.code === promoBannerSection.selectedPromoCode)?.description || 'Special offer'} 
                          {' with '}
                          <span className="font-black bg-purple-700 px-3 py-1 rounded mx-1">
                            "{promoBannerSection.selectedPromoCode}"
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </Card>
        )}
      </div>
      
      {/* Unsaved changes warning modal */}
      <Dialog open={showUnsavedModal} onOpenChange={(open) => {
        if (!open && hasUnsavedChanges) {
          // Allow closing with X button but keep track of navigateUrl
          setShowUnsavedModal(false);
        } else {
          setShowUnsavedModal(open);
        }
      }}>
        <DialogContent className="max-w-lg border-2 border-red-500 bg-gray-900 text-red-400">
          <DialogHeader className="flex flex-row items-start justify-between">
            <div className="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <DialogTitle className="text-xl text-red-400">Unsaved Changes Warning!</DialogTitle>
            </div>
            <DialogClose className="text-gray-400 hover:text-gray-200">
              <X className="h-4 w-4" />
            </DialogClose>
          </DialogHeader>
          <div className="text-gray-300 mt-2">
            <p>You have unsaved changes. If you leave this page, these changes will be <span className="text-red-400 underline">permanently lost</span>!</p>
            <p className="mt-2">Please save your changes first, or confirm that you want to discard all unsaved content.</p>
          </div>
          <div className="flex flex-col gap-4 mt-6">
            <Button 
              variant="outline" 
              onClick={handleCancelNavigation}
              className="border-gray-600 text-gray-200 hover:bg-gray-800 py-3"
            >
              Continue Editing
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleConfirmNavigation}
              className="bg-red-700 hover:bg-red-800 text-white py-3"
            >
              Discard Changes and Leave
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 