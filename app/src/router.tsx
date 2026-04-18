import { createContext, useContext, useState, useEffect, useCallback, type ReactNode, type ReactElement } from 'react';

/* ──────────────────── Types ──────────────────── */

interface RouteContextValue {
  path: string;
  navigate: (to: string) => void;
  params: Record<string, string>;
}

interface RouterProviderProps {
  children: ReactNode;
}

interface RouteProps {
  path?: string;
  element: ReactNode;
}

interface RoutesProps {
  children: ReactNode;
}

interface LinkProps {
  to: string;
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

interface NavigateProps {
  to: string;
  replace?: boolean;
}

/* ──────────────────── Context ──────────────────── */

const RouteContext = createContext<RouteContextValue>({
  path: '/',
  navigate: () => {},
  params: {},
});

/* ──────────────────── Provider ──────────────────── */

export function RouterProvider({ children }: RouterProviderProps) {
  const [path, setPath] = useState(window.location.hash.slice(1) || '/');
  const [params, setParams] = useState<Record<string, string>>({});

  useEffect(() => {
    const handleHashChange = () => {
      setPath(window.location.hash.slice(1) || '/');
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigate = useCallback((to: string) => {
    window.location.hash = to;
  }, []);

  // Parse params from path
  useEffect(() => {
    const pathParts = path.split('/');
    const newParams: Record<string, string> = {};

    // Simple param parsing for /recruiter/candidate/:id pattern
    if (pathParts.length >= 4 && pathParts[1] === 'recruiter' && pathParts[2] === 'candidate') {
      newParams.id = pathParts[3];
    }

    setParams(newParams);
  }, [path]);

  return (
    <RouteContext.Provider value={{ path, navigate, params }}>
      {children}
    </RouteContext.Provider>
  );
}

/* ──────────────────── Hooks ──────────────────── */

export function useLocation() {
  const { path } = useContext(RouteContext);
  return { pathname: path, search: '', hash: '', state: null };
}

export function useNavigate() {
  const { navigate } = useContext(RouteContext);
  return navigate;
}

export function useParams() {
  const { params } = useContext(RouteContext);
  return params;
}

/* ──────────────────── Components ──────────────────── */

export function Route({ element }: RouteProps) {
  return <>{element}</>;
}

export function Routes({ children }: RoutesProps) {
  const { path } = useContext(RouteContext);

  let matchedElement: ReactNode = null;

  // Simple route matching
  const routes = Array.isArray(children) ? children : [children];

  for (const route of routes) {
    if (!route) continue;

    const routeProps = (route as ReactElement<RouteProps>).props;
    const routePath = routeProps.path;
    const routeElement = routeProps.element;

    if (!routePath) continue;

    // Exact match
    if (routePath === path) {
      matchedElement = routeElement;
      break;
    }

    // Wildcard match for nested routes
    if (routePath.endsWith('/*')) {
      const basePath = routePath.slice(0, -2);
      if (path.startsWith(basePath)) {
        matchedElement = routeElement;
        break;
      }
    }

    // Param match for /recruiter/candidate/:id
    if (routePath.includes('/:')) {
      const routeParts = routePath.split('/');
      const pathParts = path.split('/');

      if (routeParts.length === pathParts.length) {
        let matches = true;
        for (let i = 0; i < routeParts.length; i++) {
          if (routeParts[i].startsWith(':')) continue;
          if (routeParts[i] !== pathParts[i]) {
            matches = false;
            break;
          }
        }
        if (matches) {
          matchedElement = routeElement;
          break;
        }
      }
    }
  }

  return <>{matchedElement}</>;
}

export function Link({ to, children, className, onClick }: LinkProps) {
  const { navigate } = useContext(RouteContext);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    navigate(to);
    onClick?.();
  };

  return (
    <a href={`#${to}`} onClick={handleClick} className={className}>
      {children}
    </a>
  );
}

export function Navigate({ to }: NavigateProps) {
  const { navigate } = useContext(RouteContext);

  useEffect(() => {
    navigate(to);
  }, [navigate, to]);

  return null;
}

export function Outlet() {
  // For nested routes, this would render child routes
  return null;
}
