// Utility function to list all routes in a human-readable format
const listRoutes = (app) => {
    const routes = [];
  
    // Iterate over the stack of middleware and routes
    app._router.stack.forEach((middleware) => {
      // Check if the middleware has a `route` object (it will for routes)
      if (middleware.route) {
        const methods = Object.keys(middleware.route.methods).map(method => method.toUpperCase());
        const path = middleware.route.path.replace(/\/\?$/, '');  // Remove the trailing /? (optional path)
        
        methods.forEach(method => {
          routes.push({
            method,
            path
          });
        });
      } else if (middleware.name === 'router') {
        // Handle nested routers (e.g., for nested routes like /api/rfq)
        middleware.handle.stack.forEach((nestedMiddleware) => {
          if (nestedMiddleware.route) {
            const methods = Object.keys(nestedMiddleware.route.methods).map(method => method.toUpperCase());
            const path = `${middleware.regexp.source.replace('^', '')}${nestedMiddleware.route.path}`.replace(/\/\?$/, '');  // Format path
            
            methods.forEach(method => {
              routes.push({
                method,
                path
              });
            });
          }
        });
      }
    });
  
    return routes;
  };
  
  export { listRoutes };
  