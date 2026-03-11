import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useSearch, useLocation } from "wouter";
import { Heart, Mail, CheckCircle, Loader2, Smartphone, User, ArrowRight, AtSign } from "lucide-react";

type AuthStep = "email" | "check-email" | "onboarding" | "welcome-tips";

export default function AuthPage() {
  const search = useSearch();
  const [, setLocation] = useLocation();
  const params = new URLSearchParams(search);
  const tokenFromUrl = params.get("token");

  const [step, setStep] = useState<AuthStep>("email");
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [usernameError, setUsernameError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  
  const { requestMagicLink, verifyMagicLink, completeProfile, user, loading } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!loading && user && user.displayName && step !== "welcome-tips" && step !== "onboarding") {
      setLocation("/check-in");
    }
  }, [user, loading, setLocation, step]);

  useEffect(() => {
    if (tokenFromUrl && !verifying) {
      handleVerifyToken(tokenFromUrl);
    }
  }, [tokenFromUrl]);

  async function handleVerifyToken(token: string) {
    setVerifying(true);
    try {
      const result = await verifyMagicLink(token);
      if (result.needsOnboarding) {
        setStep("onboarding");
      } else {
        setLocation("/check-in");
      }
    } catch (error) {
      toast({
        title: "Invalid or Expired Link",
        description: error instanceof Error ? error.message : "Please request a new magic link",
        variant: "destructive",
      });
      setStep("email");
    } finally {
      setVerifying(false);
    }
  }

  async function handleRequestLink(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);

    try {
      await requestMagicLink(email);
      setStep("check-email");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send magic link",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCompleteProfile(e: React.FormEvent) {
    e.preventDefault();
    setUsernameError("");
    
    if (!username || username.trim().length < 3) {
      setUsernameError("Username must be at least 3 characters");
      return;
    }
    
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      setUsernameError("Username can only contain letters, numbers, and underscores");
      return;
    }
    
    setIsLoading(true);

    try {
      await completeProfile(displayName, username);
      setStep("welcome-tips");
    } catch (error) {
      if (error instanceof Error && error.message.includes("taken")) {
        setUsernameError("This username is already taken");
      } else {
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to complete profile",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  }

  if (verifying) {
    return (
      <div className="min-h-screen bg-club-blue text-white font-sans flex flex-col items-center justify-center p-6">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center"
        >
          <Loader2 className="h-16 w-16 animate-spin text-hot-orange mx-auto mb-4" />
          <h2 className="font-display text-2xl font-bold">Signing you in...</h2>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-club-blue text-white font-sans flex flex-col items-center justify-center p-6">
      <motion.div 
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-6">
          <div className="inline-flex h-20 w-20 rounded-full bg-cream items-center justify-center border-4 border-hot-orange shadow-xl mb-3">
            <h1 className="font-display text-xl font-bold text-club-blue tracking-tighter">YSMMS</h1>
          </div>
          <h2 className="font-display text-3xl font-bold text-white mb-1">shared gratitude</h2>
          <p className="text-blue-200 text-sm font-medium">Your Smile Makes Me Smile</p>
        </div>

        {step === "email" && (
          <>
            <Card className="border-4 border-hot-orange bg-cream shadow-xl mb-4">
              <CardHeader className="pb-3">
                <CardTitle className="text-club-blue font-display text-xl">
                  Welcome
                </CardTitle>
                <CardDescription className="text-club-blue/70">
                  <span className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    <span>Enter your email to sign in or join</span>
                  </span>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleRequestLink} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-club-blue font-semibold">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      data-testid="input-email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      required
                      className="border-2 border-club-blue"
                    />
                  </div>

                  <Button
                    type="submit"
                    data-testid="button-submit"
                    disabled={isLoading}
                    className="w-full bg-hot-orange hover:bg-orange-600 text-white font-bold py-3 rounded-xl text-lg shadow-lg"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      "Send Magic Link"
                    )}
                  </Button>
                </form>

                <p className="mt-4 text-center text-sm text-club-blue/60">
                  No password needed! We'll email you a secure sign-in link.
                </p>
              </CardContent>
            </Card>
          </>
        )}

        {step === "check-email" && (
          <Card className="border-4 border-hot-orange bg-cream shadow-xl">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
                <CheckCircle className="h-10 w-10 text-green-600" />
              </div>
              <CardTitle className="text-club-blue font-display text-2xl">
                Check Your Email!
              </CardTitle>
              <CardDescription className="text-club-blue/70">
                We sent a magic link to <strong>{email}</strong>
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-club-blue/80">
                Click the link in your email to sign in. The link expires in 15 minutes.
              </p>
              <Button
                variant="outline"
                onClick={() => setStep("email")}
                className="border-2 border-club-blue text-club-blue hover:bg-club-blue hover:text-white"
              >
                Use a different email
              </Button>
            </CardContent>
          </Card>
        )}

        {step === "onboarding" && (
          <Card className="border-4 border-hot-orange bg-cream shadow-xl">
            <CardHeader>
              <CardTitle className="text-club-blue font-display text-2xl">
                <span className="flex items-center gap-2">
                  <Heart className="h-6 w-6 text-hot-orange fill-current" />
                  Welcome to YSMMS!
                </span>
              </CardTitle>
              <CardDescription className="text-club-blue/70">
                Set up your profile so friends can find you
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCompleteProfile} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="displayName" className="text-club-blue font-semibold">Your Name</Label>
                  <Input
                    id="displayName"
                    data-testid="input-displayname"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="How friends know you"
                    required
                    className="border-2 border-club-blue"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="username" className="text-club-blue font-semibold flex items-center gap-1">
                    <AtSign className="h-4 w-4" />
                    Username
                  </Label>
                  <Input
                    id="username"
                    data-testid="input-username"
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''));
                      setUsernameError("");
                    }}
                    placeholder="your_username"
                    required
                    className="border-2 border-club-blue"
                    maxLength={20}
                  />
                  {usernameError && (
                    <p className="text-sm text-red-500 font-medium">{usernameError}</p>
                  )}
                  <p className="text-xs text-club-blue/60">
                    Friends can find you by searching @{username || "username"}
                  </p>
                </div>

                <Button
                  type="submit"
                  data-testid="button-complete-profile"
                  disabled={isLoading || !displayName || !username}
                  className="w-full bg-hot-orange hover:bg-orange-600 text-white font-bold py-3 rounded-xl text-lg shadow-lg"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Continue"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {step === "welcome-tips" && (
          <Card className="border-4 border-hot-orange bg-cream shadow-xl">
            <CardHeader>
              <CardTitle className="text-club-blue font-display text-2xl">
                <span className="flex items-center gap-2">
                  <Heart className="h-6 w-6 text-hot-orange fill-current" />
                  You're all set!
                </span>
              </CardTitle>
              <CardDescription className="text-club-blue/70">
                A couple of quick tips before you start
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 bg-green-50 rounded-xl border border-green-100">
                  <div className="rounded-full bg-green-600 p-2 text-white flex-shrink-0">
                    <Smartphone className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-bold text-club-blue">Add to Home Screen</p>
                    <p className="text-sm text-gray-600">Tap the share button in your browser and select "Add to Home Screen" for quick access</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-xl border border-blue-100">
                  <div className="rounded-full bg-club-blue p-2 text-white flex-shrink-0">
                    <User className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-bold text-club-blue">Add a Profile Photo</p>
                    <p className="text-sm text-gray-600">Go to the "Me" tab at the bottom to add your profile picture and customize your profile</p>
                  </div>
                </div>
              </div>

              <Button
                onClick={() => setLocation("/check-in")}
                data-testid="button-start-app"
                className="w-full bg-hot-orange hover:bg-orange-600 text-white font-bold py-3 rounded-xl text-lg shadow-lg"
              >
                Start Sharing Gratitude
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </CardContent>
          </Card>
        )}
      </motion.div>
    </div>
  );
}
