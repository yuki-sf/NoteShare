import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Upload, Link2, Calendar, Eye, FileText, Image, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

export const CreateShare = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [customLink, setCustomLink] = useState('');
  const [title, setTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [expirationDays, setExpirationDays] = useState<number | ''>('');
  const [maxViews, setMaxViews] = useState<number | ''>('');
  const [shareUrl, setShareUrl] = useState('');
  const { toast } = useToast();
  const navigate = useNavigate();

  const validateCustomLink = (link: string) => {
    const regex = /^[a-zA-Z0-9_-]+$/;
    return regex.test(link) && link.length >= 3 && link.length <= 50;
  };

  const checkLinkAvailability = async (link: string) => {
    const { data, error } = await supabase
      .from('shared_links')
      .select('id')
      .eq('custom_link', link)
      .single();
    
    if (error && error.code === 'PGRST116') {
      return true; // Link is available
    }
    return false; // Link is taken
  };

  const uploadFile = async (file: File, linkId: string) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${linkId}.${fileExt}`;
    const filePath = fileName;

    const { error } = await supabase.storage
      .from('shared-files')
      .upload(filePath, file);

    if (error) throw error;
    return filePath;
  };

  const handleSubmit = async (contentType: 'note' | 'file') => {
    // Generate random URL if not provided
    let finalCustomLink = customLink.trim();
    if (!finalCustomLink) {
      const { data: randomUrl, error: urlError } = await supabase.rpc('generate_random_url');
      if (urlError) {
        toast({
          title: 'Error',
          description: 'Failed to generate random URL. Please try again.',
          variant: 'destructive',
        });
        return;
      }
      finalCustomLink = randomUrl;
    } else if (!validateCustomLink(finalCustomLink)) {
      toast({
        title: 'Invalid Link',
        description: 'Link must be 3-50 characters and contain only letters, numbers, hyphens, and underscores.',
        variant: 'destructive',
      });
      return;
    }

    if (!title) {
      toast({
        title: 'Title Required',
        description: 'Please enter a title for your share.',
        variant: 'destructive',
      });
      return;
    }

    if (contentType === 'note' && !noteContent) {
      toast({
        title: 'Content Required',
        description: 'Please enter some content for your note.',
        variant: 'destructive',
      });
      return;
    }

    if (contentType === 'file' && !file) {
      toast({
        title: 'File Required',
        description: 'Please select a file to upload.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      const isAvailable = await checkLinkAvailability(finalCustomLink);
      
      if (!isAvailable) {
        toast({
          title: 'Link Taken',
          description: 'This custom link is already in use. Please choose another one.',
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }

      const expiresAt = expirationDays ? 
        new Date(Date.now() + expirationDays * 24 * 60 * 60 * 1000).toISOString() : 
        null;

      let shareData = {
        custom_link: finalCustomLink,
        title,
        content_type: contentType,
        note_content: contentType === 'note' ? noteContent : null,
        file_path: null as string | null,
        file_name: null as string | null,
        file_size: null as number | null,
        expires_at: expiresAt,
        max_views: maxViews || null,
      };

      if (contentType === 'file' && file) {
        // First insert the record to get the ID
        const { data: linkData, error: linkError } = await supabase
          .from('shared_links')
          .insert(shareData)
          .select('id')
          .single();

        if (linkError) throw linkError;

        // Upload the file with the link ID
        const filePath = await uploadFile(file, linkData.id);
        
        // Update the record with file information
        const { error: updateError } = await supabase
          .from('shared_links')
          .update({
            file_path: filePath,
            file_name: file.name,
            file_size: file.size,
          })
          .eq('id', linkData.id);

        if (updateError) throw updateError;
      } else {
        const { error } = await supabase
          .from('shared_links')
          .insert(shareData);

        if (error) throw error;
      }

      // Store the created share for user reference
      const createdShare = {
        id: finalCustomLink,
        title,
        type: contentType as 'note' | 'file',
        createdAt: new Date().toISOString(),
        customLink: finalCustomLink
      };
      
      const existingShares = JSON.parse(localStorage.getItem('userShares') || '[]');
      existingShares.push(createdShare);
      localStorage.setItem('userShares', JSON.stringify(existingShares));

      const url = `${window.location.origin}/${finalCustomLink}`;
      setShareUrl(url);

      toast({
        title: 'Share Created!',
        description: 'Your shareable link has been created successfully.',
      });

      // Reset form
      setCustomLink('');
      setTitle('');
      setNoteContent('');
      setFile(null);
      setExpirationDays('');
      setMaxViews('');

    } catch (error) {
      console.error('Error creating share:', error);
      toast({
        title: 'Error',
        description: 'Failed to create share. Please try again.',
        variant: 'destructive',
      });
    }

    setIsLoading(false);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (shareUrl) {
    return (
      <div className="max-w-2xl mx-auto p-6 animate-fade-in">
        <Card className="shadow-elegant hover-lift">
          <CardHeader className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full gradient-primary flex items-center justify-center">
              <Link2 className="h-8 w-8 text-white" />
            </div>
            <CardTitle className="text-2xl text-gradient">Share Created!</CardTitle>
            <CardDescription>Your content is now available at this link</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="p-4 bg-muted rounded-lg">
              <Label className="text-sm font-medium">Your shareable link:</Label>
              <div className="flex gap-2 mt-2">
                <Input value={shareUrl} readOnly className="font-mono" />
                <Button
                  onClick={() => {
                    navigator.clipboard.writeText(shareUrl);
                    toast({ title: 'Copied!', description: 'Link copied to clipboard' });
                  }}
                  variant="outline"
                >
                  Copy
                </Button>
              </div>
            </div>
            <Button 
              onClick={() => setShareUrl('')} 
              className="w-full"
              variant="outline"
            >
              Create Another Share
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6 animate-fade-in">
      <div className="flex items-center mb-6">
        <Button 
          variant="ghost" 
          onClick={() => navigate('/')}
          className="hover:bg-muted mr-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Home
        </Button>
      </div>
      
      <Card className="shadow-elegant">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl text-gradient">Create Share</CardTitle>
          <CardDescription>Share notes or files with custom links</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  placeholder="Give your share a title..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              
              <div>
                <Label htmlFor="customLink">Custom Link (optional)</Label>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-muted-foreground">{window.location.origin}/</span>
                  <Input
                    id="customLink"
                    placeholder="my-awesome-link (leave empty for random)"
                    value={customLink}
                    onChange={(e) => setCustomLink(e.target.value.toLowerCase())}
                    className="flex-1"
                  />
                </div>
                {customLink && !validateCustomLink(customLink) && (
                  <p className="text-sm text-destructive mt-1">
                    Link must be 3-50 characters and contain only letters, numbers, hyphens, and underscores.
                  </p>
                )}
              </div>
            </div>

            {/* Content Type */}
            <Tabs defaultValue="note" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="note" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Note
                </TabsTrigger>
                <TabsTrigger value="file" className="flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  File
                </TabsTrigger>
              </TabsList>

              <TabsContent value="note" className="space-y-4">
                <div>
                  <Label htmlFor="noteContent">Note Content</Label>
                  <Textarea
                    id="noteContent"
                    placeholder="Write your note here..."
                    value={noteContent}
                    onChange={(e) => setNoteContent(e.target.value)}
                    rows={8}
                    className="resize-none"
                  />
                </div>
                <Button
                  onClick={() => handleSubmit('note')}
                  disabled={isLoading}
                  className="w-full gradient-primary text-white"
                >
                  {isLoading ? 'Creating...' : 'Create Note Share'}
                </Button>
              </TabsContent>

              <TabsContent value="file" className="space-y-4">
                <div>
                  <Label htmlFor="file">Upload File</Label>
                  <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary transition-colors">
                    <input
                      id="file"
                      type="file"
                      onChange={(e) => setFile(e.target.files?.[0] || null)}
                      className="hidden"
                    />
                    <Label htmlFor="file" className="cursor-pointer">
                      {file ? (
                        <div className="space-y-2">
                          <div className="flex items-center justify-center gap-2">
                            {file.type.startsWith('image/') ? (
                              <Image className="h-8 w-8 text-primary" />
                            ) : (
                              <FileText className="h-8 w-8 text-primary" />
                            )}
                          </div>
                          <p className="font-medium">{file.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatFileSize(file.size)}
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                          <p className="text-muted-foreground">
                            Click to select a file or drag and drop
                          </p>
                        </div>
                      )}
                    </Label>
                  </div>
                </div>
                <Button
                  onClick={() => handleSubmit('file')}
                  disabled={isLoading}
                  className="w-full gradient-primary text-white"
                >
                  {isLoading ? 'Uploading...' : 'Create File Share'}
                </Button>
              </TabsContent>
            </Tabs>

            {/* Optional Settings */}
            <Card className="bg-muted/50">
              <CardHeader>
                <CardTitle className="text-lg">Optional Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="expiration">Expires in (days)</Label>
                    <Input
                      id="expiration"
                      type="number"
                      placeholder="Never"
                      value={expirationDays}
                      onChange={(e) => setExpirationDays(e.target.value ? parseInt(e.target.value) : '')}
                      min="1"
                      max="365"
                    />
                  </div>
                  <div>
                    <Label htmlFor="maxViews">Max views</Label>
                    <Input
                      id="maxViews"
                      type="number"
                      placeholder="Unlimited"
                      value={maxViews}
                      onChange={(e) => setMaxViews(e.target.value ? parseInt(e.target.value) : '')}
                      min="1"
                    />
                  </div>
                </div>
                
                {(expirationDays || maxViews) && (
                  <div className="flex gap-2">
                    {expirationDays && (
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Expires in {expirationDays} days
                      </Badge>
                    )}
                    {maxViews && (
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        Max {maxViews} views
                      </Badge>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
