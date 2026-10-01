import React, { useState } from 'react';
import {
  ArrowLeft,
  ArrowUpRight,
  Calendar,
  Check,
  Copy,
  Eye,
  FileText,
  Image,
  Link2,
  Shield,
  Upload,
  X,
} from 'lucide-react';
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
  const [contentType, setContentType] = useState<'note' | 'file'>('note');

  const { toast } = useToast();
  const navigate = useNavigate();

  const isPortfolioEmbed = () => {
    const params = new URLSearchParams(window.location.search);
    return params.get('source') === 'yukisf';
  };
  
  const getShareUrl = (customLink: string) => {
    if (isPortfolioEmbed()) {
      return (
        'https://yukisf.me/note-share/' +
        customLink
      );
    }
  
    return (
      window.location.origin +
      '/' +
      customLink
    );
  };

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
      return true;
    }

    return false;
  };

  const uploadFile = async (file: File, linkId: string) => {
    const fileExt = file.name.split('.').pop();
    const fileName = linkId + '.' + fileExt;
    const filePath = fileName;

    const { error } = await supabase.storage
      .from('shared-files')
      .upload(filePath, file);

    if (error) throw error;

    return filePath;
  };

  const handleSubmit = async (type: 'note' | 'file') => {
    let finalCustomLink = customLink.trim();

    if (!finalCustomLink) {
      const { data: randomUrl, error: urlError } =
        await supabase.rpc('generate_random_url');

      if (urlError) {
        toast({
          title: 'Could not create link',
          description: 'Please try again.',
          variant: 'destructive',
        });
        return;
      }

      finalCustomLink = randomUrl;
    } else if (!validateCustomLink(finalCustomLink)) {
      toast({
        title: 'Invalid link',
        description:
          'Use 3–50 characters: letters, numbers, hyphens or underscores.',
        variant: 'destructive',
      });
      return;
    }

    if (!title.trim()) {
      toast({
        title: 'Title required',
        description: 'Give your share a title before creating it.',
        variant: 'destructive',
      });
      return;
    }

    if (type === 'note' && !noteContent.trim()) {
      toast({
        title: 'Your note is empty',
        description: 'Add some content before creating the share.',
        variant: 'destructive',
      });
      return;
    }

    if (type === 'file' && !file) {
      toast({
        title: 'No file selected',
        description: 'Choose a file before creating the share.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      const isAvailable = await checkLinkAvailability(finalCustomLink);

      if (!isAvailable) {
        toast({
          title: 'Link already exists',
          description:
            'That URL is already being used. Try a different one.',
          variant: 'destructive',
        });

        setIsLoading(false);
        return;
      }

      const expiresAt = expirationDays
        ? new Date(
            Date.now() + expirationDays * 24 * 60 * 60 * 1000
          ).toISOString()
        : null;

      const shareData = {
        custom_link: finalCustomLink,
        title: title.trim(),
        content_type: type,
        note_content: type === 'note' ? noteContent : null,
        file_path: null as string | null,
        file_name: null as string | null,
        file_size: null as number | null,
        expires_at: expiresAt,
        max_views: maxViews || null,
      };

      if (type === 'file' && file) {
        const { data: linkData, error: linkError } = await supabase
          .from('shared_links')
          .insert(shareData)
          .select('id')
          .single();

        if (linkError) throw linkError;

        const filePath = await uploadFile(file, linkData.id);

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

      const createdShare = {
        id: finalCustomLink,
        title: title.trim(),
        type,
        createdAt: new Date().toISOString(),
        customLink: finalCustomLink,
      };

      const existingShares = JSON.parse(
        localStorage.getItem('userShares') || '[]'
      );

      existingShares.push(createdShare);

      localStorage.setItem(
        'userShares',
        JSON.stringify(existingShares)
      );

      const url = getShareUrl(finalCustomLink);
      
      setShareUrl(url);

      toast({
        title: 'Share created',
        description: 'Your link is ready.',
      });

      setCustomLink('');
      setTitle('');
      setNoteContent('');
      setFile(null);
      setExpirationDays('');
      setMaxViews('');
    } catch (error) {
      console.error('Error creating share:', error);

      toast({
        title: 'Something went wrong',
        description: 'The share could not be created. Please try again.',
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

    return (
      parseFloat((bytes / Math.pow(k, i)).toFixed(2)) +
      ' ' +
      sizes[i]
    );
  };

  const clearFile = () => {
    setFile(null);

    const input = document.getElementById(
      'file'
    ) as HTMLInputElement | null;

    if (input) input.value = '';
  };

  /* ---------------------------------------------------------
     SUCCESS
  --------------------------------------------------------- */

  if (shareUrl) {
    return (
      <main className="min-h-screen bg-background">
        <div className="mx-auto max-w-3xl px-5 py-10 sm:px-8 lg:py-16">

          <button
            onClick={() => navigate('/')}
            className="mb-12 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back home
          </button>

          <div className="border border-border">
            <div className="border-b bg-muted/20 px-6 py-5 sm:px-8">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center bg-primary text-primary-foreground">
                  <Check className="h-4 w-4" />
                </div>

                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                    Share created
                  </p>

                  <h1 className="mt-1 text-lg font-semibold">
                    Your link is ready
                  </h1>
                </div>
              </div>
            </div>

            <div className="space-y-8 p-6 sm:p-8">

              <div>
                <p className="mb-2 text-xs uppercase tracking-[0.14em] text-muted-foreground">
                  Share URL
                </p>

                <div className="flex flex-col gap-2 sm:flex-row">
                  <div className="flex min-w-0 flex-1 items-center border bg-muted/20 px-4">
                    <span className="truncate font-mono text-sm">
                      {shareUrl}
                    </span>
                  </div>

                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(shareUrl);

                      toast({
                        title: 'Copied',
                        description: 'Link copied to clipboard.',
                      });
                    }}
                    className="inline-flex h-11 items-center justify-center gap-2 bg-primary px-5 text-sm font-medium text-primary-foreground"
                  >
                    <Copy className="h-4 w-4" />
                    Copy link
                  </button>
                </div>
              </div>

              <div className="grid gap-px border border-border bg-border sm:grid-cols-3">
                <div className="bg-background p-4">
                  <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                    Status
                  </p>

                  <p className="mt-1 text-sm font-medium">
                    Active
                  </p>
                </div>

                <div className="bg-background p-4">
                  <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                    Address
                  </p>

                  <p className="mt-1 truncate font-mono text-sm">
                    /{shareUrl.split('/').pop()}
                  </p>
                </div>

                <div className="bg-background p-4">
                  <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                    Access
                  </p>

                  <p className="mt-1 text-sm font-medium">
                    Public link
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-3 border-t pt-6 sm:flex-row">
                <button
                  onClick={() => window.open(shareUrl, '_blank')}
                  className="inline-flex h-11 flex-1 items-center justify-center gap-2 border border-border text-sm font-medium transition-colors hover:bg-muted"
                >
                  Open share
                  <ArrowUpRight className="h-4 w-4" />
                </button>

                <button
                  onClick={() => setShareUrl('')}
                  className="inline-flex h-11 flex-1 items-center justify-center bg-primary text-sm font-medium text-primary-foreground"
                >
                  Create another
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  /* ---------------------------------------------------------
     CREATE PAGE
  --------------------------------------------------------- */

  return (
    <main className="min-h-screen bg-background">

      {/* Header */}
      <header className="border-b">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8 lg:px-10">
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Home
          </button>

          <div className="text-sm font-semibold tracking-tight">
            Create share
          </div>

          <div className="w-[58px]" />
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8 lg:py-16 lg:px-10">

        {/* Intro */}
        <div className="mb-12 max-w-2xl">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            New share
          </p>

          <h1 className="mt-3 text-4xl font-semibold tracking-[-0.035em] sm:text-5xl">
            Create something
            <br className="hidden sm:block" />
            worth sharing.
          </h1>

          <p className="mt-4 max-w-xl text-base leading-7 text-muted-foreground">
            Add your content, choose how the link behaves, and send it
            wherever it needs to go.
          </p>
        </div>

        {/* Main layout */}
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-16">

          {/* Main form */}
          <div className="min-w-0">

            {/* Basic information */}
            <section className="border-t">
              <div className="grid gap-6 border-b py-8 sm:grid-cols-[180px_1fr]">
                <div>
                  <p className="text-sm font-medium">
                    Basic information
                  </p>

                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    Give your share an identity.
                  </p>
                </div>

                <div className="space-y-5">

                  {/* Title */}
                  <div>
                    <label
                      htmlFor="title"
                      className="mb-2 block text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground"
                    >
                      Title
                    </label>

                    <input
                      id="title"
                      placeholder="e.g. Project notes"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="h-12 w-full border border-border bg-background px-4 text-sm outline-none transition-colors placeholder:text-muted-foreground/50 focus:border-foreground"
                    />
                  </div>

                  {/* Custom URL */}
                  <div>
                    <label
                      htmlFor="customLink"
                      className="mb-2 block text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground"
                    >
                      Custom URL
                    </label>

                    <div className="flex h-12 items-center border border-border bg-background">
                      <span className="hidden px-3 text-xs text-muted-foreground sm:block">
                        {isPortfolioEmbed()
                          ? 'https://yukisf.me/note-share'
                          : window.location.hostname + '/my-note'}/
                      </span>

                      <input
                        id="customLink"
                        placeholder="my-project"
                        value={customLink}
                        onChange={(e) =>
                          setCustomLink(e.target.value.toLowerCase())
                        }
                        className="min-w-0 flex-1 bg-transparent px-4 text-sm outline-none placeholder:text-muted-foreground/50 sm:px-1"
                      />
                    </div>

                    <div className="mt-2 flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">
                        Leave empty to generate one automatically.
                      </p>

                      {customLink && (
                        <span
                          className={
                            validateCustomLink(customLink)
                              ? 'text-xs text-foreground'
                              : 'text-xs text-destructive'
                          }
                        >
                          {validateCustomLink(customLink)
                            ? 'Looks good'
                            : 'Invalid format'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Content */}
            <section className="border-b">
              <div className="grid gap-6 py-8 sm:grid-cols-[180px_1fr]">
                <div>
                  <p className="text-sm font-medium">
                    Content
                  </p>

                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    Choose what people will receive.
                  </p>
                </div>

                <div>

                  {/* Content switcher */}
                  <div className="mb-6 grid grid-cols-2 border border-border">
                    <button
                      onClick={() => setContentType('note')}
                      className={`flex h-11 items-center justify-center gap-2 text-sm font-medium transition-colors ${
                        contentType === 'note'
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-muted'
                      }`}
                    >
                      <FileText className="h-4 w-4" />
                      Note
                    </button>

                    <button
                      onClick={() => setContentType('file')}
                      className={`flex h-11 items-center justify-center gap-2 border-l text-sm font-medium transition-colors ${
                        contentType === 'file'
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-muted'
                      }`}
                    >
                      <Upload className="h-4 w-4" />
                      File
                    </button>
                  </div>

                  {/* Note */}
                  {contentType === 'note' && (
                    <div>
                      <label
                        htmlFor="noteContent"
                        className="mb-2 block text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground"
                      >
                        Note
                      </label>

                      <textarea
                        id="noteContent"
                        placeholder="Write something..."
                        value={noteContent}
                        onChange={(e) =>
                          setNoteContent(e.target.value)
                        }
                        rows={12}
                        className="w-full resize-none border border-border bg-background p-4 text-sm leading-6 outline-none transition-colors placeholder:text-muted-foreground/50 focus:border-foreground"
                      />

                      <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                        <span>
                          Plain text content
                        </span>

                        <span>
                          {noteContent.length} characters
                        </span>
                      </div>
                    </div>
                  )}

                  {/* File */}
                  {contentType === 'file' && (
                    <div>
                      <input
                        id="file"
                        type="file"
                        onChange={(e) =>
                          setFile(e.target.files?.[0] || null)
                        }
                        className="hidden"
                      />

                      {!file ? (
                        <label
                          htmlFor="file"
                          className="group flex min-h-[260px] cursor-pointer flex-col items-center justify-center border border-dashed border-border px-6 text-center transition-colors hover:border-foreground hover:bg-muted/20"
                        >
                          <div className="mb-5 flex h-12 w-12 items-center justify-center border">
                            <Upload className="h-5 w-5 text-muted-foreground" />
                          </div>

                          <p className="text-sm font-medium">
                            Choose a file
                          </p>

                          <p className="mt-1 text-xs text-muted-foreground">
                            Click anywhere here to browse your files
                          </p>
                        </label>
                      ) : (
                        <div className="border border-border">
                          <div className="flex items-center gap-4 p-5">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center border">
                              {file.type.startsWith('image/') ? (
                                <Image className="h-5 w-5" />
                              ) : (
                                <FileText className="h-5 w-5" />
                              )}
                            </div>

                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium">
                                {file.name}
                              </p>

                              <p className="mt-1 text-xs text-muted-foreground">
                                {formatFileSize(file.size)}
                              </p>
                            </div>

                            <button
                              onClick={clearFile}
                              className="p-2 text-muted-foreground transition-colors hover:text-foreground"
                              aria-label="Remove file"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* Options */}
            <section className="border-b">
              <div className="grid gap-6 py-8 sm:grid-cols-[180px_1fr]">
                <div>
                  <p className="text-sm font-medium">
                    Access
                  </p>

                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    Optional limits for this share.
                  </p>
                </div>

                <div className="grid gap-5 sm:grid-cols-2">

                  <div>
                    <label
                      htmlFor="expiration"
                      className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground"
                    >
                      <Calendar className="h-3.5 w-3.5" />
                      Expires after
                    </label>

                    <div className="flex h-11 items-center border border-border">
                      <input
                        id="expiration"
                        type="number"
                        min="1"
                        max="365"
                        placeholder="Never"
                        value={expirationDays}
                        onChange={(e) =>
                          setExpirationDays(
                            e.target.value
                              ? parseInt(e.target.value)
                              : ''
                          )
                        }
                        className="min-w-0 flex-1 bg-transparent px-3 text-sm outline-none"
                      />

                      <span className="pr-3 text-xs text-muted-foreground">
                        days
                      </span>
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="maxViews"
                      className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      View limit
                    </label>

                    <div className="flex h-11 items-center border border-border">
                      <input
                        id="maxViews"
                        type="number"
                        min="1"
                        placeholder="Unlimited"
                        value={maxViews}
                        onChange={(e) =>
                          setMaxViews(
                            e.target.value
                              ? parseInt(e.target.value)
                              : ''
                          )
                        }
                        className="min-w-0 flex-1 bg-transparent px-3 text-sm outline-none"
                      />

                      <span className="pr-3 text-xs text-muted-foreground">
                        views
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Submit */}
            <div className="flex flex-col-reverse gap-3 pt-8 sm:flex-row sm:justify-end">
              <button
                onClick={() => navigate('/')}
                className="h-12 border border-border px-6 text-sm font-medium transition-colors hover:bg-muted"
              >
                Cancel
              </button>

              <button
                onClick={() => handleSubmit(contentType)}
                disabled={isLoading}
                className="group inline-flex h-12 items-center justify-center gap-2 bg-primary px-7 text-sm font-medium text-primary-foreground transition-transform hover:-translate-y-0.5 disabled:pointer-events-none disabled:opacity-50"
              >
                {isLoading
                  ? contentType === 'file'
                    ? 'Uploading…'
                    : 'Creating…'
                  : contentType === 'file'
                  ? 'Create file share'
                  : 'Create note share'}

                {!isLoading && (
                  <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                )}
              </button>
            </div>
          </div>

          {/* Sidebar */}
          <aside className="hidden lg:block">
            <div className="sticky top-8 border border-border">

              <div className="border-b px-5 py-4">
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                  Before you share
                </p>
              </div>

              <div className="divide-y">
                <InfoRow
                  icon={Link2}
                  title="Your URL"
                  description="A custom URL makes the share easier to remember."
                />

                <InfoRow
                  icon={Calendar}
                  title="Expiration"
                  description="Useful for temporary or time-sensitive content."
                />

                <InfoRow
                  icon={Eye}
                  title="View limit"
                  description="Stop the link after a chosen number of views."
                />

                <InfoRow
                  icon={Shield}
                  title="Simple access"
                  description="Anyone with the link can open the share."
                />
              </div>

              <div className="border-t bg-muted/20 p-5">
                <p className="text-xs leading-5 text-muted-foreground">
                  You can always create another share later. Keep the
                  settings simple unless you actually need a restriction.
                </p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
};

interface InfoRowProps {
  icon: React.ElementType;
  title: string;
  description: string;
}

const InfoRow = ({
  icon: Icon,
  title,
  description,
}: InfoRowProps) => {
  return (
    <div className="p-5">
      <div className="mb-3 flex h-8 w-8 items-center justify-center border">
        <Icon className="h-3.5 w-3.5" />
      </div>

      <p className="text-sm font-medium">{title}</p>

      <p className="mt-1 text-xs leading-5 text-muted-foreground">
        {description}
      </p>
    </div>
  );
};
