"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface StepWorkspaceProps {
  workspaceName: string;
  displayName: string;
  onWorkspaceNameChange: (v: string) => void;
  onDisplayNameChange: (v: string) => void;
}

export function StepWorkspace({
  workspaceName,
  displayName,
  onWorkspaceNameChange,
  onDisplayNameChange,
}: StepWorkspaceProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Welcome to Stackteryx</h2>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Let&apos;s set up your workspace in under 2 minutes. You&apos;ll be pricing security
          stacks before you finish your coffee.
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="workspace-name">Company / MSP Name</Label>
          <Input
            id="workspace-name"
            placeholder="e.g. Acme Security Partners"
            value={workspaceName}
            onChange={(e) => onWorkspaceNameChange(e.target.value)}
            autoFocus
            className="h-11 text-base"
          />
          <p className="text-xs text-muted-foreground">
            Shown throughout the app and on any exported quotes.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="display-name">Your Name</Label>
          <Input
            id="display-name"
            placeholder="e.g. Alex Johnson"
            value={displayName}
            onChange={(e) => onDisplayNameChange(e.target.value)}
            className="h-11 text-base"
          />
        </div>
      </div>
    </div>
  );
}
