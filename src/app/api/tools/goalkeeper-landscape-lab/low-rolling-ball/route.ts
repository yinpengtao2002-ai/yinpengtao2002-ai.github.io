import { NextResponse } from "next/server";
import { runLowRollingBallLabScenario } from "../../../../../../tool-sources/goalkeeper-landscape/src/lab/low-rolling-ball-scenario.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const telemetry = await runLowRollingBallLabScenario();
    return NextResponse.json(telemetry);
  } catch (error) {
    return NextResponse.json(
      {
        error: "GOALKEEPER_LAB_REPLAY_FAILED",
        message: error instanceof Error ? error.message : "Unable to run goalkeeper lab replay.",
      },
      { status: 500 },
    );
  }
}
