require('glob').sync('./**/*.spec.js', { cwd: __dirname }).forEach(require)
