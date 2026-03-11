import { useState, useEffect } from "react";
import { ChevronRight, Search, Heart, Check, X, UserPlus, Loader2, Users, Clock, AtSign } from "lucide-react";
import { motion } from "framer-motion";
import { useFriends } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

type User = {
  id: string;
  email: string;
  displayName: string | null;
  username: string | null;
  avatar: string | null;
};

type FriendRequest = {
  id: string;
  userId: string;
  friendId: string;
  status: string;
  user: User;
};

export default function FriendsPage() {
  const { user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { data: friends = [], isLoading } = useFriends();
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: searchResults = [], isLoading: isSearching } = useQuery<User[]>({
    queryKey: ["/api/users/search", searchQuery],
    queryFn: async () => {
      if (searchQuery.length < 2) return [];
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(searchQuery)}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Search failed");
      return res.json();
    },
    enabled: searchQuery.length >= 2,
  });

  const { data: incomingRequests = [] } = useQuery<FriendRequest[]>({
    queryKey: ["/api/friends/requests/incoming"],
    queryFn: async () => {
      const res = await fetch("/api/friends/requests/incoming", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch incoming requests");
      return res.json();
    },
  });

  const { data: outgoingRequests = [] } = useQuery<FriendRequest[]>({
    queryKey: ["/api/friends/requests/outgoing"],
    queryFn: async () => {
      const res = await fetch("/api/friends/requests/outgoing", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch outgoing requests");
      return res.json();
    },
  });

  const sendFriendRequest = useMutation({
    mutationFn: async (friendId: string) => {
      const res = await fetch(`/api/friends/${friendId}`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to send friend request");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/friends/requests/outgoing"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users/search"] });
      toast({ title: "Friend request sent!" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const acceptRequest = useMutation({
    mutationFn: async (requestId: string) => {
      const res = await fetch(`/api/friends/requests/${requestId}/accept`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to accept request");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/friends/requests/incoming"] });
      queryClient.invalidateQueries({ queryKey: ["/api/friends"] });
      toast({ title: "Friend request accepted!" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const declineRequest = useMutation({
    mutationFn: async (requestId: string) => {
      const res = await fetch(`/api/friends/requests/${requestId}/decline`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to decline request");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/friends/requests/incoming"] });
      toast({ title: "Request declined" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const cancelRequest = useMutation({
    mutationFn: async (requestId: string) => {
      const res = await fetch(`/api/friends/requests/${requestId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to cancel request");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/friends/requests/outgoing"] });
      toast({ title: "Request cancelled" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  useEffect(() => {
    if (!authLoading && !user) {
      setLocation("/auth");
    }
  }, [authLoading, user, setLocation]);

  if (!authLoading && !user) {
    return null;
  }

  if (isLoading || authLoading) {
    return (
      <div className="min-h-screen bg-club-blue flex items-center justify-center">
        <div className="text-white font-display text-2xl">Loading...</div>
      </div>
    );
  }

  const friendIds = new Set(friends.map((f) => f.id));
  const outgoingIds = new Set(outgoingRequests.map(r => r.user.id));
  const incomingIds = new Set(incomingRequests.map(r => r.user.id));

  const filteredSearchResults = searchResults.filter((u) => 
    !friendIds.has(u.id) && !outgoingIds.has(u.id) && !incomingIds.has(u.id)
  );

  return (
    <div className="min-h-screen bg-club-blue pb-24">
      <div className="relative z-10 mx-auto max-w-2xl px-4 py-8">
        <header className="mb-6">
          <h1 className="font-display text-4xl font-bold mb-6 text-white drop-shadow-md">Friends</h1>
        </header>

        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {incomingRequests.length > 0 && (
            <section className="bg-green-500/20 backdrop-blur-sm rounded-3xl p-5 border border-green-400/30">
              <div className="flex items-center gap-2 mb-4">
                <UserPlus className="h-5 w-5 text-green-300" />
                <h3 className="font-display text-lg font-bold text-white">Friend Requests ({incomingRequests.length})</h3>
              </div>
              <div className="space-y-3">
                {incomingRequests.map((request) => (
                  <div key={request.id} className="flex items-center justify-between bg-white/10 rounded-xl p-3" data-testid={`incoming-request-${request.id}`}>
                    <div className="flex items-center gap-3">
                      {request.user.avatar ? (
                        <img src={request.user.avatar} alt="" className="h-10 w-10 rounded-full object-cover border-2 border-white/30" />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center font-bold text-white">
                          {(request.user.displayName || request.user.email)?.[0]?.toUpperCase()}
                        </div>
                      )}
                      <div>
                        <div className="font-bold text-white text-sm">{request.user.displayName || "New User"}</div>
                        {request.user.username && (
                          <div className="text-xs text-green-200">@{request.user.username}</div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => acceptRequest.mutate(request.id)}
                        disabled={acceptRequest.isPending}
                        className="bg-green-500 hover:bg-green-600 text-white"
                        data-testid={`button-accept-${request.id}`}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => declineRequest.mutate(request.id)}
                        disabled={declineRequest.isPending}
                        className="text-white/70 hover:text-white hover:bg-red-500/30"
                        data-testid={`button-decline-${request.id}`}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="bg-white/10 backdrop-blur-sm rounded-3xl p-5 border border-white/20">
            <div className="flex items-center gap-2 mb-4">
              <AtSign className="h-5 w-5 text-white" />
              <h3 className="font-display text-lg font-bold text-white">Find Friends</h3>
            </div>
            
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-club-blue/60" />
                <input 
                  type="text"
                  placeholder="Search by @username..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  data-testid="input-search-username"
                  className="w-full rounded-xl bg-white py-3 pl-12 pr-4 text-club-blue placeholder:text-club-blue/40 focus:outline-none focus:ring-2 focus:ring-hot-orange"
                />
              </div>

              {isSearching && (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin text-white/60" />
                </div>
              )}

              {searchQuery.length >= 2 && filteredSearchResults.length > 0 && (
                <div className="space-y-2">
                  {filteredSearchResults.map((result) => (
                    <div key={result.id} className="flex items-center justify-between bg-white/10 rounded-xl p-3" data-testid={`search-result-${result.id}`}>
                      <div className="flex items-center gap-3">
                        {result.avatar ? (
                          <img src={result.avatar} alt="" className="h-10 w-10 rounded-full object-cover border-2 border-white/30" />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center font-bold text-white">
                            {(result.displayName || result.email)?.[0]?.toUpperCase()}
                          </div>
                        )}
                        <div>
                          <div className="font-bold text-white text-sm">{result.displayName || "User"}</div>
                          {result.username && (
                            <div className="text-xs text-blue-200">@{result.username}</div>
                          )}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => sendFriendRequest.mutate(result.id)}
                        disabled={sendFriendRequest.isPending}
                        className="bg-hot-orange hover:bg-hot-orange/90 text-white font-bold"
                        data-testid={`button-send-request-${result.id}`}
                      >
                        {sendFriendRequest.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <UserPlus className="h-4 w-4 mr-1" />
                            Add
                          </>
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {searchQuery.length >= 2 && !isSearching && filteredSearchResults.length === 0 && (
                <p className="text-center text-white/60 py-4 text-sm">
                  No users found. Try a different username.
                </p>
              )}

              {searchQuery.length < 2 && (
                <p className="text-center text-white/60 py-4 text-sm">
                  Type at least 2 characters to search
                </p>
              )}
            </div>
          </section>

          {outgoingRequests.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Clock className="h-4 w-4 text-yellow-300" />
                <h3 className="text-sm font-bold text-blue-200 uppercase tracking-wider">Pending Requests</h3>
              </div>
              <div className="space-y-2">
                {outgoingRequests.map((request) => (
                  <div key={request.id} className="flex items-center justify-between bg-white/10 rounded-xl p-3" data-testid={`outgoing-request-${request.id}`}>
                    <div className="flex items-center gap-3">
                      {request.user.avatar ? (
                        <img src={request.user.avatar} alt="" className="h-10 w-10 rounded-full object-cover border-2 border-white/30" />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center font-bold text-white">
                          {(request.user.displayName || request.user.email)?.[0]?.toUpperCase()}
                        </div>
                      )}
                      <div>
                        <div className="font-bold text-white text-sm">{request.user.displayName || "User"}</div>
                        {request.user.username && (
                          <div className="text-xs text-blue-200">@{request.user.username}</div>
                        )}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => cancelRequest.mutate(request.id)}
                      disabled={cancelRequest.isPending}
                      className="text-white/50 hover:text-white hover:bg-red-500/30"
                      data-testid={`button-cancel-${request.id}`}
                    >
                      Cancel
                    </Button>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section>
            <h3 className="mb-4 text-sm font-bold text-blue-200 uppercase tracking-wider flex items-center gap-2">
              <Users className="h-4 w-4" />
              Your Friends ({friends.length})
            </h3>
            <div className="space-y-3">
              {friends.map((friend) => (
                <div key={friend.id} className="flex items-center rounded-2xl bg-white p-4 border-2 border-blue-100 shadow-sm" data-testid={`friend-card-${friend.id}`}>
                  <div className="flex items-center gap-4">
                    {friend.avatar ? (
                      <img src={friend.avatar} alt={friend.displayName || ""} className="h-12 w-12 rounded-full object-cover border-2 border-blue-200" />
                    ) : (
                      <div className="h-12 w-12 rounded-full bg-blue-200 border-2 border-blue-300 flex items-center justify-center font-bold text-club-blue">
                        {(friend.displayName || friend.email)?.[0]?.toUpperCase()}
                      </div>
                    )}
                    <div>
                      <div className="font-bold text-club-blue">{friend.displayName || "Friend"}</div>
                      {friend.username && (
                        <div className="text-sm font-medium text-club-blue/60">@{friend.username}</div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {friends.length === 0 && (
                <div className="p-8 text-center text-blue-200 font-medium">
                  Search for friends by their @username above!
                </div>
              )}
            </div>
          </section>
        </motion.div>
      </div>
    </div>
  );
}
