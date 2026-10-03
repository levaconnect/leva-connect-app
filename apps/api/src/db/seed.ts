import { db } from "./index.js";
import {
  users,
  profiles,
  membershipApplications,
  connectionRequests,
  connections,
  posts,
  postLikes,
  comments,
  conversations,
  conversationMembers,
  messages,
} from "./schema.js";
import { hash } from "argon2";
import { eq, and } from "drizzle-orm";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@levaconnect.dev";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "Admin@123456";
const DEV_PASSWORD = "Dev@123456";

async function seed() {
  console.log("Seeding development data...");

  // Hash passwords
  const adminPasswordHash = await hash(ADMIN_PASSWORD);
  const devPasswordHash = await hash(DEV_PASSWORD);

  // ============================================================================
  // Create Admin User
  // ============================================================================
  const [adminUser] = await db
    .insert(users)
    .values({
      email: ADMIN_EMAIL,
      passwordHash: adminPasswordHash,
      role: "admin",
    })
    .onConflictDoNothing({ target: users.email })
    .returning();

  const adminId = adminUser?.id || (await db.select({ id: users.id }).from(users).where(eq(users.email, ADMIN_EMAIL)))[0]?.id;

  if (!adminId) {
    throw new Error("Failed to create or find admin user");
  }

  // Admin profile
  await db
    .insert(profiles)
    .values({
      userId: adminId,
      fullName: "LevaConnect Admin",
      city: "Mumbai",
      hometown: "Pune",
      bio: "Community administrator",
      profession: "Community Manager",
      education: "MBA",
      interests: ["Community Building", "Technology", "Culture"],
      visibility: "community",
      onboardingCompleted: true,
    })
    .onConflictDoNothing({ target: profiles.userId });

  // Admin membership (auto-approved)
  await db
    .insert(membershipApplications)
    .values({
      userId: adminId,
      status: "approved",
      reviewedBy: adminId,
      reviewedAt: new Date(),
    })
    .onConflictDoNothing({ target: membershipApplications.userId });

  console.log(`Admin user created: ${ADMIN_EMAIL}`);

  // ============================================================================
  // Create Sample Approved Members
  // ============================================================================
  const sampleMembers = [
    {
      email: "priya.patil@levaconnect.dev",
      fullName: "Priya Patil",
      city: "Mumbai",
      hometown: "Kolhapur",
      bio: "Software engineer passionate about community building and preserving Leva Patil heritage.",
      profession: "Senior Software Engineer",
      education: "B.Tech Computer Science",
      interests: ["Technology", "Community", "Heritage", "Reading", "Travel"],
    },
    {
      email: "rahul.patil@levaconnect.dev",
      fullName: "Rahul Patil",
      city: "Pune",
      hometown: "Satara",
      bio: "Entrepreneur and community organizer. Love connecting people.",
      profession: "Founder, Tech Startup",
      education: "MBA",
      interests: ["Entrepreneurship", "Networking", "Cricket", "Music"],
    },
    {
      email: "anita.patil@levaconnect.dev",
      fullName: "Anita Patil",
      city: "Bangalore",
      hometown: "Sangli",
      bio: "Doctor by profession, artist at heart. Proud to be part of this community.",
      profession: "Physician",
      education: "MBBS, MD",
      interests: ["Medicine", "Art", "Classical Dance", "Cooking", "Yoga"],
    },
    {
      email: "vikram.patil@levaconnect.dev",
      fullName: "Vikram Patil",
      city: "Delhi",
      hometown: "Kolhapur",
      bio: "Civil servant working for rural development. Community service is my passion.",
      profession: "IAS Officer",
      education: "MA Political Science",
      interests: ["Public Policy", "Rural Development", "History", "Trekking"],
    },
    {
      email: "sneha.patil@levaconnect.dev",
      fullName: "Sneha Patil",
      city: "Hyderabad",
      hometown: "Pune",
      bio: "Data scientist who loves analytics and community analytics!",
      profession: "Data Scientist",
      education: "MS Data Science",
      interests: ["Data Science", "AI/ML", "Photography", "Hiking", "Cooking"],
    },
  ];

  const memberIds: string[] = [];

  for (const member of sampleMembers) {
    const [user] = await db
      .insert(users)
      .values({
        email: member.email,
        passwordHash: devPasswordHash,
        role: "user",
      })
      .onConflictDoNothing({ target: users.email })
      .returning();

    let userId = user?.id;
    if (!userId) {
      const existing = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, member.email));
      userId = existing[0]?.id;
    }

    if (!userId) continue;
    memberIds.push(userId);

    await db
      .insert(profiles)
      .values({
        userId,
        fullName: member.fullName,
        city: member.city,
        hometown: member.hometown,
        bio: member.bio,
        profession: member.profession,
        education: member.education,
        interests: member.interests,
        visibility: "community",
        onboardingCompleted: true,
      })
      .onConflictDoNothing({ target: profiles.userId });

    await db
      .insert(membershipApplications)
      .values({
        userId,
        status: "approved",
        reviewedBy: adminId,
        reviewedAt: new Date(),
      })
      .onConflictDoNothing({ target: membershipApplications.userId });
  }

  console.log(`Created ${memberIds.length} approved members`);

  // ============================================================================
  // Create Pending Applications
  // ============================================================================
  const pendingMembers = [
    {
      email: "amit.patil@levaconnect.dev",
      fullName: "Amit Patil",
      city: "Nashik",
      hometown: "Ahmednagar",
      bio: "Looking forward to joining the community!",
      profession: "Teacher",
      education: "B.Ed",
      interests: ["Education", "Literature", "Music"],
    },
    {
      email: "kavya.patil@levaconnect.dev",
      fullName: "Kavya Patil",
      city: "Chennai",
      hometown: "Kolhapur",
      bio: "Excited to connect with fellow community members.",
      profession: "Architect",
      education: "B.Arch",
      interests: ["Architecture", "Design", "Travel", "Photography"],
    },
  ];

  for (const member of pendingMembers) {
    const [user] = await db
      .insert(users)
      .values({
        email: member.email,
        passwordHash: devPasswordHash,
        role: "user",
      })
      .onConflictDoNothing({ target: users.email })
      .returning();

    let userId = user?.id;
    if (!userId) {
      const existing = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, member.email));
      userId = existing[0]?.id;
    }

    if (!userId) continue;

    await db
      .insert(profiles)
      .values({
        userId,
        fullName: member.fullName,
        city: member.city,
        hometown: member.hometown,
        bio: member.bio,
        profession: member.profession,
        education: member.education,
        interests: member.interests,
        visibility: "community",
        onboardingCompleted: true,
      })
      .onConflictDoNothing({ target: profiles.userId });

    await db
      .insert(membershipApplications)
      .values({
        userId,
        status: "pending",
      })
      .onConflictDoNothing({ target: membershipApplications.userId });
  }

  console.log(`Created ${pendingMembers.length} pending applications`);

  // ============================================================================
  // Create Sample Posts
  // ============================================================================
  const samplePosts = [
    {
      authorId: memberIds[0],
      content:
        "Welcome to LevaConnect! 🎉 So excited to be part of this wonderful community. Looking forward to connecting with everyone and sharing our Leva Patil heritage.",
    },
    {
      authorId: memberIds[1],
      content:
        "Just attended the community meetup in Pune. Amazing to see so many familiar faces and make new connections! The energy was incredible. 🙏",
    },
    {
      authorId: memberIds[2],
      content:
        "Sharing a traditional recipe that's been in my family for generations: Kolhapuri Misal Pav. The secret is in the tari! 🌶️ Would love to hear your family recipes too.",
    },
    {
      authorId: memberIds[3],
      content:
        "Proud moment: Our community member from Satara just received the Padma Shri for contributions to rural education. This is what our community is about - excellence and service! 🏆",
    },
    {
      authorId: memberIds[4],
      content:
        "Anyone interested in a virtual coding session this weekend? I'm working on a community directory app and would love contributors! 💻",
    },
  ];

  const postIds: string[] = [];

  for (const post of samplePosts) {
    const [created] = await db
      .insert(posts)
      .values(post)
      .returning({ id: posts.id });
    postIds.push(created.id);
  }

  console.log(`Created ${postIds.length} sample posts`);

  // ============================================================================
  // Create Likes and Comments
  // ============================================================================
  // Likes
  for (const postId of postIds) {
    const likers = memberIds.slice(0, 3);
    for (const likerId of likers) {
      await db
        .insert(postLikes)
        .values({ postId, userId: likerId })
        .onConflictDoNothing();
    }
  }

  // Comments
  const sampleComments = [
    { postId: postIds[0], authorId: memberIds[1], content: "Welcome Priya! So glad you're here! 🎉" },
    { postId: postIds[0], authorId: memberIds[2], content: "Welcome to the community! Looking forward to your posts." },
    { postId: postIds[1], authorId: memberIds[0], content: "Wish I could have been there! How was it?" },
    { postId: postIds[2], authorId: memberIds[3], content: "My grandmother makes the best misal! The tari secret is family-only though 😄" },
    { postId: postIds[3], authorId: memberIds[4], content: "Incredible achievement! Our community produces such gems. 👏" },
    { postId: postIds[4], authorId: memberIds[0], content: "Count me in! What tech stack are you using?" },
  ];

  for (const comment of sampleComments) {
    await db.insert(comments).values(comment);
  }

  console.log("Created likes and comments");

  // ============================================================================
  // Create Connections
  // ============================================================================
  const connectionPairs = [
    [memberIds[0], memberIds[1]],
    [memberIds[0], memberIds[2]],
    [memberIds[1], memberIds[3]],
    [memberIds[2], memberIds[4]],
  ];

  for (const [userOne, userTwo] of connectionPairs) {
    await db
      .insert(connections)
      .values({ userOneId: userOne, userTwoId: userTwo })
      .onConflictDoNothing();
  }

  console.log(`Created ${connectionPairs.length} connections`);

  // ============================================================================
  // Create Conversations and Messages
  // ============================================================================
  const conversationPairs = [
    [memberIds[0], memberIds[1]],
    [memberIds[0], memberIds[2]],
    [memberIds[1], memberIds[3]],
  ];

  for (const [userOne, userTwo] of conversationPairs) {
    const [conversation] = await db
      .insert(conversations)
      .values({})
      .returning({ id: conversations.id });

    await db.insert(conversationMembers).values([
      { conversationId: conversation.id, userId: userOne },
      { conversationId: conversation.id, userId: userTwo },
    ]);

    // Add some messages
    const sampleMessages = [
      { conversationId: conversation.id, senderId: userOne, content: "Hey! Great to connect with you." },
      { conversationId: conversation.id, senderId: userTwo, content: "Hi! Likewise. How have you been?" },
      { conversationId: conversation.id, senderId: userOne, content: "I've been great. The community event last week was amazing!" },
      { conversationId: conversation.id, senderId: userTwo, content: "Absolutely! Looking forward to the next one." },
    ];

    for (const msg of sampleMessages) {
      await db.insert(messages).values(msg);
    }
  }

  console.log(`Created ${conversationPairs.length} conversations with messages`);

  // ============================================================================
  // Create Connection Requests (pending)
  // ============================================================================
  if (memberIds.length >= 5) {
    await db
      .insert(connectionRequests)
      .values({
        senderId: memberIds[4],
        receiverId: memberIds[0],
        status: "pending",
      })
      .onConflictDoNothing();

    await db
      .insert(connectionRequests)
      .values({
        senderId: memberIds[3],
        receiverId: memberIds[2],
        status: "pending",
      })
      .onConflictDoNothing();
  }

  console.log("Created pending connection requests");

  console.log("\n✅ Seeding completed successfully!");
  console.log("\n📋 Development Credentials:");
  console.log(`   Admin: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
  console.log(`   Members: *_patil@levaconnect.dev / ${DEV_PASSWORD}`);
  console.log("\n⚠️  Change these credentials before deployment!");
}

seed()
  .catch((error) => {
    console.error("Seeding failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    // The pool is closed in migrate.ts, but we need to import it here
    const { pool } = await import("./index.js");
    await pool.end();
  });