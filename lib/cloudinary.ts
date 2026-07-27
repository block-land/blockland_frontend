/**
 * Cloudinary unsigned image upload helper (browser → Cloudinary directly).
 *
 * Uses the NEXT_PUBLIC_CLOUDINARY_* env vars (unsigned upload preset), so no
 * API key/secret is exposed. Returns the secure URL of the uploaded image, or
 * null on failure / missing config.
 */

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

function isConfigured(): boolean {
  return (
    !!CLOUD_NAME &&
    !!UPLOAD_PRESET &&
    !CLOUD_NAME.includes("your_cloudinary") &&
    !UPLOAD_PRESET.includes("your_cloudinary")
  );
}

/**
 * Upload a File to Cloudinary via an unsigned upload preset.
 * @returns the secure_url string, or null if upload failed / unconfigured.
 */
export async function uploadToCloudinary(file: File): Promise<string | null> {
  if (!isConfigured()) {
    console.warn(
      "Cloudinary credentials are not configured in environment variables.",
    );
    return null;
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", UPLOAD_PRESET as string);

  try {
    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
      { method: "POST", body: formData },
    );
    if (!res.ok) throw new Error("Cloudinary upload request failed");
    const data = await res.json();
    return data.secure_url || null;
  } catch (err) {
    console.error("Cloudinary upload error:", err);
    return null;
  }
}
