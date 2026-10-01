const BASE_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:5000";

export async function apiRegister(did, hash) {
  const res  = await fetch(`${BASE_URL}/api/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ did, hash }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Registration failed");
  return data;
}

export async function apiVerify(did, proof, publicSignals) {
  const res  = await fetch(`${BASE_URL}/api/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ did, proof, publicSignals }),
  });
  const data = await res.json();
  if (!res.ok && !data.authenticated) throw new Error(data.error || "Verification failed");
  return data;
}

export async function apiUpdate(did, newHash, privateKey) {
  const res  = await fetch(`${BASE_URL}/api/update`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ did, newHash, privateKey }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Update failed");
  return data;
}

export async function apiRevoke(did, privateKey) {
  const res  = await fetch(`${BASE_URL}/api/revoke`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ did, privateKey }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Revocation failed");
  return data;
}

export async function apiCheckStatus(did) {
  const res  = await fetch(`${BASE_URL}/api/status/${encodeURIComponent(did)}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Status check failed");
  return data;
}
