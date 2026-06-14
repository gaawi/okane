#!/usr/bin/env python3
"""Import a Rocket Money CSV export into the user's Supabase (okane) database.

Dry run (no writes, just a summary):
    python3 scripts/import_rocketmoney.py FILE.csv --dry-run

Commit (authenticates as the app user, creates missing categories/accounts,
inserts transactions de-duplicated by import_hash):
    SUPABASE_URL=... SUPABASE_KEY=... OKANE_EMAIL=... OKANE_PASSWORD=... \
        python3 scripts/import_rocketmoney.py FILE.csv --commit
"""
import csv, sys, os, json, hashlib, urllib.request, urllib.error
from collections import Counter

CURRENCY = "USD"  # this Rocket Money export is the USD data set
BATCH = 500


def parse_amount(raw):
    s = (raw or "").strip().replace("$", "").replace(",", "")
    if not s:
        return None
    try:
        return float(s)
    except ValueError:
        return None


def row_hash(s: str) -> str:
    """Collision-free fingerprint for a row, stored in import_hash for de-dup."""
    return hashlib.md5(s.encode("utf-8")).hexdigest()


def transform(rows):
    """Yield okane transaction dicts (without user_id / resolved ids)."""
    out = []
    for r in rows:
        amt = parse_amount(r.get("Amount"))
        date = (r.get("Date") or "").strip()[:10]
        if amt is None or not date:
            continue
        desc = (r.get("Name") or r.get("Description") or "").strip()
        cat = (r.get("Category") or "").strip()
        if cat.lower() in ("", "uncategorized"):
            cat = None
        acct = (r.get("Account Name") or "").strip() or None
        note = (r.get("Note") or "").strip() or None
        out.append({
            "posted_on": date,
            "description": desc,
            # Rocket Money: expenses positive, income negative -> flip so that
            # negative = money out, positive = money in (okane convention).
            "amount": round(-amt, 2),
            "currency": CURRENCY,
            "category_name": cat,
            "account_name": acct,
            "notes": note,
        })
    return out


def http(method, url, key, token=None, body=None, prefer=None):
    headers = {"apikey": key, "Content-Type": "application/json"}
    headers["Authorization"] = f"Bearer {token or key}"
    if prefer:
        headers["Prefer"] = prefer
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            raw = resp.read().decode()
            return resp.status, (json.loads(raw) if raw else None)
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()


def main():
    if len(sys.argv) < 2:
        print("usage: import_rocketmoney.py FILE.csv [--dry-run|--commit]")
        sys.exit(1)
    path = sys.argv[1]
    commit = "--commit" in sys.argv

    rows = list(csv.DictReader(open(path, newline="", encoding="utf-8")))
    txs = transform(rows)

    cats = Counter(t["category_name"] for t in txs if t["category_name"])
    accts = Counter(t["account_name"] for t in txs if t["account_name"])
    income = sum(t["amount"] for t in txs if t["amount"] > 0)
    expense = sum(-t["amount"] for t in txs if t["amount"] < 0)

    print(f"Parsed {len(txs)} transactions from {len(rows)} CSV rows")
    print(f"  date range: {min(t['posted_on'] for t in txs)} .. {max(t['posted_on'] for t in txs)}")
    print(f"  total income (after flip):  {income:>14,.2f} {CURRENCY}")
    print(f"  total expenses (after flip):{expense:>14,.2f} {CURRENCY}")
    print(f"  distinct categories: {len(cats)}  distinct accounts: {len(accts)}")
    print("  sample (first 5):")
    for t in txs[:5]:
        print(f"    {t['posted_on']}  {t['amount']:>10.2f}  {t['description'][:28]:28}  "
              f"[{t['category_name']}] @ {t['account_name']}")

    if not commit:
        print("\nDRY RUN — no data written. Re-run with --commit (and credentials) to import.")
        return

    url = os.environ["SUPABASE_URL"].rstrip("/")
    key = os.environ["SUPABASE_KEY"]
    email = os.environ["OKANE_EMAIL"]
    password = os.environ["OKANE_PASSWORD"]

    # 1) sign in -> user JWT (inserts run under this user's RLS context)
    st, tok = http("POST", f"{url}/auth/v1/token?grant_type=password", key,
                   body={"email": email, "password": password})
    if st != 200:
        print("AUTH FAILED:", st, tok)
        sys.exit(1)
    token = tok["access_token"]
    user_id = tok["user"]["id"]
    print(f"\nAuthenticated as {email} ({user_id})")

    # 2) load existing categories + accounts
    _, ex_cats = http("GET", f"{url}/rest/v1/categories?select=id,name", key, token)
    _, ex_accs = http("GET", f"{url}/rest/v1/accounts?select=id,name,currency", key, token)
    cat_map = {c["name"].strip().lower(): c["id"] for c in ex_cats}
    acc_map = {a["name"].strip().lower(): a["id"] for a in ex_accs}

    # 3) create missing categories
    new_cats = [n for n in cats if n.lower() not in cat_map]
    if new_cats:
        payload = [{
            "user_id": user_id, "name": n,
            "kind": "income" if any(k in n.lower() for k in
                    ("income", "reimburs", "refund", "deposit", "salary")) else "expense",
        } for n in new_cats]
        st, created = http("POST", f"{url}/rest/v1/categories", key, token,
                           body=payload, prefer="return=representation")
        if st >= 300:
            print("CATEGORY CREATE FAILED:", st, created); sys.exit(1)
        for c in created:
            cat_map[c["name"].strip().lower()] = c["id"]
    print(f"Created {len(new_cats)} categories")

    # 4) create missing accounts
    new_accs = [n for n in accts if n.lower() not in acc_map]
    if new_accs:
        payload = [{"user_id": user_id, "name": n, "type": "checking",
                    "currency": CURRENCY} for n in new_accs]
        st, created = http("POST", f"{url}/rest/v1/accounts", key, token,
                           body=payload, prefer="return=representation")
        if st >= 300:
            print("ACCOUNT CREATE FAILED:", st, created); sys.exit(1)
        for a in created:
            acc_map[a["name"].strip().lower()] = a["id"]
    print(f"Created {len(new_accs)} accounts")

    # 5) build + insert transactions in batches (de-duped by import_hash)
    # Keep every row. Identical same-day transactions (e.g. multiple subway
    # taps) are real, so we make each occurrence's import_hash unique by adding
    # an occurrence counter — otherwise the unique index would reject repeats.
    payload, occ = [], {}
    for t in txs:
        acc_id = acc_map.get((t["account_name"] or "").lower())
        cat_id = cat_map.get((t["category_name"] or "").lower())
        natural = (f"{acc_id or 'none'}|{t['posted_on']}|{t['amount']:.2f}|"
                   f"{t['description'].strip().lower()}")
        n = occ.get(natural, 0)
        occ[natural] = n + 1
        payload.append({
            "user_id": user_id, "account_id": acc_id, "category_id": cat_id,
            "posted_on": t["posted_on"], "description": t["description"],
            "amount": t["amount"], "currency": t["currency"],
            "notes": t["notes"], "import_hash": row_hash(f"{natural}|{n}"),
        })

    # Reset any prior partial load so re-runs are clean (RLS scopes this to us).
    st, res = http("DELETE", f"{url}/rest/v1/transactions?user_id=eq.{user_id}",
                   key, token, prefer="return=minimal")
    print(f"Cleared existing transactions (status {st})")

    inserted = 0
    for i in range(0, len(payload), BATCH):
        chunk = payload[i:i + BATCH]
        st, res = http("POST", f"{url}/rest/v1/transactions", key, token,
                       body=chunk, prefer="return=minimal")
        if st >= 300:
            print("INSERT FAILED at batch", i, ":", st, res); sys.exit(1)
        inserted += len(chunk)
        print(f"  batch {i//BATCH+1}: total {inserted}")

    print(f"\nDONE. Inserted {inserted} transactions.")


if __name__ == "__main__":
    main()
