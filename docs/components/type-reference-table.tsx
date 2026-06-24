export interface TypeReferenceRow {
  name: string;
  description: string;
  example: string;
}

export function TypeReferenceTable({
  title,
  rows,
}: {
  title: string;
  rows: TypeReferenceRow[];
}) {
  return (
    <div>
      <p className="mb-4 text-sm font-medium text-foreground">{title}</p>
      <div className="overflow-x-auto border border-border">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border text-muted">
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Description</th>
              <th className="px-4 py-3 font-medium">Example</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.name} className="border-b border-border last:border-0">
                <td className="px-4 py-3 font-mono text-accent">{row.name}</td>
                <td className="px-4 py-3 text-muted-foreground">{row.description}</td>
                <td className="px-4 py-3 font-mono text-xs text-foreground/80">
                  {row.example}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
