import { createTRPCReact } from "@trpc/react-query";
import { appRouter } from "../../../server/routers";

// Infer type locally to avoid esbuild bundling issues
type AppRouter = typeof appRouter;

export const trpc = createTRPCReact<AppRouter>();
