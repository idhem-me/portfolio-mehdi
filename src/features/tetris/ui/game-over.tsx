"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
  CardDescription,
} from "@/components/ui/card";
import { leaderboardEnabled } from "../flags";
import type { GameSummary, RankedRun, ScoreDraft } from "../auth/draft";
import { SubmitScore } from "./leaderboard";
export function GameOver({
  summary,
  run,
  initialName,
  onReplay,
  onMenu,
  onLeaderboard,
  preparing,
}: {
  summary: GameSummary;
  run: RankedRun | null;
  initialName?: string;
  onReplay: () => void;
  onMenu: () => void;
  onLeaderboard: () => void;
  preparing: boolean;
}) {
  const [sent, setSent] = useState(false);
  const [rank, setRank] = useState<number | null | undefined>(undefined);
  const draft: ScoreDraft | undefined =
    run && !sent ? { run, summary, name: initialName || "" } : undefined;
  return (
    <div
      className="lava-cover lava-gameover"
      role="region"
      aria-labelledby="lava-gameover-title"
    >
      <Card className="lava-end-panel">
        <CardHeader>
          <CardTitle>
            <h2 id="lava-gameover-title" tabIndex={-1}>
              Game over
            </h2>
          </CardTitle>
        </CardHeader>
        <CardContent className="lava-end-content">
          <dl className="lava-end-stats">
            <div>
              <dt>
                <CardDescription>Record</CardDescription>
              </dt>
              <dd className="lava-end-number">
                {summary.best.toLocaleString("fr")}
              </dd>
            </div>
            <div>
              <dt>
                <CardDescription>Classement</CardDescription>
              </dt>
              <dd className="lava-end-state">
                {!run
                  ? "Non classé"
                  : !sent
                    ? "À valider"
                    : rank === undefined
                      ? "Indisponible"
                      : rank === null
                        ? "Hors du top 20"
                        : rank === 1
                          ? "1er"
                          : `${rank}e`}
              </dd>
            </div>
            <div>
              <dt>
                <CardDescription>Score</CardDescription>
              </dt>
              <dd className="lava-end-number">
                {summary.score.toLocaleString("fr")}
              </dd>
            </div>
            <div>
              <dt>
                <CardDescription>Lignes</CardDescription>
              </dt>
              <dd className="lava-end-state">
                {summary.lines.toLocaleString("fr")}
              </dd>
            </div>
          </dl>
          {leaderboardEnabled && (
            <SubmitScore
              run={run}
              draft={draft}
              initialName={initialName}
              onOpen={onLeaderboard}
              onSubmitted={(position) => {
                setRank(position);
                setSent(true);
              }}
            />
          )}
        </CardContent>
        <CardFooter className="lava-end-actions">
          <Button
            variant={sent || !run ? "accent" : "outline"}
            size={sent || !run ? "lg" : "default"}
            disabled={preparing}
            onClick={onReplay}
          >
            {preparing ? "Préparation…" : "Rejouer"}
          </Button>
          <Button variant="outline" onClick={onMenu}>
            Menu
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
