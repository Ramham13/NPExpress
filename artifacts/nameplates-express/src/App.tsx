import { Router as WouterRouter, Route, Switch } from "wouter";
import Designer from "@/pages/Designer";
import AdminPage from "@/pages/AdminPage";
import { AdminProvider } from "@/context/AdminContext";

function App() {
  return (
    <AdminProvider>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
        <Switch>
          <Route path="/admin" component={AdminPage} />
          <Route path="/" component={Designer} />
          <Route>
            <Designer />
          </Route>
        </Switch>
      </WouterRouter>
    </AdminProvider>
  );
}

export default App;
