import { AppsScriptClock } from '../platform/appsScriptClock';
import { AppsScriptHttpTransport } from '../platform/appsScriptHttpTransport';
import { AppsScriptLogger } from '../platform/appsScriptLogger';
import { AppsScriptLockProvider } from '../platform/appsScriptLock';
import { AppsScriptSecretStore } from '../platform/appsScriptSecretStore';
import { AppsScriptSleeper } from '../platform/appsScriptSleeper';
import { AppsScriptUserCache } from '../platform/appsScriptUserCache';
import { AuthClient } from '../investec/authClient';
import { CredentialStore } from '../investec/credentials';
import { InvestecHttpClient } from '../investec/httpClient';

export function createInvestecHttpClient(): InvestecHttpClient {
  const transport = new AppsScriptHttpTransport();
  const clock = new AppsScriptClock();
  const logger = new AppsScriptLogger();
  const auth = new AuthClient(
    new CredentialStore(new AppsScriptSecretStore()),
    transport,
    new AppsScriptUserCache(),
    clock,
    new AppsScriptLockProvider(),
    logger,
  );
  return new InvestecHttpClient(auth, transport, clock, new AppsScriptSleeper(), logger);
}
