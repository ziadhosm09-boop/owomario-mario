import { useState, useEffect } from "react";
import { Youtube, Play, Clock, Eye, Bell, ExternalLink } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { toast } from "./ui/sonner";

interface YouTubeVideo {
  id: string;
  title: string;
  thumbnail: string;
  publishedAt: string;
  link: string;
}

const CHANNEL_ID = "UC_hA7Yvx_kYlVQ3aHF3Jt9A"; // @owomario channel ID
const CHANNEL_URL = "https://www.youtube.com/@owomario";

export const YouTubeVideos = () => {
  const [videos, setVideos] = useState<YouTubeVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastVideoId, setLastVideoId] = useState<string | null>(null);

  useEffect(() => {
    fetchVideos();
    
    // Check for new videos every 5 minutes
    const interval = setInterval(fetchVideos, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchVideos = async () => {
    try {
      // Using YouTube RSS feed (no API key required)
      const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`;
      const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(rssUrl)}`;
      
      const response = await fetch(proxyUrl);
      const text = await response.text();
      
      // Parse XML
      const parser = new DOMParser();
      const xml = parser.parseFromString(text, "text/xml");
      const entries = xml.querySelectorAll("entry");
      
      const parsedVideos: YouTubeVideo[] = [];
      
      entries.forEach((entry, index) => {
        if (index < 6) { // Get latest 6 videos
          const videoId = entry.querySelector("yt\\:videoId, videoId")?.textContent || "";
          const title = entry.querySelector("title")?.textContent || "";
          const published = entry.querySelector("published")?.textContent || "";
          const link = entry.querySelector("link")?.getAttribute("href") || "";
          
          parsedVideos.push({
            id: videoId,
            title,
            thumbnail: `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
            publishedAt: published,
            link,
          });
        }
      });
      
      // Check for new video notification
      const storedLastVideoId = localStorage.getItem("lastYouTubeVideoId");
      if (parsedVideos.length > 0) {
        const newestVideoId = parsedVideos[0].id;
        
        if (storedLastVideoId && storedLastVideoId !== newestVideoId) {
          // New video detected!
          toast.success("🎬 New Video!", {
            description: parsedVideos[0].title,
            action: {
              label: "Watch",
              onClick: () => window.open(parsedVideos[0].link, "_blank"),
            },
            duration: 10000,
          });
        }
        
        localStorage.setItem("lastYouTubeVideoId", newestVideoId);
        setLastVideoId(newestVideoId);
      }
      
      setVideos(parsedVideos);
    } catch (error) {
      console.error("Failed to fetch YouTube videos:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
  };

  const openVideo = (video: YouTubeVideo) => {
    window.open(video.link, "_blank");
  };

  if (loading) {
    return (
      <section className="container mx-auto px-4 py-12">
        <div className="flex items-center justify-center gap-3 mb-8">
          <Youtube className="w-8 h-8 text-destructive animate-pulse" />
          <span className="text-muted-foreground">Loading videos...</span>
        </div>
      </section>
    );
  }

  return (
    <section className="container mx-auto px-4 py-12">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-destructive/10 rounded-lg">
            <Youtube className="w-6 h-6 text-destructive" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Latest Videos</h2>
            <p className="text-sm text-muted-foreground">From @owomario YouTube channel</p>
          </div>
        </div>
        
        <a 
          href={CHANNEL_URL}
          target="_blank"
          rel="noopener noreferrer"
        >
          <Button variant="outline" className="gap-2 border-destructive/30 hover:bg-destructive/10 hover:text-destructive">
            <Bell className="w-4 h-4" />
            Subscribe
            <ExternalLink className="w-3 h-3" />
          </Button>
        </a>
      </div>

      {/* Videos Grid */}
      {videos.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {videos.map((video, index) => (
            <Card 
              key={video.id}
              className="group cursor-pointer overflow-hidden border-border/50 hover:border-destructive/50 transition-all duration-300 hover:shadow-lg hover:shadow-destructive/10"
              onClick={() => openVideo(video)}
            >
              {/* Thumbnail */}
              <div className="relative aspect-video overflow-hidden">
                <img
                  src={video.thumbnail}
                  alt={video.title}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                
                {/* Play overlay */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                  <div className="p-4 bg-destructive rounded-full shadow-lg transform scale-90 group-hover:scale-100 transition-transform">
                    <Play className="w-6 h-6 text-white fill-white" />
                  </div>
                </div>
                
                {/* New badge for latest video */}
                {index === 0 && (
                  <Badge className="absolute top-2 left-2 bg-destructive text-destructive-foreground border-0">
                    🔴 Latest
                  </Badge>
                )}
              </div>
              
              <CardContent className="p-4">
                <h3 className="font-semibold text-sm line-clamp-2 mb-2 group-hover:text-destructive transition-colors">
                  {video.title}
                </h3>
                
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  <span>{formatDate(video.publishedAt)}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          <Youtube className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No videos found</p>
        </div>
      )}
      
      {/* View All Button */}
      {videos.length > 0 && (
        <div className="text-center mt-8">
          <a 
            href={CHANNEL_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variant="outline" size="lg" className="gap-2">
              View All Videos
              <ExternalLink className="w-4 h-4" />
            </Button>
          </a>
        </div>
      )}
    </section>
  );
};
