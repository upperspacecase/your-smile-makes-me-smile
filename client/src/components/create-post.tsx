import { useState } from "react";
import { Plus, Send } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface CreatePostProps {
  onSubmit: (content: string) => void;
}

export function CreatePost({ onSubmit }: CreatePostProps) {
  const [content, setContent] = useState("");
  const [isFocused, setIsFocused] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (content.trim()) {
      onSubmit(content);
      setContent("");
      setIsFocused(false);
    }
  };

  return (
    <motion.form
      layout
      onSubmit={handleSubmit}
      className={`relative overflow-hidden rounded-2xl bg-white border-2 p-1 shadow-xl transition-all duration-300 ${
        isFocused ? "border-hot-orange ring-4 ring-hot-orange/20" : "border-transparent"
      }`}
      data-testid="form-create-post"
    >
      <div className="flex flex-col gap-2 p-4">
         <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-hot-orange text-white font-bold shadow-md">
              <Plus className="h-6 w-6" />
            </div>
            <div className="flex-1 min-h-[3rem] flex items-center">
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => !content && setIsFocused(false)}
                placeholder="Today I'm grateful for..."
                className="w-full resize-none bg-transparent text-lg font-medium text-club-blue placeholder:text-gray-400 focus:outline-none"
                rows={isFocused ? 3 : 1}
                data-testid="input-post-content"
              />
            </div>
         </div>

          <AnimatePresence>
            {isFocused && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="flex justify-end pt-2 border-t border-gray-100 mt-2"
              >
                <button
                  type="submit"
                  disabled={!content.trim()}
                  className="flex items-center gap-2 rounded-xl bg-club-blue px-6 py-3 text-sm font-bold text-white transition-transform hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 shadow-md"
                  data-testid="button-submit-post"
                >
                  POST IT <Send className="h-3.5 w-3.5" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
      </div>
    </motion.form>
  );
}
