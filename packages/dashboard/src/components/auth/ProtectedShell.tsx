import { AppLayout } from "../layout/AppLayout.js";
import { LiveUpdatesBridge } from "../LiveUpdatesBridge.js";

export function ProtectedShell() {
  return (
    <>
      <LiveUpdatesBridge />
      <AppLayout />
    </>
  );
}
