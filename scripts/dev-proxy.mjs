/** Development only. The deployed frontend contains no proxy or server script. */
export const frontendOrigin = 'http://localhost:4321';
export const backendOrigin = 'http://localhost:8787';

export function configureAuthProxy(proxy) {
  proxy.on('proxyReq', (proxyRequest, request) => {
    // Keep missing/foreign Origin unchanged, so Rust continues to reject it.
    if (request.headers.origin === frontendOrigin) {
      proxyRequest.setHeader('Origin', backendOrigin);
    }
  });
}

export const apiProxy = {
  target: backendOrigin,
  changeOrigin: true,
  configure: configureAuthProxy,
};
