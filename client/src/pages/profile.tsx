import { useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, Settings, UserPlus, Shield, Moon, LogOut, ChevronRight, Check } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const MOCK_FRIENDS = [
  { id: "1", name: "Sarah Miller", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=60", status: "friend" },
  { id: "2", name: "Jordan Smith", avatar: "https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=100&auto=format&fit=crop&q=60", status: "friend" },
  { id: "3", name: "Mike Johnson", avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=60", status: "pending" },
];

const SUGGESTED_FRIENDS = [
  { id: "4", name: "Emma Wilson", avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&auto=format&fit=crop&q=60" },
  { id: "5", name: "James Lee", avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&auto=format&fit=crop&q=60" },
];

export default function Profile() {
  const [activeTab, setActiveTab] = useState<"friends" | "settings">("friends");
  const [friends, setFriends] = useState(MOCK_FRIENDS);
  const [suggestions, setSuggestions] = useState(SUGGESTED_FRIENDS);

  const handleAddFriend = (id: string) => {
    const friend = suggestions.find(f => f.id === id);
    if (friend) {
      setFriends([...friends, { ...friend, status: "friend" }]);
      setSuggestions(suggestions.filter(s => s.id !== id));
    }
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-white/20 pb-20">
       {/* Subtle Gradient Ambient Light */}
      <div className="fixed top-[-20%] right-[-20%] h-[500px] w-[500px] rounded-full bg-blue-500/10 blur-[100px] pointer-events-none" />
      
      <div className="relative z-10 mx-auto max-w-2xl px-4 py-6">
        {/* Header */}
        <header className="mb-8 flex items-center justify-between">
          <Link href="/">
            <button className="rounded-full bg-zinc-900/50 p-3 text-white transition-colors hover:bg-zinc-800">
              <ArrowLeft className="h-5 w-5" />
            </button>
          </Link>
          <h1 className="font-display text-lg font-semibold">My Profile</h1>
          <div className="w-11" /> {/* Spacer for alignment */}
        </header>

        {/* Profile Card */}
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="relative mb-4">
            <img 
              src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80" 
              alt="Profile" 
              className="h-24 w-24 rounded-full object-cover ring-4 ring-zinc-900"
            />
            <div className="absolute bottom-0 right-0 rounded-full bg-green-500 p-1.5 ring-4 ring-black">
              <div className="h-2 w-2 rounded-full bg-white" />
            </div>
          </div>
          <h2 className="mb-1 font-display text-2xl font-bold">You</h2>
          <p className="text-zinc-500">@grateful_soul</p>
          
          <div className="mt-6 flex gap-8 text-center">
            <div>
              <div className="font-display text-xl font-bold">248</div>
              <div className="text-xs font-medium uppercase tracking-wider text-zinc-600">Moments</div>
            </div>
            <div>
              <div className="font-display text-xl font-bold">14</div>
              <div className="text-xs font-medium uppercase tracking-wider text-zinc-600">Streaks</div>
            </div>
            <div>
              <div className="font-display text-xl font-bold">{friends.length}</div>
              <div className="text-xs font-medium uppercase tracking-wider text-zinc-600">Friends</div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex rounded-2xl bg-zinc-900/50 p-1">
          <button
            onClick={() => setActiveTab("friends")}
            className={cn(
              "flex-1 rounded-xl py-2.5 text-sm font-medium transition-all",
              activeTab === "friends" ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-300"
            )}
          >
            Friends
          </button>
          <button
            onClick={() => setActiveTab("settings")}
            className={cn(
              "flex-1 rounded-xl py-2.5 text-sm font-medium transition-all",
              activeTab === "settings" ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-300"
            )}
          >
            Settings
          </button>
        </div>

        {/* Content */}
        <div className="space-y-6">
          {activeTab === "friends" ? (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8"
            >
              {/* Add Friends Section */}
              <section>
                <h3 className="mb-4 flex items-center gap-2 text-sm font-medium text-zinc-500 uppercase tracking-wider">
                  <UserPlus className="h-4 w-4" /> Suggested
                </h3>
                <div className="space-y-3">
                  {suggestions.map((user) => (
                    <div key={user.id} className="flex items-center justify-between rounded-2xl bg-zinc-900/30 p-4 border border-white/5">
                      <div className="flex items-center gap-3">
                        <img src={user.avatar} alt={user.name} className="h-10 w-10 rounded-full object-cover" />
                        <span className="font-medium">{user.name}</span>
                      </div>
                      <button 
                        onClick={() => handleAddFriend(user.id)}
                        className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-black transition-transform active:scale-95"
                      >
                        <UserPlus className="h-3.5 w-3.5" /> Add
                      </button>
                    </div>
                  ))}
                  {suggestions.length === 0 && (
                    <div className="p-4 text-center text-sm text-zinc-600 italic">
                      No new suggestions right now.
                    </div>
                  )}
                </div>
              </section>

              {/* My Friends List */}
              <section>
                <h3 className="mb-4 text-sm font-medium text-zinc-500 uppercase tracking-wider">
                  Your Circle
                </h3>
                <div className="space-y-3">
                  {friends.map((friend) => (
                    <div key={friend.id} className="flex items-center justify-between rounded-2xl bg-zinc-900/30 p-4 border border-white/5">
                      <div className="flex items-center gap-3">
                        <img src={friend.avatar} alt={friend.name} className="h-10 w-10 rounded-full object-cover" />
                        <div>
                          <div className="font-medium">{friend.name}</div>
                          {friend.status === 'pending' && <div className="text-xs text-zinc-500">Request sent</div>}
                        </div>
                      </div>
                      <div className="h-8 w-8 flex items-center justify-center rounded-full bg-zinc-800 text-zinc-500">
                        <ChevronRight className="h-4 w-4" />
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }} 
              className="space-y-2"
            >
              {[
                { icon: Shield, label: "Privacy", value: "Friends Only" },
                { icon: Moon, label: "Appearance", value: "Dark Aura" },
              ].map((item, i) => (
                <button key={i} className="w-full flex items-center justify-between rounded-2xl bg-zinc-900/30 p-4 border border-white/5 transition-colors hover:bg-zinc-900/50">
                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-zinc-800 p-2 text-zinc-400">
                      <item.icon className="h-4 w-4" />
                    </div>
                    <span className="font-medium">{item.label}</span>
                  </div>
                  <div className="flex items-center gap-2 text-zinc-500">
                    <span className="text-sm">{item.value}</span>
                    <ChevronRight className="h-4 w-4" />
                  </div>
                </button>
              ))}
              
              <button className="w-full mt-8 flex items-center justify-center gap-2 rounded-2xl bg-red-500/10 p-4 text-red-400 transition-colors hover:bg-red-500/20">
                <LogOut className="h-4 w-4" />
                <span className="font-medium">Log Out</span>
              </button>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
