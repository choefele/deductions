import {
  createHashRouter,
  isRouteErrorResponse,
  RouterProvider,
  useRouteError,
} from 'react-router';

import { AppShell } from './components/AppShell';
import {
  allYearsLoader,
  categoryLoader,
  invoiceLoader,
  reviewQueueLoader,
  rootLoader,
  sourcesLoader,
  taxYearLoader,
} from './routeData';
import { AllYearsDashboard } from './views/AllYearsDashboard';
import { CategoryView } from './views/CategoryView';
import { ImportResultView } from './views/ImportResultView';
import { InvoiceDetailView } from './views/InvoiceDetailView';
import { ReviewQueueView } from './views/ReviewQueueView';
import { SourcesView } from './views/SourcesView';
import { TaxYearDashboard } from './views/TaxYearDashboard';

const ErrorBoundary = () => {
  const error = useRouteError();
  const title = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : 'Something went wrong';
  const message = isRouteErrorResponse(error)
    ? error.data
    : error instanceof Error
      ? error.message
      : 'The requested view could not be loaded.';

  return (
    <main className="p-6">
      <h1 className="text-xl font-semibold">{title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{message}</p>
    </main>
  );
};

const router = createHashRouter([
  {
    id: 'root',
    path: '/',
    element: <AppShell />,
    loader: rootLoader,
    errorElement: <ErrorBoundary />,
    children: [
      {
        index: true,
        element: <AllYearsDashboard />,
        loader: allYearsLoader,
      },
      {
        path: 'years/:year',
        element: <TaxYearDashboard />,
        loader: taxYearLoader,
      },
      {
        path: 'years/:year/categories/:categoryId',
        element: <CategoryView />,
        loader: categoryLoader,
      },
      {
        path: 'invoices/:invoiceId',
        element: <InvoiceDetailView />,
        loader: invoiceLoader,
      },
      {
        path: 'review/:queue',
        element: <ReviewQueueView />,
        loader: reviewQueueLoader,
      },
      {
        path: 'sources',
        element: <SourcesView />,
        loader: sourcesLoader,
      },
      {
        path: 'import-result',
        element: <ImportResultView />,
      },
    ],
  },
]);

export const AppRouter = () => <RouterProvider router={router} />;
