import {
  parseLastOutput,
  parseWOutput,
  scoreLoginActivity
} from "../packages/agent/src/security/login-activity.collector.js";

describe("login activity collector", () => {
  it("parses active sessions from w output", () => {
    const sessions = parseWOutput("root pts/0 10.0.0.10 02:14 0.00s 0.01s 0.00s bash");

    expect(sessions).toEqual([
      {
        user: "root",
        tty: "pts/0",
        from: "10.0.0.10",
        loginAt: "02:14",
        idle: "0.00s",
        command: "bash"
      }
    ]);
  });

  it("parses login history from last output", () => {
    const records = parseLastOutput(
      "root pts/0 10.0.0.10 2026-04-15T02:14:00+03:00 still logged in",
      "success"
    );

    expect(records[0]?.user).toBe("root");
    expect(records[0]?.loginAt).toBe("2026-04-15T02:14:00+03:00");
  });

  it("detects suspicious login patterns", () => {
    const scored = scoreLoginActivity({
      activeSessions: [],
      successfulLogins: [
        {
          user: "root",
          tty: "pts/0",
          from: "10.0.0.10",
          loginAt: "2026-04-15T02:14:00+03:00",
          status: "success",
          raw: "root session"
        }
      ],
      failedLogins: [
        {
          user: "alice",
          tty: "ssh:notty",
          from: "10.0.0.50",
          loginAt: "2026-04-15T01:00:00+03:00",
          status: "failure",
          raw: "alice fail"
        },
        {
          user: "bob",
          tty: "ssh:notty",
          from: "10.0.0.50",
          loginAt: "2026-04-15T01:01:00+03:00",
          status: "failure",
          raw: "bob fail"
        }
      ]
    });

    expect(scored.status).toBe("critical");
    expect(scored.findings).toHaveLength(3);
    expect(scored.riskScore).toBeGreaterThanOrEqual(60);
  });
});
