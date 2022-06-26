import "./src/services/_register.ts";
import Server from "./src/core/server.ts";

const server = new Server({ port: 4000 });
server.run();
