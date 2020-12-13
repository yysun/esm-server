const fs = require('fs');
const path = require('path');
const MagicString = require('magic-string');
const { Parser } = require('acorn');
const walk = require('estree-walker').walk;

function fix(module) {
  if (module.startsWith('http://') || module.startsWith('https://')) {
    return;
  } else if (module.startsWith('/') || module.startsWith('./') || module.startsWith('../')) {
    if (!module.endsWith('js')) return `'${module}.js'`;
    else return;
  } else {
    return `'https://unpkg.com/${module}?module'`;
  }
}

function fixFile(root, url) {
  const file = path.join('./', root, url);
  let code = fs.readFileSync(file).toString();

  const ast = Parser.parse(code, { sourceType: 'module', ecmaVersion: 11 });
  const magicString = new MagicString(code);
  let hasFix;
  walk(ast, {
    enter(node, parent) {
      if (node.type === 'Literal' && parent.type === 'ImportDeclaration') {
        const esm = fix(node.value);
        if (esm) {
          magicString.overwrite(node.start, node.end, esm, {
            storeName: false
          });
          hasFix = true;
        }
        return node;
      }
    }
  });

  if (hasFix) {
    console.log('\t ...... ' + file)
    fs.writeFileSync(file, magicString.toString());
    fs.writeFileSync(file + '.map', magicString.generateMap({
      file,
      includeContent: true,
      hires: true
    })
    );
  }
}

module.exports = (root) => {
  return (req, res, next) => {
    var ext = path.extname(req.url).toLocaleLowerCase();
    if (ext === ".js") {
      try {
        fixFile(root, req.url);
      } catch (e) {
        console.log(e);
      }
    }
    next();
  }
}