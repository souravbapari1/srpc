export function FlowSteps({
  steps,
}: {
  steps: { title: string; description: string }[];
}) {
  return (
    <ol className="space-y-5">
      {steps.map((step, index) => (
        <li key={step.title} className="flex gap-4">
          <span className="mt-0.5 font-mono text-xs text-accent">
            {String(index + 1).padStart(2, "0")}
          </span>
          <div>
            <p className="font-medium text-foreground">{step.title}</p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              {step.description}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}
