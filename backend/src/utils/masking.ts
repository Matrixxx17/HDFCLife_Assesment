export function maskAadhaar(aadhaar: string): string {
  if (!aadhaar) return "";
  const cleaned = aadhaar.replace(/\s|-/g, "");
  if (cleaned.length !== 12) return aadhaar;
  return `XXXX-XXXX-${cleaned.slice(8)}`;
}

export function maskPAN(pan: string): string {
  if (!pan) return "";
  const cleaned = pan.trim().toUpperCase();
  if (cleaned.length !== 10) return pan;
  const p1 = cleaned.slice(0, 3);
  const p2 = cleaned.slice(5, 7);
  const p3 = cleaned.slice(9);
  return `${p1}XX${p2}XX${p3}`;
}

export function maskMobile(mobile: string): string {
  if (!mobile) return "";
  const cleaned = mobile.trim();
  if (cleaned.length !== 10) return mobile;
  return `${cleaned.slice(0, 2)}XXXXXX${cleaned.slice(8)}`;
}

export function serializeCustomer(customer: any): any {
  if (!customer) return customer;
  const doc = typeof customer.toObject === "function" ? customer.toObject() : { ...customer };
  if (doc.aadhaar) doc.aadhaar = maskAadhaar(doc.aadhaar);
  if (doc.pan) doc.pan = maskPAN(doc.pan);
  if (doc.mobile) doc.mobile = maskMobile(doc.mobile);
  return doc;
}

export function serializeCustomers(customers: any[]): any[] {
  return customers.map((c) => serializeCustomer(c));
}

export function serializePolicy(policy: any): any {
  if (!policy) return policy;
  const doc = typeof policy.toObject === "function" ? policy.toObject() : { ...policy };
  if (doc.customerId) {
    if (typeof doc.customerId === "object" && doc.customerId !== null && !doc.customerId._id) {
      doc.customerId = serializeCustomer(doc.customerId);
    }
  }
  return doc;
}

export function serializePolicies(policies: any[]): any[] {
  return policies.map((p) => serializePolicy(p));
}
