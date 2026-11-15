export function postgresConnectionOptions(connectionString, sslCa) {
  const databaseUrl = new URL(connectionString);

  for (const parameter of ['ssl', 'sslmode', 'sslcert', 'sslkey', 'sslrootcert']) {
    databaseUrl.searchParams.delete(parameter);
  }

  return {
    connectionString: databaseUrl.toString(),
    ssl: {
      rejectUnauthorized: true,
      ...(sslCa ? { ca: sslCa.replace(/\\n/g, '\n') } : {}),
    },
  };
}
