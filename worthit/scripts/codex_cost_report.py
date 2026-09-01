#!/usr/bin/env python3
"""Create a self-contained WorthIt cost report from a local Codex session log.

The tool reads usage counters only. It does not send the session, prompts, or
credentials anywhere. Model prices and subscription allocation are supplied by
the user in a local TOML configuration because both change over time.
"""

from __future__ import annotations

import argparse
import html
import json
import sys
import tomllib
from pathlib import Path
from typing import Any


USAGE_FIELDS = (
    "input_tokens",
    "cached_input_tokens",
    "cache_write_input_tokens",
    "output_tokens",
)


def locale(language: str) -> dict[str, str]:
    if language == "zh-CN":
        return {
            "title": "WorthIt AI 成本报告",
            "subtitle": "基于本地 Codex 会话记录；不会上传提示词或凭据。",
            "api": "API 等价成本（估算）",
            "subscription": "订阅消耗估算（估算）",
            "item": "项目",
            "amount": "数值",
            "source": "来源",
            "model": "模型",
            "tokens": "Token 数",
            "unit_price": "单价 / 每百万 Token",
            "cost": "费用",
            "input": "普通输入 Token",
            "cached": "缓存输入 Token",
            "cache_write": "缓存写入 Token",
            "output": "输出 Token",
            "total": "API 等价总成本",
            "subscription_cost": "本任务订阅分摊",
            "share": "任务使用占比",
            "basis": "估算依据",
            "unknown": "未知",
            "estimate": "估算值，不是实际账单。",
            "missing": "无法计算：缺少模型单价、有效日期或套餐分摊依据。",
            "limits": "说明与限制",
            "no_add": "API 等价成本和订阅消耗估算是两种不同的视角，不能相加。",
            "zero": "只有记录明确证明数值为零时才显示 0。",
            "eyebrow": "WorthIt · 成本洞察",
            "cost_detail": "输入、缓存和输出分别计价。",
            "subscription_detail": "已购套餐的比例分摊，不代表新增收费。",
            "limits_detail": "如何理解这些数字。",
            "estimate_badge": "估算",
            "separate_badge": "独立视角",
        }
    return {
        "title": "WorthIt AI cost report",
        "subtitle": "Derived from a local Codex session log; prompts and credentials stay local.",
        "api": "API-equivalent cost (estimate)",
        "subscription": "Subscription consumption estimate (estimate)",
        "item": "Item",
        "amount": "Amount",
        "source": "Source",
        "model": "Model",
        "tokens": "Tokens",
        "unit_price": "Unit price / 1M tokens",
        "cost": "Cost",
        "input": "Standard input tokens",
        "cached": "Cached input tokens",
        "cache_write": "Cache-write input tokens",
        "output": "Output tokens",
        "total": "Total API-equivalent cost",
        "subscription_cost": "Task subscription allocation",
        "share": "Task usage share",
        "basis": "Allocation basis",
        "unknown": "Unknown",
        "estimate": "Estimate, not an actual invoice.",
        "missing": "Cannot calculate: missing model price, effective date, or subscription allocation basis.",
        "limits": "Notes and limits",
        "no_add": "API-equivalent cost and subscription consumption are separate views and must not be added together.",
        "zero": "A zero is displayed only when the record explicitly proves a zero value.",
        "eyebrow": "WorthIt · cost intelligence",
        "cost_detail": "Input, cache, and output are priced independently.",
        "subscription_detail": "A proportional allocation of an existing plan, not an extra charge.",
        "limits_detail": "How to read these numbers.",
        "estimate_badge": "Estimate",
        "separate_badge": "Separate view",
    }


def parse_session(path: Path) -> tuple[dict[str, int], list[str], bool]:
    usage = {field: 0 for field in USAGE_FIELDS}
    models: set[str] = set()
    usage_observed = False
    with path.open("r", encoding="utf-8") as handle:
        for line in handle:
            try:
                record = json.loads(line)
            except json.JSONDecodeError:
                continue
            payload = record.get("payload", {})
            if record.get("type") == "event_msg" and payload.get("type") == "token_count":
                usage_observed = True
                total = payload.get("info", {}).get("total_token_usage", {})
                for field in USAGE_FIELDS:
                    value = total.get(field)
                    if isinstance(value, int) and value >= 0:
                        usage[field] = max(usage[field], value)
            settings = payload.get("thread_settings")
            if isinstance(settings, dict) and isinstance(settings.get("model"), str):
                models.add(settings["model"])
    return usage, sorted(models), usage_observed


def money(value: float | None, currency: str, unknown: str) -> str:
    return unknown if value is None else f"{currency} {value:,.4f}"


def token_value(value: int, unknown: str) -> str:
    return f"{value:,}" if value else unknown


def get_price(model_prices: dict[str, Any], model: str, key: str) -> float | None:
    raw = model_prices.get(model, {}).get(key)
    return float(raw) if isinstance(raw, (int, float)) and raw > 0 else None


def calculate_api(usage: dict[str, int], models: list[str], config: dict[str, Any], usage_observed: bool = True) -> tuple[dict[str, float | None], str]:
    pricing = config.get("pricing", {})
    model_prices = pricing.get("models", {})
    model = models[0] if len(models) == 1 else None
    effective_date = pricing.get("effective_date")
    if not usage_observed or not model or not isinstance(effective_date, str) or not effective_date.strip():
        return {field: None for field in USAGE_FIELDS} | {"total": None}, "unknown"
    remaining_input = max(0, usage["input_tokens"] - usage["cached_input_tokens"] - usage["cache_write_input_tokens"])
    quantities = {
        "input_tokens": remaining_input,
        "cached_input_tokens": usage["cached_input_tokens"],
        "cache_write_input_tokens": usage["cache_write_input_tokens"],
        "output_tokens": usage["output_tokens"],
    }
    price_keys = {
        "input_tokens": "input_per_million",
        "cached_input_tokens": "cached_input_per_million",
        "cache_write_input_tokens": "cache_write_input_per_million",
        "output_tokens": "output_per_million",
    }
    result: dict[str, float | None] = {}
    active_missing = False
    for field, quantity in quantities.items():
        if quantity == 0:
            result[field] = 0.0
            continue
        price = get_price(model_prices, model, price_keys[field])
        result[field] = None if price is None else quantity * price / 1_000_000
        active_missing = active_missing or result[field] is None
    result["total"] = None if active_missing else sum(value or 0.0 for value in result.values())
    source = "configured_public_price" if result["total"] is not None else "unknown"
    return result, source


def subscription_estimate(config: dict[str, Any]) -> tuple[float | None, float | None, str, str]:
    subscription = config.get("subscription", {})
    cost = subscription.get("period_cost_usd")
    share = subscription.get("task_usage_share")
    basis = subscription.get("basis")
    source = subscription.get("source")
    if not isinstance(cost, (int, float)) or cost <= 0 or not isinstance(share, (int, float)) or not 0 <= share <= 1:
        return None, None, "unknown", "unknown"
    return float(cost) * float(share), float(share), str(basis or "unknown"), str(source or "unknown")


def row(label: str, tokens: str, price: str, cost: str, source: str) -> str:
    return (
        f"<tr><td>{html.escape(label)}</td><td>{html.escape(tokens)}</td>"
        f"<td>{html.escape(price)}</td><td>{html.escape(cost)}</td>"
        f"<td>{html.escape(source)}</td></tr>"
    )


def render(usage: dict[str, int], models: list[str], api: dict[str, float | None], api_source: str, sub: tuple[float | None, float | None, str, str], config: dict[str, Any], language: str) -> str:
    t = locale(language)
    pricing = config.get("pricing", {})
    currency = str(pricing.get("currency", "USD"))
    model_label = ", ".join(models) if models else t["unknown"]
    standard_input = max(0, usage["input_tokens"] - usage["cached_input_tokens"] - usage["cache_write_input_tokens"])
    model = models[0] if len(models) == 1 else None
    model_prices = config.get("pricing", {}).get("models", {})
    prices = model_prices.get(model, {}) if model else {}
    price_by_field = {
        "input_tokens": prices.get("input_per_million"),
        "cached_input_tokens": prices.get("cached_input_per_million"),
        "cache_write_input_tokens": prices.get("cache_write_input_per_million"),
        "output_tokens": prices.get("output_per_million"),
    }
    labels = {
        "input_tokens": t["input"],
        "cached_input_tokens": t["cached"],
        "cache_write_input_tokens": t["cache_write"],
        "output_tokens": t["output"],
    }
    quantities = {
        "input_tokens": standard_input,
        "cached_input_tokens": usage["cached_input_tokens"],
        "cache_write_input_tokens": usage["cache_write_input_tokens"],
        "output_tokens": usage["output_tokens"],
    }
    api_rows = [
        row(t["model"], model_label, t["unknown"], t["unknown"], "observed" if models else "unknown"),
        *[
            row(
                labels[field],
                token_value(quantities[field], t["unknown"]),
                t["unknown"] if not isinstance(price_by_field[field], (int, float)) or price_by_field[field] <= 0 else f"{currency} {float(price_by_field[field]):,.4f}",
                money(api[field], currency, t["unknown"]),
                api_source,
            )
            for field in ("input_tokens", "cached_input_tokens", "cache_write_input_tokens", "output_tokens")
        ],
        row(t["total"], t["unknown"], t["unknown"], money(api["total"], currency, t["unknown"]), api_source),
    ]
    sub_cost, sub_share, basis, sub_source = sub
    sub_rows = [
        row(t["subscription_cost"], t["unknown"], t["unknown"], money(sub_cost, currency, t["unknown"]), sub_source),
        row(t["share"], t["unknown"] if sub_share is None else f"{sub_share:.2%}", t["unknown"], t["unknown"], sub_source),
        row(t["basis"], basis, t["unknown"], t["unknown"], sub_source),
    ]
    lang_attr = "zh-CN" if language == "zh-CN" else "en"
    return f"""<!doctype html>
<html lang=\"{lang_attr}\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width, initial-scale=1\"><title>{html.escape(t['title'])}</title>
<style>
:root{{font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#182235;background:#eef3f7;--ink:#182235;--muted:#66748a;--line:#dfe7ef;--panel:#fff;--soft:#f6f9fb;--brand:#087f73;--brand-soft:#e2f5f1;--amber:#a34e08;--amber-soft:#fff4e8;--shadow:0 18px 45px rgba(26,49,72,.09)}}
*{{box-sizing:border-box}} body{{margin:0;min-height:100vh;background:radial-gradient(circle at 0 0,#dff5f1 0,transparent 34%),#eef3f7;color:var(--ink)}} main{{max-width:980px;margin:32px auto;padding:0 18px 42px}}.shell{{background:var(--panel);border:1px solid rgba(223,231,239,.9);border-radius:24px;box-shadow:var(--shadow);overflow:hidden}}header{{padding:34px 36px 30px;background:linear-gradient(135deg,#f7fffd,#fff 58%);border-bottom:1px solid var(--line)}}h1{{margin:0 0 9px;font-size:clamp(1.55rem,3vw,2.35rem);letter-spacing:-.03em}}h2{{margin:0;font-size:1.08rem;letter-spacing:-.01em}}p{{line-height:1.6}}.note,.source{{color:var(--muted)}}.eyebrow{{margin:0 0 10px;color:var(--brand);font-size:.74rem;font-weight:800;letter-spacing:.12em;text-transform:uppercase}}.subtitle{{max-width:680px;margin:0;color:var(--muted)}}.section{{padding:28px 36px;border-bottom:1px solid var(--line)}}.section:last-child{{border-bottom:0}}.section-head{{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:16px}}.section-kicker{{margin:4px 0 0;color:var(--muted);font-size:.86rem}}.badge{{display:inline-flex;align-items:center;gap:6px;padding:6px 10px;border-radius:999px;background:var(--brand-soft);color:#07665d;font-size:.8rem;font-weight:750;white-space:nowrap}}.badge::before{{content:"";width:7px;height:7px;border-radius:50%;background:var(--brand)}}.cost-grid{{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin:0 0 18px}}.metric{{padding:16px;border:1px solid var(--line);border-radius:16px;background:var(--soft)}}.metric-label{{display:block;color:var(--muted);font-size:.82rem;margin-bottom:7px}}.metric-value{{font-size:1.3rem;font-weight:800;letter-spacing:-.02em}}.metric-value.unknown{{color:var(--muted);font-size:1.1rem}}.table-wrap{{overflow-x:auto;border:1px solid var(--line);border-radius:14px}}table{{width:100%;min-width:690px;border-collapse:collapse}}th,td{{text-align:left;padding:11px 12px;border-bottom:1px solid var(--line);vertical-align:top;font-size:.9rem}}th{{background:var(--soft);font-size:.76rem;letter-spacing:.04em;text-transform:uppercase;color:var(--muted)}}tr:last-child td,tr:last-child th{{border-bottom:0}}tbody tr:hover{{background:#fbfdfd}}.estimate{{margin:12px 0 0;font-size:.86rem;color:var(--muted)}}.warning{{margin:0;padding:15px 17px;border-left:4px solid #e18b2c;border-radius:0 12px 12px 0;background:var(--amber-soft);color:#71400f}}ul{{margin:8px 0;padding-left:22px}}code{{padding:2px 5px;border-radius:5px;background:#edf2f6}}@media(max-width:720px){{main{{margin:0;padding:0 10px 24px}}.shell{{border-radius:18px}}header,.section{{padding:24px 20px}}.cost-grid{{grid-template-columns:1fr 1fr}}.section-head{{display:block}}.section-head .badge{{margin-top:10px}}}}@media(max-width:440px){{.cost-grid{{grid-template-columns:1fr}}h1{{font-size:1.55rem}}}}
</style></head><body><main><div class=\"shell\"><header><p class=\"eyebrow\">{html.escape(t['eyebrow'])}</p><h1>{html.escape(t['title'])}</h1><p class=\"subtitle\">{html.escape(t['subtitle'])}</p></header>
<section class=\"section\"><div class=\"section-head\"><div><h2>{html.escape(t['api'])}</h2><p class=\"section-kicker\">{html.escape(t['cost_detail'])}</p></div><span class=\"badge\">{html.escape(t['estimate_badge'])}</span></div><div class=\"cost-grid\"><div class=\"metric\"><span class=\"metric-label\">{html.escape(t['input'])}</span><strong class=\"metric-value {'unknown' if api['input_tokens'] is None else ''}\">{html.escape(money(api['input_tokens'], currency, t['unknown']))}</strong></div><div class=\"metric\"><span class=\"metric-label\">{html.escape(t['output'])}</span><strong class=\"metric-value {'unknown' if api['output_tokens'] is None else ''}\">{html.escape(money(api['output_tokens'], currency, t['unknown']))}</strong></div><div class=\"metric\"><span class=\"metric-label\">{html.escape(t['total'])}</span><strong class=\"metric-value {'unknown' if api['total'] is None else ''}\">{html.escape(money(api['total'], currency, t['unknown']))}</strong></div></div><div class=\"table-wrap\"><table><thead><tr><th>{html.escape(t['item'])}</th><th>{html.escape(t['tokens'])}</th><th>{html.escape(t['unit_price'])}</th><th>{html.escape(t['cost'])}</th><th>{html.escape(t['source'])}</th></tr></thead><tbody>{''.join(api_rows)}</tbody></table></div><p class=\"estimate\">{html.escape(t['estimate'])}</p></section>
<section class=\"section\"><div class=\"section-head\"><div><h2>{html.escape(t['subscription'])}</h2><p class=\"section-kicker\">{html.escape(t['subscription_detail'])}</p></div><span class=\"badge\">{html.escape(t['separate_badge'])}</span></div><div class=\"table-wrap\"><table><thead><tr><th>{html.escape(t['item'])}</th><th>{html.escape(t['tokens'])}</th><th>{html.escape(t['unit_price'])}</th><th>{html.escape(t['cost'])}</th><th>{html.escape(t['source'])}</th></tr></thead><tbody>{''.join(sub_rows)}</tbody></table></div><p class=\"estimate\">{html.escape(t['estimate'])}</p></section>
<section class=\"section\"><div class=\"section-head\"><div><h2>{html.escape(t['limits'])}</h2><p class=\"section-kicker\">{html.escape(t['limits_detail'])}</p></div></div><p class=\"warning\">{html.escape(t['no_add'])}<br>{html.escape(t['missing'])}<br>{html.escape(t['zero'])}</p></section>
</div></main></body></html>"""


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--session", required=True, type=Path)
    parser.add_argument("--config", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--language", choices=("zh-CN", "en"), default="en")
    args = parser.parse_args()
    with args.config.open("rb") as handle:
        config = tomllib.load(handle)
    usage, models, usage_observed = parse_session(args.session)
    api, api_source = calculate_api(usage, models, config, usage_observed)
    report = render(usage, models, api, api_source, subscription_estimate(config), config, args.language)
    args.output.write_text(report, encoding="utf-8")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
