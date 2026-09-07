export function displayUserName(name: string) {
  const compactName = name
    .replace(/\s+(HM\s+)?Constructora$/i, "")
    .replace(/\s+HM$/i, "")
    .trim();
  return compactName || name;
}
