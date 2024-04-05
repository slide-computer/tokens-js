export const getCollections = async (): Promise<
  Array<{
    id: string;
    name?: string;
    unit?: string;
    avatar?: string;
    owner?: string;
  }>
> => {
  const res = await fetch(
    "https://us-central1-entrepot-api.cloudfunctions.net/api/collections",
  );
  return res.json();
};

export const urlIsImage = async (url: string): Promise<boolean> => {
  // Web can't use fetch in the browser due to possibly running into CORS
  if (window?.Image) {
    return new Promise((resolve) => {
      const image = new Image();
      image.onload = () => resolve(true);
      image.onerror = () => resolve(false);
      image.src = url;
    });
  }

  // This isn't an issue outside the browser
  try {
    const res = await fetch(url, { method: "HEAD" });
    return !!res.headers.get("Content-Type")?.startsWith("image/");
  } catch (_) {
    return false;
  }
};
