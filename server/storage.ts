import { 
  type User, 
  type InsertUser, 
  type Post, 
  type InsertPost,
  type Like,
  type Friendship,
  type MagicToken,
  type Invite,
  users,
  posts,
  likes,
  friendships,
  magicTokens,
  invites
} from "@shared/schema";
import { db } from "../db";
import { eq, and, desc, sql, isNull, lt, gt, or, inArray } from "drizzle-orm";
import crypto from "crypto";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  searchUsersByUsername(query: string, currentUserId: string): Promise<User[]>;
  isUsernameTaken(username: string): Promise<boolean>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, data: Partial<InsertUser>): Promise<User>;
  
  getPosts(currentUserId?: string, friendsOnly?: boolean): Promise<(Post & { user: User; likeCount: number; isLiked: boolean })[]>;
  getUserPosts(userId: string, currentUserId?: string): Promise<(Post & { user: User; likeCount: number; isLiked: boolean })[]>;
  getPost(id: string): Promise<Post | undefined>;
  createPost(post: InsertPost & { userId: string }): Promise<Post>;
  deletePost(postId: string, userId: string): Promise<boolean>;
  
  likePost(userId: string, postId: string): Promise<Like>;
  unlikePost(userId: string, postId: string): Promise<void>;
  hasLikedPost(userId: string, postId: string): Promise<boolean>;

  getFriends(userId: string): Promise<User[]>;
  getIncomingFriendRequests(userId: string): Promise<(Friendship & { user: User })[]>;
  getOutgoingFriendRequests(userId: string): Promise<(Friendship & { user: User })[]>;
  createFriendship(userId: string, friendId: string): Promise<Friendship>;
  acceptFriendRequest(friendshipId: string): Promise<Friendship>;
  declineFriendRequest(friendshipId: string): Promise<void>;
  cancelFriendRequest(friendshipId: string): Promise<void>;
  removeFriendship(userId: string, friendId: string): Promise<void>;
  hasPendingRequest(userId: string, friendId: string): Promise<boolean>;

  createMagicToken(email: string): Promise<MagicToken>;
  getMagicToken(token: string): Promise<MagicToken | undefined>;
  useMagicToken(token: string): Promise<MagicToken>;
  cleanExpiredTokens(): Promise<void>;

  createInvite(inviterId: string, inviterName: string, inviteeEmail: string): Promise<Invite>;
  createSelfInvite(email: string): Promise<Invite>;
  getInviteByEmail(email: string): Promise<Invite | undefined>;
  getPendingInviteByEmail(email: string): Promise<Invite | undefined>;
  acceptInvite(inviteId: string, inviteeId: string): Promise<Invite>;
  getUserInvites(userId: string): Promise<Invite[]>;
  deleteInvite(inviteId: string, userId: string): Promise<void>;
  canUserSignUp(email: string): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase()));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username.toLowerCase()));
    return user;
  }

  async searchUsersByUsername(query: string, currentUserId: string): Promise<User[]> {
    const normalizedQuery = query.toLowerCase().replace(/^@/, '');
    if (normalizedQuery.length < 1) return [];
    
    const results = await db
      .select()
      .from(users)
      .where(sql`${users.username} ILIKE ${`%${normalizedQuery}%`} AND ${users.id} != ${currentUserId}`)
      .limit(10);
    return results;
  }

  async isUsernameTaken(username: string): Promise<boolean> {
    const [user] = await db.select().from(users).where(eq(users.username, username.toLowerCase()));
    return !!user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values({
      ...insertUser,
      email: insertUser.email.toLowerCase(),
    }).returning();
    return user;
  }

  async updateUser(id: string, data: Partial<InsertUser>): Promise<User> {
    const [user] = await db.update(users).set(data).where(eq(users.id, id)).returning();
    return user;
  }

  async getPosts(currentUserId?: string, friendsOnly?: boolean): Promise<(Post & { user: User; likeCount: number; isLiked: boolean })[]> {
    let friendIds: string[] = [];
    
    if (friendsOnly && currentUserId) {
      const friends = await this.getFriends(currentUserId);
      friendIds = friends.map(f => f.id);
      friendIds.push(currentUserId);
    }

    const baseQuery = db
      .select({
        post: posts,
        user: users,
      })
      .from(posts)
      .innerJoin(users, eq(posts.userId, users.id));

    const allPosts = friendsOnly && currentUserId && friendIds.length > 0
      ? await baseQuery.where(inArray(posts.userId, friendIds)).orderBy(desc(posts.createdAt))
      : await baseQuery.orderBy(desc(posts.createdAt));

    const postsWithCounts = await Promise.all(
      allPosts.map(async ({ post, user }: { post: Post; user: User }) => {
        const [{ count }] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(likes)
          .where(eq(likes.postId, post.id));

        let isLiked = false;
        if (currentUserId) {
          const [like] = await db
            .select()
            .from(likes)
            .where(and(eq(likes.postId, post.id), eq(likes.userId, currentUserId)));
          isLiked = !!like;
        }

        return {
          ...post,
          user,
          likeCount: count || 0,
          isLiked,
        };
      })
    );

    return postsWithCounts;
  }

  async getUserPosts(userId: string, currentUserId?: string): Promise<(Post & { user: User; likeCount: number; isLiked: boolean })[]> {
    const userPosts = await db
      .select({
        post: posts,
        user: users,
      })
      .from(posts)
      .innerJoin(users, eq(posts.userId, users.id))
      .where(eq(posts.userId, userId))
      .orderBy(desc(posts.createdAt));

    const postsWithCounts = await Promise.all(
      userPosts.map(async ({ post, user }: { post: Post; user: User }) => {
        const [{ count }] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(likes)
          .where(eq(likes.postId, post.id));

        let isLiked = false;
        if (currentUserId) {
          const [like] = await db
            .select()
            .from(likes)
            .where(and(eq(likes.postId, post.id), eq(likes.userId, currentUserId)));
          isLiked = !!like;
        }

        return {
          ...post,
          user,
          likeCount: count || 0,
          isLiked,
        };
      })
    );

    return postsWithCounts;
  }

  async getPost(id: string): Promise<Post | undefined> {
    const [post] = await db.select().from(posts).where(eq(posts.id, id));
    return post;
  }

  async createPost(insertPost: InsertPost & { userId: string }): Promise<Post> {
    const [post] = await db.insert(posts).values(insertPost).returning();
    return post;
  }

  async deletePost(postId: string, userId: string): Promise<boolean> {
    const [post] = await db.select().from(posts).where(eq(posts.id, postId));
    if (!post) {
      return false;
    }
    if (post.userId !== userId) {
      throw new Error("Not authorized to delete this post");
    }
    await db.delete(likes).where(eq(likes.postId, postId));
    await db.delete(posts).where(eq(posts.id, postId));
    return true;
  }

  async likePost(userId: string, postId: string): Promise<Like> {
    const existing = await db
      .select()
      .from(likes)
      .where(and(eq(likes.userId, userId), eq(likes.postId, postId)));
    
    if (existing.length > 0) {
      return existing[0];
    }

    const [like] = await db.insert(likes).values({ userId, postId }).returning();
    return like;
  }

  async unlikePost(userId: string, postId: string): Promise<void> {
    await db
      .delete(likes)
      .where(and(eq(likes.userId, userId), eq(likes.postId, postId)));
  }

  async hasLikedPost(userId: string, postId: string): Promise<boolean> {
    const [like] = await db
      .select()
      .from(likes)
      .where(and(eq(likes.userId, userId), eq(likes.postId, postId)));
    return !!like;
  }

  async getFriends(userId: string): Promise<User[]> {
    const outgoingFriends = await db
      .select({ user: users })
      .from(friendships)
      .innerJoin(users, eq(friendships.friendId, users.id))
      .where(and(eq(friendships.userId, userId), eq(friendships.status, "accepted")));

    const incomingFriends = await db
      .select({ user: users })
      .from(friendships)
      .innerJoin(users, eq(friendships.userId, users.id))
      .where(and(eq(friendships.friendId, userId), eq(friendships.status, "accepted")));

    const allFriends = [...outgoingFriends, ...incomingFriends].map((f: { user: User }) => f.user);
    const uniqueFriends = allFriends.filter((friend, index, self) =>
      index === self.findIndex(f => f.id === friend.id)
    );

    uniqueFriends.sort((a, b) => {
      const nameA = (a.displayName || a.email || '').toLowerCase();
      const nameB = (b.displayName || b.email || '').toLowerCase();
      return nameA.localeCompare(nameB);
    });

    return uniqueFriends;
  }

  async getIncomingFriendRequests(userId: string): Promise<(Friendship & { user: User })[]> {
    const requests = await db
      .select({
        friendship: friendships,
        user: users,
      })
      .from(friendships)
      .innerJoin(users, eq(friendships.userId, users.id))
      .where(and(eq(friendships.friendId, userId), eq(friendships.status, "pending")));
    
    return requests.map(r => ({ ...r.friendship, user: r.user }));
  }

  async getOutgoingFriendRequests(userId: string): Promise<(Friendship & { user: User })[]> {
    const requests = await db
      .select({
        friendship: friendships,
        user: users,
      })
      .from(friendships)
      .innerJoin(users, eq(friendships.friendId, users.id))
      .where(and(eq(friendships.userId, userId), eq(friendships.status, "pending")));
    
    return requests.map(r => ({ ...r.friendship, user: r.user }));
  }

  async createFriendship(userId: string, friendId: string): Promise<Friendship> {
    const [friendship] = await db
      .insert(friendships)
      .values({ userId, friendId, status: "pending" })
      .returning();
    return friendship;
  }

  async acceptFriendRequest(friendshipId: string): Promise<Friendship> {
    const [friendship] = await db
      .update(friendships)
      .set({ status: "accepted" })
      .where(eq(friendships.id, friendshipId))
      .returning();
    return friendship;
  }

  async declineFriendRequest(friendshipId: string): Promise<void> {
    await db.delete(friendships).where(eq(friendships.id, friendshipId));
  }

  async cancelFriendRequest(friendshipId: string): Promise<void> {
    await db.delete(friendships).where(eq(friendships.id, friendshipId));
  }

  async removeFriendship(userId: string, friendId: string): Promise<void> {
    await db
      .delete(friendships)
      .where(
        or(
          and(eq(friendships.userId, userId), eq(friendships.friendId, friendId)),
          and(eq(friendships.userId, friendId), eq(friendships.friendId, userId))
        )
      );
  }

  async hasPendingRequest(userId: string, friendId: string): Promise<boolean> {
    const [existing] = await db
      .select()
      .from(friendships)
      .where(
        or(
          and(eq(friendships.userId, userId), eq(friendships.friendId, friendId)),
          and(eq(friendships.userId, friendId), eq(friendships.friendId, userId))
        )
      );
    return !!existing;
  }

  async createMagicToken(email: string): Promise<MagicToken> {
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    
    const [magicToken] = await db
      .insert(magicTokens)
      .values({ token, email: email.toLowerCase(), expiresAt })
      .returning();
    return magicToken;
  }

  async getMagicToken(token: string): Promise<MagicToken | undefined> {
    const [magicToken] = await db
      .select()
      .from(magicTokens)
      .where(and(
        eq(magicTokens.token, token),
        lt(magicTokens.useCount, 3),
        gt(magicTokens.expiresAt, new Date())
      ));
    return magicToken;
  }

  async useMagicToken(token: string): Promise<MagicToken> {
    const [magicToken] = await db
      .update(magicTokens)
      .set({ 
        useCount: sql`${magicTokens.useCount} + 1`,
        usedAt: sql`CASE WHEN ${magicTokens.useCount} >= 2 THEN NOW() ELSE ${magicTokens.usedAt} END`
      })
      .where(and(
        eq(magicTokens.token, token),
        lt(magicTokens.useCount, 3),
        gt(magicTokens.expiresAt, new Date())
      ))
      .returning();
    
    if (!magicToken) {
      throw new Error("Token is invalid, expired, or has been used too many times");
    }
    
    return magicToken;
  }

  async cleanExpiredTokens(): Promise<void> {
    await db
      .delete(magicTokens)
      .where(lt(magicTokens.expiresAt, new Date()));
  }

  async createInvite(inviterId: string, inviterName: string, inviteeEmail: string): Promise<Invite> {
    const [invite] = await db
      .insert(invites)
      .values({ inviterId, inviterName, inviteeEmail: inviteeEmail.toLowerCase() })
      .returning();
    return invite;
  }

  async createSelfInvite(email: string): Promise<Invite> {
    const [invite] = await db
      .insert(invites)
      .values({ 
        inviterId: null, 
        inviterName: "Access Code", 
        inviteeEmail: email.toLowerCase() 
      })
      .returning();
    return invite;
  }

  async getInviteByEmail(email: string): Promise<Invite | undefined> {
    const [invite] = await db
      .select()
      .from(invites)
      .where(eq(invites.inviteeEmail, email.toLowerCase()));
    return invite;
  }

  async getPendingInviteByEmail(email: string): Promise<Invite | undefined> {
    const [invite] = await db
      .select()
      .from(invites)
      .where(and(
        eq(invites.inviteeEmail, email.toLowerCase()),
        eq(invites.accepted, false)
      ));
    return invite;
  }

  async acceptInvite(inviteId: string, inviteeId: string): Promise<Invite> {
    const [invite] = await db
      .update(invites)
      .set({ inviteeId, accepted: true })
      .where(eq(invites.id, inviteId))
      .returning();
    return invite;
  }

  async getUserInvites(userId: string): Promise<Invite[]> {
    return db.select().from(invites).where(eq(invites.inviterId, userId));
  }

  async deleteInvite(inviteId: string, userId: string): Promise<void> {
    const [invite] = await db.select().from(invites).where(eq(invites.id, inviteId));
    if (!invite) {
      throw new Error("Invite not found");
    }
    if (invite.inviterId !== userId) {
      throw new Error("Not authorized to delete this invite");
    }
    if (invite.accepted) {
      throw new Error("Cannot delete accepted invite");
    }
    await db.delete(invites).where(eq(invites.id, inviteId));
  }

  async canUserSignUp(email: string): Promise<boolean> {
    const invite = await this.getInviteByEmail(email);
    return !!invite;
  }
}

export const storage = new DatabaseStorage();
