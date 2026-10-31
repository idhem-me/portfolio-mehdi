import { budget, imageLease } from "@/lib/security/budget";
import { verifiedAccountUser } from "@/features/tetris/server/auth";
import { createExtractionHandler } from "@/features/gift-lists/server/extraction-handler";

// Same cookie scope as the shared account: no session migration or duplicate login.
export const maxDuration = 30;
export const POST = createExtractionHandler({
  acquireShared: imageLease,
  authenticate: async (request) => {
    const auth = await verifiedAccountUser(request);
    if (auth.user)
      await budget(request, "gift-extraction", {
        global: 120,
        network: 20,
        user: auth.user.id,
        perUser: 10,
      });
    return auth;
  },
});
