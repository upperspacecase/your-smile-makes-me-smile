import { useState } from "react";
import { Link } from "wouter";
import { User } from "lucide-react";
import { GratitudeCard } from "@/components/gratitude-card";
import { CreatePost } from "@/components/create-post";

const MOCK_USERS = [
  { name: "Alex Chen", avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=60" },
  { name: "Sarah Miller", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=60" },
  { name: "Jordan Smith", avatar: "https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=100&auto=format&fit=crop&q=60" },
];

const INITIAL_POSTS = [
  {
    id: "1",
    user: MOCK_USERS[0],
    content: "Grateful for the warm morning coffee and a quiet moment before the busy day starts. ☕️☀️",
    timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 mins ago
  },
  {
    id: "2",
    user: MOCK_USERS[1],
    content: "My cat finally learned to fetch! It's the little things that bring so much joy.",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
  },
  {
    id: "3",
    user: MOCK_USERS[2],
    content: "Had an amazing call with an old friend I hadn't spoken to in years. Reconnecting feels so good.",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5), // 5 hours ago
  },
];

export default function Home() {
  const [posts, setPosts] = useState(INITIAL_POSTS);

  const handleCreatePost = (content: string) => {
    const newPost = {
      id: Date.now().toString(),
      user: {
        name: "You",
        avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=60",
      },
      content,
      timestamp: new Date(),
    };
    setPosts([newPost, ...posts]);
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-white/20">
      {/* Subtle Gradient Ambient Light */}
      <div className="fixed top-[-20%] left-[-20%] h-[600px] w-[600px] rounded-full bg-blue-500/10 blur-[120px] pointer-events-none" />
      <div className="fixed bottom-[-20%] right-[-20%] h-[600px] w-[600px] rounded-full bg-purple-500/10 blur-[120px] pointer-events-none" />

      <div className="relative z-10 mx-auto max-w-2xl px-4 py-8 md:py-12">
        <header className="mb-12 text-center relative">
          {/* Profile Link */}
          <Link href="/profile">
            <button className="absolute right-0 top-0 rounded-full bg-zinc-900/50 p-3 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white">
              <User className="h-5 w-5" />
            </button>
          </Link>

          {/* Aura Heart Logo Representation */}
          <div className="mx-auto mb-6 h-16 w-16 rounded-full bg-aura-gradient opacity-90 blur-[1px] animate-pulse duration-[3000ms]" />
          
          <h1 className="text-4xl font-bold tracking-tight text-white md:text-5xl font-display mb-3">
            How are you feeling?
          </h1>
          <p className="text-lg text-zinc-400 font-sans">
            Share a moment of gratitude.
          </p>
        </header>

        <div className="space-y-8">
          <section>
            <CreatePost onSubmit={handleCreatePost} />
          </section>

          <section className="space-y-4">
            {posts.map((post) => (
              <GratitudeCard 
                key={post.id} 
                post={post}
              />
            ))}
          </section>
          
          <div className="text-center py-8 text-sm text-zinc-600">
            <p>Breathe in. Breathe out.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
