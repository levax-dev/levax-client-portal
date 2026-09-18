"use client"

import { useActionState, useState } from "react"
import { CalendarRange, CheckCircle2, ClipboardCheck, RotateCcw, Undo2 } from "lucide-react"

import { decideProject, type ActionState } from "@/app/actions/projects"
import { EmptyState } from "@/components/empty-state"
import { SubmitButton } from "@/components/submit-button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { formatDate } from "@/lib/periods"
import type { PendingProject } from "@/lib/queries/work"

const initialState: ActionState = null

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
}

/**
 * The client's sign-off queue — the first thing they should see on logging in.
 *
 * Rejection demands a reason: "sent back" with no explanation just costs both
 * sides another round trip.
 */
export function ApprovalQueue({
  projects,
  canDecide,
  showOrg = false,
}: {
  projects: PendingProject[]
  /** Any member of the client org may approve; staff only watch. */
  canDecide: boolean
  showOrg?: boolean
}) {
  if (projects.length === 0) {
    return (
      <EmptyState
        icon={ClipboardCheck}
        title="Nothing waiting on you"
        description="New project requests from the Leverage Axiom team will appear here for approval."
      />
    )
  }

  return (
    <div className="space-y-3">
      {projects.map((project) => (
        <ApprovalCard
          key={project.id}
          project={project}
          canDecide={canDecide}
          showOrg={showOrg}
        />
      ))}
    </div>
  )
}

function ApprovalCard({
  project,
  canDecide,
  showOrg,
}: {
  project: PendingProject
  canDecide: boolean
  showOrg: boolean
}) {
  const [state, action] = useActionState(decideProject, initialState)
  const [rejecting, setRejecting] = useState(false)
  const isRejected = project.approvalStatus === "rejected"

  return (
    <Card className={isRejected ? "border-status-critical/30" : "border-status-warning/40"}>
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <CardTitle className="text-base">{project.name}</CardTitle>
          <div className="flex flex-wrap items-center gap-1.5">
            {isRejected ? (
              <Badge className="border-status-critical/30 bg-status-critical/10 text-status-critical">
                Sent back
              </Badge>
            ) : (
              <Badge className="border-status-warning/40 bg-status-warning/15 text-status-warning">
                Awaiting approval
              </Badge>
            )}
            {showOrg && project.orgName && <Badge variant="secondary">{project.orgName}</Badge>}
            {project.departments.map((dept) => (
              <Badge key={dept} variant="outline">
                {dept}
              </Badge>
            ))}
          </div>
        </div>
        {project.lead && (
          <div className="flex shrink-0 items-center gap-2">
            <Avatar className="size-6">
              {project.lead.avatar_url && <AvatarImage src={project.lead.avatar_url} />}
              <AvatarFallback className="text-[10px]">
                {initials(project.lead.full_name ?? "?")}
              </AvatarFallback>
            </Avatar>
            <div className="text-xs">
              <p className="text-muted-foreground">Lead</p>
              <p className="font-medium">{project.lead.full_name}</p>
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-3">
        {project.description && (
          <p className="text-sm whitespace-pre-wrap text-muted-foreground">{project.description}</p>
        )}

        {(project.startDate || project.targetDate) && (
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <CalendarRange className="size-3.5 shrink-0" />
            {project.startDate ? formatDate(project.startDate) : "No start date"}
            {" → "}
            {project.targetDate ? formatDate(project.targetDate) : "no target date"}
          </p>
        )}

        {isRejected && project.decisionNote && (
          <Alert>
            <AlertDescription>
              <span className="font-medium">Sent back:</span> {project.decisionNote}
            </AlertDescription>
          </Alert>
        )}

        {state?.error && (
          <Alert variant="destructive">
            <AlertDescription>{state.error}</AlertDescription>
          </Alert>
        )}
        {state?.success && (
          <Alert>
            <AlertDescription>{state.success}</AlertDescription>
          </Alert>
        )}

        {canDecide && !state?.success && (
          <form action={action} className="space-y-3">
            <input type="hidden" name="projectId" value={project.id} />
            <input type="hidden" name="approve" value={rejecting ? "false" : "true"} />

            {rejecting && (
              <div className="space-y-1.5">
                <Textarea
                  name="note"
                  rows={3}
                  required
                  maxLength={2000}
                  placeholder="What needs to change before this can go ahead?"
                  autoFocus
                />
                <p className="text-xs text-muted-foreground">
                  The project lead sees this and can revise and resubmit.
                </p>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              {rejecting ? (
                <>
                  <SubmitButton variant="destructive" pendingText="Sending back…">
                    <Undo2 />
                    Send back with this note
                  </SubmitButton>
                  <Button type="button" variant="ghost" onClick={() => setRejecting(false)}>
                    Cancel
                  </Button>
                </>
              ) : (
                <>
                  <SubmitButton pendingText="Approving…">
                    <CheckCircle2 />
                    {isRejected ? "Approve after all" : "Approve and start"}
                  </SubmitButton>
                  {!isRejected && (
                    <Button type="button" variant="outline" onClick={() => setRejecting(true)}>
                      <RotateCcw />
                      Send back
                    </Button>
                  )}
                </>
              )}
            </div>
          </form>
        )}

        {!canDecide && !isRejected && (
          <p className="text-sm text-muted-foreground">
            Waiting on {project.orgName ?? "the client"} to approve.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
