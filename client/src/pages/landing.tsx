import { useMemo } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { ArrowRight, Quote } from "lucide-react";

const GRATITUDE_QUOTES = [
  { quote: "Let us be grateful to people who make us happy; they are the charming gardeners who make our souls blossom.", author: "Marcel Proust" },
  { quote: "Gratitude unlocks the fullness of life. It turns what we have into enough, and more. It turns denial into acceptance, chaos to order, confusion to clarity. It can turn a meal into a feast, a house into a home, a stranger into a friend. Gratitude makes sense of our past, brings peace for today and creates a vision for tomorrow.", author: "Melody Beattie" },
  { quote: "Acknowledging the good that you already have in your life is the foundation for all abundance.", author: "Eckhart Tolle" },
  { quote: "Wear gratitude like a cloak, and it will feed every corner of your life.", author: "Rumi" },
  { quote: "When we focus on our gratitude, the tide of disappointment goes out and the tide of love rushes in.", author: "Kristin Armstrong" },
  { quote: "Silent gratitude isn't very much to anyone.", author: "Gertrude Stein" },
  { quote: "Enjoy the little things, for one day you may look back and realize they were the big things.", author: "Robert Brault" },
  { quote: "Some people grumble that roses have thorns; I am grateful that thorns have roses.", author: "Alphonse Karr" },
  { quote: "The more grateful I am, the more beauty I see.", author: "Mary Davis" },
  { quote: "Gratitude is when memory is stored in the heart and not in the mind.", author: "Lionel Hampton" },
];

function getDailyQuote() {
  const today = new Date();
  const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
  const quoteIndex = dayOfYear % GRATITUDE_QUOTES.length;
  return GRATITUDE_QUOTES[quoteIndex];
}

export default function LandingPage() {
  const dailyQuote = useMemo(() => getDailyQuote(), []);

  return (
    <div className="min-h-screen bg-club-blue text-white font-sans flex flex-col items-center justify-center p-6 relative overflow-hidden">
      
      <div className="w-full max-w-xs flex flex-col items-center justify-center flex-1">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="mb-6 relative"
        >
          <div className="h-28 w-28 rounded-full bg-cream flex items-center justify-center border-4 border-hot-orange shadow-xl">
            <h1 className="font-display text-2xl font-bold text-club-blue tracking-tighter">YSMMS</h1>
          </div>
          <div className="absolute -inset-3 border-2 border-dashed border-white/30 rounded-full animate-spin-slow pointer-events-none" style={{ animationDuration: '10s' }} />
        </motion.div>

        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-center mb-6"
        >
          <h2 className="font-display text-3xl font-bold text-cream mb-1">
            shared gratitude
          </h2>
          <p className="text-blue-200 text-sm font-medium">Your Smile Makes Me Smile</p>
        </motion.div>

        <Link href="/auth">
          <motion.button 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            data-testid="button-enter"
            className="group relative inline-flex items-center gap-3 bg-blue-600 hover:bg-blue-700 text-white font-bold px-10 py-3 rounded-full text-lg shadow-lg transition-all active:scale-95 mb-6"
          >
            <span>Sign In</span>
            <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
          </motion.button>
        </Link>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="w-full mt-4"
        >
          <div 
            className="rounded-2xl bg-cream px-5 pt-6 pb-5 shadow-lg border-b-4 border-blue-900/10" 
            data-testid="card-daily-quote"
          >
            <div className="flex items-start gap-3">
              <Quote className="h-5 w-5 text-hot-orange flex-shrink-0 mt-0.5" />
              <div className="space-y-3 flex-1">
                <p className="text-base font-medium leading-relaxed text-black font-sans italic">
                  "{dailyQuote.quote}"
                </p>
                <p className="text-sm font-bold text-gray-500 text-right">
                  — {dailyQuote.author}
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
