/**
 * Browser-based CSR (Certificate Signing Request) generator.
 * Uses the Web Crypto API + PKI.js to generate a 2048-bit RSA key pair
 * and a PKCS#10 CSR entirely in the browser.
 *
 * The private key never leaves the client.
 */

import * as asn1js from "asn1js";
import * as pkijs from "pkijs";
import { Convert } from "pvtsutils";

const HASH_ALG = "SHA-256";
const KEY_SIZE = 2048;

export interface CSRSubject {
  commonName: string; // domain name
  organization: string;
  country: string; // 2-letter ISO
  state?: string;
  city?: string;
}

export interface CSRResult {
  csr: string; // PEM-formatted CSR
  privateKey: string; // PEM-formatted private key
}

/**
 * Generate a CSR and RSA key pair in the browser.
 * Returns PEM-encoded CSR and private key.
 */
export async function generateCSR(subject: CSRSubject): Promise<CSRResult> {
  // Ensure Web Crypto is available
  const cryptoObj = getGlobalCrypto();
  const subtle = cryptoObj.subtle;

  // Set the crypto engine for PKI.js
  pkijs.setEngine("webcrypto", new pkijs.CryptoEngine({
    name: "webcrypto",
    crypto: cryptoObj,
  }));

  // Generate RSA key pair
  const keyPair = await subtle.generateKey(
    {
      name: "RSASSA-PKCS1-v1_5",
      modulusLength: KEY_SIZE,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: HASH_ALG,
    },
    true, // extractable — needed to export the private key
    ["sign", "verify"]
  );

  // Build the PKCS#10 CSR
  const pkcs10 = new pkijs.CertificationRequest();
  pkcs10.version = 0;

  // Add subject attributes
  addSubjectAttribute(pkcs10, "2.5.4.3", subject.commonName); // CN
  addSubjectAttribute(pkcs10, "2.5.4.10", subject.organization); // O
  addSubjectAttribute(pkcs10, "2.5.4.6", subject.country, true); // C (PrintableString)

  if (subject.state) {
    addSubjectAttribute(pkcs10, "2.5.4.8", subject.state); // ST
  }
  if (subject.city) {
    addSubjectAttribute(pkcs10, "2.5.4.7", subject.city); // L
  }

  // Set the public key and sign
  await pkcs10.subjectPublicKeyInfo.importKey(keyPair.publicKey);
  await pkcs10.sign(keyPair.privateKey, HASH_ALG);

  // Export CSR to PEM
  const csrDer = pkcs10.toSchema().toBER(false);
  const csrPem = toPem(csrDer, "CERTIFICATE REQUEST");

  // Export private key to PEM
  const privateKeyDer = await subtle.exportKey("pkcs8", keyPair.privateKey);
  const privateKeyPem = toPem(privateKeyDer, "PRIVATE KEY");

  return {
    csr: csrPem,
    privateKey: privateKeyPem,
  };
}

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

function getGlobalCrypto(): Crypto {
  if (typeof window !== "undefined" && window.crypto?.subtle) {
    return window.crypto;
  }
  throw new Error(
    "Web Crypto API is not available. Please use a modern browser with HTTPS."
  );
}

function addSubjectAttribute(
  pkcs10: pkijs.CertificationRequest,
  oid: string,
  value: string,
  printable = false
) {
  pkcs10.subject.typesAndValues.push(
    new pkijs.AttributeTypeAndValue({
      type: oid,
      value: printable
        ? new asn1js.PrintableString({ value })
        : new asn1js.Utf8String({ value }),
    })
  );
}

function toPem(der: ArrayBuffer, label: string): string {
  const b64 = Convert.ToBase64(der);
  const lines = b64.match(/.{1,64}/g) || [];
  return `-----BEGIN ${label}-----\n${lines.join("\n")}\n-----END ${label}-----`;
}

/**
 * Trigger a browser download of a text file.
 */
export function downloadTextFile(content: string, filename: string) {
  const blob = new Blob([content], { type: "application/x-pem-file" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
