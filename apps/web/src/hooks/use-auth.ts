import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { RegisterDto, LoginDto, UserProfile } from "@repo/contracts";
import { fetchApi } from "../lib/api-client";

export function useCurrentUser() {
  return useQuery<UserProfile>({
    queryKey: ["auth", "me"],
    queryFn: () => fetchApi<UserProfile>("/auth/me"),
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
}

export function useLogin() {
  const queryClient = useQueryClient();

  return useMutation<{ user: UserProfile }, Error, LoginDto>({
    mutationFn: (data: LoginDto) =>
      fetchApi<{ user: UserProfile }>("/auth/login", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: (data) => {
      queryClient.setQueryData(["auth", "me"], data.user);
    },
  });
}

export function useRegister() {
  const queryClient = useQueryClient();

  return useMutation<{ user: UserProfile }, Error, RegisterDto>({
    mutationFn: (data: RegisterDto) =>
      fetchApi<{ user: UserProfile }>("/auth/register", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: (data) => {
      queryClient.setQueryData(["auth", "me"], data.user);
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation<{ success: boolean }, Error, void>({
    mutationFn: () =>
      fetchApi<{ success: boolean }>("/auth/logout", {
        method: "POST",
      }),
    onSuccess: () => {
      queryClient.setQueryData(["auth", "me"], null);
      queryClient.invalidateQueries({ queryKey: ["auth"] });
    },
  });
}
