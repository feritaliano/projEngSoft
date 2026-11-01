// The generated Prisma Client imports its own .ts files with the .js extension (nodenext style). Jest resolves the
// path as written first; only when that fails for a relative .js import does it retry with .ts.
module.exports = (request, options) => {
  try {
    return options.defaultResolver(request, options);
  } catch (error) {
    if (/^\.{1,2}\/.*\.js$/.test(request)) {
      return options.defaultResolver(request.replace(/\.js$/, '.ts'), options);
    }
    throw error;
  }
};
