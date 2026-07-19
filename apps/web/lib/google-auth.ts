type GoogleOAuthProfile = {
  email?: string | null;
  email_verified?: boolean | null;
};

export function isVerifiedGoogleProfile(
  profile: GoogleOAuthProfile | null | undefined,
) {
  return (
    profile?.email_verified === true &&
    typeof profile.email === "string" &&
    profile.email.trim().length > 0
  );
}
