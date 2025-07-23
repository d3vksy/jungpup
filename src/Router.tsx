import { lazy, Suspense, useMemo } from "react";
import { Route, Routes } from "react-router-dom";

const folder = [{ name: "main", path: "" }, { name: "login", path: "login" }];

const AppRoutes = () => {
    const routes = useMemo(() => (
        folder.map((item, i) => {
            const Component = lazy(() => import(`./pages/${item.name}/index.tsx`));
            return (
                <Route
                    key={i}
                    path={`/${item.path}`}
                    element={
                        <Suspense fallback={<div>로딩 중...</div>}>
                            <Component />
                        </Suspense>
                    }
                />
            );
        })
    ), []);

    return <Routes>{routes}</Routes>;
};

export default AppRoutes;