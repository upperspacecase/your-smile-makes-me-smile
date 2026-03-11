import { useState, useEffect } from "react";
import { Settings, LogOut, Pencil, Check, X, Smartphone, Share, Trash2, AtSign } from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { useUserPosts } from "@/lib/api";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { AvatarUploader } from "@/components/AvatarUploader";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useQueryClient } from "@tanstack/react-query";

export default function MePage() {
  const { user, logout, loading: authLoading, refreshUser } = useAuth();
  const [, setLocation] = useLocation();
  const { data: posts = [], isLoading } = useUserPosts(user?.id);
  const [activeTab, setActiveTab] = useState<"journal" | "settings">("journal");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isEditingName, setIsEditingName] = useState(false);
  const [newDisplayName, setNewDisplayName] = useState("");
  const [isSavingName, setIsSavingName] = useState(false);
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [isSavingUsername, setIsSavingUsername] = useState(false);
  const [usernameError, setUsernameError] = useState("");
  const [showHomeScreenModal, setShowHomeScreenModal] = useState(false);
  const [postToDelete, setPostToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      setLocation("/auth");
    }
  }, [authLoading, user, setLocation]);

  if (!authLoading && !user) {
    return null;
  }

  const handleLogout = async () => {
    await logout();
  };

  const handleDeletePost = async () => {
    if (!postToDelete) return;
    
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/posts/${postToDelete}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to delete post");
      }

      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/posts/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/posts/mine"] });
      
      toast({
        title: "Post deleted",
        description: "Your gratitude moment has been removed.",
      });
    } catch (error) {
      toast({
        title: "Delete failed",
        description: error instanceof Error ? error.message : "Failed to delete post. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setPostToDelete(null);
    }
  };

  const handleAvatarUpdated = async (newAvatarUrl: string) => {
    await refreshUser();
  };

  const handleStartEditName = () => {
    setNewDisplayName(user?.displayName || "");
    setIsEditingName(true);
  };

  const handleCancelEditName = () => {
    setIsEditingName(false);
    setNewDisplayName("");
  };

  const handleSaveName = async () => {
    if (!newDisplayName.trim()) {
      toast({
        title: "Name required",
        description: "Please enter a display name",
        variant: "destructive",
      });
      return;
    }

    setIsSavingName(true);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ displayName: newDisplayName.trim() }),
      });

      if (!res.ok) {
        throw new Error("Failed to update name");
      }

      await refreshUser();
      setIsEditingName(false);
      toast({
        title: "Name updated!",
        description: "Your display name has been changed.",
      });
    } catch (error) {
      toast({
        title: "Update failed",
        description: "Failed to update your name. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSavingName(false);
    }
  };

  const handleStartEditUsername = () => {
    setNewUsername(user?.username || "");
    setUsernameError("");
    setIsEditingUsername(true);
  };

  const handleCancelEditUsername = () => {
    setIsEditingUsername(false);
    setNewUsername("");
    setUsernameError("");
  };

  const handleSaveUsername = async () => {
    const trimmed = newUsername.trim().toLowerCase();
    
    if (!trimmed || trimmed.length < 3) {
      setUsernameError("Username must be at least 3 characters");
      return;
    }
    
    if (!/^[a-z0-9_]+$/.test(trimmed)) {
      setUsernameError("Only letters, numbers, and underscores allowed");
      return;
    }

    setIsSavingUsername(true);
    setUsernameError("");
    
    try {
      const res = await fetch("/api/users/username", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username: trimmed }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to update username");
      }

      await refreshUser();
      setIsEditingUsername(false);
      toast({
        title: "Username updated!",
        description: `You can now be found as @${trimmed}`,
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes("taken")) {
        setUsernameError("This username is already taken");
      } else {
        toast({
          title: "Update failed",
          description: error instanceof Error ? error.message : "Failed to update username",
          variant: "destructive",
        });
      }
    } finally {
      setIsSavingUsername(false);
    }
  };

  if (isLoading || authLoading || !user) {
    return (
      <div className="min-h-screen bg-club-blue flex items-center justify-center">
        <div className="text-white font-display text-2xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 bg-club-blue">
      <div className="relative z-10 mx-auto max-w-2xl px-4 py-6">
        <header className="mb-8 text-center bg-white/10 rounded-3xl p-6 border border-white/20 shadow-lg backdrop-blur-sm">
          
          <AvatarUploader
            currentAvatar={user.avatar}
            displayName={user.displayName || user.email}
            onAvatarUpdated={handleAvatarUpdated}
          />
          
          <div className="flex items-center justify-center gap-2 mb-1">
            {isEditingName ? (
              <div className="flex items-center gap-2">
                <Input
                  value={newDisplayName}
                  onChange={(e) => setNewDisplayName(e.target.value)}
                  className="bg-white text-club-blue font-display text-xl font-bold text-center w-48"
                  data-testid="input-display-name"
                  autoFocus
                />
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={handleSaveName}
                  disabled={isSavingName}
                  className="text-green-400 hover:text-green-300 hover:bg-green-400/20"
                  data-testid="button-save-name"
                >
                  <Check className="h-5 w-5" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={handleCancelEditName}
                  className="text-red-400 hover:text-red-300 hover:bg-red-400/20"
                  data-testid="button-cancel-name"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            ) : (
              <>
                <h2 className="font-display text-3xl font-bold text-white">
                  {user.displayName || "Set your name"}
                </h2>
                <button
                  onClick={handleStartEditName}
                  className="text-white/60 hover:text-white transition-colors p-1"
                  data-testid="button-edit-name"
                >
                  <Pencil className="h-4 w-4" />
                </button>
              </>
            )}
          </div>
          
          <div className="flex items-center justify-center gap-2 mb-1">
            {isEditingUsername ? (
              <div className="flex items-center gap-2">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-club-blue/60">@</span>
                  <Input
                    value={newUsername}
                    onChange={(e) => {
                      setNewUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''));
                      setUsernameError("");
                    }}
                    className="bg-white text-club-blue font-medium text-center w-40 pl-7"
                    data-testid="input-username"
                    autoFocus
                    maxLength={20}
                  />
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={handleSaveUsername}
                  disabled={isSavingUsername}
                  className="text-green-400 hover:text-green-300 hover:bg-green-400/20"
                  data-testid="button-save-username"
                >
                  <Check className="h-5 w-5" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={handleCancelEditUsername}
                  className="text-red-400 hover:text-red-300 hover:bg-red-400/20"
                  data-testid="button-cancel-username"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            ) : (
              <>
                <span className="text-blue-200 font-medium">
                  {user.username ? `@${user.username}` : "Set username"}
                </span>
                <button
                  onClick={handleStartEditUsername}
                  className="text-white/60 hover:text-white transition-colors p-1"
                  data-testid="button-edit-username"
                >
                  <Pencil className="h-3 w-3" />
                </button>
              </>
            )}
          </div>
          {usernameError && (
            <p className="text-red-300 text-xs font-medium mb-2">{usernameError}</p>
          )}
          <p className="text-blue-200/60 text-sm">{user.email}</p>
          
          <div className="mt-6 flex justify-center gap-8 text-center divide-x divide-white/20">
            <div className="px-4">
              <div className="font-display text-2xl font-bold text-white">{posts.length}</div>
              <div className="text-xs font-bold uppercase tracking-wider text-blue-200">Moments</div>
            </div>
          </div>
        </header>

        <div className="mb-8 flex rounded-2xl bg-blue-900/30 p-1.5 border border-white/10">
          <button
            onClick={() => setActiveTab("journal")}
            data-testid="button-tab-journal"
            className={cn(
              "flex-1 rounded-xl py-3 text-sm font-bold transition-all",
              activeTab === "journal" ? "bg-white text-club-blue shadow-md" : "text-blue-200 hover:text-white hover:bg-white/5"
            )}
          >
            Journal
          </button>
          <button
            onClick={() => setActiveTab("settings")}
            data-testid="button-tab-settings"
            className={cn(
              "flex-1 rounded-xl py-3 text-sm font-bold transition-all",
              activeTab === "settings" ? "bg-white text-club-blue shadow-md" : "text-blue-200 hover:text-white hover:bg-white/5"
            )}
          >
            Settings
          </button>
        </div>

        <div className="space-y-6">
          {activeTab === "journal" ? (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8"
            >
               <div className="relative border-l-2 border-white/20 ml-4 space-y-8 pl-8 py-2">
                 {posts.map((post) => (
                   <div key={post.id} className="relative group">
                     <div className="absolute -left-[39px] top-1 h-5 w-5 rounded-full bg-hot-orange border-4 border-club-blue" />
                     
                     <div className="flex flex-col gap-2 bg-white p-4 rounded-xl shadow-sm">
                       <div className="flex justify-between items-center">
                         <span className="text-xs font-bold text-gray-500 tracking-wider">
                           {format(new Date(post.createdAt), "d MMM ''yy")}
                         </span>
                         <button
                           onClick={() => setPostToDelete(post.id)}
                           className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-full hover:bg-red-50 text-gray-600 hover:text-red-500"
                           data-testid={`button-delete-post-${post.id}`}
                         >
                           <Trash2 className="h-4 w-4" />
                         </button>
                       </div>
                       <p className="text-lg text-club-blue font-medium leading-relaxed">
                         {post.content}
                       </p>
                     </div>
                   </div>
                 ))}
               </div>
               
               {posts.length === 0 && (
                 <div className="text-center py-12 text-blue-200 font-medium">
                   <p>You haven't shared any gratitude moments yet.</p>
                   <p className="text-sm mt-2">Start by checking in!</p>
                 </div>
               )}
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }} 
              className="space-y-3"
            >
              <button
                onClick={() => setShowHomeScreenModal(true)}
                data-testid="button-add-home-screen"
                className="w-full rounded-2xl bg-white p-4 border-b-4 border-gray-100 shadow-sm flex items-center gap-3 text-left hover:bg-gray-50 transition-colors"
              >
                <div className="rounded-full bg-green-50 p-2 text-green-600">
                  <Smartphone className="h-5 w-5" />
                </div>
                <div>
                  <span className="font-bold text-club-blue">Add to Home Screen</span>
                  <p className="text-sm text-gray-500">Quick access from your phone</p>
                </div>
              </button>
              
              <button 
                onClick={handleLogout}
                data-testid="button-logout"
                className="w-full mt-8 flex items-center justify-center gap-2 rounded-2xl bg-white/10 p-4 text-white font-bold border-2 border-white/20 transition-colors hover:bg-white/20"
              >
                <LogOut className="h-5 w-5" />
                <span className="font-bold">Log Out</span>
              </button>
            </motion.div>
          )}
        </div>
      </div>

      <Dialog open={showHomeScreenModal} onOpenChange={setShowHomeScreenModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-xl text-club-blue flex items-center gap-2">
              <Smartphone className="h-5 w-5" />
              Add to Home Screen
            </DialogTitle>
            <DialogDescription className="text-gray-600">
              Get quick access to YSMMS from your phone's home screen
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-xl">
                <div className="bg-club-blue text-white rounded-full h-6 w-6 flex items-center justify-center text-sm font-bold flex-shrink-0">1</div>
                <div>
                  <p className="font-semibold text-club-blue">Tap the Share button</p>
                  <p className="text-sm text-gray-600">In Safari, tap the share icon at the bottom of the screen</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-orange-50 rounded-xl">
                <div className="bg-hot-orange text-white rounded-full h-6 w-6 flex items-center justify-center text-sm font-bold flex-shrink-0">2</div>
                <div>
                  <p className="font-semibold text-club-blue">Select "Add to Home Screen"</p>
                  <p className="text-sm text-gray-600">Scroll down in the share menu and tap this option</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-green-50 rounded-xl">
                <div className="bg-green-600 text-white rounded-full h-6 w-6 flex items-center justify-center text-sm font-bold flex-shrink-0">3</div>
                <div>
                  <p className="font-semibold text-club-blue">Tap "Add"</p>
                  <p className="text-sm text-gray-600">The YSMMS icon will appear on your home screen</p>
                </div>
              </div>
            </div>
            <p className="text-xs text-gray-500 text-center">
              On Android, tap the menu button (three dots) and select "Add to Home Screen"
            </p>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!postToDelete} onOpenChange={(open) => !open && setPostToDelete(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-xl text-red-600 flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              Delete Post
            </DialogTitle>
            <DialogDescription className="text-gray-600">
              Are you sure you want to delete this gratitude moment? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-3 sm:justify-end">
            <Button
              variant="outline"
              onClick={() => setPostToDelete(null)}
              disabled={isDeleting}
              data-testid="button-cancel-delete"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeletePost}
              disabled={isDeleting}
              data-testid="button-confirm-delete"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
