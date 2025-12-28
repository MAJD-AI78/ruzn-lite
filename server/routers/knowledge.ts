import { router, protectedProcedure } from "../_core/trpc";
import { KnowledgeSearchInputSchema } from "../knowledge/knowledge.types";
import { getKnowledgeProvider } from "../knowledge/providers";

export const knowledgeRouter = router({
  search: protectedProcedure
    .input(KnowledgeSearchInputSchema)
    .query(async ({ input, ctx }) => {
      // Optional RBAC example:
      // if (!ctx.user || (ctx.user.role !== "admin" && ctx.user.role !== "analyst")) throw new TRPCError({ code: "FORBIDDEN" });

      const provider = getKnowledgeProvider();
      const sovereign = process.env.SOVEREIGN_MODE === "true";
      if (sovereign && provider.backend === "vectara") {
        return { backend: "mock", dataset_version: process.env.KNOWLEDGE_DATASET_VERSION || "sovereign-demo", results: [] };
      }
      return provider.search(input);
    }),
});
