import { Router as WouterRouter, Route, Switch } from "wouter";
import Designer from "@/pages/Designer";

function App() {
  return (
    <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
      <Switch>
        <Route path="/" component={Designer} />
        <Route>
          <Designer />
        </Route>
      </Switch>
    </WouterRouter>
  );
}

export default App;
