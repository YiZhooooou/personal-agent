export function containsCredential(text:string){
 return /-----BEGIN [^-]*PRIVATE KEY-----|\bsk-[A-Za-z0-9_-]{12,}|authorization\s*[:=]\s*(?:bearer|basic)\s+\S+|(?:password|passwd|access_token|refresh_token|id_token|client_secret)\s*["']?\s*[:=]\s*["']?[^\s"',;]+/i.test(text);
}
