require('glob').sync('./**/*_spec.js', { cwd: __dirname }).forEach(require)
