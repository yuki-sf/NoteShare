import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Download, Eye, Calendar, Clock, AlertTriangle, Copy, Image as ImageIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useParams } from 'react-router-dom';

interface SharedLink {
  id: string;
  custom_link: string;
  title: string;
  content_type: 'note' | 'file';
  note_content?: string;
  file_path?: string;
  file_name?: string;
  file_size?: number;
  view_count: number;
  max_views?: number;
  expires_at?: string;
  created_at: string;
}

export const ViewShare = () => {
  const { linkId } = useParams<{ linkId: string }>();
  const [shareData, setShareData] = useState<SharedLink | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasIncrementedView, setHasIncrementedView] = useState(false);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (linkId) {
      fetchShare();
    }
  }, [linkId]);

  const fetchShare = async () => {
    try {
      // Clean up expired shares before fetching
      await supabase.rpc('cleanup_expired_shares');
      
      const { data, error } = await supabase
        .from('shared_links')
        .select('*')
        .eq('custom_link', linkId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          setError('Share not found');
        } else {
          setError('Failed to load share');
        }
        setLoading(false);
        return;
      }

      // Check if expired
      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        setError('This share has expired');
        setLoading(false);
        return;
      }

      // Check if view limit reached
      if (data.max_views && data.view_count >= data.max_views) {
        setError('This share has reached its view limit');
        setLoading(false);
        return;
      }

      setShareData(data as SharedLink);
      
      // Increment view count only once per page load
      if (!hasIncrementedView) {
        await supabase.rpc('increment_view_count', { link_id: data.id });
        setHasIncrementedView(true);
        // Update local data to reflect the incremented view count
        setShareData(prev => prev ? { ...prev, view_count: prev.view_count + 1 } : null);
      }

      // Load file preview for image files
      if (data.content_type === 'file' && data.file_path && data.file_name?.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
        try {
          const { data: fileData, error: fileError } = await supabase.storage
            .from('shared-files')
            .download(data.file_path);
          
          if (!fileError && fileData) {
            const url = URL.createObjectURL(fileData);
            setFilePreviewUrl(url);
          }
        } catch (err) {
          console.error('Error loading file preview:', err);
        }
      }
      
      setLoading(false);
    } catch (err) {
      console.error('Error fetching share:', err);
      setError('Failed to load share');
      setLoading(false);
    }
  };

  const downloadFile = async () => {
    if (!shareData?.file_path) return;

    try {
      const { data, error } = await supabase.storage
        .from('shared-files')
        .download(shareData.file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = shareData.file_name || 'download';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error downloading file:', err);
      toast({
        title: 'Download Failed',
        description: 'Failed to download file. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({
        title: 'Copied!',
        description: `${type} copied to clipboard`,
      });
    }).catch(() => {
      toast({
        title: 'Copy Failed',
        description: 'Failed to copy to clipboard',
        variant: 'destructive',
      });
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getRemainingViews = () => {
    if (!shareData?.max_views) return null;
    return shareData.max_views - shareData.view_count;
  };

  const getTimeUntilExpiry = () => {
    if (!shareData?.expires_at) return null;
    const expiryDate = new Date(shareData.expires_at);
    const now = new Date();
    const diffTime = expiryDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 0) return 'Expired';
    if (diffDays === 1) return '1 day';
    return `${diffDays} days`;
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto p-6 animate-fade-in">
        <Card className="shadow-elegant">
          <CardContent className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto p-6 animate-fade-in">
        <Card className="shadow-elegant border-destructive/20">
          <CardContent className="text-center py-12">
            <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Oops!</h2>
            <p className="text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!shareData) return null;

  return (
    <div className="max-w-2xl mx-auto p-6 animate-fade-in">
      <Card className="shadow-elegant hover-lift">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <CardTitle className="text-2xl">{shareData.title}</CardTitle>
              <CardDescription className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Created {formatDate(shareData.created_at)}
              </CardDescription>
            </div>
            <Badge variant={shareData.content_type === 'note' ? 'default' : 'secondary'}>
              {shareData.content_type === 'note' ? (
                <><FileText className="h-3 w-3 mr-1" /> Note</>
              ) : (
                <><Download className="h-3 w-3 mr-1" /> File</>
              )}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Content */}
          {shareData.content_type === 'note' ? (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg relative">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyToClipboard(shareData.note_content || '', 'Note content')}
                  className="absolute top-2 right-2"
                >
                  <Copy className="h-3 w-3 mr-1" />
                  Copy
                </Button>
                <pre className="whitespace-pre-wrap font-sans leading-relaxed pr-16">
                  {shareData.note_content}
                </pre>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* File Preview for Images */}
              {filePreviewUrl && (
                <div className="bg-muted rounded-lg p-4">
                  <p className="text-sm text-muted-foreground mb-3 flex items-center gap-2">
                    <ImageIcon className="h-4 w-4" />
                    Preview
                  </p>
                  <img 
                    src={filePreviewUrl} 
                    alt={shareData.file_name}
                    className="max-w-full h-auto rounded-lg border max-h-96 mx-auto"
                  />
                </div>
              )}
              
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    {shareData.file_name?.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                      <ImageIcon className="h-5 w-5 text-primary" />
                    ) : (
                      <FileText className="h-5 w-5 text-primary" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium">{shareData.file_name}</p>
                    {shareData.file_size && (
                      <p className="text-sm text-muted-foreground">
                        {formatFileSize(shareData.file_size)}
                      </p>
                    )}
                  </div>
                </div>
                <Button onClick={downloadFile} className="gradient-primary text-white">
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </div>
            </div>
          )}

          {/* Stats and Info */}
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="flex items-center gap-1">
              <Eye className="h-3 w-3" />
              {shareData.view_count} views
            </Badge>
            
            {shareData.max_views && (
              <Badge variant="outline" className="flex items-center gap-1">
                <Eye className="h-3 w-3" />
                {getRemainingViews()} remaining
              </Badge>
            )}
            
            {shareData.expires_at && (
              <Badge variant="outline" className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Expires in {getTimeUntilExpiry()}
              </Badge>
            )}
          </div>

          {/* Warning messages */}
          {shareData.max_views && getRemainingViews()! <= 5 && getRemainingViews()! > 0 && (
            <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <p className="text-sm text-yellow-800 dark:text-yellow-200 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Only {getRemainingViews()} views remaining
              </p>
            </div>
          )}

          {shareData.expires_at && getTimeUntilExpiry() && getTimeUntilExpiry()!.includes('1 day') && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-800 dark:text-red-200 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                This share expires in {getTimeUntilExpiry()}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
