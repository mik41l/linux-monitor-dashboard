import { parseIptablesOutput, scoreFirewallAudit } from "../packages/agent/src/security/firewall.collector.js";

describe("firewall collector", () => {
  it("parses iptables chains and rules", () => {
    const parsed = parseIptablesOutput(`
Chain INPUT (policy DROP)
num  target     prot opt source               destination
1    ACCEPT     tcp  --  10.0.0.0/24          0.0.0.0/0            tcp dpt:22
2    ACCEPT     tcp  --  0.0.0.0/0            0.0.0.0/0            tcp dpt:5432

Chain OUTPUT (policy ACCEPT)
num  target     prot opt source               destination

Chain FORWARD (policy DROP)
num  target     prot opt source               destination
`);

    expect(parsed.defaultPolicy.input).toBe("DROP");
    expect(parsed.rules).toHaveLength(2);
    expect(parsed.rules[1]?.port).toBe(5432);
  });

  it("scores unsafe default policies and wide-open rules", () => {
    const scored = scoreFirewallAudit({
      backend: "iptables",
      defaultPolicy: {
        input: "ACCEPT",
        output: "ACCEPT",
        forward: "ACCEPT"
      },
      rules: [
        {
          chain: "INPUT",
          target: "ACCEPT",
          protocol: "tcp",
          source: "0.0.0.0/0",
          destination: "0.0.0.0/0",
          port: 6379,
          lineNumber: 1
        }
      ]
    });

    expect(scored.status).toBe("critical");
    expect(scored.isEnabled).toBe(true);
    expect(scored.riskScore).toBeGreaterThan(30);
    expect(scored.findings.some((finding) => finding.key === "input-policy")).toBe(true);
  });
});
