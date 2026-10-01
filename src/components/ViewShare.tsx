import React, { useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  FileText,
  Download,
  Eye,
  Calendar,
  Clock,
  AlertTriangle,
  Copy,
  Image as ImageIcon,
  Check,
  Link2,
  ArrowLeft,
  ExternalLink,
  File,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useParams, useNavigate } from 'react-router-dom';

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
  const navigate = useNavigate();
  const { toast } = useToast();

  const [shareData, setShareData] = useState<SharedLink | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasIncrementedView, setHasIncrementedView] = useState(false);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (linkId) {
      fetchShare();
    }
  }, [linkId]);

  useEffect(() => {
    return () => {
      if (filePreviewUrl) {
        URL.revokeObjectURL(filePreviewUrl);
      }
    };
  }, [filePreviewUrl]);

  const fetchShare = async () => {
    try {
      setLoading(true);
      setError(null);

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

      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        setError('This share has expired');
        setLoading(false);
        return;
      }

      if (data.max_views && data.view_count >= data.max_views) {
        setError('This share has reached its view limit');
        setLoading(false);
        return;
      }

      setShareData(data as SharedLink);

      if (!hasIncrementedView) {
        const { error: viewError } = await supabase.rpc(
          'increment_view_count',
          {
            link_id: data.id,
          }
        );

        if (!viewError) {
          setHasIncrementedView(true);

          setShareData((prev) =>
            prev
              ? {
                  ...prev,
                  view_count: prev.view_count + 1,
                }
              : null
          );
        }
      }

      const isImage =
        data.content_type === 'file' &&
        data.file_path &&
        data.file_name?.match(
          /\.(jpg|jpeg|png|gif|webp|svg|avif)$/i
        );

      if (isImage) {
        try {
          const { data: fileData, error: fileError } =
            await supabase.storage
              .from('shared-files')
              .download(data.file_path);

          if (!fileError && fileData) {
            const url = URL.createObjectURL(fileData);
            setFilePreviewUrl(url);
          }
        } catch (previewError) {
          console.error(
            'Error loading file preview:',
            previewError
          );
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

      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 1000);

      toast({
        title: 'Download started',
        description: shareData.file_name || 'Your file is being downloaded.',
      });
    } catch (err) {
      console.error('Error downloading file:', err);

      toast({
        title: 'Download Failed',
        description: 'Failed to download file. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const copyToClipboard = async (
    text: string,
    type: string
  ) => {
    try {
      await navigator.clipboard.writeText(text);

      setCopied(true);

      toast({
        title: 'Copied!',
        description: type + ' copied to clipboard.',
      });

      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch {
      toast({
        title: 'Copy Failed',
        description: 'Failed to copy to clipboard.',
        variant: 'destructive',
      });
    }
  };

  const copyShareLink = () => {
    const url =
      window.location.origin +
      '/' +
      (shareData?.custom_link || linkId || '');

    copyToClipboard(url, 'Share link');
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return (
      parseFloat(
        (bytes / Math.pow(k, i)).toFixed(2)
      ) +
      ' ' +
      sizes[i]
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(
      'en-US',
      {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }
    );
  };

  const getRemainingViews = () => {
    if (!shareData?.max_views) return null;

    return Math.max(
      0,
      shareData.max_views - shareData.view_count
    );
  };

  const getTimeUntilExpiry = () => {
    if (!shareData?.expires_at) return null;

    const expiryDate = new Date(
      shareData.expires_at
    );

    const now = new Date();

    const diffTime =
      expiryDate.getTime() - now.getTime();

    const diffMinutes = Math.ceil(
      diffTime / (1000 * 60)
    );

    if (diffMinutes <= 0) return 'Expired';

    if (diffMinutes < 60) {
      return diffMinutes + ' min';
    }

    const diffHours = Math.ceil(
      diffMinutes / 60
    );

    if (diffHours < 24) {
      return diffHours + ' hr';
    }

    const diffDays = Math.ceil(
      diffHours / 24
    );

    if (diffDays === 1) {
      return '1 day';
    }

    return diffDays + ' days';
  };

  const isImageFile =
    shareData?.file_name?.match(
      /\.(jpg|jpeg|png|gif|webp|svg|avif)$/i
    );

  const isPdfFile =
    shareData?.file_name?.match(/\.pdf$/i);

  const isCodeFile =
    shareData?.file_name?.match(
      /\.(js|jsx|ts|tsx|py|java|c|cpp|cs|html|css|json|xml|sql|md|txt|sh|yml|yaml)$/i
    );

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="border-b border-border">
          <div className="mx-auto flex min-h-14 w-full max-w-5xl items-center justify-between px-4 sm:px-6">
            <div className="h-4 w-24 animate-pulse bg-muted" />
  
            <div className="h-8 w-20 animate-pulse bg-muted" />
          </div>
        </header>
  
        <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
          {/* Share header skeleton */}
          <div className="mb-6 border-b border-border pb-6 sm:mb-8 sm:pb-8">
            <div className="mb-4 h-5 w-16 animate-pulse bg-muted" />
  
            <div className="h-8 w-3/4 max-w-xl animate-pulse bg-muted sm:h-9" />
  
            <div className="mt-4 flex flex-wrap gap-4">
              <div className="h-3 w-32 animate-pulse bg-muted" />
              <div className="h-3 w-20 animate-pulse bg-muted" />
            </div>
          </div>
  
          {/* Content skeleton */}
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_240px]">
            <section className="min-w-0">
              <div className="border border-border bg-card">
                {/* Toolbar */}
                <div className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-5">
                  <div className="h-4 w-24 animate-pulse bg-muted" />
                  <div className="h-8 w-16 animate-pulse bg-muted" />
                </div>
  
                {/* Note body */}
                <div className="space-y-3 px-4 py-6 sm:px-6 sm:py-8">
                  <div className="h-4 w-full animate-pulse bg-muted" />
                  <div className="h-4 w-[94%] animate-pulse bg-muted" />
                  <div className="h-4 w-[88%] animate-pulse bg-muted" />
  
                  <div className="h-4 w-[96%] animate-pulse bg-muted" />
                  <div className="h-4 w-[72%] animate-pulse bg-muted" />
  
                  <div className="h-4 w-[91%] animate-pulse bg-muted" />
                  <div className="h-4 w-[84%] animate-pulse bg-muted" />
                </div>
              </div>
            </section>
  
            {/* Details skeleton */}
            <aside>
              <div className="border border-border bg-card">
                <div className="border-b border-border px-4 py-3">
                  <div className="h-4 w-24 animate-pulse bg-muted" />
                </div>
  
                <div className="divide-y divide-border">
                  <div className="space-y-2 px-4 py-4">
                    <div className="h-3 w-14 animate-pulse bg-muted" />
                    <div className="h-4 w-28 animate-pulse bg-muted" />
                  </div>
  
                  <div className="space-y-2 px-4 py-4">
                    <div className="h-3 w-12 animate-pulse bg-muted" />
                    <div className="h-4 w-20 animate-pulse bg-muted" />
                  </div>
  
                  <div className="space-y-2 px-4 py-4">
                    <div className="h-3 w-20 animate-pulse bg-muted" />
                    <div className="h-4 w-24 animate-pulse bg-muted" />
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto flex min-h-[70vh] w-full max-w-xl items-center justify-center">
          <Card className="w-full border-destructive/20 shadow-sm">
            <CardContent className="px-5 py-12 text-center sm:px-8">
              <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center border border-destructive/20 bg-destructive/5">
                <AlertTriangle className="h-6 w-6 text-destructive" />
              </div>

              <h2 className="text-xl font-semibold tracking-tight">
                {error === 'Share not found'
                  ? 'Share not found'
                  : 'This share is unavailable'}
              </h2>

              <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
                {error}
              </p>

              <Button
                variant="outline"
                className="mt-6"
                onClick={() => navigate('/')}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to NoteShare
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!shareData) return null;

  const remainingViews = getRemainingViews();
  const expiryText = getTimeUntilExpiry();

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="border-b border-border">
        <div className="mx-auto flex min-h-14 w-full max-w-5xl items-center justify-between gap-3 px-4 sm:px-6">
          <button
            onClick={() => navigate('/')}
            className="flex min-w-0 items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4 shrink-0" />
            <span className="truncate">
              NoteShare
            </span>
          </button>

          <Button
            variant="ghost"
            size="sm"
            onClick={copyShareLink}
            className="shrink-0"
          >
            {copied ? (
              <Check className="mr-2 h-4 w-4" />
            ) : (
              <Link2 className="mr-2 h-4 w-4" />
            )}
            <span className="hidden sm:inline">
              {copied ? 'Copied' : 'Copy link'}
            </span>
            <span className="sm:hidden">
              {copied ? 'Copied' : 'Copy'}
            </span>
          </Button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
        {/* Header */}
        <div className="mb-6 border-b border-border pb-6 sm:mb-8 sm:pb-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <Badge
                  variant="outline"
                  className="rounded-none"
                >
                  {shareData.content_type === 'note' ? (
                    <>
                      <FileText className="mr-1.5 h-3 w-3" />
                      Note
                    </>
                  ) : (
                    <>
                      <File className="mr-1.5 h-3 w-3" />
                      File
                    </>
                  )}
                </Badge>

                {isImageFile && (
                  <Badge
                    variant="outline"
                    className="rounded-none"
                  >
                    <ImageIcon className="mr-1.5 h-3 w-3" />
                    Image
                  </Badge>
                )}
              </div>

              <h1 className="break-words text-2xl font-semibold tracking-tight sm:text-3xl">
                {shareData.title}
              </h1>

              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground sm:text-sm">
                <span className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  {formatDate(shareData.created_at)}
                </span>

                <span className="flex items-center gap-1.5">
                  <Eye className="h-3.5 w-3.5" />
                  {shareData.view_count} views
                </span>
              </div>
            </div>

            <Button
              variant="outline"
              onClick={copyShareLink}
              className="w-full shrink-0 sm:w-auto"
            >
              {copied ? (
                <Check className="mr-2 h-4 w-4" />
              ) : (
                <Copy className="mr-2 h-4 w-4" />
              )}
              {copied ? 'Copied' : 'Share link'}
            </Button>
          </div>
        </div>

        {/* Main content */}
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_240px] lg:items-start">
          <section className="min-w-0">
            {shareData.content_type === 'note' ? (
              <div className="border border-border bg-card">
                {/* Note toolbar */}
                <div className="flex flex-col gap-3 border-b border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    Note content
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      copyToClipboard(
                        shareData.note_content || '',
                        'Note content'
                      )
                    }
                    className="w-full sm:w-auto"
                  >
                    {copied ? (
                      <Check className="mr-2 h-3.5 w-3.5" />
                    ) : (
                      <Copy className="mr-2 h-3.5 w-3.5" />
                    )}
                    {copied ? 'Copied' : 'Copy'}
                  </Button>
                </div>

                {/* Note body */}
                <div className="overflow-x-auto">
                  <div
                    className={
                      'min-w-0 whitespace-pre-wrap break-words px-4 py-5 text-[15px] leading-7 sm:px-6 sm:py-7 sm:text-base ' +
                      (isCodeFile
                        ? 'font-mono text-sm leading-6'
                        : 'font-sans')
                    }
                  >
                    {shareData.note_content}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Image preview */}
                {filePreviewUrl && (
                  <div className="border border-border bg-card">
                    <div className="flex items-center justify-between border-b border-border px-4 py-3">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <ImageIcon className="h-4 w-4 text-muted-foreground" />
                        Preview
                      </div>

                      <span className="text-xs text-muted-foreground">
                        {shareData.file_name}
                      </span>
                    </div>

                    <div className="flex min-h-[220px] items-center justify-center overflow-hidden bg-muted/30 p-3 sm:min-h-[360px] sm:p-6">
                      <img
                        src={filePreviewUrl}
                        alt={shareData.file_name || 'Shared image'}
                        className="max-h-[70vh] max-w-full object-contain"
                      />
                    </div>
                  </div>
                )}

                {/* File card */}
                <div className="border border-border bg-card">
                  <div className="flex flex-col gap-5 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center border border-border bg-muted">
                        {isImageFile ? (
                          <ImageIcon className="h-5 w-5 text-primary" />
                        ) : (
                          <FileText className="h-5 w-5 text-primary" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <p className="break-all text-sm font-medium sm:text-base">
                          {shareData.file_name || 'Shared file'}
                        </p>

                        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                          {shareData.file_size && (
                            <span>
                              {formatFileSize(
                                shareData.file_size
                              )}
                            </span>
                          )}

                          {shareData.file_size &&
                            shareData.file_name && (
                              <span>•</span>
                            )}

                          {isPdfFile && (
                            <span>PDF document</span>
                          )}

                          {isImageFile && (
                            <span>Image</span>
                          )}

                          {!isPdfFile &&
                            !isImageFile && (
                              <span>File</span>
                            )}
                        </div>
                      </div>
                    </div>

                    <Button
                      onClick={downloadFile}
                      className="w-full shrink-0 sm:w-auto"
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Download
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* Information panel */}
          <aside className="space-y-3">
            <div className="border border-border bg-card">
              <div className="border-b border-border px-4 py-3">
                <p className="text-sm font-medium">
                  Share details
                </p>
              </div>

              <div className="divide-y divide-border">
                <div className="px-4 py-3">
                  <p className="text-xs text-muted-foreground">
                    Created
                  </p>
                  <p className="mt-1 text-sm">
                    {formatDate(
                      shareData.created_at
                    )}
                  </p>
                </div>

                <div className="px-4 py-3">
                  <p className="text-xs text-muted-foreground">
                    Views
                  </p>
                  <p className="mt-1 text-sm">
                    {shareData.view_count}
                    {shareData.max_views
                      ? ' / ' + shareData.max_views
                      : ''}
                  </p>
                </div>

                {remainingViews !== null && (
                  <div className="px-4 py-3">
                    <p className="text-xs text-muted-foreground">
                      Remaining views
                    </p>
                    <p className="mt-1 text-sm">
                      {remainingViews}
                    </p>
                  </div>
                )}

                {expiryText && (
                  <div className="px-4 py-3">
                    <p className="text-xs text-muted-foreground">
                      Expires
                    </p>
                    <p className="mt-1 flex items-center gap-1.5 text-sm">
                      <Calendar className="h-3.5 w-3.5" />
                      {expiryText}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Mobile-friendly action */}
            {shareData.content_type === 'file' && (
              <Button
                variant="outline"
                onClick={downloadFile}
                className="w-full lg:hidden"
              >
                <Download className="mr-2 h-4 w-4" />
                Download file
              </Button>
            )}
          </aside>
        </div>

        {/* Warnings */}
        <div className="mt-6 space-y-3">
          {remainingViews !== null &&
            remainingViews <= 5 &&
            remainingViews > 0 && (
              <div className="flex items-start gap-3 border border-yellow-200 bg-yellow-50 px-4 py-3 dark:border-yellow-900 dark:bg-yellow-950/30">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-yellow-700 dark:text-yellow-400" />

                <div>
                  <p className="text-sm font-medium text-yellow-900 dark:text-yellow-300">
                    Limited views remaining
                  </p>

                  <p className="mt-0.5 text-xs text-yellow-800 dark:text-yellow-400">
                    This share can be viewed {remainingViews}{' '}
                    more{' '}
                    {remainingViews === 1
                      ? 'time'
                      : 'times'}.
                  </p>
                </div>
              </div>
            )}

          {expiryText &&
            (expiryText === '1 day' ||
              expiryText === '1 hr' ||
              expiryText.includes('min')) && (
              <div className="flex items-start gap-3 border border-red-200 bg-red-50 px-4 py-3 dark:border-red-900 dark:bg-red-950/30">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-700 dark:text-red-400" />

                <div>
                  <p className="text-sm font-medium text-red-900 dark:text-red-300">
                    This share expires soon
                  </p>

                  <p className="mt-0.5 text-xs text-red-800 dark:text-red-400">
                    It will expire in {expiryText}.
                  </p>
                </div>
              </div>
            )}
        </div>

        {/* Footer */}
        <footer className="mt-10 border-t border-border pt-5 pb-8 text-center">
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            Shared with NoteShare
            <ExternalLink className="h-3 w-3" />
          </button>
        </footer>
      </main>
    </div>
  );
};
