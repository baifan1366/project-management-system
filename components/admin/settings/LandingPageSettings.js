'use client';

import { useState, useEffect } from 'react';
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
// import { useToast } from "@/hooks/use-toast";
import { supabase } from '@/lib/supabase';
import { FaChevronDown, FaChevronUp } from 'react-icons/fa';

export default function LandingPageSettings() {
  // const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [sections, setSections] = useState([]);
  const [featuresCount, setFeaturesCount] = useState(1);
  const [cardsCount, setCardsCount] = useState(1);
  const [isCollapsed, setIsCollapsed] = useState({
    hero: false,
    features: false,
    solutions: false
  });

  // Format states for each section
  const [heroSection, setHeroSection] = useState({
    h1: '',
    mediaType: 'video',
    mediaFile: null,
    mediaUrl: null
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

  useEffect(() => {
    fetchSections();
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
      // toast({
      //   title: "Error",
      //   description: "Failed to load landing page settings",
      //   variant: "destructive"
      // });
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
    } catch (error) {
      console.error('Error initializing landing page sections:', error);
      // toast({
      //   title: "Error",
      //   description: "Failed to initialize landing page sections",
      //   variant: "destructive"
      // });
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
      
      setHeroSection({
        h1: h1Content?.content || '',
        mediaType: mediaContent?.type || 'video',
        mediaUrl: mediaContent?.content || null,
        mediaFile: null
      });
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
      
      setSolutionsSection({
        h2: h2Content?.content || '',
        cards
      });
      
      setCardsCount(cards.length);
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
      // toast({
      //   title: "Error",
      //   description: "Failed to upload media file",
      //   variant: "destructive"
      // });
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
    setFeaturesCount(prev => prev + 1);
  };

  const removeFeature = (index) => {
    setFeaturesSection(prev => ({
      ...prev,
      features: prev.features.filter((_, i) => i !== index)
    }));
    setFeaturesCount(prev => prev - 1);
  };

  const addCard = () => {
    setSolutionsSection(prev => ({
      ...prev,
      cards: [
        ...prev.cards,
        { title: '', content: '' }
      ]
    }));
    setCardsCount(prev => prev + 1);
  };

  const removeCard = (index) => {
    setSolutionsSection(prev => ({
      ...prev,
      cards: prev.cards.filter((_, i) => i !== index)
    }));
    setCardsCount(prev => prev - 1);
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      
      // Check if sections exist
      if (!sections || sections.length < 3) {
        await initializeSections();
        // toast({
        //   title: "Info",
        //   description: "Landing page sections initialized",
        // });
        return;
      }
      
      // Find section IDs
      const heroSectionData = sections.find(s => s.name === 'hero');
      const featuresSectionData = sections.find(s => s.name === 'features');
      const solutionsSectionData = sections.find(s => s.name === 'solutions');
      
      if (!heroSectionData || !featuresSectionData || !solutionsSectionData) {
        throw new Error('Required sections not found');
      }
      
      // First, delete all existing content
      const { error: deleteError } = await supabase
        .from('landing_page_content')
        .delete()
        .in('section_id', [heroSectionData.id, featuresSectionData.id, solutionsSectionData.id]);
        
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
        for (let i = 0; i < featuresSection.features.length; i++) {
          const feature = featuresSection.features[i];
          
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
        for (let i = 0; i < solutionsSection.cards.length; i++) {
          const card = solutionsSection.cards[i];
          
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
      
      // Insert all content
      const allContents = [...heroContents, ...featureContents, ...solutionContents];
      
      if (allContents.length > 0) {
        const { error: insertError } = await supabase
          .from('landing_page_content')
          .insert(allContents);
          
        if (insertError) throw insertError;
      }
      
      // toast({
      //   title: "Success",
      //   description: "Landing page settings saved successfully"
      // });
      fetchSections(); // Refresh data
      
    } catch (error) {
      console.error('Error saving landing page settings:', error);
      // toast({
      //   title: "Error",
      //   description: "Failed to save landing page settings",
      //   variant: "destructive"
      // });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-10">
      <div className="pb-4 mb-4 border-b">
        <h1 className="text-2xl font-bold mb-2">System Configuration</h1>
        <p className="text-gray-500">Manage your system's core settings and appearance</p>
      </div>
      
      {/* Hero Section */}
      <div className="space-y-4">
        <div 
          className="flex justify-between items-center py-2 border-b cursor-pointer" 
          onClick={() => toggleSection('hero')}
        >
          <h2 className="text-2xl font-bold">Hero Section</h2>
          <button className="p-1 rounded-full hover:bg-gray-100">
            {isCollapsed.hero ? <FaChevronDown /> : <FaChevronUp />}
          </button>
        </div>
        
        {!isCollapsed.hero && (
          <Card className="p-6 shadow-md">
            <div className="space-y-6">
              <div>
                <Label htmlFor="hero-title">H1:</Label>
                <Input
                  id="hero-title"
                  placeholder="Enter your text here..."
                  value={heroSection.h1}
                  onChange={(e) => setHeroSection(prev => ({ ...prev, h1: e.target.value }))}
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label>Media File:</Label>
                <Tabs defaultValue="video" value={heroSection.mediaType} className="mt-1">
                  <TabsList>
                    <TabsTrigger value="video">Video</TabsTrigger>
                    <TabsTrigger value="image">Images</TabsTrigger>
                  </TabsList>

                  <TabsContent value="video" className="space-y-4 mt-2">
                    <Input
                      type="file"
                      accept="video/*"
                      onChange={handleHeroMediaChange}
                    />
                    {(heroSection.mediaFile || heroSection.mediaUrl) && (
                      <div className="mt-4">
                        <video
                          controls
                          className="max-w-full h-auto rounded-lg"
                          src={heroSection.mediaFile ? URL.createObjectURL(heroSection.mediaFile) : heroSection.mediaUrl}
                        />
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="image" className="space-y-4 mt-2">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handleHeroMediaChange}
                    />
                    {(heroSection.mediaFile || heroSection.mediaUrl) && (
                      <div className="mt-4">
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
          className="flex justify-between items-center py-2 border-b cursor-pointer" 
          onClick={() => toggleSection('features')}
        >
          <h2 className="text-2xl font-bold">Features Section</h2>
          <button className="p-1 rounded-full hover:bg-gray-100">
            {isCollapsed.features ? <FaChevronDown /> : <FaChevronUp />}
          </button>
        </div>
        
        {!isCollapsed.features && (
          <Card className="p-6 shadow-md">
            <div className="space-y-8">
              {featuresSection.features && featuresSection.features.map((feature, index) => (
                <div key={index} className="p-6 border rounded-lg relative bg-gray-50">
                  <h3 className="font-medium mb-4">Feature {index + 1}:</h3>
                  
                  {index >= 1 && (
                    <Button 
                      variant="destructive" 
                      size="sm" 
                      className="absolute top-2 right-2" 
                      onClick={() => removeFeature(index)}
                    >
                      &times;
                    </Button>
                  )}
                  
                  <div className="space-y-6">
                    <div>
                      <Label htmlFor={`feature-h2-${index}`}>H2:</Label>
                      <Input
                        id={`feature-h2-${index}`}
                        placeholder="Advanced Features"
                        value={feature.h2}
                        onChange={(e) => {
                          const updatedFeatures = [...featuresSection.features];
                          updatedFeatures[index].h2 = e.target.value;
                          setFeaturesSection({ ...featuresSection, features: updatedFeatures });
                        }}
                        className="mt-1"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor={`feature-span-${index}`}>Span:</Label>
                      <Input
                        id={`feature-span-${index}`}
                        placeholder="Discover our powerful features that help you work smarter"
                        value={feature.span}
                        onChange={(e) => {
                          const updatedFeatures = [...featuresSection.features];
                          updatedFeatures[index].span = e.target.value;
                          setFeaturesSection({ ...featuresSection, features: updatedFeatures });
                        }}
                        className="mt-1"
                      />
                    </div>
                    
                    <div>
                      <Label>Media File:</Label>
                      <Tabs defaultValue="video" value={feature.mediaType} className="mt-1">
                        <TabsList>
                          <TabsTrigger value="video">Video</TabsTrigger>
                          <TabsTrigger value="image">Images</TabsTrigger>
                        </TabsList>
                        
                        <TabsContent value="video" className="space-y-4 mt-2">
                          <Input
                            type="file"
                            accept="video/*"
                            onChange={(e) => handleFeatureMediaChange(e, index)}
                          />
                          {(feature.mediaFile || feature.mediaUrl) && (
                            <div className="mt-4">
                              <video
                                controls
                                className="max-w-full h-auto rounded-lg"
                                src={feature.mediaFile ? URL.createObjectURL(feature.mediaFile) : feature.mediaUrl}
                              />
                            </div>
                          )}
                        </TabsContent>
                        
                        <TabsContent value="image" className="space-y-4 mt-2">
                          <Input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleFeatureMediaChange(e, index)}
                          />
                          {(feature.mediaFile || feature.mediaUrl) && (
                            <div className="mt-4">
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
                className="w-full py-4 bg-primary text-white hover:bg-primary/90" 
                onClick={addFeature}
              >
                Add A New Feature
              </Button>
            </div>
          </Card>
        )}
      </div>
      
      {/* Solutions Section */}
      <div className="space-y-4">
        <div 
          className="flex justify-between items-center py-2 border-b cursor-pointer" 
          onClick={() => toggleSection('solutions')}
        >
          <h2 className="text-2xl font-bold">Solution Section</h2>
          <button className="p-1 rounded-full hover:bg-gray-100">
            {isCollapsed.solutions ? <FaChevronDown /> : <FaChevronUp />}
          </button>
        </div>
        
        {!isCollapsed.solutions && (
          <Card className="p-6 shadow-md">
            <div className="space-y-6">
              <div>
                <Label htmlFor="solution-title">H2:</Label>
                <Input
                  id="solution-title"
                  placeholder="Our Solutions"
                  value={solutionsSection.h2}
                  onChange={(e) => setSolutionsSection(prev => ({ ...prev, h2: e.target.value }))}
                  className="mt-1"
                />
              </div>
              
              <div className="space-y-8 mt-6">
                {solutionsSection.cards && solutionsSection.cards.map((card, index) => (
                  <div key={index} className="p-6 border rounded-lg relative bg-gray-50">
                    <h3 className="font-medium mb-4">Card {index + 1}:</h3>
                    
                    {index >= 1 && (
                      <Button
                        variant="destructive"
                        size="sm"
                        className="absolute top-2 right-2" 
                        onClick={() => removeCard(index)}
                      >
                        &times;
                      </Button>
                    )}
                    
                    <div className="space-y-6">
                      <div>
                        <Label htmlFor={`card-title-${index}`}>Card Title:</Label>
                        <Input
                          id={`card-title-${index}`}
                          placeholder="Workflow"
                          value={card.title}
                          onChange={(e) => {
                            const updatedCards = [...solutionsSection.cards];
                            updatedCards[index].title = e.target.value;
                            setSolutionsSection({ ...solutionsSection, cards: updatedCards });
                          }}
                          className="mt-1"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor={`card-content-${index}`}>Card Content:</Label>
                        <Input
                          id={`card-content-${index}`}
                          placeholder="Automate your workflows with AI"
                          value={card.content}
                          onChange={(e) => {
                            const updatedCards = [...solutionsSection.cards];
                            updatedCards[index].content = e.target.value;
                            setSolutionsSection({ ...solutionsSection, cards: updatedCards });
                          }}
                          className="mt-1"
                        />
                      </div>
                    </div>
                  </div>
                ))}
                
                <Button 
                  className="w-full py-4 bg-primary text-white hover:bg-primary/90" 
                  onClick={addCard}
                >
                  Add A New Card
                </Button>
              </div>
            </div>
          </Card>
        )}
      </div>
      
      <Button 
        className="w-full py-6 bg-primary text-white hover:bg-primary/90 text-lg font-medium" 
        disabled={loading}
        onClick={handleSave}
      >
        {loading ? 'Saving...' : 'Save Changes'}
      </Button>
    </div>
  );
} 