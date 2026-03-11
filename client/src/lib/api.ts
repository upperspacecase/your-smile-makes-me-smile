import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

type Post = {
  id: string;
  userId: string;
  content: string;
  createdAt: Date;
  user: {
    id: string;
    email: string;
    displayName: string | null;
    avatar: string | null;
  };
  likeCount: number;
  isLiked: boolean;
};

type Friend = {
  id: string;
  email: string;
  displayName: string | null;
  username: string | null;
  avatar: string | null;
};

type Invite = {
  id: string;
  inviterId: string | null;
  inviterName: string | null;
  inviteeEmail: string;
  inviteeId: string | null;
  accepted: boolean;
  createdAt: Date;
};

export function usePosts(filter: "all" | "friends" = "all") {
  return useQuery({
    queryKey: ["posts", filter],
    queryFn: async () => {
      const url = filter === "friends" ? "/api/posts?filter=friends" : "/api/posts";
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch posts");
      return res.json() as Promise<Post[]>;
    },
  });
}

export function useUserPosts(userId: string | undefined) {
  return useQuery({
    queryKey: ["posts", "user", userId],
    queryFn: async () => {
      if (!userId) throw new Error("User ID required");
      const res = await fetch(`/api/posts/user/${userId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch user posts");
      return res.json() as Promise<Post[]>;
    },
    enabled: !!userId,
  });
}

export function useCreatePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (content: string) => {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
        credentials: "include",
      });

      if (!res.ok) throw new Error("Failed to create post");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
  });
}

export function useDeletePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (postId: string) => {
      const res = await fetch(`/api/posts/${postId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!res.ok) throw new Error("Failed to delete post");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
  });
}

export function useFriends() {
  return useQuery({
    queryKey: ["friends"],
    queryFn: async () => {
      const res = await fetch("/api/friends", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch friends");
      return res.json() as Promise<Friend[]>;
    },
  });
}

export function useInvites() {
  return useQuery({
    queryKey: ["invites"],
    queryFn: async () => {
      const res = await fetch("/api/invites", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch invites");
      return res.json() as Promise<Invite[]>;
    },
  });
}

export function useCreateInvite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (email: string) => {
      const res = await fetch("/api/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
        credentials: "include",
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to send invite");
      }
      return res.json() as Promise<Invite>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invites"] });
    },
  });
}
