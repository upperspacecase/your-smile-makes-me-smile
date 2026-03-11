import { useState } from "react";
import { GratitudeCard } from "@/components/gratitude-card";
import { CreatePost } from "@/components/create-post";
import { usePosts, useCreatePost } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { Users, Globe } from "lucide-react";

export default function CheckInPage() {
  const { user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [filter, setFilter] = useState<"all" | "friends">("friends");
  const { data: posts = [], isLoading } = usePosts(filter);
  const createPost = useCreatePost();

  if (!authLoading && !user) {
    setLocation("/auth");
    return null;
  }

  const handleCreatePost = async (content: string) => {
    await createPost.mutateAsync(content);
  };

  if (isLoading || authLoading) {
    return (
      <div className="min-h-screen bg-club-blue flex items-center justify-center">
        <div className="text-white font-display text-2xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-club-blue">
      <div className="relative z-10 mx-auto max-w-2xl px-4 py-8 md:py-12">
        <header className="mb-8 text-center bg-hot-orange -mx-4 px-4 py-12 shadow-lg transform -skew-y-2 origin-top-left">
          <div className="transform skew-y-2">
            <h1 className="text-4xl font-bold tracking-tight text-white md:text-5xl font-display mb-3 drop-shadow-md uppercase">
              the good stuff
            </h1>
            <p className="text-lg text-white/90 font-medium font-sans max-w-xs mx-auto">
              Share a moment of gratitude.
            </p>
          </div>
        </header>

        <div className="space-y-6 mt-8">
          <div className="flex justify-center">
            <div className="inline-flex bg-white/10 rounded-full p-1" data-testid="feed-filter-toggle">
              <button
                onClick={() => setFilter("all")}
                className={`flex items-center gap-2 px-4 py-2 rounded-full font-medium text-sm transition-all ${
                  filter === "all"
                    ? "bg-white text-club-blue shadow-md"
                    : "text-white/80 hover:text-white"
                }`}
                data-testid="button-filter-all"
              >
                <Globe className="h-4 w-4" />
                Everyone
              </button>
              <button
                onClick={() => setFilter("friends")}
                className={`flex items-center gap-2 px-4 py-2 rounded-full font-medium text-sm transition-all ${
                  filter === "friends"
                    ? "bg-white text-club-blue shadow-md"
                    : "text-white/80 hover:text-white"
                }`}
                data-testid="button-filter-friends"
              >
                <Users className="h-4 w-4" />
                Friends
              </button>
            </div>
          </div>

          <section>
            <CreatePost onSubmit={handleCreatePost} />
          </section>

          <section className="space-y-4">
            {posts.map((post) => (
              <GratitudeCard 
                key={post.id} 
                post={{
                  id: post.id,
                  user: {
                    id: post.user.id,
                    name: post.user.displayName || post.user.email || "Anonymous",
                    avatar: post.user.avatar || undefined,
                  },
                  content: post.content,
                  timestamp: new Date(post.createdAt),
                  isLiked: post.isLiked,
                }}
              />
            ))}
          </section>
          
          <div className="text-center py-8 text-sm text-blue-200 font-medium">
            <p>Breathe in. Breathe out.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
