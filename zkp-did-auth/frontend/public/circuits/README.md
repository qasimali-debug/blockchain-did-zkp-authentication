# frontend/public/circuits/

This directory must contain the compiled circuit files for **browser-side proof generation**.

## Files required here:

| File | Source |
|------|--------|
| `auth_js/auth.wasm` | `circuits/build/auth_js/auth.wasm` |
| `auth_0001.zkey` | `circuits/build/auth_0001.zkey` |
| `verification_key.json` | `circuits/build/verification_key.json` |

## How to populate:

After running `bash setup.sh` in the `circuits/` directory:

```bash
# From project root
mkdir -p frontend/public/circuits/auth_js

cp circuits/build/auth_js/auth.wasm        frontend/public/circuits/auth_js/
cp circuits/build/auth_0001.zkey           frontend/public/circuits/
cp circuits/build/verification_key.json    frontend/public/circuits/
```

## Why here?

React's `public/` folder is served as static files at runtime.
SnarkJS in the browser fetches these files via HTTP to generate proofs using WebAssembly.
