import { fetchLandingConfig } from "@/lib/landing-config";
import LoginClient from "./LoginClient";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const config = await fetchLandingConfig();
  return <LoginClient initialConfig={config} />;
}
