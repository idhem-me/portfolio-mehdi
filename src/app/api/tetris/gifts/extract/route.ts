import { verifiedGoogleUser } from "@/features/tetris/server/auth";
import { createExtractionHandler } from "@/features/gift-lists/server/extraction-handler";


// Same cookie scope as the shared account: no session migration or duplicate login.
export const POST = createExtractionHandler({
  authenticate: verifiedGoogleUser,
});
