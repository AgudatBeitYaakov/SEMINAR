import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const app = require("./server.cjs").default;

export default function handler(req: any, res: any) {
  return app(req, res);
}
