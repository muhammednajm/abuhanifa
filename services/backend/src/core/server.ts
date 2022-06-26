import { serve } from "https://deno.land/std@0.145.0/http/server.ts";
import { Pool } from "https://deno.land/x/postgres@v0.16.1/mod.ts";
import routes from "./router.ts";

const pool = new Pool(
  {
    user: "muhammad",
    password: "math",
    hostname: "db",
    database: "app",
    port: 5432,
    tls: {
      enabled: false,
    },
  },
  20,
  true,
);

const tools = {
  rows: async (SQL: string, args: any) => {
    const client = await pool.connect();

    try {
      const { rows } = await client.queryObject({
        text: SQL,
        args,
        camelcase: true,
      });
      return rows;
    } catch (e) {
      throw e;
    } finally {
      client.release();
    }
  },

  row: async (SQL: string, args: any) => {
    const client = await pool.connect();

    try {
      const { rows: [row] } = await client.queryObject({
        text: SQL,
        args,
        camelcase: true,
      });
      return row;
    } catch (e) {
      throw e;
    } finally {
      client.release();
    }
  },
};

type HTTPHandler = (
  req: ProxyRequest,
  helpers: { [name: string]: Function },
) => Promise<[
  | 200
  | // Ok
  201
  | // Created
  400
  | // Bad Request
  401
  | // Unauthorized
  402
  | // Payment Required
  503, // Service Unavailable
  (Promise<Object> | Object | null)?, // Response body
  { [name: string]: string }?, // Headers
]>;

class ProxyRequest {
  constructor(
    public body: { [name: string]: any } = {},
    public params: Object = {},
    public query: { [name: string]: any } = {},
  ) {}

  async upload(path: string | URL, file: File) {
    const stream: ReadableStream = file.stream();

    const reader: ReadableStreamDefaultReader = stream.getReader();

    const data = await reader.read();

    await Deno.writeFile(path, data.value);
  }
}

class Server {
  constructor(
    public options: { port: number } = { port: 80 },
    private _routes: { [name: string]: [string, HTTPHandler][] } = {},
  ) {}

  get(pathname: string, handler: HTTPHandler): Server {
    if (!("OK" in this._routes)) {
      this._routes["GET"] = [];
    }
    this._routes["GET"].push([pathname, handler]);
    return this;
  }

  put(pathname: string, handler: HTTPHandler): Server {
    if (!("OK" in this._routes)) {
      this._routes["PUT"] = [];
    }
    this._routes["PUT"].push([pathname, handler]);
    return this;
  }

  patch(pathname: string, handler: HTTPHandler): Server {
    if (!("OK" in this._routes)) {
      this._routes["PATCH"] = [];
    }
    this._routes["PATCH"].push([pathname, handler]);
    return this;
  }

  post(pathname: string, handler: HTTPHandler): Server {
    if (!("OK" in this._routes)) {
      this._routes["POST"] = [];
    }
    this._routes["POST"].push([pathname, handler]);
    return this;
  }

  delete(pathname: string, handler: HTTPHandler): Server {
    if (!("OK" in this._routes)) {
      this._routes["DELETE"] = [];
    }
    this._routes["DELETE"].push([pathname, handler]);
    return this;
  }

  run() {
    serve((req: Request) => {
      return this._handler(req);
    }, { port: this.options.port });
  }

  async _handler(request: Request): Promise<Response> {
    if (request.method === "OPTIONS") {
      return new Response("OK", {
        status: 200,
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    if (!(request.method in routes)) {
      return new Response(null, {
        status: 405,
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    for (const [pathname, service, handler] of routes[request.method]) {
      const pattern = new URLPattern({ pathname });

      if (pattern.test(request.url)) {
        const requestBody: { [name: string]: any } = {};
        const requestQuery: { [name: string]: any } = {};
        let requestParms: Object = {};

        const paramsExec = pattern.exec(request.url);

        if (paramsExec) {
          requestParms = paramsExec.pathname.groups;
        }

        for (
          const [name, value]
            of (new URLSearchParams((new URL(request.url)).search)).entries()
        ) {
          requestQuery[name] = value;
        }

        const contentType = request.headers.get("content-type");

        if (contentType) {
          if (contentType.startsWith("multipart/form-data;")) {
            try {
              const formData = await request.formData();
              for (const [name, value] of formData) {
                requestBody[name] = value;
              }
            } catch (err) {
            }
          }
        }

        const proxyRequest = new ProxyRequest(
          requestBody,
          requestParms,
          requestQuery,
        );

        const [status, body, headers = {}] = await handler.call(
          service,
          proxyRequest,
          tools,
        );

        return new Response(
          body ? JSON.stringify(body) : null,
          {
            status,
            headers: {
              "Access-Control-Allow-Origin": "*",
              "Content-Type": "application/json;charset=UTF-8",
              ...headers,
            },
          },
        );
      }
    }

    return new Response(null, {
      status: 404,
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
    });
  }
}

export default Server;
