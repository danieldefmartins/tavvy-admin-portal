import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";

export interface User {
  id: string;
  openId: string;
  email: string | undefined;
  name: string;
  role: string;
}

export function useAuth() {
  const [, setLocation] = useLocation();
  const { data: user, isLoading, error } = trpc.auth.me.useQuery();
  const utils = trpc.useUtils();

  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      utils.auth.me.invalidate();
      setLocation("/login");
    },
  });

  const logout = () => {
    logoutMutation.mutate();
  };

  return {
    user: user as User | null,
    isLoading,
    isAuthenticated: !!user,
    error,
    logout,
    isLoggingOut: logoutMutation.isPending,
  };
}

export function getLoginUrl(): string {
  return "/login";
}
