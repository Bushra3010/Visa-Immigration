/** CMS images live in the public `cms-media` Storage bucket; the DB stores the object path. */

export const MEDIA_BUCKET = "cms-media";
export const MAX_MEDIA_BYTES = 5 * 1024 * 1024;

export const mediaUrl = (path: string) =>
  `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${MEDIA_BUCKET}/${path.split("/").map(encodeURIComponent).join("/")}`;
