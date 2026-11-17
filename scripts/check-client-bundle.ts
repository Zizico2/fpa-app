import { readdir, readFile } from 'fs/promises';
import { join } from 'path';

async function check(directory: string): Promise<number> {
  let count = 0;
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) count += await check(path);
    else if (entry.name.endsWith('.js')) {
      const source = await readFile(path, 'utf8');
      if (
        /fpa\.v1|GetPhaseRequest|FPA_GRPC_URL|createGrpcTransport|@connectrpc\/connect-node|node:http2|FPA results unavailable/.test(
          source,
        )
      ) {
        throw new Error(`Server-only code found in browser asset: ${path}`);
      }
      count++;
    }
  }
  return count;
}

console.log(
  `Checked ${await check('.next/static')} browser JavaScript assets: no gRPC runtime or server routes.`,
);
