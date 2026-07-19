import { useEffect, useState } from "react";
import { pb } from "../lib/pocketbase";

export function useAuth() {
  const [user, setUser] = useState(pb.authStore.record);

  useEffect(() => {
    return pb.authStore.onChange((_token, record) => setUser(record));
  }, []);

  return {
    user,
    isLoggedIn: Boolean(user),
    login: (email, password) =>
      pb.collection("users").authWithPassword(email, password),
    logout: () => pb.authStore.clear(),
  };
}
