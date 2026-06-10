import { Link } from 'react-router';

import type { BreadcrumbItem as BreadcrumbItemType } from '@/navigation';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from './ui/breadcrumb';

export const Breadcrumbs = ({ items }: { items: BreadcrumbItemType[] }) => (
  <Breadcrumb>
    <BreadcrumbList>
      {items.map((item, index) => {
        const isLast = index === items.length - 1;

        return (
          <BreadcrumbItem key={`${item.label}-${index}`}>
            {isLast || !item.to ? (
              <BreadcrumbPage>{item.label}</BreadcrumbPage>
            ) : (
              <Link
                className="transition-colors hover:text-foreground"
                to={item.to}
              >
                {item.label}
              </Link>
            )}
            {!isLast ? <BreadcrumbSeparator /> : null}
          </BreadcrumbItem>
        );
      })}
    </BreadcrumbList>
  </Breadcrumb>
);
