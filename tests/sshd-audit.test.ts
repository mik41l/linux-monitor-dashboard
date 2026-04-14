import {
  parseSshdConfig,
  scoreSshdConfig
} from "../packages/agent/src/security/sshd-audit.collector.js";

describe("sshd audit collector", () => {
  it("parses sshd_config directives", () => {
    const parsed = parseSshdConfig(`
      PermitRootLogin yes
      PasswordAuthentication yes
      Port 22
      MaxAuthTries 8
      PermitEmptyPasswords no
      X11Forwarding yes
      Protocol 2
      UsePAM yes
      LoginGraceTime 2m
      AllowUsers admin ops
    `);

    expect(parsed).toEqual({
      permitRootLogin: "yes",
      passwordAuthentication: "yes",
      port: 22,
      maxAuthTries: 8,
      permitEmptyPasswords: "no",
      x11Forwarding: "yes",
      protocol: "2",
      usePAM: "yes",
      loginGraceTime: 120,
      allowUsers: ["admin", "ops"]
    });
  });

  it("scores risky directives into findings and risk score", () => {
    const parsed = parseSshdConfig(`
      PermitRootLogin yes
      PasswordAuthentication yes
      Port 22
      MaxAuthTries 8
      PermitEmptyPasswords yes
      X11Forwarding yes
      Protocol 1
    `);
    const result = scoreSshdConfig(parsed);

    expect(result.status).toBe("critical");
    expect(result.riskScore).toBe(145);
    expect(result.findings.map((finding) => finding.key)).toEqual([
      "PermitRootLogin",
      "PasswordAuthentication",
      "Port",
      "MaxAuthTries",
      "PermitEmptyPasswords",
      "X11Forwarding",
      "Protocol",
      "AllowUsers"
    ]);
  });
});
