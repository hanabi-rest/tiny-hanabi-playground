import Cloudflare from "cloudflare";
import { HTTPException } from "hono/http-exception";
import { nanoid } from "nanoid"

export const tokenVerify = async (client: Cloudflare) => {
    try {
        const verifyResult = await client.user.tokens.verify();

        if (!verifyResult.status) {
            return false;
        }
        return true;
    } catch (e) {
        return false;
    }
};

export const getCloudflareAccounts = async (client: Cloudflare) => {
    const accounts = await (await client.accounts.list()).result;

    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    return accounts.map((account: any) => {
        return {
            id: account.id,
            name: account.name,
            type: account.type,
        } as {
            id: string;
            name: string;
            type: string;
        };
    });
};

export const enableSubdomain = async ({ accountId, workerName, token }: { accountId: string; workerName: string; token: string }) => {
    const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/${workerName}/subdomain`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            enabled: true,
        }),
    }).then((res) => res.json());
    console.info(res);
};

type DeployCloudflareParams = {
    environmentId: string;
    accountId: string;
    name: string;
    isDeploySql: boolean;
    strictSqlExecution?: boolean;
    sql?: string;
    dummySql?: string;
    token: string;
    javascript: string;
};

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: <explanation>
export const deployCloudflare = async (params: DeployCloudflareParams) => {
    const {
        accountId,
        name,
        isDeploySql,
        strictSqlExecution = true,
        sql,
        javascript,
        token,
    } = params;


    if (!token) throw new HTTPException(404, { message: "Token not found" });

    const client = new Cloudflare({
        apiToken: token,
    });

    try {
        const verification = await tokenVerify(client);
        if (!verification) throw new Error("Token verification failed");
    } catch (e) {
        console.error(e);
        throw new HTTPException(400, { message: "Token verification failed" });
    }

    try {
        const cloudflareAccount = await client.accounts.get({ account_id: accountId });
        if (!cloudflareAccount) throw new Error("Account not found");
    } catch (e) {
        console.error(e);
        throw new HTTPException(400, { message: "Account not found" });
    }

    const d1Name = `${name}-d1-${nanoid(5)}`.toLowerCase();
    const workerName = `${name}-${nanoid(5)}`.toLowerCase();
    let subdomain: string | null = null;
    let d1Id: string | null = null;

    if (isDeploySql && sql) {
        try {
            const d1CreateResult = await client.d1.database.create({
                account_id: accountId,
                name: d1Name,
            });

            if (!d1CreateResult?.uuid) throw new Error("Failed to create d1 database");

            d1Id = d1CreateResult.uuid;
        } catch (e) {
            console.error(e);

            // When the maximum number of D1 databases for an account is reached

            if (e instanceof Cloudflare.PermissionDeniedError) {
                const error7406 = e.errors.find((error) => error.code === 7406);
                if (error7406) {
                    throw new HTTPException(400, { message: error7406.message });
                }
            }

            throw new HTTPException(400, { message: "Failed to create d1 database" });
        }

        try {
            const queryResult = await client.d1.database.query(d1Id, {
                account_id: accountId,
                sql,
            });

            const errorSqlResult = queryResult.filter((res) => res.success === false);
            if (errorSqlResult.length > 0 && strictSqlExecution) {
                throw new Error("Failed to execute SQL code.");
            }
        } catch (e) {
            console.error(e);
            throw new HTTPException(400, { message: "Failed to execute SQL code" });
        }

    }

    try {
        await client.workers.scripts.update(workerName, {
            account_id: accountId,
            "index.js": new File([javascript], "index.js", {
                type: "application/javascript+module",
            }),
            //@ts-ignore
            metadata: new File(
                [
                    JSON.stringify({
                        bindings: d1Id
                            ? [
                                {
                                    type: "d1",
                                    name: "DB",
                                    database_name: d1Name,
                                    id: d1Id,
                                },
                            ]
                            : [],
                        tags: ["hanabi"],
                        main_module: "index.js",
                        placement: { mode: "smart" },
                    }),
                ],
                "metadata.json",
                {
                    type: "application/json",
                },
            ),
        });
    } catch (e) {
        console.error(e);
        throw new HTTPException(400, { message: "Failed to deploy worker" });
    }

    try {
        await enableSubdomain({ accountId, workerName, token });
        const userSubdomainResult = await client.workers.subdomains.get({
            account_id: accountId,
        });
        //@ts-ignore
        subdomain = userSubdomainResult.subdomain;

        if (!subdomain) throw new Error("Failed to get subdomain");
    } catch (e) {
        console.error(e);
        throw new HTTPException(400, { message: "Failed to enable subdomain" });
    }

    return { workerName, d1Name, d1Id, publishUrl: `https://${workerName}.${subdomain}.workers.dev` };
};