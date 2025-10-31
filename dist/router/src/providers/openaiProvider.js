"use strict";
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
exports.openaiProvider = void 0;
const openai_1 = __importDefault(require("openai"));
/**
 * OpenAI provider using the Responses API.
 * Returns a normalized object shape that most registries use.
 */
const openaiProvider = async ({ system, user, model }) => {
  var _a, _b, _c, _d, _e, _f;
  const client = new openai_1.default({ apiKey: process.env.OPENAI_API_KEY });
  const resp = await client.responses.create({
    model: model !== null && model !== void 0 ? model : "gpt-4o-mini",
    input: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  });
  const anyResp = resp;
  const fallback =
    (_e =
      Array.isArray(anyResp.output) &&
      ((_d =
        (_c =
          (_b =
            (_a = anyResp.output[0]) === null || _a === void 0
              ? void 0
              : _a.content) === null || _b === void 0
            ? void 0
            : _b[0]) === null || _c === void 0
          ? void 0
          : _c.text) === null || _d === void 0
        ? void 0
        : _d.value)) !== null && _e !== void 0
      ? _e
      : "";
  // Avoid mixing ?? and || without parens:
  const text =
    ((_f = anyResp.output_text) !== null && _f !== void 0 ? _f : fallback) ||
    "";
  return { text, raw: resp };
};
exports.openaiProvider = openaiProvider;
