const fs = require('fs');
const path = require('path');

function loadEnvFile(fileName) {
  const filePath = path.join(__dirname, fileName);
  if (!fs.existsSync(filePath)) return {};

  return fs.readFileSync(filePath, 'utf8').split(/\r?\n/).reduce((env, line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return env;

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) return env;

    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    env[key] = value;
    return env;
  }, {});
}

const loadedEnv = {
  ...loadEnvFile('.env.production'),
  ...loadEnvFile('.env'),
  NEXTAUTH_URL: 'https://dent-ix.app'
};

function envOr(key, fallback) {
  return loadedEnv[key] || process.env[key] || fallback;
}

const workerEnv = {
  ...loadedEnv,
  NODE_ENV: 'production',
  INGRESS_WORKER_CONCURRENCY: envOr('INGRESS_WORKER_CONCURRENCY', '8'),
  CORE_ROUTING_WORKER_CONCURRENCY: envOr('CORE_ROUTING_WORKER_CONCURRENCY', '8'),
  AI_WORKER_CONCURRENCY: envOr('AI_WORKER_CONCURRENCY', '12'),
  EGRESS_WORKER_CONCURRENCY: envOr('EGRESS_WORKER_CONCURRENCY', '8'),
  OUTBOUND_WORKER_CONCURRENCY: envOr('OUTBOUND_WORKER_CONCURRENCY', '24'),
  KNOWLEDGE_WORKER_CONCURRENCY: envOr('KNOWLEDGE_WORKER_CONCURRENCY', '3'),
  MASTRA_MAX_TOOL_CALLS: envOr('MASTRA_MAX_TOOL_CALLS', '1'),
  MASTRA_TIMEOUT_MS: envOr('MASTRA_TIMEOUT_MS', '18000'),
  AI_KB_SEARCH_LIMIT: envOr('AI_KB_SEARCH_LIMIT', '4'),
  KNOWLEDGE_CANDIDATE_LIMIT: envOr('KNOWLEDGE_CANDIDATE_LIMIT', '80'),
  KNOWLEDGE_KEYWORD_LIMIT: envOr('KNOWLEDGE_KEYWORD_LIMIT', '40'),
  KNOWLEDGE_FAST_KEYWORD_CONFIDENCE: envOr('KNOWLEDGE_FAST_KEYWORD_CONFIDENCE', '65')
};

module.exports = {
  apps: [
    {
      name: 'chatzi-web',
      script: 'node_modules/next/dist/bin/next',
      args: 'start',
      instances: 2,
      exec_mode: 'cluster',
      max_memory_restart: '768M',
      out_file: './logs/chatzi-web.out.log',
      error_file: './logs/chatzi-web.err.log',
      env: {
        ...loadedEnv,
        NODE_ENV: 'production',
        PORT: 3000
      }
    },
    {
      name: 'worker-ingress',
      script: 'node_modules/ts-node/dist/bin.js',
      args: '--transpile-only -r tsconfig-paths/register --compiler-options {"module":"commonjs","moduleResolution":"node"} workers/ingress-worker.ts',
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '1200M',
      out_file: './logs/worker-ingress.out.log',
      error_file: './logs/worker-ingress.err.log',
      env: workerEnv
    },
    {
      name: 'worker-core-routing',
      script: 'node_modules/ts-node/dist/bin.js',
      args: '--transpile-only -r tsconfig-paths/register --compiler-options {"module":"commonjs","moduleResolution":"node"} workers/core-routing-worker.ts',
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '1200M',
      out_file: './logs/worker-core-routing.out.log',
      error_file: './logs/worker-core-routing.err.log',
      env: workerEnv
    },
    {
      name: 'worker-ai',
      script: 'node_modules/ts-node/dist/bin.js',
      args: '--transpile-only -r tsconfig-paths/register --compiler-options {"module":"commonjs","moduleResolution":"node"} workers/ai-worker.ts',
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '1200M',
      out_file: './logs/worker-ai.out.log',
      error_file: './logs/worker-ai.err.log',
      env: workerEnv
    },
    {
      name: 'worker-egress',
      script: 'node_modules/ts-node/dist/bin.js',
      args: '--transpile-only -r tsconfig-paths/register --compiler-options {"module":"commonjs","moduleResolution":"node"} workers/egress-worker.ts',
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '1200M',
      out_file: './logs/worker-egress.out.log',
      error_file: './logs/worker-egress.err.log',
      env: workerEnv
    },
    {
      name: 'worker-outbound',
      script: 'node_modules/ts-node/dist/bin.js',
      args: '--transpile-only -r tsconfig-paths/register --compiler-options {"module":"commonjs","moduleResolution":"node"} workers/outbound-worker.ts',
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '1200M',
      out_file: './logs/worker-outbound.out.log',
      error_file: './logs/worker-outbound.err.log',
      env: workerEnv
    },


    {
      name: 'chatzi-socket',
      script: 'node_modules/ts-node/dist/bin.js',
      args: '--transpile-only -r tsconfig-paths/register --compiler-options {"module":"commonjs","moduleResolution":"node"} server/socket-server.ts',
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '512M',
      out_file: './logs/chatzi-socket.out.log',
      error_file: './logs/chatzi-socket.err.log',
      env: {
        ...workerEnv,
        SOCKET_IO_PORT: loadedEnv.SOCKET_IO_PORT || '4001',
        SOCKET_IO_PATH: loadedEnv.SOCKET_IO_PATH || '/socket.io'
      }
    },

    {
      name: 'worker-knowledge',
      script: 'node_modules/ts-node/dist/bin.js',
      args: '--transpile-only -r tsconfig-paths/register --compiler-options {"module":"commonjs","moduleResolution":"node"} workers/knowledge-worker.ts',
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '1200M',
      out_file: './logs/worker-knowledge.out.log',
      error_file: './logs/worker-knowledge.err.log',
      env: workerEnv
    }
  ]
};
