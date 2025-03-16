
// path.sep seems to return "/" in browser
// so we hardcode this
// might be best to handle it in env
// browserify seems to suggest they can't feasibly do it, so I might have issues
// figuring it out in browser
// https://github.com/browserify/path-browserify/issues/1
export const pathsep = "\\";