import { useState } from "react";
import { useAuth } from "./hooks/useAuth";
import { LoginForm } from "./components/LoginForm";
import { ResolveFlow } from "./features/resolve/ResolveFlow";
import { PantryView } from "./features/pantry/PantryView";
import { ShoppingListView } from "./features/shoppingList/ShoppingListView";

const TABS = [
  { key: "scan", label: "Scan", render: ResolveFlow },
  { key: "pantry", label: "Pantry", render: PantryView },
  { key: "list", label: "List", render: ShoppingListView },
];

function App() {
  const { user, isLoggedIn, logout } = useAuth();
  const [tab, setTab] = useState("scan");

  if (!isLoggedIn) {
    return <LoginForm />;
  }

  const ActiveView = TABS.find((t) => t.key === tab).render;

  return (
    <div>
      <header>
        <span>{user.name || user.email}</span>
        <button type="button" onClick={logout}>
          Sign out
        </button>
      </header>

      <nav>
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            aria-current={tab === t.key}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <ActiveView householdId={user.household} />
    </div>
  );
}

export default App;
