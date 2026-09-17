import { describe, expect, it } from "vitest";
import { checkUpload, safeFileName } from "@/lib/documents/validation";

const pdf = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31]);
const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a]);

describe("checkUpload", () => {
  it("accepts a PDF with matching extension", () => {
    expect(checkUpload("passport.pdf", 1000, pdf)).toMatchObject({ ok: true, mime: "application/pdf" });
  });
  it("rejects spoofed extensions", () => {
    expect(checkUpload("passport.pdf", 1000, png).ok).toBe(false);
  });
  it("rejects executables disguised as images", () => {
    expect(checkUpload("photo.jpg", 1000, new Uint8Array([0x4d, 0x5a, 0x90, 0x00])).ok).toBe(false);
  });
  it("rejects oversized and empty files", () => {
    expect(checkUpload("a.pdf", 11 * 1024 * 1024, pdf).ok).toBe(false);
    expect(checkUpload("a.pdf", 0, pdf).ok).toBe(false);
  });
  it("sanitises file names", () => {
    expect(safeFileName("../../etc/passwd .pdf")).toBe("etc-passwd");
    expect(safeFileName("????.pdf")).toBe("document");
  });
});
