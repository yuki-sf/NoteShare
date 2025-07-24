import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Share2, FileText, Upload, Link2, Eye, Calendar, Shield, ExternalLink, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface UserShare {
  id: string;
  title: string;
  type: 'note' | 'file';
  createdAt: string;
  customLink?: string;
}

export const HomePage = () => {
  const navigate = useNavigate();
  const [userShares, setUserShares] = useState<UserShare[]>([]);

  useEffect(() => {
    const shares = localStorage.getItem('userShares');
    if (shares) {
      setUserShares(JSON.parse(shares));
    }
  }, []);

  const removeShare = (id: string) => {
    const updatedShares = userShares.filter(share => share.id !== id);
    setUserShares(updatedShares);
    localStorage.setItem('userShares', JSON.stringify(updatedShares));
  };

  const features = [
    {
      icon: <FileText className="h-6 w-6" />,
      title: 'Share Notes',
      description: 'Create and share text notes with custom links',
    },
    {
      icon: <Upload className="h-6 w-6" />,
      title: 'Upload Files',
      description: 'Upload and share any file type with download links',
    },
    {
      icon: <Link2 className="h-6 w-6" />,
      title: 'Custom Links',
      description: 'Choose your own memorable short links',
    },
    {
      icon: <Eye className="h-6 w-6" />,
      title: 'View Analytics',
      description: 'Track how many times your content is viewed',
    },
    {
      icon: <Calendar className="h-6 w-6" />,
      title: 'Expiration Control',
      description: 'Set expiration dates and view limits',
    },
    {
      icon: <Shield className="h-6 w-6" />,
      title: 'Secure & Private',
      description: 'Your content is stored securely with Supabase',
    },
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 gradient-hero opacity-10"></div>
        <div className="relative z-10 max-w-6xl mx-auto px-6 pt-20 pb-16">
          <div className="text-center space-y-8 animate-fade-in">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full text-primary">
                <Share2 className="h-4 w-4" />
                <span className="text-sm font-medium">NoteShare</span>
              </div>
              <h1 className="text-5xl md:text-6xl font-bold tracking-tight">
                Share anything with
                <br />
                <span className="text-gradient">custom links</span>
              </h1>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                Create beautiful shareable links for your notes and files. 
                Simple, fast, and completely free to use.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                onClick={() => navigate('/create')}
                size="lg"
                className="gradient-primary text-white shadow-elegant hover:shadow-glow transition-all duration-300"
              >
                Create Share
                <Share2 className="ml-2 h-5 w-5" />
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="border-primary/20 hover:border-primary/40"
                onClick={() => window.open('/example-note', '_blank')}
              >
                View Example
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center space-y-4 mb-16">
          <h2 className="text-3xl md:text-4xl font-bold">
            Everything you need to share
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Powerful features designed to make sharing effortless and secure
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <Card 
              key={index} 
              className="hover-lift shadow-card border-0 bg-gradient-to-br from-background to-muted/30"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <CardHeader>
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary mb-4">
                  {feature.icon}
                </div>
                <CardTitle className="text-xl">{feature.title}</CardTitle>
                <CardDescription className="text-base">
                  {feature.description}
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-muted/30">
        <div className="max-w-4xl mx-auto px-6 py-20 text-center">
          <div className="space-y-8 animate-scale-in">
            <div className="space-y-4">
              <h2 className="text-3xl md:text-4xl font-bold">
                Ready to start sharing?
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Create your first share in seconds. No registration required.
              </p>
            </div>
            
            <Button
              onClick={() => navigate('/create')}
              size="lg"
              className="gradient-primary text-white shadow-elegant hover:shadow-glow animate-glow"
            >
              Get Started Now
              <Share2 className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="max-w-6xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          <div className="space-y-2">
            <div className="text-3xl font-bold text-gradient">100%</div>
            <div className="text-muted-foreground">Free to use</div>
          </div>
          <div className="space-y-2">
            <div className="text-3xl font-bold text-gradient">∞</div>
            <div className="text-muted-foreground">Unlimited shares</div>
          </div>
          <div className="space-y-2">
            <div className="text-3xl font-bold text-gradient">⚡</div>
            <div className="text-muted-foreground">Instant sharing</div>
          </div>
        </div>
      </div>

      {/* User's Created Shares Section */}
      {userShares.length > 0 && (
        <div className="py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">Your Created Shares</h2>
              <p className="text-xl text-muted-foreground">Manage your shared notes and files</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {userShares.map((share) => (
                <Card key={share.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        {share.type === 'note' ? (
                          <FileText className="h-5 w-5 text-primary" />
                        ) : (
                          <Upload className="h-5 w-5 text-primary" />
                        )}
                        <CardTitle className="text-sm">{share.title}</CardTitle>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeShare(share.id)}
                        className="h-8 w-8 p-0 text-gray-400 hover:text-red-500"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground">
                        Created: {new Date(share.createdAt).toLocaleDateString()}
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(`/${share.customLink || share.id}`, '_blank')}
                          className="flex-1"
                        >
                          <ExternalLink className="h-3 w-3 mr-1" />
                          View
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
