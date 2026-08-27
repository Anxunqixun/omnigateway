# Billing inventory

Only models with `billing_setting.billing_mode[model]=tiered_expr` use the expression engine. Everything else stays on official ratio / price / task billing.

| Kind | Request fields (`param`) | Response / poll paths | Sync or poll | Config vs adaptor |
| --- | --- | --- | --- | --- |
| OpenAI / Claude / Gemini chat | messages, max_tokens | `usage.prompt_tokens` / `input_tokens` / `usageMetadata.promptTokenCount` | Sync or stream last chunk | Config: sell expr + optional usage alias. Official adaptor already maps `p,c`. |
| Per-second video (Kling, Sora, Veo, Jimeng…) | `seconds` / `duration` | `data.task_result.videos.0.duration` or provider field | Poll | Config: v2 expr. Official task adaptor. |
| Per-call image | `n`, size, quality | usually none | Sync | Config: v2 expr on request fields. |
| Generic REST JSON task | configured body | configured `resp()` paths | Poll | Config: channel `task_generic` + model expr. |
| HMAC / JWT / protobuf / callback-only | — | — | — | Must keep a thin official or custom adaptor. |

Example sell formulas:

```text
num(resp("usage.prompt_tokens"), resp("usage.input_tokens"), usage("prompt")) * 0.5
+ num(resp("usage.completion_tokens"), resp("usage.output_tokens"), usage("completion")) * 1.5
```

```text
v2:num(param("seconds"), resp("data.task_result.videos.0.duration"), 0) * 0.17
```

Cost formulas use the same engine and **never** multiply user group ratio. Unconfigured cost is shown as "—" on the profit dashboard.
