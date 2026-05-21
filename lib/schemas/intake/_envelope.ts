export type Envelope<T> = {
  $schema: string;
  $version: number;
  data: T;
};

export function wrapOutput<T>(
  schemaName: string,
  schemaVersion: number,
  data: T,
): Envelope<T> {
  return { $schema: schemaName, $version: schemaVersion, data };
}
