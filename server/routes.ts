import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { sendMagicLinkEmail } from "./email";
import { insertPostSchema, usernameSchema } from "@shared/schema";
import { z } from "zod";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import multer from "multer";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(null, false);
    }
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  app.post("/api/auth/magic-link", async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email || !z.string().email().safeParse(email).success) {
        return res.status(400).json({ error: "Valid email required" });
      }

      const normalizedEmail = email.toLowerCase();

      const invite = await storage.getPendingInviteByEmail(normalizedEmail);
      const inviterName = invite?.inviterName || undefined;

      const magicToken = await storage.createMagicToken(normalizedEmail);
      
      const baseUrl = `${req.protocol}://${req.get("host")}`;
      await sendMagicLinkEmail(normalizedEmail, magicToken.token, baseUrl, inviterName);

      res.json({ success: true, message: "Magic link sent! Check your email." });
    } catch (error) {
      console.error("Magic link error:", error);
      res.status(500).json({ error: "Failed to send magic link" });
    }
  });

  app.get("/api/auth/verify", async (req, res) => {
    try {
      const { token } = req.query;
      
      if (!token || typeof token !== "string") {
        return res.status(400).json({ error: "Token required" });
      }

      const magicToken = await storage.getMagicToken(token);
      
      if (!magicToken) {
        return res.status(400).json({ error: "Invalid or expired token" });
      }

      if (new Date() > magicToken.expiresAt) {
        return res.status(400).json({ error: "Token has expired" });
      }

      try {
        await storage.useMagicToken(token);
      } catch (useError) {
        return res.status(400).json({ error: "This link has been used too many times or has expired" });
      }

      let user = await storage.getUserByEmail(magicToken.email);
      
      if (!user) {
        user = await storage.createUser({
          email: magicToken.email,
          displayName: null,
          avatar: null,
        });

        const invite = await storage.getPendingInviteByEmail(magicToken.email);
        if (invite && invite.inviterId) {
          await storage.acceptInvite(invite.id, user.id);
          
          const friendship1 = await storage.createFriendship(invite.inviterId, user.id);
          const friendship2 = await storage.createFriendship(user.id, invite.inviterId);
          await storage.acceptFriendRequest(friendship1.id);
          await storage.acceptFriendRequest(friendship2.id);
        }
      }

      if (req.session) {
        req.session.userId = user.id;
        await new Promise<void>((resolve, reject) => {
          req.session.save((err) => {
            if (err) reject(err);
            else resolve();
          });
        });
      }

      res.json({ success: true, user, needsOnboarding: !user.displayName });
    } catch (error) {
      console.error("Verify error:", error);
      res.status(500).json({ error: "Failed to verify token" });
    }
  });

  app.post("/api/auth/complete-profile", async (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { displayName, username } = req.body;
      
      if (!displayName || displayName.trim().length < 1) {
        return res.status(400).json({ error: "Display name required" });
      }

      if (!username) {
        return res.status(400).json({ error: "Username required" });
      }

      const usernameResult = usernameSchema.safeParse(username);
      if (!usernameResult.success) {
        return res.status(400).json({ error: usernameResult.error.errors[0]?.message });
      }

      const taken = await storage.isUsernameTaken(username);
      if (taken) {
        return res.status(400).json({ error: "Username is already taken" });
      }

      const user = await storage.updateUser(req.session.userId, {
        displayName: displayName.trim(),
        username: username.toLowerCase(),
      });

      res.json(user);
    } catch (error) {
      res.status(500).json({ error: "Failed to update profile" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session?.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: "Logout failed" });
      }
      res.json({ success: true });
    });
  });

  app.get("/api/auth/me", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const user = await storage.getUser(req.session.userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(user);
  });

  app.get("/api/users/search", async (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { q } = req.query;
      if (!q || typeof q !== "string") {
        return res.json([]);
      }

      const users = await storage.searchUsersByUsername(q, req.session.userId);
      res.json(users);
    } catch (error) {
      res.status(500).json({ error: "Failed to search users" });
    }
  });

  app.get("/api/users/check-username/:username", async (req, res) => {
    try {
      const { username } = req.params;
      const result = usernameSchema.safeParse(username);
      
      if (!result.success) {
        return res.json({ available: false, error: result.error.errors[0]?.message });
      }

      const taken = await storage.isUsernameTaken(username);
      res.json({ available: !taken });
    } catch (error) {
      res.status(500).json({ error: "Failed to check username" });
    }
  });

  app.post("/api/users/username", async (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { username } = req.body;
      const result = usernameSchema.safeParse(username);
      
      if (!result.success) {
        return res.status(400).json({ error: result.error.errors[0]?.message });
      }

      const currentUser = await storage.getUser(req.session.userId);
      if (currentUser?.username === username.toLowerCase()) {
        return res.json(currentUser);
      }

      const taken = await storage.isUsernameTaken(username);
      if (taken) {
        return res.status(400).json({ error: "Username is already taken" });
      }

      const user = await storage.updateUser(req.session.userId, { username: username.toLowerCase() });
      res.json(user);
    } catch (error) {
      res.status(500).json({ error: "Failed to update username" });
    }
  });

  app.get("/api/posts", async (req, res) => {
    try {
      const currentUserId = req.session?.userId;
      const friendsOnly = req.query.filter === "friends";
      const posts = await storage.getPosts(currentUserId, friendsOnly);
      res.json(posts);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch posts" });
    }
  });

  app.get("/api/posts/mine", async (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const posts = await storage.getUserPosts(req.session.userId, req.session.userId);
      res.json(posts);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch posts" });
    }
  });

  app.get("/api/posts/user/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const currentUserId = req.session?.userId;
      const posts = await storage.getUserPosts(userId, currentUserId);
      res.json(posts);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch user posts" });
    }
  });

  app.post("/api/posts", async (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { content } = insertPostSchema.parse(req.body);
      const post = await storage.createPost({
        content,
        userId: req.session.userId
      });

      res.json(post);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create post" });
    }
  });

  app.delete("/api/posts/:postId", async (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { postId } = req.params;
      const deleted = await storage.deletePost(postId, req.session.userId);
      
      if (!deleted) {
        return res.status(404).json({ error: "Post not found" });
      }
      
      res.json({ success: true });
    } catch (error) {
      if (error instanceof Error && error.message.includes("Not authorized")) {
        return res.status(403).json({ error: "Not authorized to delete this post" });
      }
      res.status(500).json({ error: "Failed to delete post" });
    }
  });

  app.post("/api/posts/:postId/love", async (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { postId } = req.params;
      const like = await storage.likePost(req.session.userId, postId);
      res.json(like);
    } catch (error) {
      res.status(500).json({ error: "Failed to love post" });
    }
  });

  app.delete("/api/posts/:postId/love", async (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { postId } = req.params;
      await storage.unlikePost(req.session.userId, postId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to unlove post" });
    }
  });

  app.get("/api/friends", async (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const friends = await storage.getFriends(req.session.userId);
      res.json(friends);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch friends" });
    }
  });

  app.get("/api/friends/requests/incoming", async (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const requests = await storage.getIncomingFriendRequests(req.session.userId);
      res.json(requests);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch incoming requests" });
    }
  });

  app.get("/api/friends/requests/outgoing", async (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const requests = await storage.getOutgoingFriendRequests(req.session.userId);
      res.json(requests);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch outgoing requests" });
    }
  });

  app.post("/api/friends/requests/:requestId/accept", async (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { requestId } = req.params;
      await storage.acceptFriendRequest(requestId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to accept friend request" });
    }
  });

  app.post("/api/friends/requests/:requestId/decline", async (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { requestId } = req.params;
      await storage.declineFriendRequest(requestId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to decline friend request" });
    }
  });

  app.delete("/api/friends/requests/:requestId", async (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { requestId } = req.params;
      await storage.cancelFriendRequest(requestId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to cancel friend request" });
    }
  });

  app.post("/api/friends/:friendId", async (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { friendId } = req.params;
      const friendship = await storage.createFriendship(req.session.userId, friendId);
      res.json(friendship);
    } catch (error) {
      res.status(500).json({ error: "Failed to add friend" });
    }
  });

  app.delete("/api/friends/:friendId", async (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { friendId } = req.params;
      await storage.removeFriendship(req.session.userId, friendId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to remove friend" });
    }
  });

  app.post("/api/invites", async (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { email } = req.body;
      
      if (!email || !z.string().email().safeParse(email).success) {
        return res.status(400).json({ error: "Valid email required" });
      }

      const normalizedEmail = email.toLowerCase();

      const existingUser = await storage.getUserByEmail(normalizedEmail);
      if (existingUser) {
        return res.status(400).json({ error: "This person already has an account" });
      }

      const existingInvite = await storage.getInviteByEmail(normalizedEmail);
      if (existingInvite) {
        return res.status(400).json({ error: "This person has already been invited" });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const invite = await storage.createInvite(user.id, user.displayName || "A friend", normalizedEmail);

      const magicToken = await storage.createMagicToken(normalizedEmail);
      const baseUrl = `${req.protocol}://${req.get("host")}`;
      await sendMagicLinkEmail(normalizedEmail, magicToken.token, baseUrl, user.displayName || "A friend");

      res.json(invite);
    } catch (error) {
      console.error("Invite error:", error);
      res.status(500).json({ error: "Failed to send invite" });
    }
  });

  app.get("/api/invites", async (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const invites = await storage.getUserInvites(req.session.userId);
      res.json(invites);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch invites" });
    }
  });

  app.delete("/api/invites/:inviteId", async (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { inviteId } = req.params;
      await storage.deleteInvite(inviteId, req.session.userId);
      res.json({ success: true });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes("Not authorized")) {
          return res.status(403).json({ error: error.message });
        }
        if (error.message.includes("not found")) {
          return res.status(404).json({ error: error.message });
        }
      }
      res.status(500).json({ error: "Failed to cancel invite" });
    }
  });

  app.get("/objects/:objectPath(*)", async (req, res) => {
    const objectStorageService = new ObjectStorageService();
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(req.path);
      const canAccess = await objectStorageService.canAccessObjectEntity({
        objectFile,
        userId: req.session?.userId,
      });
      if (!canAccess) {
        return res.sendStatus(403);
      }
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error serving object:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  app.post("/api/objects/upload", async (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const objectStorageService = new ObjectStorageService();
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      res.json({ uploadURL });
    } catch (error) {
      console.error("Upload URL error:", error);
      res.status(500).json({ error: "Failed to get upload URL" });
    }
  });

  app.post("/api/user/avatar/upload", upload.single("avatar"), async (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      if (!req.file) {
        return res.status(400).json({ error: "Please select an image file (JPEG, PNG, etc.)" });
      }

      const objectStorageService = new ObjectStorageService();
      
      const avatarPath = await objectStorageService.uploadFileServerSide(
        req.file.buffer,
        req.file.mimetype
      );

      await objectStorageService.trySetObjectEntityAclPolicy(
        avatarPath,
        {
          owner: req.session.userId,
          visibility: "public",
        }
      );

      await storage.updateUser(req.session.userId, { avatar: avatarPath });
      res.json({ avatarPath });
    } catch (error) {
      console.error("Avatar upload error:", error);
      res.status(500).json({ error: "Failed to upload avatar" });
    }
  });

  app.put("/api/user/avatar", async (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { avatarURL } = req.body;
      if (!avatarURL) {
        return res.status(400).json({ error: "avatarURL is required" });
      }

      const objectStorageService = new ObjectStorageService();
      
      try {
        const avatarPath = await objectStorageService.trySetObjectEntityAclPolicy(
          avatarURL,
          {
            owner: req.session.userId,
            visibility: "public",
          }
        );

        await storage.updateUser(req.session.userId, { avatar: avatarPath });
        res.json({ avatarPath });
      } catch (aclError) {
        if (aclError instanceof Error && aclError.message.includes("ownership")) {
          return res.status(403).json({ error: "Cannot use this image" });
        }
        throw aclError;
      }
    } catch (error) {
      console.error("Avatar update error:", error);
      res.status(500).json({ error: "Failed to update avatar" });
    }
  });

  app.put("/api/user/profile", async (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { displayName } = req.body;
      
      if (displayName !== undefined && displayName.trim().length < 1) {
        return res.status(400).json({ error: "Display name cannot be empty" });
      }

      const user = await storage.updateUser(req.session.userId, {
        displayName: displayName?.trim(),
      });

      res.json(user);
    } catch (error) {
      console.error("Profile update error:", error);
      res.status(500).json({ error: "Failed to update profile" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
