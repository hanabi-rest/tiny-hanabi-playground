import { Hono } from 'hono'
import { boolean, maxLength, object, optional, pipe, regex, string } from "valibot";
import { vValidator } from "@hono/valibot-validator";
import * as deployUsecase from "@/services/deploy";

const app = new Hono()

const deployCloudflareSchema = object({
  environmentId: string(),
  accountId: string(),
  name: pipe(string(), maxLength(50, "name is too long"), regex(/^[a-zA-Z0-9-]+$/, "Only alphanumeric and hyphen allowed")),
  isDeploySql: boolean(),
  isDeployDummy: boolean(),
  strictSqlExecution: optional(boolean(), true),
  sql: string(),
  javascript: string(),
  token: string(),
});

app.post("/cloudflare", vValidator("json", deployCloudflareSchema), async (c) => {

  const { environmentId, accountId, name, isDeploySql, strictSqlExecution, sql, javascript, token } =
    c.req.valid("json");

  const { workerName, d1Name, d1Id, publishUrl } = await deployUsecase.deployCloudflare(
    {
      environmentId,
      accountId,
      name,
      isDeploySql,
      strictSqlExecution,
      sql,
      token,
      javascript,
    },
  );

  return c.json({ workerName, d1Name, d1Id, publishUrl });
})

export default app
