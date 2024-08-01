import { Hono } from 'hono'
import { boolean, maxLength, object, optional, pipe, regex, string } from "valibot";
import { vValidator } from "@hono/valibot-validator";
import * as deployUsecase from "@/services/deploy";
import { DeployCode, renderer } from './component';

const app = new Hono()

app.get('*', renderer)

app.get('/', async (c) => {
  return c.render(
    <div>
      <DeployCode />
      <div id="deploy"></div>
    </div>
  )
})

const deployCloudflareSchema = object({
  accountId: string(),
  name: pipe(string(), maxLength(50, "name is too long"), regex(/^[a-zA-Z0-9-]+$/, "Only alphanumeric and hyphen allowed")),
  sql: string(),
  javascript: string(),
  token: string(),
});

app.post("/deploy-cloudflare", vValidator("json", deployCloudflareSchema), async (c) => {

  const { accountId, name, sql, javascript, token } =
    c.req.valid("json");

  const { workerName, d1Name, d1Id, publishUrl } = await deployUsecase.deployCloudflare(
    {
      accountId,
      name,
      sql,
      token,
      javascript,
    },
  );

  return c.json({ workerName, d1Name, d1Id, publishUrl });
})

export default app
