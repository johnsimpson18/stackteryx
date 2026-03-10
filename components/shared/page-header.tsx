interface PageHeaderProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
}

export function PageHeader({ title, description, children }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
          {title}
        </h1>
        {description && (
          <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
            {description}
          </p>
        )}
      </div>
      {children && (
        <div className="flex items-center gap-3 flex-shrink-0 pt-0.5">
          {children}
        </div>
      )}
    </div>
  );
}
