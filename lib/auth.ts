import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { supabaseAdmin } from "@/lib/supabase";
import bcrypt from "bcryptjs";
import { z } from "zod";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;

        const { data: user, error } =
          await supabaseAdmin.auth.admin.listUsers();

        if (error || !user) return null;

        const matchedUser = user.users.find((u: { email?: string }) => u.email === email);
        if (!matchedUser) return null;

        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("*")
          .eq("id", matchedUser.id)
          .single();

        if (!profile) return null;

        // Verify password using Supabase Auth
        const { data: signInData, error: signInError } =
          await supabaseAdmin.auth.signInWithPassword({ email, password });

        if (signInError || !signInData.user) return null;

        return {
          id: profile.id,
          email: profile.email,
          name: profile.full_name,
          image: profile.avatar_url,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days — auto re-login on browser reopen
  },
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        const { data: existingProfile } = await supabaseAdmin
          .from("profiles")
          .select("id")
          .eq("email", user.email!)
          .single();

        if (!existingProfile) {
          // Create profile for new Google user
          const { data: authUser } =
            await supabaseAdmin.auth.admin.createUser({
              email: user.email!,
              email_confirm: true,
              user_metadata: {
                full_name: user.name,
                avatar_url: user.image,
              },
            });

          if (authUser.user) {
            await supabaseAdmin.from("profiles").upsert({
              id: authUser.user.id,
              email: user.email!,
              full_name: user.name,
              avatar_url: user.image,
            });
            user.id = authUser.user.id;
          }
        } else {
          user.id = existingProfile.id;
        }
      }
      return true;
    },
    async jwt({ token, user, account }) {
      if (user) {
        // For Google, look up the actual Supabase profile ID by email
        if (account?.provider === "google" && user.email) {
          const { data: profile } = await supabaseAdmin
            .from("profiles")
            .select("id")
            .eq("email", user.email)
            .single();
          token.id = profile?.id ?? user.id;
        } else {
          token.id = user.id;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token?.id) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
});
