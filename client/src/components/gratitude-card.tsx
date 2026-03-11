import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { Heart } from "lucide-react";
import { useState, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

interface Post {
  id: string;
  user: {
    id: string;
    name: string;
    avatar?: string;
  };
  content: string;
  timestamp: Date;
  isLiked: boolean;
}

interface GratitudeCardProps {
  post: Post;
  currentUserId?: string;
}

interface FloatingHeart {
  id: number;
  x: number;
  delay: number;
}

export function GratitudeCard({ post }: GratitudeCardProps) {
  const [isLiked, setIsLiked] = useState(post.isLiked);
  const [floatingHearts, setFloatingHearts] = useState<FloatingHeart[]>([]);
  const queryClient = useQueryClient();

  const loveMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/posts/${post.id}/love`, {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to love post");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts", "all"] });
      queryClient.invalidateQueries({ queryKey: ["posts", "friends"] });
    },
    onError: () => {
      setIsLiked(false);
    },
  });

  const unloveMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/posts/${post.id}/love`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to unlove post");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts", "all"] });
      queryClient.invalidateQueries({ queryKey: ["posts", "friends"] });
    },
    onError: () => {
      setIsLiked(true);
    },
  });

  const spawnHearts = useCallback(() => {
    const newHearts: FloatingHeart[] = [];
    for (let i = 0; i < 8; i++) {
      newHearts.push({
        id: Date.now() + i,
        x: Math.random() * 60 - 30,
        delay: Math.random() * 0.3,
      });
    }
    setFloatingHearts(newHearts);
    setTimeout(() => setFloatingHearts([]), 1500);
  }, []);

  const handleLoveClick = () => {
    if (isLiked) {
      setIsLiked(false);
      unloveMutation.mutate();
    } else {
      setIsLiked(true);
      spawnHearts();
      loveMutation.mutate();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="group relative overflow-hidden rounded-2xl bg-cream p-6 shadow-lg border-b-4 border-blue-900/10"
      data-testid={`card-post-${post.id}`}
    >
      <div className="flex items-start gap-4">
        {post.user.avatar ? (
          <img
            src={post.user.avatar}
            alt={post.user.name}
            className="h-12 w-12 rounded-full object-cover ring-2 ring-club-blue"
            data-testid={`img-avatar-${post.id}`}
          />
        ) : (
          <div className="h-12 w-12 rounded-full bg-hot-orange ring-2 ring-club-blue flex items-center justify-center font-bold text-white text-lg">
            {post.user.name[0]?.toUpperCase()}
          </div>
        )}
        <div className="flex-1 space-y-1">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-club-blue text-lg">
              {post.user.name}
            </h3>
            <span className="text-xs font-bold text-gray-500 tracking-wider">
              {format(post.timestamp, "d MMM ''yy")}
            </span>
          </div>
          <p className="text-lg font-medium leading-relaxed text-black font-sans">
            {post.content}
          </p>
          
          <div className="flex justify-end pt-2">
            <div className="relative">
              <button
                onClick={handleLoveClick}
                className="flex items-center gap-1 transition-transform active:scale-125"
                data-testid={`button-love-${post.id}`}
              >
                <Heart
                  className={`h-6 w-6 transition-all duration-200 ${
                    isLiked
                      ? "fill-red-500 text-red-500 scale-110"
                      : "text-gray-400 hover:text-red-400"
                  }`}
                />
              </button>
              
              <AnimatePresence>
                {floatingHearts.map((heart) => (
                  <motion.div
                    key={heart.id}
                    initial={{ opacity: 1, y: 0, x: 0, scale: 0.5 }}
                    animate={{
                      opacity: 0,
                      y: -100,
                      x: heart.x,
                      scale: 1.2,
                      rotate: Math.random() * 30 - 15,
                    }}
                    exit={{ opacity: 0 }}
                    transition={{
                      duration: 1.2,
                      delay: heart.delay,
                      ease: "easeOut",
                    }}
                    className="absolute bottom-0 left-0 pointer-events-none"
                  >
                    <Heart className="h-5 w-5 fill-red-500 text-red-500" />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
