import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { supabaseAdmin } from "@/lib/supabase";
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
        // Validate input shape
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;

        // Verify credentials directly — no need to listUsers() first
        const { data: signInData, error: signInError } =
          await supabaseAdmin.auth.signInWithPassword({ email, password });

        if (signInError || !signInData.user) return null;

        // Fetch profile using the verified user ID
        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("*")
          .eq("id", signInData.user.id)
          .single();

        if (!profile) return null;

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
    maxAge: 30 * 24 * 60 * 60, // 30 days
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
          // Create Supabase auth user for new Google user
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
            }, { onConflict: "id" });
            user.id = authUser.user.id;
          }
        } else {
          // Always update profile with latest Google info
          await supabaseAdmin.from("profiles").update({
            full_name: user.name,
            avatar_url: user.image,
          }).eq("id", existingProfile.id);
          user.id = existingProfile.id;
        }
      }
      return true;
    },
    async jwt({ token, user, account }) {
      if (user) {
        if (account?.provider === "google" && user.email) {
          // Resolve Supabase UUID by email — never trust Google OAuth sub ID
          const { data: profile } = await supabaseAdmin
            .from("profiles")
            .select("id")
            .eq("email", user.email)
            .single();
          token.id = profile?.id ?? user.id;
          token.email = user.email;
        } else {
          token.id = user.id;
          token.email = user.email;
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
