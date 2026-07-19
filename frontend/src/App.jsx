import { useAuth } from "./hooks/useAuth";
import { LoginForm } from "./components/LoginForm";
import { ResolveFlow } from "./features/resolve/ResolveFlow";

function App() {
  const { user, isLoggedIn, logout } = useAuth();

  if (!isLoggedIn) {
    return <LoginForm />;
  }

  return (
    <div>
      <header>
        <span>{user.name || user.email}</span>
        <button type="button" onClick={logout}>
          Sign out
        </button>
      </header>
      <ResolveFlow householdId={user.household} />
    </div>
  );
}

export default App;
